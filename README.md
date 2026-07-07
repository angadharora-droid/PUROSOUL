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

## Business Rules Implemented

- Registrations activate **immediately on creation**: activation = now, **expiry auto-calculated** = activation + scheme validity days; scheme terms are snapshotted so later scheme edits never change running registrations. Registration date can never be in the past.
- A **payment attachment (screenshot/receipt) is compulsory for every payment mode** (JPG/PNG/WEBP/PDF, ≤ 5 MB, preview before upload); the UTR/reference number is optional.
- Saving a registration **automatically sends the validation email** to all configured recipients — the send is recorded in the audit log and a mail failure never blocks the save.
- Dispatches: only against active schemes, **globally unique bill numbers**, date must be within activation–expiry, total cases (250 ml + 500 ml + 1 L) auto-calculated, at least one case required.
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
