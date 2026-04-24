-- Audit logs table
-- Run this once against your Supabase/PostgreSQL database

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id     TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  action      TEXT NOT NULL,        -- CREATE, UPDATE, DELETE, LOGIN, QUEUE_ADD, etc.
  entity_type TEXT NOT NULL,        -- patient, consultation_record, prescription, queue, etc.
  entity_id   TEXT,                 -- ID of the affected record (null for bulk actions)
  description TEXT NOT NULL,        -- Human-readable summary
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Doctor notes column on consultation_records (admin-only, not visible to staff)
ALTER TABLE consultation_records ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
