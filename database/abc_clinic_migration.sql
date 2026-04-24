-- ============================================================
-- ABC Clinic Overhaul — Full Schema Migration
-- Run this against your Supabase/PostgreSQL database
-- WARNING: This drops all existing patient data
-- ============================================================

-- Step 1: Drop old tables (CASCADE removes all dependent rows/FKs)
DROP TABLE IF EXISTS medical_charts CASCADE;
DROP TABLE IF EXISTS emrs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Step 2: Add role column to admin_users (safe — uses IF NOT EXISTS)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('staff', 'admin'));

-- Step 3: Add preferences column to admin_users
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

-- Set the default admin account to admin role
UPDATE admin_users SET role = 'admin' WHERE id = 'admin-001';

-- ── Default clinic accounts (change passwords after first login) ──────────
-- Staff account: staff@abcclinic.com / Staff@ABC2026!
INSERT INTO admin_users (id, email, name, password_hash, role, mfa_enabled, failed_login_attempts)
VALUES (
  'staff-001',
  'staff@abcclinic.com',
  'Clinic Staff',
  '$2b$12$UPmu9L9wjf.Suq9Y9i0RMeAreKQws1VwEuSaKjDPJYnH0sMDsaUba',
  'staff',
  false,
  0
) ON CONFLICT (email) DO NOTHING;

-- Doctor account: doctor@abcclinic.com / Doctor@ABC2026!
INSERT INTO admin_users (id, email, name, password_hash, role, mfa_enabled, failed_login_attempts)
VALUES (
  'doctor-001',
  'doctor@abcclinic.com',
  'Clinic Doctor',
  '$2b$12$ibbfQisjl1nsnx50Xv9q0.wVa1baNl5ZdbdtsMjOqbAVg2iwPXPRa',
  'admin',
  false,
  0
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- patients
-- ============================================================
CREATE TABLE patients (
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
  created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_full_name ON patients(full_name);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- ============================================================
-- patient_medical_history (one row per patient)
-- ============================================================
CREATE TABLE patient_medical_history (
  id                                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id                          TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  past_medical                        JSONB NOT NULL DEFAULT '{}',
  maintenance_medications_text        TEXT,
  maintenance_medications_image_path  TEXT,
  travel_history                      TEXT,
  personal_social_history             JSONB NOT NULL DEFAULT '{}',
  family_history                      JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_pmh_patient_id ON patient_medical_history(patient_id);

-- ============================================================
-- consultation_records
-- ============================================================
CREATE TABLE consultation_records (
  id                           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id                   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date                         DATE NOT NULL DEFAULT CURRENT_DATE,
  subjective_clinical_findings TEXT,
  assessment_plan              TEXT,
  reviewed                     BOOLEAN NOT NULL DEFAULT FALSE,
  marked_at                    TIMESTAMP,
  reviewer_notes               TEXT,
  raw_ocr_text                 TEXT,
  confidence_score             REAL,
  created_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cr_patient_id ON consultation_records(patient_id);
CREATE INDEX idx_cr_reviewed ON consultation_records(reviewed);
CREATE INDEX idx_cr_marked_at ON consultation_records(marked_at DESC);

-- ============================================================
-- chart_images
-- ============================================================
CREATE TABLE chart_images (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ci_patient_id ON chart_images(patient_id);

-- ============================================================
-- procedures
-- ============================================================
CREATE TABLE procedures (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  patient_id        TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_type    TEXT NOT NULL CHECK (procedure_type IN ('counseling', 'surgery', 'immunization')),
  consent_form_data JSONB NOT NULL DEFAULT '{}',
  signature_path    TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_procedures_patient_id ON procedures(patient_id);

-- ============================================================
-- prescriptions
-- ============================================================
CREATE TABLE prescriptions (
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

CREATE INDEX idx_rx_patient_id ON prescriptions(patient_id);

-- ============================================================
-- queue
-- ============================================================
CREATE TABLE queue (
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

CREATE INDEX idx_queue_queued_date ON queue(queued_date);
CREATE INDEX idx_queue_archived ON queue(archived);
CREATE INDEX idx_queue_status ON queue(status);

-- ============================================================
-- audit_logs (keep existing)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  description TEXT,
  performed_by TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
