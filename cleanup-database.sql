-- MediFlow Database Cleanup Script
-- Removes "Visit Update" entries and old EMR records per REFACTOR-PLAN.md
-- Run this script to clean up the database

-- ============================================
-- STEP 1: Check what will be deleted
-- ============================================

-- Count Visit Update entries
SELECT COUNT(*) as visit_update_count 
FROM medical_charts 
WHERE document_type = 'Visit Update';

-- Show Visit Update entries (for review)
SELECT id, patient_id, visit_date, document_type, notes, created_at 
FROM medical_charts 
WHERE document_type = 'Visit Update'
ORDER BY created_at DESC;

-- Count EMR records (old system)
SELECT COUNT(*) as emr_count FROM emrs;

-- Show EMR records (for review)
SELECT id, patient_id, visit_date, diagnosis, treatment_plan, created_at 
FROM emrs 
ORDER BY created_at DESC;

-- ============================================
-- STEP 2: Backup before deletion (RECOMMENDED)
-- ============================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS medical_charts_backup AS 
SELECT * FROM medical_charts WHERE document_type = 'Visit Update';

CREATE TABLE IF NOT EXISTS emrs_backup AS 
SELECT * FROM emrs;

-- Verify backups
SELECT COUNT(*) as backup_medical_charts FROM medical_charts_backup;
SELECT COUNT(*) as backup_emrs FROM emrs_backup;

-- ============================================
-- STEP 3: Delete Visit Update entries
-- ============================================

-- Delete all "Visit Update" entries from medical_charts
DELETE FROM medical_charts 
WHERE document_type = 'Visit Update';

-- Verify deletion
SELECT COUNT(*) as remaining_visit_updates 
FROM medical_charts 
WHERE document_type = 'Visit Update';

-- ============================================
-- STEP 4: Optional - Delete old EMR records
-- ============================================

-- NOTE: Only run this if you want to remove the old EMR system entirely
-- The refactor plan says to keep the table but hide from UI
-- Uncomment the line below if you want to delete all EMR records:

-- DELETE FROM emrs;

-- ============================================
-- STEP 5: Verify cleanup
-- ============================================

-- Show remaining medical charts
SELECT document_type, COUNT(*) as count 
FROM medical_charts 
GROUP BY document_type 
ORDER BY count DESC;

-- Show total counts
SELECT 
  (SELECT COUNT(*) FROM medical_charts) as total_medical_charts,
  (SELECT COUNT(*) FROM medical_charts WHERE document_type = 'Visit Update') as visit_updates,
  (SELECT COUNT(*) FROM emrs) as total_emrs;

-- ============================================
-- STEP 6: Restore from backup (if needed)
-- ============================================

-- If you need to restore, uncomment these lines:
-- INSERT INTO medical_charts SELECT * FROM medical_charts_backup;
-- INSERT INTO emrs SELECT * FROM emrs_backup;

-- ============================================
-- STEP 7: Drop backup tables (after verification)
-- ============================================

-- After verifying everything is correct, drop the backup tables:
-- DROP TABLE IF EXISTS medical_charts_backup;
-- DROP TABLE IF EXISTS emrs_backup;

-- ============================================
-- DONE!
-- ============================================
