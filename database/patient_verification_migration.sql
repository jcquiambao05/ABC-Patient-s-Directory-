-- ============================================================
-- ABCare OmniFlow — Incremental Migration
-- Run this on EXISTING databases to apply all new changes
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. Patient doctor verification columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS verified_by_doctor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- 2. Procedures — remove restrictive type constraint, add description + custom_type
ALTER TABLE procedures DROP CONSTRAINT IF EXISTS procedures_procedure_type_check;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS custom_type TEXT;

-- 3. Admin users — fix reset token timezone + add created_at tracking
ALTER TABLE admin_users ALTER COLUMN reset_token_expiry TYPE TIMESTAMPTZ
  USING COALESCE(reset_token_expiry AT TIME ZONE 'Asia/Manila', NULL);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS reset_token_created_at TIMESTAMPTZ;

-- 4. Appointment status — fix constraint to match actual app values
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'confirmed', 'attended', 'no_show', 'cancelled'));

-- Done
SELECT 'Migration complete' AS status;
