import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { AuthService } from '../services/auth.service.ts';
import {
  JobApplicationStatus,
  JOB_APPLICATION_STATUSES,
  PlacementService,
  PROFILE_SECTIONS,
  ProfileSection,
  StudentJobApplication,
} from '../services/placement.service.ts';

type JobApplicationInput = Omit<StudentJobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

function isValidApplicationInput(value: unknown, partial = false): value is Partial<JobApplicationInput> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  const allowedFields = ['companyName', 'roleTitle', 'status', 'appliedOn', 'applicationUrl', 'notes'];
  if (Object.keys(input).some(key => !allowedFields.includes(key))) return false;
  if (!partial && (
    typeof input.companyName !== 'string' ||
    typeof input.roleTitle !== 'string' ||
    !input.companyName.trim() ||
    !input.roleTitle.trim()
  )) return false;
  if (input.companyName !== undefined && (typeof input.companyName !== 'string' || !input.companyName.trim() || input.companyName.trim().length > 120)) return false;
  if (input.roleTitle !== undefined && (typeof input.roleTitle !== 'string' || !input.roleTitle.trim() || input.roleTitle.trim().length > 120)) return false;
  if (input.status !== undefined && (typeof input.status !== 'string' || !JOB_APPLICATION_STATUSES.includes(input.status as JobApplicationStatus))) return false;
  if (input.appliedOn !== undefined && (
    typeof input.appliedOn !== 'string' ||
    (input.appliedOn !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(input.appliedOn))
  )) return false;
  if (input.applicationUrl !== undefined) {
    if (typeof input.applicationUrl !== 'string' || input.applicationUrl.length > 2048) return false;
    if (input.applicationUrl) {
      try {
        const url = new URL(input.applicationUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      } catch {
        return false;
      }
    }
  }
  if (input.notes !== undefined && (typeof input.notes !== 'string' || input.notes.length > 2000)) return false;
  return partial ? Object.keys(input).length > 0 : true;
}

function normalizeApplicationInput(input: Partial<JobApplicationInput>): Partial<JobApplicationInput> {
  return {
    ...input,
    ...(typeof input.companyName === 'string' ? { companyName: input.companyName.trim() } : {}),
    ...(typeof input.roleTitle === 'string' ? { roleTitle: input.roleTitle.trim() } : {}),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error &&
    (error as { code?: number }).code === 11000;
}

export class PlacementController {
  public static async login(req: AuthenticatedRequest, res: Response) {
    const { email, password } = req.body;
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 320 ||
      password.length > 128 ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }
    const result = await AuthService.authenticate(email, password);
    if (!result) return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    await PlacementService.recordLogin({ ...result.user, passwordHash: '' });
    return res.json({ success: true, data: result });
  }

  public static async register(req: AuthenticatedRequest, res: Response) {
    const { name, email, password, studentId } = req.body;
    if (
      typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120 ||
      typeof email !== 'string' || email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 10 || password.length > 128 ||
      typeof studentId !== 'string' || studentId.trim().length < 2 || studentId.trim().length > 40
    ) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid name, email, student ID, and password with at least 10 characters.',
      });
    }

    try {
      const user = await PlacementService.registerStudent({ name, email, password, studentId });
      return res.status(201).json({
        success: true,
        data: { token: AuthService.generateToken({ ...user, passwordHash: '' }), user },
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({
          success: false,
          error: 'That email address or student ID is already registered.',
        });
      }
      throw error;
    }
  }

  public static async getOwnProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const profile = await PlacementService.getOwnProfile(req.user.userId);
    return res.json({ success: true, data: profile });
  }

  public static async saveOwnProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const { section, values } = req.body;
    const encodedValues = values && typeof values === 'object' && !Array.isArray(values)
      ? JSON.stringify(values)
      : '';
    const photo = section === 'personal' && typeof values?.photoDataUrl === 'string'
      ? values.photoDataUrl as string
      : undefined;
    if (
      typeof section !== 'string' ||
      !PROFILE_SECTIONS.includes(section as ProfileSection) ||
      !values ||
      typeof values !== 'object' ||
      Array.isArray(values) ||
      encodedValues.length > (photo ? 1_500_000 : 100_000) ||
      (photo !== undefined && photo !== '' && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))
    ) {
      return res.status(400).json({ success: false, error: 'The profile section is invalid or too large.' });
    }
    const profile = await PlacementService.saveOwnProfile(
      req.user.userId,
      section as ProfileSection,
      values as Record<string, unknown>,
    );
    return res.json({ success: true, data: profile });
  }

  public static async submitOwnProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const profile = await PlacementService.getOwnProfile(req.user.userId);
    const personal = profile.sections.personal || {};
    const academic = profile.sections.academic || {};
    const careerGoals = profile.sections.careerGoals || {};
    if (
      typeof personal.fullName !== 'string' || !personal.fullName.trim() ||
      typeof personal.department !== 'string' || !personal.department.trim() ||
      typeof academic.currentCgpa !== 'string' || !academic.currentCgpa.trim() ||
      typeof careerGoals.primaryPreference !== 'string' || !careerGoals.primaryPreference.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Complete your name, department, current CGPA, and primary career preference before submitting your profile.',
      });
    }
    const submitted = await PlacementService.submitOwnProfile(req.user.userId);
    return res.json({ success: true, data: submitted });
  }

  public static async listOwnJobApplications(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const applications = await PlacementService.listOwnJobApplications(req.user.userId);
    return res.json({ success: true, data: applications });
  }

  public static async createJobApplication(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    if (!isValidApplicationInput(req.body)) {
      return res.status(400).json({ success: false, error: 'Enter a company and role, and provide valid application details.' });
    }
    const application = await PlacementService.createJobApplication(
      req.user.userId,
      normalizeApplicationInput(req.body) as JobApplicationInput,
    );
    return res.status(201).json({ success: true, data: application });
  }

  public static async updateJobApplication(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    if (!isValidApplicationInput(req.body, true)) {
      return res.status(400).json({ success: false, error: 'The application update is invalid or empty.' });
    }
    const application = await PlacementService.updateJobApplication(
      req.user.userId,
      req.params.id,
      normalizeApplicationInput(req.body),
    );
    if (!application) return res.status(404).json({ success: false, error: 'Job application not found.' });
    return res.json({ success: true, data: application });
  }

  public static async deleteJobApplication(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const deleted = await PlacementService.deleteJobApplication(req.user.userId, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Job application not found.' });
    return res.json({ success: true, data: { deleted: true } });
  }

  public static async listFacultyJobApplications(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const applications = await PlacementService.listFacultyJobApplications(req.user.userId);
    return res.json({ success: true, data: applications });
  }

  public static async listSubmittedStudents(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
    const students = await PlacementService.listSubmittedStudents(search, req.user.userId);
    return res.json({ success: true, data: students });
  }

  public static async getSubmittedStudent(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const student = await PlacementService.getSubmittedStudent(req.params.id, req.user.userId);
    if (!student) return res.status(404).json({ success: false, error: 'Submitted student profile not found.' });
    return res.json({ success: true, data: student });
  }

  public static async getFacultyActivity(_req: AuthenticatedRequest, res: Response) {
    const activity = await PlacementService.getFacultyActivity();
    return res.json({ success: true, data: activity });
  }
}
