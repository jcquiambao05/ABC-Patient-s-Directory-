#!/usr/bin/env python3
"""
MediFlow Database Cleanup Script
Removes "Visit Update" entries from medical_charts table
Per REFACTOR-PLAN.md requirements
"""

import os
import sys
from datetime import datetime
import psycopg2
from psycopg2 import sql

def get_db_connection():
    """Get database connection from environment variable"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        sys.exit(1)

def check_visit_updates(conn):
    """Check how many Visit Update entries exist"""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM medical_charts WHERE document_type = 'Visit Update'")
    count = cursor.fetchone()[0]
    cursor.close()
    return count

def show_visit_updates(conn, limit=10):
    """Show Visit Update entries"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, patient_id, visit_date, document_type, notes, created_at 
        FROM medical_charts 
        WHERE document_type = 'Visit Update' 
        ORDER BY created_at DESC 
        LIMIT %s
    """, (limit,))
    
    rows = cursor.fetchall()
    cursor.close()
    return rows

def create_backup(conn):
    """Create backup table before deletion"""
    cursor = conn.cursor()
    backup_table = f"medical_charts_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    cursor.execute(sql.SQL("""
        CREATE TABLE {} AS 
        SELECT * FROM medical_charts 
        WHERE document_type = 'Visit Update'
    """).format(sql.Identifier(backup_table)))
    
    conn.commit()
    cursor.close()
    return backup_table

def delete_visit_updates(conn):
    """Delete all Visit Update entries"""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medical_charts WHERE document_type = 'Visit Update'")
    deleted_count = cursor.rowcount
    conn.commit()
    cursor.close()
    return deleted_count

def show_summary(conn):
    """Show summary of medical charts by type"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT document_type, COUNT(*) as count 
        FROM medical_charts 
        GROUP BY document_type 
        ORDER BY count DESC
    """)
    
    rows = cursor.fetchall()
    cursor.close()
    return rows

def main():
    print("=" * 60)
    print("  MediFlow Database Cleanup Script")
    print("=" * 60)
    print()
    print("This script will remove 'Visit Update' entries from medical_charts")
    print()
    
    # Connect to database
    print("📡 Connecting to database...")
    conn = get_db_connection()
    print("✅ Connected successfully")
    print()
    
    # Step 1: Check for Visit Update entries
    print("📊 Step 1: Checking for 'Visit Update' entries...")
    count = check_visit_updates(conn)
    print(f"Found {count} 'Visit Update' entries")
    print()
    
    if count == 0:
        print("✅ No 'Visit Update' entries found. Database is already clean!")
        conn.close()
        return
    
    # Show preview
    print("Preview of entries to be deleted:")
    print("-" * 60)
    entries = show_visit_updates(conn, limit=5)
    for entry in entries:
        print(f"  ID: {entry[0]}")
        print(f"  Patient: {entry[1]}")
        print(f"  Date: {entry[2]}")
        print(f"  Type: {entry[3]}")
        print(f"  Notes: {entry[4]}")
        print(f"  Created: {entry[5]}")
        print("-" * 60)
    
    if len(entries) < count:
        print(f"  ... and {count - len(entries)} more entries")
        print("-" * 60)
    print()
    
    # Ask for confirmation
    response = input("Do you want to proceed with deletion? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("❌ Cleanup cancelled.")
        conn.close()
        return
    
    # Step 2: Create backup
    print()
    print("💾 Step 2: Creating backup...")
    try:
        backup_table = create_backup(conn)
        print(f"✅ Backup created: {backup_table}")
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        conn.close()
        return
    print()
    
    # Step 3: Delete Visit Update entries
    print("🗑️  Step 3: Deleting 'Visit Update' entries...")
    try:
        deleted_count = delete_visit_updates(conn)
        print(f"✅ Deleted {deleted_count} entries")
    except Exception as e:
        print(f"❌ Error deleting entries: {e}")
        conn.rollback()
        conn.close()
        return
    print()
    
    # Step 4: Verify cleanup
    print("✔️  Step 4: Verifying cleanup...")
    remaining = check_visit_updates(conn)
    
    if remaining == 0:
        print("✅ SUCCESS! All 'Visit Update' entries have been removed.")
    else:
        print(f"⚠️  WARNING: {remaining} 'Visit Update' entries still remain.")
    print()
    
    # Show summary
    print("📊 Current medical charts by type:")
    print("-" * 60)
    summary = show_summary(conn)
    for doc_type, doc_count in summary:
        print(f"  {doc_type}: {doc_count}")
    print("-" * 60)
    print()
    
    # Close connection
    conn.close()
    
    # Final summary
    print("=" * 60)
    print("  Cleanup Complete!")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  - Deleted: {deleted_count} entries")
    print(f"  - Remaining: {remaining} entries")
    print(f"  - Backup table: {backup_table}")
    print()
    print("Next steps:")
    print("  1. Refresh your browser to see the changes")
    print("  2. Verify medical records display correctly")
    print("  3. If everything looks good, you can drop the backup table")
    print()
    print("To drop backup table (after verification):")
    print(f"  psql \"$DATABASE_URL\" -c \"DROP TABLE {backup_table};\"")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cleanup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)
