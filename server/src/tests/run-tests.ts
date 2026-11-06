import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AuthService } from '../services/auth.service.ts';
import { PlacementService } from '../services/placement.service.ts';
import { connectDatabase, disconnectDatabase } from '../config/database.ts';
import { config } from '../config/index.ts';
import { db } from '../repositories/database.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const testDatabase = `${config.mongoDbName || 'student_placement'}_test`;
  await connectDatabase(testDatabase);
  let createdUserId: string | undefined;
  try {
    await db.initialize();
    const suffix = randomUUID();
    const email = `placement-test-${suffix}@example.test`;
    const studentId = `STU-${suffix}`;
    const password = 'Test-Student-Password-382!';

    const student = await PlacementService.registerStudent({
      name: 'Placement Test Student',
      email,
      password,
      studentId,
    });
    createdUserId = student.id;
    assert(student.role === 'STUDENT', 'Public registration must always create a student account.');
    assert(!('passwordHash' in student), 'Registration response must not expose a password hash.');

    const stored = await db.getUserByEmail(email);
    assert(Boolean(stored), 'Student account must be persisted.');
    assert(await bcrypt.compare(password, stored!.passwordHash), 'Student password must be stored as a secure hash.');

    const auth = await AuthService.authenticate(email, password);
    assert(Boolean(auth), 'The registered student should be able to sign in.');
    assert(AuthService.verifyToken(auth!.token)?.role === 'STUDENT', 'Student session must retain the student role.');
    assert(await AuthService.authenticate(email, 'incorrect-password') === null, 'Invalid passwords must be rejected.');

    let duplicateRejected = false;
    try {
      await PlacementService.registerStudent({
        name: 'Duplicate Student',
        email: `another-${suffix}@example.test`,
        password,
        studentId,
      });
    } catch (error) {
      duplicateRejected = typeof error === 'object' && error !== null && 'code' in error &&
        (error as { code?: number }).code === 11000;
    }
    assert(duplicateRejected, 'The unique student ID index must reject duplicate registrations.');

    const profile = await PlacementService.getOwnProfile(student.id);
    assert(profile.sections.personal?.fullName === student.name, 'Registration should initialize the student profile.');
    await PlacementService.saveOwnProfile(student.id, 'personal', {
      fullName: student.name,
      studentId,
      department: 'Computer Science',
    });
    await PlacementService.saveOwnProfile(student.id, 'academic', { currentCgpa: '8.7' });
    await PlacementService.saveOwnProfile(student.id, 'careerGoals', { primaryPreference: 'Software engineering' });
    const submitted = await PlacementService.submitOwnProfile(student.id);
    assert(submitted.status === 'SUBMITTED', 'Profile submission must persist the submitted status.');

    const facultyResults = await PlacementService.listSubmittedStudents('Computer Science', student.id);
    assert(facultyResults.some(result => result.user.id === student.id), 'Faculty search should find submitted profiles.');
    const facultyDetail = await PlacementService.getSubmittedStudent(student.id, student.id);
    assert(
      facultyDetail?.profile.sections.academic?.currentCgpa === '8.7',
      'Faculty detail lookup should return a submitted student profile.',
    );

    const application = await PlacementService.createJobApplication(student.id, {
      companyName: 'Example Technologies',
      roleTitle: 'Graduate Software Engineer',
      status: 'APPLIED',
      appliedOn: '2026-11-06',
      applicationUrl: 'https://example.test/jobs/graduate-engineer',
      notes: 'Application submitted for integration test.',
    });
    assert(
      (await PlacementService.listOwnJobApplications(student.id)).some(item => item.id === application.id),
      'A student job application must be persisted and retrievable by its owner.',
    );
    const updatedApplication = await PlacementService.updateJobApplication(student.id, application.id, {
      status: 'INTERVIEW',
      notes: 'Interview scheduled.',
    });
    assert(updatedApplication?.status === 'INTERVIEW', 'Students must be able to update their application status.');
    const facultyApplications = await PlacementService.listFacultyJobApplications(student.id);
    assert(
      facultyApplications.some(item => item.id === application.id && item.student.id === student.id),
      'Faculty must be able to view student applications with their associated student identity.',
    );
    assert(
      !(await PlacementService.updateJobApplication(`other_${student.id}`, application.id, { status: 'OFFER' })),
      'A student must not be able to update another student’s application.',
    );
    assert(await PlacementService.deleteJobApplication(student.id, application.id), 'A student must be able to delete their own application.');
    assert(
      !(await PlacementService.listOwnJobApplications(student.id)).some(item => item.id === application.id),
      'A deleted application must no longer appear in the student list.',
    );

    const activity = await PlacementService.getFacultyActivity();
    assert(activity.some(event => event.studentId === student.id && event.action === 'PROFILE_SUBMITTED'), 'Placement activity should record profile submissions.');
    assert(activity.some(event => event.studentId === student.id && event.action === 'APPLICATION_CREATED'), 'Placement activity should record job application creation.');
    assert(activity.some(event => event.actorId === student.id && event.studentId === 'job_applications' && event.action === 'FACULTY_VIEWED_APPLICATIONS'), 'Placement activity should record faculty access to student applications.');
    assert(AuthService.hasPermission('FACULTY', 'placement:students:read'), 'Faculty should have the placement read permission.');
    assert(!AuthService.hasPermission('STUDENT', 'placement:students:read'), 'Students must not have faculty record permissions.');

    console.log('Student placement integration checks passed.');
  } finally {
    if (createdUserId) {
      await mongoose.connection.db?.collection('placement_users').deleteOne({ id: createdUserId });
      await mongoose.connection.db?.collection('student_profiles').deleteOne({ userId: createdUserId });
      await mongoose.connection.db?.collection('student_job_applications').deleteMany({ userId: createdUserId });
      await mongoose.connection.db?.collection('placement_activity_logs').deleteMany({ actorId: createdUserId });
      await mongoose.connection.db?.collection('placement_activity_logs').deleteMany({ studentId: createdUserId });
    }
    await disconnectDatabase();
  }
}

main().catch(error => {
  console.error('Student placement tests failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
