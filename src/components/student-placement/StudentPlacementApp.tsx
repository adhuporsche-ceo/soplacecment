import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Check, CheckCircle2, Code2,
  CircleUserRound, ClipboardCheck, GraduationCap, LogOut,
  Search, ShieldCheck, Target, Users, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  api,
  JobApplicationStatus,
  PlacementProfile,
  StudentJobApplication,
  SubmittedStudent,
} from '../../services/api.ts';
import { StickyTopNav, ProfileNavStep } from './StickyTopNav.tsx';
import { useScrollSpy } from './useScrollSpy.ts';

type SectionKey =
  | 'personal' | 'family' | 'academic' | 'skills' | 'achievements'
  | 'projects' | 'onlineProfiles' | 'selfAssessment' | 'careerGoals';
type Field = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'date' | 'number' | 'url' | 'textarea';
  required?: boolean;
  hint?: string;
  placeholder?: string;
};
type Section = { key: SectionKey; title: string; subtitle: string; icon: React.ElementType; fields: Field[] };

const sections: Section[] = [
  {
    key: 'personal', title: 'Personal & residence', subtitle: 'Identity, contact details and where you stay.',
    icon: CircleUserRound, fields: [
      { key: 'fullName', label: 'Full name', required: true },
      { key: 'studentId', label: 'University roll number', required: true },
      { key: 'department', label: 'Department', required: true },
      { key: 'classYear', label: 'Class / section' },
      { key: 'batch', label: 'Batch' },
      { key: 'yearOfStudy', label: 'Year of study', type: 'number' },
      { key: 'currentSemester', label: 'Current semester', type: 'number' },
      { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { key: 'gender', label: 'Gender (optional)' },
      { key: 'collegeEmail', label: 'College email', type: 'email' },
      { key: 'personalEmail', label: 'Personal email', type: 'email' },
      { key: 'mobile', label: 'Student mobile' },
      { key: 'alternateMobile', label: 'Alternate mobile (optional)' },
      { key: 'hometown', label: 'Hometown' },
      { key: 'district', label: 'District' },
      { key: 'state', label: 'State' },
      { key: 'postalCode', label: 'PIN code' },
      { key: 'address', label: 'Permanent address', type: 'textarea' },
      { key: 'residenceType', label: 'Residence type', hint: 'Hostel, day scholar, or other' },
      { key: 'transport', label: 'Daily travel / transport' },
      { key: 'commuteDistance', label: 'One-way travel distance (km)', type: 'number' },
    ],
  },
  {
    key: 'family', title: 'Family & mentor', subtitle: 'Contacts and the people who support your progress.',
    icon: Users, fields: [
      { key: 'parent1Name', label: 'Parent / guardian name' },
      { key: 'parent1Occupation', label: 'Parent / guardian occupation' },
      { key: 'parent1Mobile', label: 'Parent / guardian mobile' },
      { key: 'parent2Name', label: 'Second parent / guardian name' },
      { key: 'parent2Occupation', label: 'Second parent / guardian occupation' },
      { key: 'parent2Mobile', label: 'Second parent / guardian mobile' },
      { key: 'emergencyContactName', label: 'Emergency contact name' },
      { key: 'emergencyRelationship', label: 'Relationship' },
      { key: 'emergencyMobile', label: 'Emergency contact mobile' },
      { key: 'facultyMentorName', label: 'Faculty mentor name' },
      { key: 'mentorDepartment', label: 'Mentor department' },
      { key: 'mentorEmail', label: 'Mentor email', type: 'email' },
      { key: 'mentorMobile', label: 'Mentor mobile' },
      { key: 'lastMentorMeeting', label: 'Last mentor meeting', type: 'date' },
      { key: 'mentorNotes', label: 'Topics for your next meeting', type: 'textarea' },
    ],
  },
  {
    key: 'academic', title: 'Academic record', subtitle: 'Your academic progress, learning needs and semester results.',
    icon: BookOpen, fields: [
      { key: 'currentCgpa', label: 'Current CGPA', required: true, type: 'number', hint: 'Enter the latest verified CGPA.' },
      { key: 'currentPercentage', label: 'Current percentage', type: 'number' },
      { key: 'totalArrears', label: 'Current arrears / backlogs', type: 'number' },
      { key: 'standingArrears', label: 'History of arrears / backlogs', type: 'number' },
      { key: 'academicNotes', label: 'Academic awards, projects or notes', type: 'textarea' },
      { key: 'class10', label: 'Class 10 result' },
      { key: 'class12', label: 'Class 12 / diploma result' },
      { key: 'degree', label: 'Degree / specialization' },
      { key: 'learningNeeds', label: 'Learning needs (optional)', type: 'textarea' },
      { key: 'learningInterests', label: 'Subjects you enjoy learning', type: 'textarea' },
      { key: 'semesterResults', label: 'Semester-wise results', type: 'textarea', hint: 'Add one semester per line, including marks or CGPA.' },
      { key: 'expectedGraduation', label: 'Expected graduation', type: 'date' },
    ],
  },
  {
    key: 'skills', title: 'Skills & interests', subtitle: 'Programming languages, subject strengths and practice.',
    icon: Code2, fields: [
      { key: 'areasOfInterest', label: 'Areas of interest', type: 'textarea', hint: 'Separate items with commas.' },
      { key: 'technicalSkills', label: 'Technical skills', type: 'textarea', hint: 'Include proficiency level for each skill.' },
      { key: 'programmingLanguages', label: 'Programming languages', type: 'textarea', hint: 'Example: TypeScript — Intermediate; Python — Beginner.' },
      { key: 'toolsTechnologies', label: 'Tools & technologies', type: 'textarea' },
      { key: 'subjectExpertise', label: 'Subject expertise', type: 'textarea' },
      { key: 'codingProblemsSolved', label: 'Coding problems solved', type: 'number' },
      { key: 'codingPracticeHours', label: 'Coding practice hours per week', type: 'number' },
      { key: 'currentlyLearning', label: 'What would you like to learn next?' },
      { key: 'evidenceOfPractice', label: 'Practice / project evidence', type: 'textarea' },
    ],
  },
  {
    key: 'achievements', title: 'Achievements', subtitle: 'Papers, hackathons, awards and other accomplishments.',
    icon: CheckCircle2, fields: [
      { key: 'publications', label: 'Papers, presentations & publications', type: 'textarea', hint: 'Add title, event, date, status and evidence link per entry.' },
      { key: 'hackathons', label: 'Hackathons & coding contests', type: 'textarea', hint: 'Add event, organization, result and date per entry.' },
      { key: 'patents', label: 'Patents', type: 'textarea' },
      { key: 'sportsAndArts', label: 'Sports & cultural activities', type: 'textarea' },
      { key: 'awards', label: 'Awards and other achievements', type: 'textarea' },
      { key: 'evidenceLinks', label: 'Supporting evidence links', type: 'textarea', hint: 'Use one public link per line. Never include private passwords or access tokens.' },
    ],
  },
  {
    key: 'projects', title: 'Projects & experience', subtitle: 'Industry exposure, internships and certifications.',
    icon: BriefcaseBusiness, fields: [
      { key: 'academicProjects', label: 'Academic & industry projects', type: 'textarea', hint: 'For each project include title, role, dates, tools, outcome and link.' },
      { key: 'internships', label: 'Internships', type: 'textarea', hint: 'For each internship include organization, role, dates and responsibilities.' },
      { key: 'certifications', label: 'Global & other certifications', type: 'textarea', hint: 'Include certificate, issuer, completion date and verification link.' },
      { key: 'workExperience', label: 'Other work experience', type: 'textarea' },
    ],
  },
  {
    key: 'onlineProfiles', title: 'Online profiles', subtitle: 'Links to your work and professional presence.',
    icon: Target, fields: [
      { key: 'github', label: 'GitHub', type: 'url' },
      { key: 'linkedin', label: 'LinkedIn', type: 'url' },
      { key: 'portfolio', label: 'Portfolio website', type: 'url' },
      { key: 'hackerrank', label: 'HackerRank', type: 'url' },
      { key: 'leetcode', label: 'LeetCode', type: 'url' },
      { key: 'codechef', label: 'CodeChef', type: 'url' },
      { key: 'otherProfiles', label: 'Other professional profiles', type: 'textarea' },
    ],
  },
  {
    key: 'selfAssessment', title: 'Self-assessment & clubs', subtitle: 'Reflect on your confidence, habits and leadership.',
    icon: ClipboardCheck, fields: [
      { key: 'confidence', label: 'Current confidence & strengths', type: 'textarea' },
      { key: 'improve', label: 'Areas you want to improve', type: 'textarea' },
      { key: 'learningHours', label: 'Independent learning hours per week', type: 'number' },
      { key: 'habits', label: 'Habits & interests', type: 'textarea' },
      { key: 'leadership', label: 'Leadership responsibilities & outcomes', type: 'textarea' },
      { key: 'clubs', label: 'Clubs, volunteering & responsibilities', type: 'textarea', hint: 'Include club, role and dates.' },
    ],
  },
  {
    key: 'careerGoals', title: 'Career goals', subtitle: 'Your preferred path and the support you need.',
    icon: Target, fields: [
      { key: 'primaryPreference', label: 'Primary career preference', required: true },
      { key: 'alternatePreference', label: 'Alternate career preference' },
      { key: 'preferredRoles', label: 'Preferred roles', type: 'textarea' },
      { key: 'targetCompanies', label: 'Dream companies' },
      { key: 'preferredJobRole', label: 'Preferred job role' },
      { key: 'preferredLocations', label: 'Preferred work locations' },
      { key: 'willingToRelocate', label: 'Willing to relocate?' },
      { key: 'placementStatus', label: 'Current placement status' },
      { key: 'salaryExpectation', label: 'Expected salary (optional)' },
      { key: 'readiness', label: 'Placement readiness', type: 'textarea' },
      { key: 'supportNeeded', label: 'Support you would like from the placement team', type: 'textarea' },
      { key: 'placementVolunteering', label: 'Placement volunteering preferences', type: 'textarea' },
    ],
  },
];

const profileNavSteps: ProfileNavStep[] = [
  ...sections.map((section, index) => ({
    id: `profile-${section.key}`,
    label: section.key === 'family' ? 'Family & Mentor' : section.title,
  })),
  { id: 'profile-review', label: 'Review & Submit' },
  { id: 'student-applications', label: 'Job applications' },
];
const profileSectionIds = profileNavSteps.map(step => step.id);

const emptyProfile = (): PlacementProfile => ({
  userId: '',
  sections: {},
  status: 'DRAFT',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function isSectionComplete(section: Section, values: Record<string, unknown> = {}): boolean {
  const required = section.fields.filter(field => field.required);
  if (required.length) return required.every(field => String(values[field.key] || '').trim().length > 0);
  return section.fields.some(field => String(values[field.key] || '').trim().length > 0);
}

export const StudentPlacementApp: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <div className="placement-loading"><span className="placement-spinner" /> Loading your placement workspace…</div>;
  if (!user) return <AccessPage />;
  if (user.role === 'STUDENT') return <StudentPortal logout={logout} />;
  if (user.role === 'FACULTY') return <FacultyPortal logout={logout} />;
  return <AccessDenied logout={logout} />;
};

function AccessPage() {
  const { login, registerStudent, isLoading, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (mode === 'register') await registerStudent({ name, email, password, studentId });
      else await login(email, password);
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Please try again.');
    }
  };

  return (
    <main className={`placement-auth ${mode === 'login' ? 'placement-auth-login' : ''}`}>
      <section className="placement-auth-story">
        <a className="placement-brand" href="/" aria-label="StudentInsight home">
          <img className="placement-brand-icon placement-institution-badge" src="/images/kct-cse-badge.png" alt="KCT CSE badge" />
          <span>Nanga KCT CSE<small>StudentInsight · Academic & career profiles</small></span>
        </a>
        <div className="placement-story-copy">
          <p className="placement-eyebrow"><i /> YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>Make your potential<br /><em>easy to see.</em></h1>
          <p>One thoughtful profile for your academic journey, strengths and placement goals.</p>
          <div className="placement-story-card">
            <div className="placement-story-card-head"><span className="placement-story-icon"><Code2 size={17} /></span><div><b>Your career profile</b><small>One place to tell your story</small></div><span className="placement-live">READY</span></div>
            <div className="placement-story-steps"><div><i>01</i><span>Build your student profile</span><Check size={15} /></div><div><i>02</i><span>Share your strengths</span><Check size={15} /></div><div><i>03</i><span>Plan your next move</span><ArrowRight size={15} /></div></div>
          </div>
        </div>
        <p className="placement-story-foot">Your profile is private and visible to authorized faculty.</p>
      </section>
      <section className="placement-auth-panel">
        <div className="placement-auth-form">
          <div className="placement-auth-mobile-brand"><GraduationCap size={21} /> Student<span>Insight</span></div>
          <p className="placement-auth-kicker">{mode === 'login' ? 'STUDENT & FACULTY PORTAL' : 'STUDENT REGISTRATION'}</p>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="placement-auth-intro">{mode === 'login' ? 'Sign in to continue to your placement workspace.' : 'Set up your student account to start your profile.'}</p>
          <form onSubmit={submit} className="placement-form">
            {mode === 'register' && <>
              <label htmlFor="register-name">Full name</label>
              <input id="register-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={120} />
              <label htmlFor="register-id">Student ID</label>
              <input id="register-id" value={studentId} onChange={event => setStudentId(event.target.value.toUpperCase())} required maxLength={40} />
              <small className="placement-field-hint">Use the ID assigned by your institution. IDs are not independently verified here.</small>
            </>}
            <label htmlFor="placement-email">Email address</label>
            <input id="placement-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required maxLength={320} />
            <label htmlFor="placement-password">Password</label>
            <div className="placement-password"><input id="placement-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={mode === 'register' ? 10 : 1} maxLength={128} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            {mode === 'register' && <small className="placement-field-hint">Use at least 10 characters. Your password is securely hashed.</small>}
            {(message || error) && <div className="placement-error" role="alert">{message || error}</div>}
            <button className="placement-primary placement-auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create student account'} <ArrowRight size={16} /></button>
          </form>
          <p className="placement-auth-switch">{mode === 'login' ? 'New student?' : 'Already registered?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          <div className="placement-privacy"><ShieldCheck size={15} /> Student details are shared with authorized faculty only.</div>
        </div>
      </section>
    </main>
  );
}

function StudentPortal({ logout }: { logout: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PlacementProfile>(emptyProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
  const [showSubmissionImage, setShowSubmissionImage] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const persistedSections = useRef<Partial<Record<SectionKey, Record<string, unknown>>>>({});
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const latestSections = useRef(profile.sections);
  latestSections.current = profile.sections;
  const activeSectionId = useScrollSpy(profileSectionIds);

  useEffect(() => {
    if (!showSubmissionImage) return;
    const timeout = window.setTimeout(() => {
      setShowSubmissionImage(false);
      document.getElementById('profile-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [showSubmissionImage]);

  useEffect(() => {
    let activeRequest = true;
    api.getPlacementProfile().then(value => {
      if (activeRequest) {
        persistedSections.current = value.sections;
        setProfile(value);
        setProfileLoaded(true);
      }
    })
      .catch(error => { if (activeRequest) setLoadError(error instanceof Error ? error.message : 'Could not load your profile.'); });
    return () => { activeRequest = false; };
  }, []);

  const persistSections = useCallback((snapshot: PlacementProfile['sections']) => {
    // Keep section writes ordered so rapid edits cannot overwrite one another.
    const queuedSave = saveQueue.current.catch(() => undefined).then(async () => {
      for (const section of sections) {
        const values = snapshot[section.key] || {};
        if (JSON.stringify(values) === JSON.stringify(persistedSections.current[section.key] || {})) continue;
        await api.savePlacementSection(section.key, values);
        persistedSections.current = { ...persistedSections.current, [section.key]: values };
        setProfile(current => ({ ...current, status: 'DRAFT' }));
      }
    });
    saveQueue.current = queuedSave;
    return queuedSave;
  }, []);

  const hasUnsavedChanges = useCallback((snapshot: PlacementProfile['sections']) => sections.some(section =>
    JSON.stringify(snapshot[section.key] || {}) !==
    JSON.stringify(persistedSections.current[section.key] || {}),
  ), []);

  useEffect(() => {
    if (!profileLoaded) return;
    if (!hasUnsavedChanges(profile.sections)) return;

    setAutoSaveStatus('unsaved');
    const snapshot = profile.sections;
    const timeout = window.setTimeout(() => {
      setAutoSaveStatus('saving');
      void persistSections(snapshot)
        .then(() => setAutoSaveStatus(hasUnsavedChanges(latestSections.current) ? 'unsaved' : 'saved'))
        .catch(error => {
          setAutoSaveStatus('error');
          setSaveMessage(error instanceof Error ? error.message : 'Could not save your profile.');
        });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [profile.sections, profileLoaded, persistSections, hasUnsavedChanges]);

  const values = (key: SectionKey) => profile.sections[key] || {};
  const completed = useMemo(
    () => sections.filter(section => isSectionComplete(section, profile.sections[section.key])).length,
    [profile.sections],
  );
  const percent = Math.round((completed / sections.length) * 100);

  const saveNow = async () => {
    setSaving(true);
    setAutoSaveStatus('saving');
    try {
      await persistSections(profile.sections);
      setAutoSaveStatus(hasUnsavedChanges(latestSections.current) ? 'unsaved' : 'saved');
    } catch (error) {
      setAutoSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const navigateTo = (target: SectionKey | 'review' | 'applications') => {
    const targetId = target === 'applications' ? 'student-applications' : `profile-${target}`;
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeField = (key: SectionKey, field: string, value: string) => {
    setProfile(current => ({
      ...current,
      sections: { ...current.sections, [key]: { ...(current.sections[key] || {}), [field]: value } },
    }));
    setSaveMessage('');
  };

  const uploadProfilePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setSaveMessage('Choose a JPG, PNG, or WebP photo under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') changeField('personal', 'photoDataUrl', reader.result);
    };
    reader.onerror = () => setSaveMessage('The selected photo could not be read.');
    reader.readAsDataURL(file);
  };

  const submitProfile = async () => {
    setSaving(true);
    setAutoSaveStatus('saving');
    try {
      await persistSections(profile.sections);
      const result = await api.submitPlacementProfile();
      persistedSections.current = result.sections;
      setProfile(result);
      setSaveMessage('Profile submitted to your faculty team.');
      setAutoSaveStatus('saved');
      setShowSubmissionImage(true);
    } catch (error) {
      setAutoSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Could not submit your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="placement-app placement-profile-page">
      <StickyTopNav
        steps={profileNavSteps}
        activeId={activeSectionId}
        saving={saving}
        onNavigate={id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onSave={() => void saveNow()}
        onLogout={logout}
      />
      <main className="placement-main">
        {loadError && <div className="placement-error placement-page-error" role="alert">{loadError}</div>}
        {saveMessage && <div className="placement-toast" role="status">{saveMessage}</div>}
        <div id="profile-overview">
          <StudentDashboard
            userName={user?.name || 'Student'}
            profile={profile}
            percent={percent}
            completed={completed}
            onEdit={navigateTo}
            onContinue={() => navigateTo(sections.find(section => !isSectionComplete(section, profile.sections[section.key]))?.key || 'review')}
          />
        </div>
        {sections.map((section, index) => {
          const Icon = section.icon;
          return <section id={`profile-${section.key}`} className="placement-content placement-form-section" key={section.key}>
          <div className="placement-step-heading"><div><p>STUDENT PROFILE · STEP {index + 1} OF 10</p><h1>{section.title}</h1><span>{section.subtitle}</span></div><div className="placement-heading-progress"><b>{percent}%</b><span>profile complete</span></div></div>
          <div className="placement-progress-track"><span style={{ width: `${percent}%` }} /></div>
          <form className="placement-section-card" onSubmit={event => { event.preventDefault(); navigateTo(index === sections.length - 1 ? 'review' : sections[index + 1].key); }}>
              <div className="placement-section-intro"><span className="placement-icon-tile"><Icon size={18} /></span><div><b>{section.title}</b><p>{section.subtitle}</p></div></div>
              {section.key === 'personal' && <div className="placement-photo-upload"><div className="placement-photo-preview">{typeof values('personal').photoDataUrl === 'string' ? <img src={String(values('personal').photoDataUrl)} alt="Your profile" /> : <CircleUserRound size={25} />}</div><div><b>Passport-size photo <small>OPTIONAL</small></b><span>JPG, PNG or WebP · up to 1 MB</span><div className="placement-photo-actions"><label className="placement-outline">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadProfilePhoto(event.target.files?.[0])} /></label>{typeof values('personal').photoDataUrl === 'string' && <button type="button" onClick={() => changeField('personal', 'photoDataUrl', '')}>Remove</button>}</div></div></div>}
              <div className="placement-fields">
                {section.fields.map(field => {
                  const value = String(values(section.key)[field.key] ?? (field.key === 'fullName' ? user?.name : field.key === 'studentId' ? user?.studentId : field.key === 'collegeEmail' ? user?.email : '') ?? '');
                  return <label className={`placement-field ${field.type === 'textarea' ? 'wide' : ''}`} key={field.key}>
                    <span>{field.label}{field.required && <i> *</i>}</span>
                    {field.type === 'textarea' ? <textarea value={value} onChange={event => changeField(section.key, field.key, event.target.value)} placeholder={field.placeholder || 'Add details…'} rows={3} /> : <input type={field.type || 'text'} value={value} onChange={event => changeField(section.key, field.key, event.target.value)} placeholder={field.placeholder || 'Enter here'} required={field.required} />}
                    {field.hint && <small>{field.hint}</small>}
                  </label>;
                })}
              </div>
              <div className="placement-step-footer"><button type="button" className="placement-outline" onClick={() => document.getElementById(index === 0 ? 'profile-overview' : `profile-${sections[index - 1].key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><ArrowLeft size={14} /> Previous</button><span>Step {index + 1} of 10</span><button className="placement-primary" disabled={saving}>{saving ? 'Saving…' : index === sections.length - 1 ? 'Review profile' : 'Next section'}<ArrowRight size={15} /></button></div>
          </form>
        </section>;
        })}
        <ReviewSubmit
          profile={profile}
          userName={user?.name || 'Student'}
          onEdit={navigateTo}
          onSubmit={() => void submitProfile()}
          saving={saving}
        />
        <StudentApplications />
      </main>
      <div className={`placement-autosave placement-autosave-${autoSaveStatus}`} role="status" aria-live="polite">
        <i />
        {autoSaveStatus === 'saving' ? 'Saving draft…' : autoSaveStatus === 'unsaved' ? 'Unsaved changes' : autoSaveStatus === 'error' ? 'Draft save failed' : 'Draft saved automatically'}
      </div>
      {showSubmissionImage && (
        <div className="placement-submit-image-overlay" role="status" aria-label="Profile submitted successfully">
          <img src="/images/placement-submit.jpeg" alt="Profile submitted successfully" />
        </div>
      )}
    </div>
  );
}

const jobApplicationStatuses: JobApplicationStatus[] = [
  'SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
];

type JobApplicationForm = {
  companyName: string;
  roleTitle: string;
  status: JobApplicationStatus;
  appliedOn: string;
  applicationUrl: string;
  notes: string;
};

const emptyJobApplication: JobApplicationForm = {
  companyName: '',
  roleTitle: '',
  status: 'SAVED',
  appliedOn: '',
  applicationUrl: '',
  notes: '',
};

function StudentApplications() {
  const [applications, setApplications] = useState<StudentJobApplication[]>([]);
  const [form, setForm] = useState<JobApplicationForm>(emptyJobApplication);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setApplications(await api.getJobApplications());
  }, []);

  useEffect(() => {
    let active = true;
    api.getJobApplications()
      .then(items => { if (active) setApplications(items); })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load your job applications.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateForm = (field: keyof JobApplicationForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api.updateJobApplication(editingId, form);
      else await api.createJobApplication(form);
      await refresh();
      setForm(emptyJobApplication);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save this job application.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (application: StudentJobApplication) => {
    setEditingId(application.id);
    setForm({
      companyName: application.companyName,
      roleTitle: application.roleTitle,
      status: application.status,
      appliedOn: application.appliedOn || '',
      applicationUrl: application.applicationUrl || '',
      notes: application.notes || '',
    });
    document.getElementById('student-applications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const remove = async (application: StudentJobApplication) => {
    if (!window.confirm(`Delete your ${application.roleTitle} application at ${application.companyName}?`)) return;
    setError('');
    try {
      await api.deleteJobApplication(application.id);
      setApplications(current => current.filter(item => item.id !== application.id));
      if (editingId === application.id) {
        setEditingId(null);
        setForm(emptyJobApplication);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete this job application.');
    }
  };

  return <section id="student-applications" className="placement-content placement-form-section">
    <div className="placement-step-heading"><div><p>CAREER TRACKING</p><h1>Job applications</h1><span>Track opportunities, application progress, and outcomes in one place.</span></div></div>
    <div className="placement-progress-track"><span style={{ width: `${applications.length ? 100 : 0}%` }} /></div>
    <div className="placement-section-card student-applications-card">
      <div className="placement-section-intro"><span className="placement-icon-tile"><BriefcaseBusiness size={18} /></span><div><b>{editingId ? 'Update application' : 'Add an application'}</b><p>Your records are private to you and authorized faculty.</p></div></div>
      <form className="placement-fields" onSubmit={event => void submit(event)}>
        <label className="placement-field"><span>Company *</span><input value={form.companyName} onChange={event => updateForm('companyName', event.target.value)} maxLength={120} required placeholder="Company name" /></label>
        <label className="placement-field"><span>Role *</span><input value={form.roleTitle} onChange={event => updateForm('roleTitle', event.target.value)} maxLength={120} required placeholder="Job title or internship role" /></label>
        <label className="placement-field"><span>Application status</span><select value={form.status} onChange={event => updateForm('status', event.target.value)}>{jobApplicationStatuses.map(status => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="placement-field"><span>Applied on</span><input type="date" value={form.appliedOn} onChange={event => updateForm('appliedOn', event.target.value)} /></label>
        <label className="placement-field wide"><span>Application link (optional)</span><input type="url" value={form.applicationUrl} onChange={event => updateForm('applicationUrl', event.target.value)} maxLength={2048} placeholder="https://…" /></label>
        <label className="placement-field wide"><span>Notes (optional)</span><textarea value={form.notes} onChange={event => updateForm('notes', event.target.value)} maxLength={2000} rows={3} placeholder="Interview dates, recruiter details, or next steps" /></label>
        {error && <div className="placement-error wide" role="alert">{error}</div>}
        <div className="placement-application-actions wide">
          {editingId && <button className="placement-outline" type="button" onClick={() => { setEditingId(null); setForm(emptyJobApplication); }}>Cancel edit</button>}
          <button className="placement-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update application' : 'Save application'}</button>
        </div>
      </form>
      <div className="student-application-list">
        <div className="placement-section-intro"><div><b>Your saved applications</b><p>{applications.length} {applications.length === 1 ? 'opportunity' : 'opportunities'} tracked</p></div></div>
        {loading ? <div className="faculty-empty"><span className="placement-spinner" />Loading your applications…</div>
          : applications.length === 0 ? <div className="faculty-empty"><BriefcaseBusiness size={24} /><b>No job applications yet</b><span>Add an opportunity above to start tracking it.</span></div>
            : <div className="faculty-table-wrap"><table className="faculty-table student-application-table"><thead><tr><th>COMPANY</th><th>ROLE</th><th>STATUS</th><th>APPLIED</th><th>LINK</th><th /></tr></thead><tbody>
              {applications.map(application => <tr key={application.id}>
                <td>{application.companyName}</td>
                <td>{application.roleTitle}</td>
                <td><span className={`application-status application-status-${application.status.toLowerCase()}`}>{application.status.replaceAll('_', ' ')}</span></td>
                <td>{application.appliedOn || '—'}</td>
                <td>{application.applicationUrl ? <a href={application.applicationUrl} target="_blank" rel="noreferrer">Open link</a> : '—'}</td>
                <td><div className="placement-application-actions"><button type="button" className="placement-outline" onClick={() => edit(application)}>Edit</button><button type="button" className="placement-outline" onClick={() => void remove(application)}>Delete</button></div></td>
              </tr>)}
            </tbody></table></div>}
      </div>
    </div>
  </section>;
}

function StudentDashboard({ userName, profile, percent, completed, onEdit, onContinue }: {
  userName: string; profile: PlacementProfile; percent: number; completed: number;
  onEdit: (key: SectionKey) => void; onContinue: () => void;
}) {
  const personal = profile.sections.personal || {};
  const academic = profile.sections.academic || {};
  const career = profile.sections.careerGoals || {};
  return <section className="placement-dashboard">
    <div className="placement-welcome"><div><p className="placement-eyebrow">YOUR PLACEMENT JOURNEY</p><h1>Good to see you, {userName.split(' ')[0]}.</h1><p>Build a profile that helps your faculty team understand what you can do and where you want to go.</p></div><div className="placement-welcome-badge"><GraduationCap size={24} /><span>STUDENT<br />WORKSPACE</span></div></div>
    <div className="placement-stat-grid"><div><span>Profile completion</span><b>{percent}%</b><small>{completed} of {sections.length} required sections ready</small><div className="placement-progress-track"><span style={{ width: `${percent}%` }} /></div></div><div><span>Academic snapshot</span><b>{String(academic.currentCgpa || '—')}</b><small>Current CGPA</small><BookOpen size={22} /></div><div><span>Career direction</span><b>{String(career.primaryPreference || 'Not set')}</b><small>{String(career.placementStatus || 'Add your placement preferences')}</small><Target size={22} /></div></div>
    <div className="placement-dashboard-grid"><div className="placement-card placement-checklist"><div className="placement-card-heading"><div><p>PROFILE CHECKLIST</p><h2>Make your profile count</h2></div><span>{percent}%</span></div>{sections.map(section => {
      const done = isSectionComplete(section, profile.sections[section.key]);
      const Icon = section.icon;
      return <button key={section.key} onClick={() => onEdit(section.key)}><span className={`placement-check-icon ${done ? 'done' : ''}`}>{done ? <Check size={14} /> : <Icon size={14} />}</span><span>{section.title}</span><small>{done ? 'Complete' : 'Add details'}</small><ArrowRight size={14} /></button>;
    })}</div><div className="placement-card placement-next-card"><span className="placement-icon-tile"><Code2 size={18} /></span><p className="placement-card-kicker">YOUR NEXT STEP</p><h2>{profile.status === 'SUBMITTED' ? 'Your profile is with faculty.' : 'Tell your story, one step at a time.'}</h2><p>{profile.status === 'SUBMITTED' ? 'You can keep editing your details. Saving changes will return your profile to draft until you submit it again.' : 'A complete profile helps your faculty team guide you toward relevant placement opportunities.'}</p><button className="placement-primary" onClick={onContinue}>{profile.status === 'SUBMITTED' ? 'Review profile' : 'Continue profile'}<ArrowRight size={15} /></button><div className="placement-data-note"><ShieldCheck size={15} /><span>Private to you and authorized faculty.</span></div></div></div>
    <div className="placement-mini-summary"><div><b>Student ID</b><span>{String(personal.studentId || 'Add your ID')}</span></div><div><b>Department</b><span>{String(personal.department || 'Add department')}</span></div><div><b>Batch</b><span>{String(personal.batch || 'Add batch')}</span></div></div>
  </section>;
}

function ProfileInsights({ percent, completed, profile, onContinue }: {
  percent: number; completed: number; profile: PlacementProfile; onContinue: () => void;
}) {
  const missing = sections.filter(section => !isSectionComplete(section, profile.sections[section.key]));
  return <aside className="placement-insights"><div className="placement-insights-heading"><div><p>YOUR PROFILE INSIGHTS</p><b>Profile progress</b></div><Code2 size={16} /></div><div className="placement-insights-score"><strong>{completed}<small> / {sections.length}</small></strong><span>key sections started</span></div><div className="placement-insights-bar"><span style={{ width: `${percent}%` }} /></div><ul><li className={completed > 0 ? 'done' : ''}><CheckCircle2 size={13} />Personal details added</li><li className={Boolean(profile.sections.academic?.currentCgpa) ? 'done' : ''}><CheckCircle2 size={13} />Academic record updated</li><li className={Boolean(profile.sections.skills?.technicalSkills) ? 'done' : ''}><CheckCircle2 size={13} />Skills profile started</li><li className={Boolean(profile.sections.careerGoals?.primaryPreference) ? 'done' : ''}><CheckCircle2 size={13} />Career goals added</li></ul><div className="placement-insight-divider" /><b className="placement-insight-subtitle">SUGGESTED NEXT STEP</b><p>{missing[0] ? `Complete ${missing[0].title.toLowerCase()} to strengthen your profile.` : 'Review and submit your profile to faculty.'}</p><button className="placement-insight-link" onClick={onContinue}>Continue profile <ArrowRight size={13} /></button><div className="placement-insight-private"><ShieldCheck size={14} /><span>Your details stay private to you and authorized faculty.</span></div></aside>;
}

function FinalYearView({ profile, onEdit }: { profile: PlacementProfile; onEdit: () => void }) {
  const goals = profile.sections.careerGoals || {};
  const readiness = profile.sections.skills || {};
  return <section className="placement-content placement-final-year"><div className="placement-step-heading"><div><p>PLACEMENT READINESS</p><h1>My final-year career</h1><span>A clear view of your goals and preparation.</span></div></div><div className="placement-career-card"><div className="placement-career-score"><Code2 size={20} /><span>YOUR CAREER PLAN</span><b>{String(goals.primaryPreference || 'Start with your goals')}</b><p>{String(goals.preferredJobRole || 'Add your preferred role to shape a placement plan.')}</p></div><div className="placement-career-details"><div><small>Preferred companies</small><b>{String(goals.targetCompanies || 'Not added')}</b></div><div><small>Preferred locations</small><b>{String(goals.preferredLocations || 'Not added')}</b></div><div><small>Current placement status</small><b>{String(goals.placementStatus || 'Not added')}</b></div><div><small>Skills in focus</small><b>{String(readiness.areasOfInterest || 'Add areas of interest')}</b></div></div></div><div className="placement-card placement-plan"><p className="placement-card-kicker">A PRACTICAL NEXT STEP</p><h2>Your plan gets stronger as your profile grows.</h2><p>Add your target role, locations, strengths and the support you need. Your faculty mentor can use these details to guide your next steps.</p><button className="placement-primary" onClick={onEdit}>Update career goals <ArrowRight size={15} /></button></div></section>;
}

function ReviewSubmit({ profile, userName, onEdit, onSubmit, saving }: {
  profile: PlacementProfile; userName: string; onEdit: (key: SectionKey) => void; onSubmit: () => void; saving: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const submit = () => {
    const personal = profile.sections.personal || {};
    const academic = profile.sections.academic || {};
    if (!String(personal.fullName || userName).trim() || !String(personal.department || '').trim() || !String(academic.currentCgpa || '').trim()) {
      setError('Add your department and current CGPA before submitting. Use the edit links above.');
      return;
    }
    if (!confirmed) { setError('Confirm that the information is accurate before submitting.'); return; }
    setError('');
    onSubmit();
  };
  const preview: Array<[string, SectionKey, string[]]> = [
    ['Personal & residence', 'personal', ['fullName', 'studentId', 'department', 'batch']],
    ['Family & mentor', 'family', ['emergencyContactName', 'facultyMentorName', 'mentorDepartment']],
    ['Academic record', 'academic', ['currentCgpa', 'currentPercentage', 'totalArrears']],
    ['Skills & interests', 'skills', ['areasOfInterest', 'technicalSkills', 'programmingLanguages']],
    ['Achievements', 'achievements', ['awards', 'hackathons']],
    ['Projects & experience', 'projects', ['academicProjects', 'internships', 'certifications']],
    ['Online profiles', 'onlineProfiles', ['github', 'linkedin', 'portfolio']],
    ['Self-assessment & clubs', 'selfAssessment', ['confidence', 'clubs']],
    ['Career goals', 'careerGoals', ['primaryPreference', 'preferredJobRole', 'targetCompanies']],
  ];
  return <section id="profile-review" className="placement-content placement-form-section placement-review"><div className="placement-step-heading"><div><p>STUDENT PROFILE · STEP 10 OF 10</p><h1>Review & submit</h1><span>Review your profile, choose your placement preferences and submit.</span></div></div><div className="placement-review-grid"><div className="placement-section-card"><div className="placement-review-summary"><div><span>NAME</span><b>{userName}</b></div><div><span>STUDENT ID</span><b>{String(profile.sections.personal?.studentId || 'Not added')}</b></div><div><span>DEPARTMENT</span><b>{String(profile.sections.personal?.department || 'Not added')}</b></div><div><span>CGPA</span><b>{String(profile.sections.academic?.currentCgpa || 'Not added')}</b></div></div><h2 className="placement-review-section-title">Profile at a glance</h2>{preview.map(([label, key, fields]) => <button className="placement-review-row" key={key} onClick={() => onEdit(key)}><b>{label}</b><span>{fields.map(field => String(profile.sections[key]?.[field] || '')).filter(Boolean).join(' · ') || 'No details added yet'}</span><small>Edit details</small></button>)}<div className="placement-review-submit"><b>Confirm & submit</b><label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I confirm that the information I provided is accurate to the best of my knowledge.</label><p>Your profile is shared only with authorized faculty for placement support. Do not include passwords or private access tokens in profile links.</p>{error && <div className="placement-error" role="alert">{error}</div>}<button className="placement-primary" onClick={submit} disabled={saving}>{saving ? 'Submitting…' : profile.status === 'SUBMITTED' ? 'Resubmit profile' : 'Submit profile'}<ArrowRight size={15} /></button></div></div><aside className="placement-insights"><div className="placement-insights-heading"><div><p>READY TO SHARE</p><b>Profile visibility</b></div><ShieldCheck size={16} /></div><div className="placement-submission-note"><ShieldCheck size={18} /><b>Faculty-only access</b><span>Submitted profiles are visible on the separate faculty portal to authorized faculty accounts.</span></div><div className="placement-insight-divider" /><b className="placement-insight-subtitle">BEFORE YOU SUBMIT</b><p>Check that your contact details, academic information and placement preferences are up to date.</p></aside></div></section>;
}

function FacultyPortal({ logout }: { logout: () => void }) {
  const { user } = useAuth();
  const [students, setStudents] = useState<SubmittedStudent[]>([]);
  const [jobApplications, setJobApplications] = useState<StudentJobApplication[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');
  const [selected, setSelected] = useState<SubmittedStudent | null>(null);
  const [openingStudentId, setOpeningStudentId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Array<{ actorId: string; action: string; timestamp: string }>>([]);

  const openStudentProfile = async (studentId: string) => {
    setOpeningStudentId(studentId);
    setError('');
    try {
      setSelected(await api.getSubmittedStudent(studentId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not open this student profile.');
    } finally {
      setOpeningStudentId(null);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getSubmittedStudents(search)
      .then(profiles => { if (active) { setStudents(profiles); setError(''); } })
      .catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load student records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search]);

  useEffect(() => {
    let active = true;
    api.getPlacementActivity()
      .then(logs => { if (active) setActivity(logs); })
      .catch(requestError => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load faculty activity.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.getFacultyJobApplications()
      .then(applications => { if (active) setJobApplications(applications); })
      .catch(requestError => { if (active) setApplicationsError(requestError instanceof Error ? requestError.message : 'Could not load student applications.'); })
      .finally(() => { if (active) setApplicationsLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="faculty-app"><aside className="faculty-sidebar"><div className="placement-side-brand"><span className="placement-brand-icon"><GraduationCap size={20} /></span><div><b>Student<span>Insight</span></b><small>Faculty workspace</small></div></div><div className="faculty-nav-title">PLACEMENT MANAGEMENT</div><div className="faculty-nav-item active"><Users size={16} />Submitted students</div><div className="faculty-sidebar-note"><ShieldCheck size={16} /><span>Student records are restricted to authorized faculty.</span></div><div className="placement-account"><span>{user?.name.slice(0, 2).toUpperCase()}</span><div><b>{user?.name}</b><small>Faculty</small></div><button onClick={logout} title="Sign out"><LogOut size={15} /></button></div></aside><main className="faculty-main"><header className="faculty-topbar"><div><span>FACULTY WORKSPACE</span><strong>Student placement records</strong></div><span className="placement-status"><i />Secure faculty access</span></header><section className="faculty-content"><div className="faculty-welcome"><div><p className="placement-eyebrow">PLACEMENT MANAGEMENT</p><h1>Student profiles</h1><p>Review submitted student profiles and help learners prepare for their next opportunity.</p></div><div className="faculty-total"><b>{students.length}</b><span>SUBMITTED<br />PROFILES</span></div></div><div className="faculty-summary-cards"><div><span>Submitted profiles</span><b>{students.length}</b><small>Visible to faculty</small></div><div><span>Profile sections</span><b>9</b><small>Academic & career details</small></div><div><span>Recent activity</span><b>{activity.length}</b><small>Placement events recorded</small></div></div><div className="faculty-directory"><div className="faculty-directory-heading"><div><p>STUDENT DIRECTORY</p><h2>Submitted profiles</h2><span>Only submitted student profiles appear here.</span></div><label className="faculty-search"><Search size={16} /><input placeholder="Search name, ID, department, skills…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>{error && <div className="placement-error" role="alert">{error}</div>}{loading ? <div className="faculty-empty"><span className="placement-spinner" />Loading submitted profiles…</div> : students.length === 0 ? <div className="faculty-empty"><Users size={27} /><b>No submitted profiles found</b><span>Students appear here after they complete and submit their profile.</span></div> : <div className="faculty-table-wrap"><table className="faculty-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>DEPARTMENT / BATCH</th><th>CAREER PREFERENCE</th><th>SUBMITTED</th><th /></tr></thead><tbody>{students.map(({ user: student, profile }) => <tr key={student.id}><td><div className="faculty-student-name"><span>{student.name.slice(0, 2).toUpperCase()}</span><div><b>{student.name}</b><small>{student.email}</small></div></div></td><td>{String(profile.sections.personal?.studentId || student.studentId || '—')}</td><td>{String(profile.sections.personal?.department || '—')}<small>{String(profile.sections.personal?.batch || '')}</small></td><td>{String(profile.sections.careerGoals?.primaryPreference || 'Not specified')}</td><td>{profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString() : '—'}</td><td><button className="placement-outline" disabled={openingStudentId === student.id} onClick={() => void openStudentProfile(student.id)}>{openingStudentId === student.id ? 'Loading…' : 'View profile'} <ArrowRight size={13} /></button></td></tr>)}</tbody></table></div>}</div><FacultyJobApplications applications={jobApplications} loading={applicationsLoading} error={applicationsError} /><div className="faculty-activity"><div><p>PLACEMENT ACTIVITY</p><h2>Recent events</h2></div>{activity.length ? activity.slice(0, 6).map((item, index) => <div className="faculty-activity-row" key={`${item.timestamp}-${index}`}><span><CheckCircle2 size={14} /></span><div><b>{item.action.replaceAll('_', ' ').toLowerCase()}</b><small>{new Date(item.timestamp).toLocaleString()}</small></div></div>) : <p className="faculty-no-activity">Placement events will appear here as students complete their profiles.</p>}</div></section></main>{selected && <StudentProfileModal student={selected} onClose={() => setSelected(null)} />}</div>;
}

function FacultyJobApplications({ applications, loading, error }: {
  applications: StudentJobApplication[];
  loading: boolean;
  error: string;
}) {
  return <div className="faculty-directory faculty-job-applications">
    <div className="faculty-directory-heading"><div><p>PLACEMENT TRACKING</p><h2>Student job applications</h2><span>Read-only view of opportunities tracked by students.</span></div></div>
    {error && <div className="placement-error" role="alert">{error}</div>}
    {loading ? <div className="faculty-empty"><span className="placement-spinner" />Loading student applications…</div>
      : applications.length === 0 ? <div className="faculty-empty"><BriefcaseBusiness size={24} /><b>No student applications recorded</b><span>Student-submitted opportunities will appear here.</span></div>
        : <div className="faculty-table-wrap"><table className="faculty-table faculty-applications-table">
          <thead><tr><th>STUDENT</th><th>COMPANY</th><th>ROLE</th><th>STATUS</th><th>APPLIED</th><th /></tr></thead>
          <tbody>{applications.map(application => <tr key={application.id}>
            <td><div className="faculty-student-name"><span>{(application.student?.name || 'S').slice(0, 2).toUpperCase()}</span><div><b>{application.student?.name || 'Student account unavailable'}</b><small>{application.student?.studentId || application.student?.email || '—'}</small></div></div></td>
            <td>{application.companyName}</td>
            <td>{application.roleTitle}</td>
            <td><span className={`application-status application-status-${application.status.toLowerCase()}`}>{application.status.replaceAll('_', ' ')}</span></td>
            <td>{application.appliedOn || '—'}</td>
            <td>{application.applicationUrl ? <a href={application.applicationUrl} target="_blank" rel="noreferrer">Open link</a> : '—'}</td>
          </tr>)}</tbody>
        </table></div>}
  </div>;
}

function StudentProfileModal({ student, onClose }: { student: SubmittedStudent; onClose: () => void }) {
  const photo = student.profile.sections.personal?.photoDataUrl;
  const content = [
    ...sections.map(section => ({ label: section.title, values: student.profile.sections[section.key] || {} })),
  ];
  return <div className="placement-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="placement-student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title"><header>{typeof photo === 'string' && photo && <img className="placement-modal-photo" src={photo} alt="" />}<div><p>SUBMITTED STUDENT PROFILE</p><h2 id="student-modal-title">{student.user.name}</h2><span>{student.user.email} · {String(student.profile.sections.personal?.studentId || student.user.studentId || '')}</span></div><button onClick={onClose} aria-label="Close profile"><X size={19} /></button></header><div className="placement-modal-scroll">{content.map(({ label, values }) => <section key={label}><h3>{label}</h3><div className="placement-modal-fields">{Object.entries(values).filter(([key, value]) => key !== 'photoDataUrl' && value !== '' && value !== null && value !== undefined).map(([key, value]) => <div key={key}><small>{key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase())}</small><span>{String(value)}</span></div>)}</div></section>)}</div><footer><span><ShieldCheck size={14} /> Faculty-only student record</span><button className="placement-primary" onClick={onClose}>Close</button></footer></section></div>;
}

function AccessDenied({ logout }: { logout: () => void }) {
  return <main className="placement-denied"><div><ShieldCheck size={30} /><p className="placement-eyebrow">STUDENT PLACEMENT MANAGEMENT</p><h1>Portal access is restricted</h1><p>This workspace is available to student and faculty accounts. Sign out and use an authorized account.</p><button className="placement-primary" onClick={logout}>Sign out <LogOut size={15} /></button></div></main>;
}
