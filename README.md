# ABCare OmniFlow — Clinic Management System

A full-stack web application for ABC MD Medical Clinic. Manages patient records, consultations, appointments, queue, prescriptions, and procedures with role-based access control.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript (tsx)
- **Database:** PostgreSQL 15 (Supabase locally, Docker in production)
- **Auth:** JWT + TOTP MFA + Google OAuth
- **Email:** Gmail SMTP (Nodemailer) — password reset OTP


---

## Roles

| Role | Access |
|------|--------|
| **Staff** | Patient directory, queue, appointments, consultations, chart images |
| **Doctor (Admin)** | All staff access + prescriptions, doctor notes, patient verification, audit log |
| **Superadmin** | All access + user management, archived patients, admin panel |

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
git clone https://github.com/jcquiambao05/ABC-Patient-s-Directory-.git
cd ABC-Patient-s-Directory-
cp .env.example .env
# Edit .env — fill in EMAIL_USER, EMAIL_PASS, SMS_API_KEY

# 2. Start everything
docker compose up -d

# 3. Open the app
open http://localhost:3000
```



---

## Local Development (Supabase)

```bash
# Prerequisites: Node.js 20+, Supabase CLI, Docker
npm install
supabase start
npm run dev
```

Database URL for local dev: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

---

## Database Setup

### Fresh installation
```bash
psql -U postgres -d postgres -f database/full_schema.sql
```

### Load demo data (optional)
```bash
psql -U postgres -d postgres -f database/seed_demo_data.sql
```

### Migrate existing database
```bash
psql -U postgres -d postgres -f database/patient_verification_migration.sql
```

---

## Database Files

| File | Purpose |
|------|---------|
| `database/full_schema.sql` | Complete schema — all 20 tables, indexes, default accounts |
| `database/seed_demo_data.sql` | 10 fictional demo patients with consultations and prescriptions |
| `database/patient_verification_migration.sql` | Incremental migration for existing databases |
| `database/appointment-lifecycle-migration.sql` | Appointment status lifecycle tables |
| `database/vitals_migration.sql` | Vitals JSONB column migration |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_SECRET=<generate same way>

# Email (password reset OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password   # Gmail App Password, not your login password

# SMS reminders (Semaphore)
SMS_API_KEY=your_semaphore_api_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_EMAILS=admin@yourdomain.com
```

---

## Key Features

- **Patient Directory** — A–Z cabinet view, search, profile photos, medical history
- **Doctor Verification** — Doctor can mark patient info as verified (blue badge); staff sees read-only status
- **Consultation Records** — Vitals tracking, clinical findings, assessment/plan, review workflow
- **Procedures** — Counseling, surgery, immunization + custom types with e-signature consent
- **Prescriptions** — Typed or photo prescriptions
- **Queue Management** — Drag-to-reorder, status tracking, post-consultation appointment prompt
- **Appointments** — Calendar view, SMS confirmation links, 48h/24h auto-reminders, no-show follow-up
- **Print with Filters** — Filter by date range, status, and sections before printing patient records
- **Audit Log** — Full action history (doctor/admin only)
- **MFA** — TOTP mandatory for all accounts
- **Password Reset** — 6-digit OTP via Gmail with 60-second cooldown

---

## Security

- JWT authentication with 8-hour expiry
- TOTP MFA mandatory on signup
- Account lockout after 5 failed login attempts (15-minute lock)
- Name validation — letters only, full name required (no numbers/single characters)
- Password requirements — 12+ chars, uppercase, lowercase, number, special character
- Role-based access control on all API endpoints
- Superadmin bypasses all role checks
- `.env` excluded from git — never committed

---

## Project Structure

```
├── src/
│   ├── auth/authRoutes.ts      # Auth endpoints (login, MFA, password reset, OAuth)
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API client, constants, normalization
│   └── types/                  # TypeScript interfaces
├── database/
│   ├── full_schema.sql         # Complete DB schema
│   ├── seed_demo_data.sql      # Demo patients
│   └── *_migration.sql         # Incremental migrations
├── server.ts                   # Express server + all API routes
├── Dockerfile                  # Production container
├── docker-compose.yml          # Full stack (app + postgres)
└── .env.example                # Environment template
```

---

## License

MIT — See [LICENSE](LICENSE)
