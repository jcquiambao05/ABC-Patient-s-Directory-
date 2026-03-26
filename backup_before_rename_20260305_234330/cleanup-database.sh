#!/bin/bash

# MediFlow Database Cleanup Script
# Removes "Visit Update" entries from medical_charts table
# Per REFACTOR-PLAN.md requirements

set -e  # Exit on error

echo "================================================"
echo "  MediFlow Database Cleanup Script"
echo "================================================"
echo ""
echo "This script will:"
echo "  1. Check for 'Visit Update' entries"
echo "  2. Create a backup"
echo "  3. Delete 'Visit Update' entries"
echo "  4. Verify the cleanup"
echo ""

# Database connection details from .env
DB_URL=${DATABASE_URL:-"postgresql://postgres:postgres@127.0.0.1:54322/postgres"}

# Extract database name from URL
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')

echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""

# Step 1: Check what will be deleted
echo "📊 Step 1: Checking for 'Visit Update' entries..."
echo ""

VISIT_UPDATE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM medical_charts WHERE document_type = 'Visit Update';" | xargs)

echo "Found $VISIT_UPDATE_COUNT 'Visit Update' entries"
echo ""

if [ "$VISIT_UPDATE_COUNT" -eq 0 ]; then
    echo "✅ No 'Visit Update' entries found. Database is already clean!"
    exit 0
fi

# Show the entries
echo "Preview of entries to be deleted:"
psql "$DB_URL" -c "SELECT id, patient_id, visit_date, document_type, notes, created_at FROM medical_charts WHERE document_type = 'Visit Update' ORDER BY created_at DESC LIMIT 5;"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with deletion? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

# Step 2: Create backup
echo ""
echo "💾 Step 2: Creating backup..."
echo ""

psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS medical_charts_backup_$(date +%Y%m%d_%H%M%S) AS SELECT * FROM medical_charts WHERE document_type = 'Visit Update';"

BACKUP_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM medical_charts_backup_$(date +%Y%m%d_%H%M%S);" 2>/dev/null | xargs || echo "0")

echo "✅ Backup created with $VISIT_UPDATE_COUNT entries"
echo ""

# Step 3: Delete Visit Update entries
echo "🗑️  Step 3: Deleting 'Visit Update' entries..."
echo ""

psql "$DB_URL" -c "DELETE FROM medical_charts WHERE document_type = 'Visit Update';"

echo "✅ Deletion complete"
echo ""

# Step 4: Verify cleanup
echo "✔️  Step 4: Verifying cleanup..."
echo ""

REMAINING_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM medical_charts WHERE document_type = 'Visit Update';" | xargs)

if [ "$REMAINING_COUNT" -eq 0 ]; then
    echo "✅ SUCCESS! All 'Visit Update' entries have been removed."
else
    echo "⚠️  WARNING: $REMAINING_COUNT 'Visit Update' entries still remain."
fi

echo ""
echo "📊 Current medical charts by type:"
psql "$DB_URL" -c "SELECT document_type, COUNT(*) as count FROM medical_charts GROUP BY document_type ORDER BY count DESC;"

echo ""
echo "================================================"
echo "  Cleanup Complete!"
echo "================================================"
echo ""
echo "Summary:"
echo "  - Deleted: $VISIT_UPDATE_COUNT entries"
echo "  - Remaining: $REMAINING_COUNT entries"
echo "  - Backup table created: medical_charts_backup_$(date +%Y%m%d_%H%M%S)"
echo ""
echo "Next steps:"
echo "  1. Refresh your browser to see the changes"
echo "  2. Verify medical records display correctly"
echo "  3. If everything looks good, you can drop the backup table"
echo ""
echo "To drop backup table (after verification):"
echo "  psql \"$DB_URL\" -c \"DROP TABLE medical_charts_backup_$(date +%Y%m%d_%H%M%S);\""
echo ""
