# Scheme Tracker

A production-ready web application for managing dealer/distributor schemes for **Puro Soul** (purosoul.in): parties register for a scheme by paying an advance, the scheme activates immediately, products are dispatched over multiple trips, and the system tracks progress toward the sales target, calculates the earned benefit, and produces a printable A4 report. Saving a registration **automatically emails the payment details** (mode, UTR, amounts, dates) to the validation recipients that the admin configures in Settings.

## Tech Stack

| Layer    | Technologies |
|----------|--------------|
| Frontend | React 18 (Vite, TypeScript), Tailwind CSS, React Router, Axios, React Hook Form, TanStack Table, TanStack React Query, Recharts, react-hot-toast |
| Backend  | Node.js, Express, MongoDB (Mongoose), JWT auth, express-validator, Multer (screenshot upload), Nodemailer |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/        # env, db connection, domain constants
│   │   ├── models/        # User, Scheme, SchemeRegistration, Dispatch, AuditLog
│   │   ├── controllers/   # thin request handlers
│   │   ├── services/      # business logic (activation, expiry, benefit, emails, dashboard aggregations)
│   │   ├── routes/        # express routers per resource
│   │   ├── middleware/    # auth (JWT + roles), errors, multer upload, validation runner
│   │   ├── validators/    # express-validator chains
│   │   ├── utils/         # ApiError, asyncHandler, date helpers
│   │   └── seed/          # seed script (default users + sample schemes)
│   └── uploads/           # payment screenshots (served at /uploads)
└── frontend/
    └── src/
        ├── api/           # typed API functions per resource
        ├── components/    # reusable UI (Button, DataTable, Modal, FileUpload, …), layout, registration widgets
        ├── context/       # Auth + Theme (dark mode) providers
        ├── hooks/         # useDebounce
        ├── lib/           # axios client, formatters, status maps
        ├── pages/         # Login, Dashboard, Scheme Master, Registrations, Print, Settings
        └── types/         # shared TypeScript interfaces
```

## Getting Started

Prerequisites: **Node.js ≥ 18** and a running **MongoDB** instance.

### 1. Backend

```bash
cd backend
npm install
# create a .env file (see template below)
npm run seed                # creates default users + sample schemes
npm run dev                 # http://localhost:5000
```

Create `backend/.env` with:

```ini
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/scheme-tracker
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads

# Email (leave blank to disable outgoing mail in development)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
# Must match the authenticated mailbox for most providers
MAIL_FROM="Puro Soul Scheme Tracker <you@yourdomain.com>"
# Fallback recipient for registration emails when none are configured in Settings
ACCOUNTS_EMAIL=

# Mailbox the vendor's daily sales report (AFVPL Tally export) arrives in —
# auto-import stays OFF until host, user and password are all set
REPORT_IMAP_HOST=
REPORT_IMAP_PORT=993
REPORT_EMAIL_USER=
REPORT_EMAIL_PASSWORD=
# How far back the FIRST run searches for report emails (backfills history);
# later runs resume from the last processed email automatically
REPORT_LOOKBACK_DAYS=45
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api and /uploads to :5000)
```

### Default Accounts (from seed)

| Role     | Email                 | Password      |
|----------|-----------------------|---------------|
| Admin    | admin@company.com     | Admin@1234    |
| Sales    | sales@company.com     | Sales@1234    |

> Change these passwords immediately in any real deployment (Settings → Change Password).

### Email

Two emails are sent automatically: **Scheme Registration Validation** (payment details, sent the moment a registration is saved) and **Scheme Target Achieved** (on completion). Recipients are managed by the admin in **Settings → Validation Emails** (stored in the database); if none are configured, the `ACCOUNTS_EMAIL` from `backend/.env` is used as a fallback, and the completion email additionally goes to the sales employee who created the registration. Configure `SMTP_*` and `MAIL_FROM` in `backend/.env`. If SMTP is not configured, the app logs the email instead of failing.

### Dispatch auto-import from the daily sales email

An employee mails the **AFVPL daily sales report** (Tally "Ledger Account" export, one tab per month) every day except Sunday. The job `backend/src/jobs/fetchDispatchEmail.js`:

1. Logs into the report mailbox over IMAP (`REPORT_*` env vars) and finds **every report email not processed yet** (subject "daily sales"/"sales report" or an `AFVPL`/`purosoul` attachment, from Amarjit Fiscal), importing them oldest first. Every run is recorded in the `ReportImport` collection — that record powers the dashboard's **"Today's Sales Report Email"** card and is the job's resume point (no local state file, so it works across separate web/cron containers). The first run looks back `REPORT_LOOKBACK_DAYS` (default 45) to backfill history.
2. Saves a copy of each Excel attachment to `backend/data/attachments/` and parses every monthly tab: party name from **Particulars**, total cases from **Quantity**, and **Voucher No.** as the dispatch bill number (the report has no case-size split, so imported dispatches carry the total only).
3. Matches each invoice's party name (case-insensitive) against active scheme registrations and records a dispatch through the normal dispatch flow — progress, completion, benefit and audit log all update exactly as for a manual entry. Imported entries show as source `EMAIL_IMPORT`, added by "Email Import (auto)".
4. Skips safely: vouchers already recorded (the monthly file re-sends every prior day), `NIL` no-sale rows, Grand Total rows, invoices dated outside a scheme's validity, and parties without a registration.

Missed days heal themselves: the workbook is cumulative, so when the employee is on holiday or forgets to send it, the next email they do send contains all the missed invoices and the job catches up in one go — without ever double-counting.

**Scheduling is built into the web server** — no cron or Task Scheduler needed. While the backend runs (e.g. on Railway), it checks the mailbox once at startup (catch-up after downtime) and then every 30 minutes between 9 AM and 5 PM IST, Monday–Saturday (the report has no fixed send time, usually 9 AM–2 PM). Just set `REPORT_EMAIL_PASSWORD`; set `REPORT_AUTO_FETCH=false` to turn the scheduler off. Every check is logged (`[report-fetch] ...`), visible in Railway's deploy logs.

You can also run a check manually anytime — re-runs never duplicate:

```bash
cd backend
npm run import:dispatch-email                        # check the mailbox now
npm run import:dispatch-email -- --file report.xlsx  # import a file on disk
```

## Business Rules Implemented

- Registrations activate **immediately on creation**: activation = now, **expiry auto-calculated** = activation + scheme validity days. The deadline is a **whole day, not a time**: the scheme stays valid through the end of its expiry day, and expiry is displayed date-only everywhere. Scheme terms are snapshotted so later scheme edits never change running registrations. Registration date can never be in the past.
- A **payment attachment (screenshot/receipt) is compulsory for every payment mode** (JPG/PNG/WEBP/PDF, ≤ 5 MB, preview before upload); the UTR/reference number is optional.
- Saving a registration **automatically sends the validation email** to all configured recipients — the send is recorded in the audit log and a mail failure never blocks the save.
- Dispatches are **fully automated** — imported from the daily sales report email (see above); there is no manual entry form. Rules enforced on every import: only against active schemes, **globally unique bill numbers** (the Tally voucher number), date must be within activation–expiry.
- When achieved ≥ target before expiry: status → **Completed**, **Benefit = achieved cases × benefit per case** (keeps accruing on further dispatches within validity), completion email sent.
- Past expiry without reaching target: status → **Expired**, benefit = 0 (evaluated lazily on every read, no cron needed).
- Every action (create, validate-email, dispatch, print, scheme/user changes) is written to the **audit log** and shown as an activity timeline.

## API Overview (all under `/api`)

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST   | `/auth/login` | public | Login, returns JWT |
| GET    | `/auth/me` · PATCH `/auth/password` | authed | Profile / change password |
| GET    | `/schemes` | authed | List schemes (`?active=true`) |
| POST/PUT/DELETE | `/schemes[/:id]` | admin | Manage scheme master |
| POST   | `/registrations` | sales, admin | Create registration (multipart, `screenshot` field) |
| GET    | `/registrations` | authed | Search/filter/paginate (`q, bill, status, scheme, from, to, page, limit`) |
| GET    | `/registrations/:id` · `/registrations/:id/timeline` | authed | Detail + audit timeline |
| GET/PUT | `/settings/emails` | admin | Manage validation email recipients |
| POST   | `/dispatch` (alias `/dispatches`) | sales, admin | Add dispatch entry |
| GET    | `/dispatch/:registrationId` | authed | Dispatch history |
| GET    | `/dashboard` | authed | Cards + monthly charts + completion average |
| GET    | `/print/:registrationId` | authed | Full printable report payload (audited) |
| GET/POST/PATCH | `/users[/:id]` | admin | User management |

## Production Notes

- `frontend`: `npm run build` outputs a static `dist/` (React/charts/table vendors split into separate chunks). Set `VITE_API_URL` to the deployed API base and serve `dist/` from any static host; the backend `CLIENT_URL` env must match the frontend origin for CORS.
- `backend`: set a strong `JWT_SECRET`, real `MONGODB_URI`, and SMTP credentials. Uploads are stored on disk under `backend/uploads` — mount a persistent volume (or swap the Multer storage for S3) in production.
- Security middleware included: helmet, CORS allow-list, JWT expiry, role-based authorization on every route, request validation on every write, and centralized error handling (Mongoose/Multer/duplicate-key errors mapped to proper status codes).
