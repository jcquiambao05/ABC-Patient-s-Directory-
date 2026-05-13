-- ============================================================
-- ABCare OmniFlow — Appointment Lifecycle Migration
-- Adds: token system, status machine, audit log, SMS log, daily briefings
-- Run after full_schema.sql
-- ============================================================

-- ── 1. Update appointments table with new status values ────────────────────
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'attended', 'no_show', 'cancelled'));

-- Add new columns to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (booking_type IN ('standard', 'walk_in', 'follow_up', 'patient_portal')),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT,
  ADD COLUMN IF NOT EXISTS patient_name_override TEXT;

-- Update existing appointments to new status values
UPDATE appointments SET status = 'confirmed' WHERE status = 'scheduled';
UPDATE appointments SET status = 'attended' WHERE status = 'completed';

-- ── 2. Appointment tokens table ────────────────────────────────────────────
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

-- ── 3. Appointment status audit log (immutable) ────────────────────────────
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

-- ── 4. SMS log ──────────────────────────────────────────────────────────────
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

-- ── 5. Daily briefings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_briefings (
  id             SERIAL PRIMARY KEY,
  briefing_date  DATE NOT NULL UNIQUE,
  content        TEXT NOT NULL,
  generated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(briefing_date DESC);

-- ── 6. Doctor schedules ─────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);

-- ── 7. Schedule blocks (holidays, doctor leave) ─────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  doctor_id  TEXT NOT NULL REFERENCES admin_users(id),
  block_date DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_doctor ON schedule_blocks(doctor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks(block_date);

-- ── 8. FAQ entries ──────────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_entries(category);
CREATE INDEX IF NOT EXISTS idx_faq_active ON faq_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_draft ON faq_entries(is_draft);

-- ── 9. Insert default FAQ entries ───────────────────────────────────────────
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
-- Migration complete
-- ============================================================
