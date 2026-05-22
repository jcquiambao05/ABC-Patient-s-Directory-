# ABCare OmniFlow — Technical Documentation
**Version:** 1.0 | **Last Updated:** May 2026

---

## 1. Purpose

ABCare OmniFlow is a full-stack clinic management system for ABC MD Medical Clinic.
It digitizes patient records, consultations, appointments, queue management,
prescriptions, and procedures with role-based access control.

**Designed for:** Small to medium Philippine medical clinics  
**Users:** Clinic staff, doctors, and system administrators  
**Data handled:** Protected Health Information (PHI) — patient medical records

---

## 2. User Roles

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **Staff** | Limited | Patient directory, queue, appointments, consultations, chart uploads |
| **Doctor (Admin)** | Standard | All staff + prescriptions, doctor notes, patient verification, audit log |
| **Superadmin** | Full | All + user management, archived patients, admin panel, permanent delete |

---

## 3. Features

### Patient Directory
- A–Z cabinet grouping with search
- Profile photos (JPEG/PNG/WebP, 10MB)
- Soft delete (archive) — patients never permanently lost
- Doctor verification badge (blue = verified, gray = not verified)
- Staff sees read-only verification status

### Medical Records
- **Medical History:** Past conditions, medications, travel history, family history
- **Consultation Records:** Clinical findings, assessment/plan, vitals (BP, temp, HR, SpO2, weight, height)
- **Doctor Notes:** Private notes visible only to doctors
- **Review Workflow:** Staff creates records, doctor marks as reviewed
- **Chart Images:** Upload physical chart photos (JPEG/PNG/PDF, 20MB)

### Procedures & Prescriptions
- Procedure types: Counseling, Surgery, Immunization + custom types (doctor only)
- E-signature consent forms (stored as PNG)
- Typed or photo prescriptions
- Medication dosage/frequency/duration/instructions

### Queue Management
- Daily queue with drag-to-reorder
- Status: Waiting → In Consultation → Done
- Post-consultation appointment prompt
- Archive/reset queue per day

### Appointments
- Calendar view with month/date filtering
- Walk-in vs. standard booking
- Patient confirmation via SMS link (48h token)
- Auto SMS reminders: 48h and 24h before appointment
- No-show tracking and follow-up SMS
- Recurring appointments (weekly/monthly/yearly)

### Dashboard
- Today/week/month visit counts
- Pending review count
- No-show rate and at-risk patients
- Date range filtering

### Authentication
- Email + password login
- TOTP MFA (mandatory on signup)
- Google OAuth (whitelisted emails only)
- Password reset via email OTP (10-minute expiry)
- Account lockout (5 failed attempts → 15-minute lock)

### Admin Panel (Superadmin)
- User management (list, delete, reset passwords)
- Google OAuth whitelist management
- Archived patient recovery
- Appointment audit log

---

## 4. Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)
- Motion/Framer Motion (animations)

### Backend
- Node.js 20 + Express.js
- TypeScript (tsx runtime)
- JWT authentication (8-hour expiry)
- Bcrypt (12 rounds) for passwords
- Speakeasy for TOTP MFA
- Nodemailer for email (Gmail SMTP)
- Passport.js for Google OAuth
- Multer for file uploads
- Node-cron for scheduled tasks

### Database
- PostgreSQL 15
- pg driver
- pgcrypto extension
- JSONB for flexible data (vitals, preferences, consent forms)

### External Services
- Gmail SMTP — password reset OTP emails
- Semaphore API — SMS appointment reminders
- Google OAuth — optional sign-in

### Deployment
- Docker + Docker Compose
- Nginx (reverse proxy + SSL)
- Ubuntu 22.04 LTS (recommended)

---

## 5. Database Schema (20 Tables)

| Table | Purpose |
|-------|---------|
| `admin_users` | System users (staff, doctors, superadmin) |
| `audit_logs` | All system actions with user/timestamp |
| `auth_audit_log` | Authentication events |
| `session_tokens` | Active session tracking |
| `patients` | Patient demographics + verification status |
| `patient_medical_history` | Medical history (JSONB) |
| `consultation_records` | Clinical notes + vitals |
| `chart_images` | Physical chart image references |
| `procedures` | Procedures with e-signature consent |
| `prescriptions` | Medication prescriptions |
| `queue` | Daily patient queue |
| `appointments` | Scheduled appointments |
| `appointment_tokens` | Confirmation link tokens |
| `appointment_status_log` | Immutable status change history |
| `sms_log` | SMS delivery tracking |
| `doctor_schedules` | Doctor availability slots |
| `schedule_blocks` | Blocked dates (holidays/leave) |
| `daily_briefings` | AI-generated daily summaries |
| `faq_entries` | Clinic FAQ content |
| `medical_charts_backup` | OCR legacy backup table |

---

## 6. API Endpoints Summary

All endpoints require `Authorization: Bearer <token>` except:
- `GET /api/health` — public health check
- `POST /api/auth/login` — login
- `POST /api/auth/forgot-password` — request OTP
- `POST /api/auth/reset-password` — reset with OTP
- `POST /api/appointments/confirm` — patient confirmation (token-based)

See full endpoint list in SECURITY-AUDIT.md

---

## 7. Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<64-char random hex>
SESSION_SECRET=<64-char random hex>

# Email (password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

# SMS (appointment reminders)
SMS_API_KEY=your_semaphore_key
SMS_SENDER_NAME=ABCClinic

# Optional
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_EMAILS=
GEMINI_API_KEY=
```

---

## 8. File Upload Directories

```
uploads/
├── patients/      # Profile photos (JPEG/PNG/WebP, 10MB)
├── charts/        # Medical chart images (JPEG/PNG/PDF, 20MB)
├── medications/   # Medication images (JPEG/PNG/WebP, 10MB)
├── prescriptions/ # Prescription photos (JPEG/PNG/WebP, 10MB)
└── signatures/    # E-signature PNGs (from canvas)
```

---

## 9. Default Accounts (Change Immediately)

| Role | Username | Default Password |
|------|----------|-----------------|
| Superadmin | `adminabcare` | `Admin@ABCare2026` |
| Doctor | `doctor@abcclinic.com` | `Doctor@ABC2026!` |
| Staff | `staff@abcclinic.com` | `Staff@ABC2026!` |

**⚠️ Change all passwords immediately after first login.**

---

## 10. Scheduled Tasks (Cron Jobs)

| Schedule | Task |
|----------|------|
| Every 30 minutes | Send 48h and 24h appointment reminders via SMS |
| Daily at 11:00 PM | Detect no-shows, send follow-up SMS |
| Daily at 6:00 AM | Generate AI daily briefing (if Gemini configured) |
