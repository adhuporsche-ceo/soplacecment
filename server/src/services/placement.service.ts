import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose, { Schema } from 'mongoose';
import { db } from '../repositories/database.ts';
import { User } from '../types/index.ts';

export const PROFILE_SECTIONS = [
  'personal',
  'family',
  'academic',
  'skills',
  'achievements',
  'projects',
  'onlineProfiles',
  'selfAssessment',
  'careerGoals',
] as const;

export type ProfileSection = typeof PROFILE_SECTIONS[number];
export type PlacementProfileStatus = 'DRAFT' | 'SUBMITTED';
export const JOB_APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number];

export interface PlacementProfile {
  userId: string;
  sections: Partial<Record<ProfileSection, Record<string, unknown>>>;
  status: PlacementProfileStatus;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentJobApplication {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  status: JobApplicationStatus;
  appliedOn?: string;
  applicationUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PlacementActivity {
  actorId: string;
  actorRole: string;
  studentId: string;
  action:
    | 'STUDENT_REGISTERED'
    | 'LOGIN_SUCCESS'
    | 'PROFILE_SAVED'
    | 'PROFILE_SUBMITTED'
    | 'FACULTY_VIEWED_PROFILES'
    | 'APPLICATION_CREATED'
    | 'APPLICATION_UPDATED'
    | 'APPLICATION_DELETED'
    | 'FACULTY_VIEWED_APPLICATIONS';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const profileSchema = new Schema<PlacementProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    sections: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT', required: true },
    submittedAt: { type: Date },
  },
  { collection: 'student_profiles', timestamps: true, versionKey: false },
);

const activitySchema = new Schema<PlacementActivity>(
  {
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        'STUDENT_REGISTERED',
        'LOGIN_SUCCESS',
        'PROFILE_SAVED',
        'PROFILE_SUBMITTED',
        'FACULTY_VIEWED_PROFILES',
        'APPLICATION_CREATED',
        'APPLICATION_UPDATED',
        'APPLICATION_DELETED',
        'FACULTY_VIEWED_APPLICATIONS',
      ],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'placement_activity_logs', versionKey: false },
);

const jobApplicationSchema = new Schema<StudentJobApplication>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    roleTitle: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: JOB_APPLICATION_STATUSES, default: 'SAVED', required: true },
    appliedOn: { type: String, maxlength: 10 },
    applicationUrl: { type: String, maxlength: 2048 },
    notes: { type: String, maxlength: 2000 },
  },
  { collection: 'student_job_applications', timestamps: true, versionKey: false },
);
jobApplicationSchema.index({ userId: 1, updatedAt: -1 });
jobApplicationSchema.index({ status: 1, updatedAt: -1 });

const ProfileModel = mongoose.models.StudentProfile ||
  mongoose.model<PlacementProfile>('StudentProfile', profileSchema);
const ActivityModel = mongoose.models.PlacementActivity ||
  mongoose.model<PlacementActivity>('PlacementActivity', activitySchema);
const JobApplicationModel = mongoose.models.StudentJobApplication ||
  mongoose.model<StudentJobApplication>('StudentJobApplication', jobApplicationSchema);

export class PlacementService {
  private static async log(activity: PlacementActivity): Promise<void> {
    await ActivityModel.create(activity);
  }

  public static async recordLogin(user: User): Promise<void> {
    await this.log({
      actorId: user.id,
      actorRole: user.role,
      studentId: user.id,
      action: 'LOGIN_SUCCESS',
      timestamp: new Date(),
    });
  }

  public static async registerStudent(input: {
    name: string;
    email: string;
    password: string;
    studentId: string;
  }): Promise<Omit<User, 'passwordHash'>> {
    const email = input.email.trim().toLowerCase();
    const studentId = input.studentId.trim().toUpperCase();
    const id = `student_${randomUUID()}`;
    const user: User = {
      id,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      name: input.name.trim(),
      role: 'STUDENT',
      organizationId: 'student-placement',
      studentId,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    await db.createUser(user);
    try {
      await ProfileModel.create({
        userId: id,
        sections: {
          personal: {
            fullName: user.name,
            studentId,
            collegeEmail: email,
          },
        },
        status: 'DRAFT',
      });
      await this.log({
        actorId: id,
        actorRole: 'STUDENT',
        studentId: id,
        action: 'STUDENT_REGISTERED',
        timestamp: new Date(),
      });
    } catch (error) {
      await Promise.all([
        mongoose.connection.db?.collection('placement_users').deleteOne({ id }),
        mongoose.connection.db?.collection('student_profiles').deleteOne({ userId: id }),
        mongoose.connection.db?.collection('placement_activity_logs').deleteMany({ actorId: id }),
      ]);
      throw error;
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  public static async getOwnProfile(userId: string): Promise<PlacementProfile> {
    const profile = await ProfileModel.findOne({ userId }).lean<PlacementProfile>();
    if (profile) return profile;
    return ProfileModel.create({ userId, sections: {}, status: 'DRAFT' });
  }

  public static async saveOwnProfile(
    userId: string,
    section: ProfileSection,
    values: Record<string, unknown>,
  ): Promise<PlacementProfile> {
    const profile = await this.getOwnProfile(userId);
    if (JSON.stringify(profile.sections[section] || {}) === JSON.stringify(values)) return profile;
    const sections = { ...profile.sections, [section]: values };
    const updated = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: { sections, status: 'DRAFT' }, $unset: { submittedAt: 1 } },
      { returnDocument: 'after', runValidators: true },
    ).lean<PlacementProfile>();
    if (!updated) throw new Error('Student profile could not be saved.');

    await this.log({
      actorId: userId,
      actorRole: 'STUDENT',
      studentId: userId,
      action: 'PROFILE_SAVED',
      timestamp: new Date(),
      metadata: { section },
    });
    return updated;
  }

  public static async submitOwnProfile(userId: string): Promise<PlacementProfile> {
    const updated = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: { status: 'SUBMITTED', submittedAt: new Date() } },
      { returnDocument: 'after', runValidators: true, upsert: true },
    ).lean<PlacementProfile>();
    if (!updated) throw new Error('Student profile could not be submitted.');
    await this.log({
      actorId: userId,
      actorRole: 'STUDENT',
      studentId: userId,
      action: 'PROFILE_SUBMITTED',
      timestamp: new Date(),
    });
    return updated;
  }

  public static async listOwnJobApplications(userId: string): Promise<StudentJobApplication[]> {
    return JobApplicationModel.find({ userId }).sort({ updatedAt: -1 }).lean<StudentJobApplication[]>();
  }

  public static async createJobApplication(
    userId: string,
    input: Omit<StudentJobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<StudentJobApplication> {
    const application = await JobApplicationModel.create({
      ...input,
      id: `application_${randomUUID()}`,
      userId,
    });
    await this.log({
      actorId: userId,
      actorRole: 'STUDENT',
      studentId: userId,
      action: 'APPLICATION_CREATED',
      timestamp: new Date(),
      metadata: { applicationId: application.id, companyName: application.companyName },
    });
    return application.toObject();
  }

  public static async updateJobApplication(
    userId: string,
    applicationId: string,
    updates: Partial<Pick<StudentJobApplication, 'companyName' | 'roleTitle' | 'status' | 'appliedOn' | 'applicationUrl' | 'notes'>>,
  ): Promise<StudentJobApplication | undefined> {
    const updated = await JobApplicationModel.findOneAndUpdate(
      { id: applicationId, userId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).lean<StudentJobApplication>();
    if (!updated) return undefined;
    await this.log({
      actorId: userId,
      actorRole: 'STUDENT',
      studentId: userId,
      action: 'APPLICATION_UPDATED',
      timestamp: new Date(),
      metadata: { applicationId },
    });
    return updated;
  }

  public static async deleteJobApplication(userId: string, applicationId: string): Promise<boolean> {
    const deleted = await JobApplicationModel.findOneAndDelete({ id: applicationId, userId }).lean<StudentJobApplication>();
    if (!deleted) return false;
    await this.log({
      actorId: userId,
      actorRole: 'STUDENT',
      studentId: userId,
      action: 'APPLICATION_DELETED',
      timestamp: new Date(),
      metadata: { applicationId, companyName: deleted.companyName },
    });
    return true;
  }

  public static async listFacultyJobApplications(facultyUserId: string) {
    const applications = await JobApplicationModel.find()
      .sort({ updatedAt: -1 })
      .limit(1000)
      .lean<StudentJobApplication[]>();
    const userIds = [...new Set(applications.map(application => application.userId))];
    const users = await mongoose.connection.db
      ?.collection<User>('placement_users')
      .find({ id: { $in: userIds }, role: 'STUDENT', isActive: true })
      .project({ passwordHash: 0 })
      .toArray();
    const userById = new Map((users || []).map(user => [user.id, user]));
    const results = applications.flatMap(application => {
      const user = userById.get(application.userId);
      return user ? [{ ...application, student: { id: user.id, name: user.name, email: user.email, studentId: user.studentId } }] : [];
    });
    await this.log({
      actorId: facultyUserId,
      actorRole: 'FACULTY',
      studentId: 'job_applications',
      action: 'FACULTY_VIEWED_APPLICATIONS',
      timestamp: new Date(),
      metadata: { resultCount: results.length },
    });
    return results;
  }

  public static async listSubmittedStudents(search = '', facultyUserId: string) {
    const profiles = await ProfileModel.find({ status: 'SUBMITTED' })
      .sort({ submittedAt: -1 })
      .limit(500)
      .lean<PlacementProfile[]>();
    if (!profiles.length) return [];

    const userIds = profiles.map(profile => profile.userId);
    const users = await mongoose.connection.db
      ?.collection<User>('placement_users')
      .find({ id: { $in: userIds }, role: 'STUDENT', isActive: true })
      .project({ passwordHash: 0 })
      .toArray();
    const userById = new Map((users || []).map(user => [user.id, user]));
    const term = search.trim().toLowerCase();
    const results = profiles.flatMap(profile => {
      const user = userById.get(profile.userId);
      if (!user) return [];
      const personal = profile.sections.personal || {};
      const searchable = [
        user.name,
        user.email,
        user.studentId,
        personal.department,
        personal.batch,
        personal.classYear,
        JSON.stringify(profile.sections.skills || {}),
      ].join(' ').toLowerCase();
      if (term && !searchable.includes(term)) return [];
      return [{
        user,
        profile: {
          ...profile,
          sections: {
            personal: {
              fullName: personal.fullName,
              studentId: personal.studentId,
              department: personal.department,
              batch: personal.batch,
            },
            academic: {
              currentCgpa: profile.sections.academic?.currentCgpa,
            },
            careerGoals: {
              primaryPreference: profile.sections.careerGoals?.primaryPreference,
            },
          },
        },
      }];
    });

    await this.log({
      actorId: facultyUserId,
      actorRole: 'FACULTY',
      studentId: 'submitted_directory',
      action: 'FACULTY_VIEWED_PROFILES',
      timestamp: new Date(),
      metadata: { resultCount: results.length },
    });
    return results;
  }

  public static async getSubmittedStudent(userId: string, facultyUserId: string) {
    const [profile, user] = await Promise.all([
      ProfileModel.findOne({ userId, status: 'SUBMITTED' }).lean<PlacementProfile>(),
      mongoose.connection.db
        ?.collection<User>('placement_users')
        .findOne({ id: userId, role: 'STUDENT', isActive: true }, { projection: { passwordHash: 0 } }),
    ]);
    if (!profile || !user) return undefined;
    await this.log({
      actorId: facultyUserId,
      actorRole: 'FACULTY',
      studentId: userId,
      action: 'FACULTY_VIEWED_PROFILES',
      timestamp: new Date(),
      metadata: { view: 'student_profile' },
    });
    return { user, profile };
  }

  public static async getFacultyActivity() {
    return ActivityModel.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select({ _id: 0, actorId: 1, actorRole: 1, studentId: 1, action: 1, timestamp: 1, metadata: 1 })
      .lean();
  }
}
