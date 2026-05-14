-- ============================================================
-- ABCare OmniFlow — COMPLETE DATABASE SCHEMA
-- Run this on a fresh PostgreSQL database to set up everything
-- Works with: PostgreSQL 14+, Supabase, Docker Postgres
--
-- Usage:
--   psql -U postgres -d postgres -f database/full_schema.sql
--   OR via Docker:
--   docker compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/full_schema.sql
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  name                  TEXT NOT NULL,
  display_name          TEXT,
  role                  TEXT NOT NULL DEFAULT 'staff'
                        CHECK (role IN ('staff', 'admin', 'superadmin')),
  preferences           JSONB NOT NULL DEFAULT '{}',

  -- MFA
  mfa_enabled           BOOLEAN DEFAULT FALSE,
  mfa_secret            TEXT,
  mfa_secret_temp       TEXT,

  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until          TIMESTAMP,
  reset_token           TEXT,
  reset_token_expiry    TIMESTAMPTZ,
  reset_token_created_at TIMESTAMPTZ,
  password_changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- OAuth
  google_id             TEXT UNIQUE,

  -- Audit
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role  ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users(reset_token) WHERE reset_token IS NOT NULL;

-- ============================================================
-- 2. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id     TEXT,
  user_email  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- 3. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  full_name                       TEXT NOT NULL,
  age                             INTEGER,
  gender                          TEXT,
  date_of_birth                   DATE,
  civil_status                    TEXT,
  address                         TEXT,
  contact_number                  TEXT,
  occupation                      TEXT,
  referred_by                     TEXT,
  profile_photo_path              TEXT,
  privacy_consent_signature_path  TEXT,
  privacy_consent_at              TIMESTAMP,
  -- Soft delete / archive
  archived                        BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at                     TIMESTAMP,
  archived_by                     TEXT,
  -- Doctor verification
  verified_by_doctor              BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at                     TIMESTAMPTZ,
  verified_by                     TEXT,
  created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_full_name  ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_archived   ON patients(archived);

-- ============================================================
-- 4. PATIENT MEDICAL HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_medical_history (
  id                                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id                          TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  past_medical                        JSONB NOT NULL DEFAULT '{}',
  maintenance_medications_text        TEXT,
  maintenance_medications_image_path  TEXT,
  travel_history                      TEXT,
  personal_social_history             JSONB NOT NULL DEFAULT '{}',
  family_history                      JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pmh_patient_id ON patient_medical_history(patient_id);

-- ============================================================
-- 5. CONSULTATION RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS consultation_records (
  id                           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id                   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date                         DATE NOT NULL DEFAULT CURRENT_DATE,
  subjective_clinical_findings TEXT,
  assessment_plan              TEXT,
  doctor_notes                 TEXT,
  reviewed                     BOOLEAN NOT NULL DEFAULT FALSE,
  marked_at                    TIMESTAMP,
  reviewer_notes               TEXT,
  raw_ocr_text                 TEXT,
  confidence_score             REAL,
  created_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cr_patient_id ON consultation_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_cr_reviewed   ON consultation_records(reviewed);
CREATE INDEX IF NOT EXISTS idx_cr_marked_at  ON consultation_records(marked_at DESC);

-- ============================================================
-- 6. CHART IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_images (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ci_patient_id ON chart_images(patient_id);

-- ============================================================
-- 7. PROCEDURES
-- ============================================================
CREATE TABLE IF NOT EXISTS procedures (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id        TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_type    TEXT NOT NULL,
  custom_type       TEXT,
  description       TEXT,
  consent_form_data JSONB NOT NULL DEFAULT '{}',
  signature_path    TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON procedures(patient_id);

-- ============================================================
-- 8. PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('typed', 'photo')),
  medication_name TEXT,
  dosage          TEXT,
  frequency       TEXT,
  duration        TEXT,
  instructions    TEXT,
  photo_path      TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rx_patient_id ON prescriptions(patient_id);

-- ============================================================
-- 9. QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS queue (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'in_consultation', 'done')),
  remarks     TEXT,
  queued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_queued_date ON queue(queued_date);
CREATE INDEX IF NOT EXISTS idx_queue_archived    ON queue(archived);
CREATE INDEX IF NOT EXISTS idx_queue_status      ON queue(status);

-- ============================================================
-- 10. APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by       TEXT NOT NULL,
  title            TEXT NOT NULL DEFAULT 'Follow-up Consultation',
  notes            TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  frequency        TEXT NOT NULL DEFAULT 'once'
                   CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
  frequency_every  INTEGER NOT NULL DEFAULT 1,
  end_date         DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'attended', 'no_show', 'cancelled')),
  booking_type     TEXT NOT NULL DEFAULT 'standard'
                   CHECK (booking_type IN ('standard', 'walk_in')),
  sms_sent         BOOLEAN NOT NULL DEFAULT FALSE,
  sms_sent_at      TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_date       ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_status     ON appointments(status);

-- ============================================================
-- 11. DEFAULT ACCOUNTS
-- Passwords listed below — CHANGE AFTER FIRST LOGIN
-- ============================================================

-- Super Admin: username=adminabcare  password=Admin@ABCare2026
INSERT INTO admin_users (id, email, name, display_name, password_hash, role, mfa_enabled, failed_login_attempts, created_at)
VALUES (
  'superadmin-001',
  'adminabcare@abclinic.local',
  'Super Admin',
  'Super Admin',
  '$2b$12$C2OVqQFQJc38IJ.dw.NBhOXf3/kZtcL4InN5oBcqhA36X4LgsYftC',
  'superadmin',
  FALSE, 0, NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  password_hash = '$2b$12$C2OVqQFQJc38IJ.dw.NBhOXf3/kZtcL4InN5oBcqhA36X4LgsYftC',
  mfa_enabled = FALSE,
  failed_login_attempts = 0,
  locked_until = NULL;

-- Staff account: staff@abcclinic.com  password=Staff@ABC2026!
INSERT INTO admin_users (id, email, name, display_name, password_hash, role, mfa_enabled, failed_login_attempts)
VALUES (
  'staff-001',
  'staff@abcclinic.com',
  'Clinic Staff',
  'Clinic Staff',
  '$2b$12$UPmu9L9wjf.Suq9Y9i0RMeAreKQws1VwEuSaKjDPJYnH0sMDsaUba',
  'staff', FALSE, 0
) ON CONFLICT (email) DO NOTHING;

-- Doctor account: doctor@abcclinic.com  password=Doctor@ABC2026!
INSERT INTO admin_users (id, email, name, display_name, password_hash, role, mfa_enabled, failed_login_attempts)
VALUES (
  'doctor-001',
  'doctor@abcclinic.com',
  'Clinic Doctor',
  'Clinic Doctor',
  '$2b$12$ibbfQisjl1nsnx50Xv9q0.wVa1baNl5ZdbdtsMjOqbAVg2iwPXPRa',
  'admin', FALSE, 0
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- DEFAULT ACCOUNTS SUMMARY
-- ============================================================
-- | Role       | Login username          | Password           |
-- |------------|-------------------------|--------------------|
-- | Superadmin | adminabcare             | Admin@ABCare2026   |
-- | Doctor     | doctor@abcclinic.com    | Doctor@ABC2026!    |
-- | Staff      | staff@abcclinic.com     | Staff@ABC2026!     |
-- ============================================================
-- IMPORTANT: Change all passwords after first login!
-- ============================================================

-- ============================================================
-- 11. APPOINTMENT LIFECYCLE TABLES (added in overhaul)
-- ============================================================

-- Appointment tokens for patient confirmation links
CREATE TABLE IF NOT EXISTS appointment_tokens (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  token_hash     TEXT NOT NULL UNIQUE,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  expires_at     TIMESTAMP NOT NULL,
  used           BOOLEAN NOT NULL DEFAULT FALSE,
  used_at        TIMESTAMP,
  action_taken   TEXT CHECK (action_taken IN ('confirmed', 'cancelled', 'reschedule_requested')),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_tokens_hash ON appointment_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_appt_tokens_appointment ON appointment_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_tokens_expires ON appointment_tokens(expires_at) WHERE used = false;

-- Immutable appointment status audit log
CREATE TABLE IF NOT EXISTS appointment_status_log (
  id             SERIAL PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id),
  old_status     TEXT NOT NULL,
  new_status     TEXT NOT NULL,
  changed_by     TEXT,
  changed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_reason  TEXT,
  ip_address     INET
);

CREATE INDEX IF NOT EXISTS idx_appt_status_log_appt ON appointment_status_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_status_log_changed_at ON appointment_status_log(changed_at DESC);

-- SMS delivery log
CREATE TABLE IF NOT EXISTS sms_log (
  id             SERIAL PRIMARY KEY,
  appointment_id TEXT REFERENCES appointments(id),
  phone_number   TEXT NOT NULL,
  message_type   TEXT NOT NULL,
  sent_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status         TEXT,
  provider_ref   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sms_log_appointment ON sms_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_sent_at ON sms_log(sent_at DESC);

-- Daily AI briefings
CREATE TABLE IF NOT EXISTS daily_briefings (
  id             SERIAL PRIMARY KEY,
  briefing_date  DATE NOT NULL UNIQUE,
  content        TEXT NOT NULL,
  generated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(briefing_date DESC);

-- Doctor availability schedules
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  doctor_id             TEXT NOT NULL REFERENCES admin_users(id),
  day_of_week           INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_patients_per_slot INTEGER NOT NULL DEFAULT 1,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);

-- Schedule blocks (holidays, leave)
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  doctor_id  TEXT NOT NULL REFERENCES admin_users(id),
  block_date DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks(block_date);

-- FAQ entries
CREATE TABLE IF NOT EXISTS faq_entries (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category   TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  is_draft   BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faq_active ON faq_entries(is_active);

-- Default FAQ entries
INSERT INTO faq_entries (category, question, answer, sort_order, is_active) VALUES
('Appointments', 'How do I book an appointment?', 'You can book an appointment by visiting our clinic reception, calling us, or using the patient portal on our clinic tablet.', 1, true),
('Appointments', 'What happens if I miss my appointment?', 'If you miss your appointment, our staff will reach out via SMS to help you reschedule. We understand things come up — just let us know.', 2, true),
('Clinic Hours', 'What are your clinic hours?', 'ABC MD Medical Clinic is open Monday to Friday, 9:00 AM to 5:00 PM, and Saturday 9:00 AM to 12:00 PM.', 3, true),
('Services', 'What services does the clinic offer?', 'We offer general consultations, follow-up care, prescription management, and basic laboratory referrals.', 4, true),
('Records', 'Can I get a copy of my medical records?', 'Yes. Please visit the clinic reception with a valid ID. Records are prepared within 3-5 business days.', 5, true),
('Fees', 'How much does a consultation cost?', 'Consultation fees vary. Please contact our reception for the current fee schedule.', 6, true),
('Prescriptions', 'Can I get a prescription refill without a visit?', 'Prescription refills require a consultation with the doctor. Please schedule an appointment.', 7, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. AUTH AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details    JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id    ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- ============================================================
-- 13. SESSION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS session_tokens (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id    TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked    BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id    ON session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_token_hash ON session_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires_at ON session_tokens(expires_at);

-- ============================================================
-- 14. MEDICAL CHARTS BACKUP (OCR legacy table)
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_charts_backup (
  id               TEXT,
  patient_id       TEXT,
  visit_date       TEXT,
  document_type    TEXT,
  diagnosis        TEXT,
  treatment_plan   TEXT,
  notes            TEXT,
  custom_fields    JSONB,
  metadata         JSONB,
  confidence_score REAL,
  reviewed         BOOLEAN,
  reviewer_notes   TEXT,
  raw_ocr_text     TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Quick reference:
--   Tables: admin_users, audit_logs, auth_audit_log, session_tokens,
--           patients, patient_medical_history, consultation_records,
--           chart_images, procedures, prescriptions, queue,
--           appointments, appointment_tokens, appointment_status_log,
--           sms_log, daily_briefings, doctor_schedules, schedule_blocks,
--           faq_entries, medical_charts_backup
--
-- Default login credentials (CHANGE AFTER FIRST LOGIN):
--   Superadmin : adminabcare            / Admin@ABCare2026
--   Doctor     : doctor@abcclinic.com   / Doctor@ABC2026!
--   Staff      : staff@abcclinic.com    / Staff@ABC2026!
-- ============================================================
