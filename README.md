# StudentInsight Placement Management

StudentInsight is a full-stack student placement management application. Students
create accounts, save a multi-step academic and career profile, and submit it to
faculty. Faculty have a separate, protected workspace for finding and reviewing
submitted student profiles.

## Features

- Student self-registration, sign-in, and persistent profile drafts
- Ten-step profile workflow with progress, review, and submission
- Optional profile photo upload stored with the private student profile
- Academic, skills, achievements, projects, online profiles, and career goals
- Student job-application tracker with status, dates, links, notes, and edit/delete
- Separate faculty-only directory of submitted profiles
- Faculty read-only view of student job applications
- Faculty search across student name, student ID, department, batch, and skills
- MongoDB-backed student accounts, profiles, and placement activity history
- Server-enforced role and profile ownership checks

## Technology

- React, TypeScript, Vite, Tailwind CSS, and Lucide icons
- Node.js, Express, and Socket.IO
- MongoDB with Mongoose
- JWT authentication and bcrypt password hashing

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`. Set a MongoDB Atlas URI in `MONGODB_URI`,
   a random `JWT_SECRET` of at least 32 characters, and the faculty bootstrap
   email/password. Keep `.env` private; it is excluded from Git.

   The database name is read from the URI when it includes one. If it does not,
   the application uses `MONGODB_DB_NAME` when configured, or
   `student_placement` by default.

3. Start the development server:

   ```sh
   npm run dev
   ```

4. Open [http://localhost:5000](http://localhost:5000). The server connects to
   MongoDB before accepting requests.

The `/health` and `/api/health` endpoints report database connectivity without
returning connection details.

## Accounts and privacy

Students register from the sign-in page. The server assigns the `STUDENT` role;
registration cannot create faculty or administrator accounts. Student email and
student ID are unique. Passwords are stored as bcrypt hashes.

Faculty accounts are bootstrapped from `FACULTY_EMAIL` and
`FACULTY_LOGIN_PASSWORD`. They are stored in MongoDB after the first startup.
Changing an environment password does not change an already-created account.
Do not expose account secrets through frontend variables such as `VITE_*`.

Students can only read and update their own profiles. The separate submitted
student directory and placement activity endpoint require the `FACULTY` role.
Administrators and students cannot access those endpoints. Only submitted
profiles appear in the faculty directory.

Students can create, view, update, and delete only their own job-application
records. Faculty can view all student job applications but cannot modify them.
The tracker supports saved, applied, assessment, interview, offer, rejected,
and withdrawn statuses.

## MongoDB collections

- `placement_users`: student and configured faculty identities, roles, and
  password hashes
- `student_profiles`: structured profile sections and draft/submission status
- `student_job_applications`: one document per student/job opportunity, linked
  to the owning account by `userId`
- `placement_activity_logs`: account, profile, submission, and faculty-view
  events, including job-application changes; profile contents and passwords are
  not copied into activity logs

Unique indexes protect normalized email addresses and student IDs. Existing
legacy collections are left untouched; the placement application does not
read or migrate legacy audit records.

## Placement application API

- `GET /api/v1/placement/applications` — list the signed-in student's applications
- `POST /api/v1/placement/applications` — create an application
- `PATCH /api/v1/placement/applications/:id` — update an owned application
- `DELETE /api/v1/placement/applications/:id` — delete an owned application
- `GET /api/v1/placement/applications/faculty` — faculty-only read of all applications

## Deployment

Deploy as a Node web service rather than a static site because Express serves
the API and production frontend.

Build command:

```sh
npm ci && npm run build
```

Start command:

```sh
npm start
```

Set `NODE_ENV=production`, `MONGODB_URI`, and a strong `JWT_SECRET` in the
deployment service settings. Configure `FACULTY_EMAIL` and
`FACULTY_LOGIN_PASSWORD` to provision faculty access. If using MongoDB Atlas,
allow the deployment host in Atlas Network Access and grant the database user
access to the selected database. Do not set `PORT` manually on Render; Render
provides it.

## Validation

```sh
npm run lint
npm run build
npm test
```

The integration test suite uses a separate database named
`<database>_test`; configure test database access before running it.
