-- ============================================================
-- MIGRATION: Add vitals JSONB column to consultation_records
-- Run once against Supabase / local PostgreSQL
-- ============================================================

ALTER TABLE consultation_records
  ADD COLUMN IF NOT EXISTS vitals JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN consultation_records.vitals IS
  'Structured vitals snapshot per consultation: {bp_systolic, bp_diastolic, temp_celsius, heart_rate, spo2, weight_kg, height_cm}';

-- Index for future analytics queries (e.g. BP trend across visits)
CREATE INDEX IF NOT EXISTS idx_cr_vitals ON consultation_records USING gin(vitals);
