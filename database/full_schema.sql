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
  reset_token_expiry    TIMESTAMP,
  password_changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- OAuth
  google_id             TEXT UNIQUE,

  -- Audit
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role  ON admin_users(role);

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
  procedure_type    TEXT NOT NULL CHECK (procedure_type IN ('counseling', 'surgery', 'immunization')),
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
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled')),
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
