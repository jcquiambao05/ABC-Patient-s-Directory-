-- ============================================================
-- SUPERADMIN OVERHAUL MIGRATION
-- Run this against your Supabase/PostgreSQL database
-- ============================================================

-- 1. Expand role constraint to include superadmin
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('staff', 'admin', 'superadmin'));

-- 2. Add display_name column (shown in UI instead of email)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. Soft-delete / archive columns for patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- 4. Create the superadmin account (username: adminabcare, temp password: Admin@ABCare2026)
--    Change this password immediately after first login via Settings > Change Password
INSERT INTO admin_users (
  id, email, name, display_name, password_hash, role,
  mfa_enabled, failed_login_attempts, created_at
)
VALUES (
  'superadmin-001',
  'adminabcare@abclinic.local',
  'Super Admin',
  'Super Admin',
  '$2b$12$C2OVqQFQJc38IJ.dw.NBhOXf3/kZtcL4InN5oBcqhA36X4LgsYftC',
  'superadmin',
  FALSE,
  0,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  display_name = 'Super Admin',
  name = 'Super Admin',
  password_hash = '$2b$12$C2OVqQFQJc38IJ.dw.NBhOXf3/kZtcL4InN5oBcqhA36X4LgsYftC',
  mfa_enabled = FALSE,
  failed_login_attempts = 0,
  locked_until = NULL;

-- Temp password is: Admin@ABCare2026
-- Login with username: adminabcare  password: Admin@ABCare2026
-- Change it immediately in Settings after first login.

-- 5. Index for archived patients
CREATE INDEX IF NOT EXISTS idx_patients_archived ON patients(archived);
CREATE INDEX IF NOT EXISTS idx_patients_archived_at ON patients(archived_at DESC);
