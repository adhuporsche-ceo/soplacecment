<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AuditMind 360

AuditMind 360 is a React application served by the existing Express backend.
MongoDB Atlas is the source of truth for application users and audit records.
On first startup, existing `.data/auditmind360.json` records are imported into
their corresponding MongoDB collections without overwriting existing records.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies with the repository's lockfile:
   `npm install`
2. Create a private root `.env` file using [.env.example](.env.example) as a
   template. Set the backend-only `MONGODB_URI`, `MONGODB_DB_NAME`,
   `JWT_SECRET`, `NODE_ENV`, `PORT`, and the sign-in email/password pairs.
   Never prefix server secrets with `VITE_`.
3. Start the existing Express + Vite server:
   `npm run dev`
4. Open `http://localhost:5000`, sign in with one of the configured accounts,
   and check `http://localhost:5000/api/health`.
   The server waits for the initial MongoDB connection before listening.
5. In development, insert and read back a connection test using:
   `Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/dev/mongo-connection-test`
   This endpoint is limited to development mode and localhost.

The application stores audit data in collections such as `transactions`,
`findings`, `cases`, `evidenceDocuments`, `auditLogs`, and `soxControls`.
The original JSON file is retained as a migration backup; application reads and
writes use MongoDB after startup. Derived dashboard, reconciliation, and
forensic results are calculated from the MongoDB records.

The connection test writes one record to the `system_connection_tests`
collection in the selected database.

## Sign-in accounts

The login form sends credentials to the Express API. When a configured account
ID is missing, the server bootstraps it into MongoDB with a bcrypt password hash.
Authentication and subsequent account reads use MongoDB; plain-text passwords
are not stored in MongoDB or bundled into the frontend. Configure these pairs
before the first startup:

- `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` (or
  `ADMIN_LOGIN_EMAIL` / `ADMIN_LOGIN_PASSWORD`) — Super Administrator.
- `PLACEMENT_COORDINATOR_EMAIL` / `PLACEMENT_COORDINATOR_PASSWORD` — Chief
  Auditor.
- `FACULTY_EMAIL` / `FACULTY_LOGIN_PASSWORD` — Financial Auditor.
- `INSTITUTION_EMAIL` / `INSTITUTION_LOGIN_PASSWORD` — Compliance Officer.

The sample `.env.example` contains placeholders only. Use unique passwords.
After the accounts are bootstrapped, MongoDB is authoritative; changing an
environment password does not overwrite an existing MongoDB account.
The test suite uses a separate database named `<MONGODB_DB_NAME>_test`.

## Gemini AI

Set `GEMINI_API_KEY` in the backend `.env` file to enable Gemini features.
