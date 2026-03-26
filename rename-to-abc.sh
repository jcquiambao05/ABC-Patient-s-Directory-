#!/bin/bash

# Safe Renaming Script: MediFlow → ABC Patient Directory
# This script renames all occurrences while preserving system functionality

echo "🔄 Starting safe rename: MediFlow → ABC Patient Directory"
echo "=================================================="

# Create backup
BACKUP_DIR="backup_before_rename_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Backup critical files
cp -r .kiro/specs "$BACKUP_DIR/"
cp server.ts "$BACKUP_DIR/"
cp src/components/App.tsx "$BACKUP_DIR/"
cp src/components/Login.tsx "$BACKUP_DIR/"
cp ocr_service_simple.py "$BACKUP_DIR/"
cp *.md "$BACKUP_DIR/" 2>/dev/null || true
cp *.sh "$BACKUP_DIR/" 2>/dev/null || true

echo "✅ Backup created"
echo ""

# Function to safely replace in file
safe_replace() {
    local file="$1"
    local search="$2"
    local replace="$3"
    
    if [ -f "$file" ]; then
        # Use sed with backup
        sed -i.bak "s/$search/$replace/g" "$file"
        rm -f "$file.bak"
        echo "  ✓ Updated: $file"
    fi
}

echo "📝 Renaming in documentation files..."
echo "--------------------------------------"

# Documentation files - Replace "MediFlow" with "ABC Patient Directory"
for file in .kiro/specs/mediflow-production-enhancements/*.md; do
    if [ -f "$file" ]; then
        safe_replace "$file" "MediFlow AI" "ABC Patient Directory"
        safe_replace "$file" "MediFlow" "ABC Patient Directory"
    fi
done

# Root documentation files
for file in *.md; do
    if [ -f "$file" ]; then
        safe_replace "$file" "MediFlow AI" "ABC Patient Directory"
        safe_replace "$file" "MediFlow" "ABC Patient Directory"
    fi
done

echo ""
echo "💻 Renaming in code files..."
echo "--------------------------------------"

# App.tsx - UI text only (not localStorage keys)
if [ -f "src/components/App.tsx" ]; then
    sed -i.bak "s/Hello! I am your MediFlow assistant/Hello! I am your ABC Patient Directory assistant/g" "src/components/App.tsx"
    sed -i.bak "s/MediFlow Assistant/ABC Patient Directory Assistant/g" "src/components/App.tsx"
    rm -f "src/components/App.tsx.bak"
    echo "  ✓ Updated: src/components/App.tsx"
fi

# Login.tsx - UI text only
if [ -f "src/components/Login.tsx" ]; then
    safe_replace "src/components/Login.tsx" "MediFlow AI" "ABC Patient Directory"
    safe_replace "src/components/Login.tsx" "MediFlow" "ABC Patient Directory"
fi

# server.ts - Comments only (not code)
if [ -f "server.ts" ]; then
    sed -i.bak "s/\/\/ MediFlow/\/\/ ABC Patient Directory/g" "server.ts"
    sed -i.bak "s/MediFlow AI/ABC Patient Directory/g" "server.ts"
    rm -f "server.ts.bak"
    echo "  ✓ Updated: server.ts"
fi

# OCR service - Comments only
if [ -f "ocr_service_simple.py" ]; then
    sed -i.bak 's/"""MediFlow/"""ABC Patient Directory/g' "ocr_service_simple.py"
    sed -i.bak "s/MediFlow Simple OCR Service/ABC Patient Directory OCR Service/g" "ocr_service_simple.py"
    sed -i.bak "s/print(\"MediFlow/print(\"ABC Patient Directory/g" "ocr_service_simple.py"
    rm -f "ocr_service_simple.py.bak"
    echo "  ✓ Updated: ocr_service_simple.py"
fi

# Startup scripts - Comments and echo statements
for script in start-mediflow.sh stop-mediflow.sh restart-mediflow.sh; do
    if [ -f "$script" ]; then
        sed -i.bak "s/# MediFlow/# ABC Patient Directory/g" "$script"
        sed -i.bak "s/MediFlow AI/ABC Patient Directory/g" "$script"
        sed -i.bak 's/echo ".*MediFlow/echo "🏥 ABC Patient Directory/g' "$script"
        rm -f "$script.bak"
        echo "  ✓ Updated: $script"
    fi
done

# .gitignore - Comments only
if [ -f ".gitignore" ]; then
    sed -i.bak "s/# MediFlow/# ABC Patient Directory/g" ".gitignore"
    rm -f ".gitignore.bak"
    echo "  ✓ Updated: .gitignore"
fi

echo ""
echo "🔍 Verifying critical functionality preserved..."
echo "--------------------------------------"

# Check that localStorage keys are NOT changed (critical!)
if grep -q "mediflow_auth_token" "src/components/App.tsx"; then
    echo "  ✓ localStorage keys preserved (mediflow_auth_token)"
else
    echo "  ⚠️  WARNING: localStorage key may have been changed!"
fi

# Check that database names are NOT changed
if grep -q "mediflow" "server.ts"; then
    echo "  ✓ Database references preserved"
else
    echo "  ℹ️  Note: No database name references found (this is OK)"
fi

# Check that file paths are NOT changed
if [ -f "start-mediflow.sh" ]; then
    echo "  ✓ Script filenames preserved (start-mediflow.sh)"
else
    echo "  ⚠️  WARNING: Script files may have been renamed!"
fi

echo ""
echo "📊 Summary of changes..."
echo "--------------------------------------"

# Count occurrences in key files
echo "Remaining 'MediFlow' references:"
grep -r "MediFlow" src/ .kiro/specs/ *.md *.sh 2>/dev/null | wc -l || echo "0"

echo ""
echo "✅ Renaming complete!"
echo ""
echo "📋 What was changed:"
echo "  • Documentation: MediFlow → ABC Patient Directory"
echo "  • UI text: MediFlow → ABC Patient Directory"
echo "  • Comments: MediFlow → ABC Patient Directory"
echo ""
echo "🔒 What was NOT changed (preserved for functionality):"
echo "  • localStorage keys: mediflow_auth_token"
echo "  • Script filenames: start-mediflow.sh, stop-mediflow.sh, etc."
echo "  • Database names: (if any)"
echo "  • API endpoints: (if any)"
echo ""
echo "💾 Backup location: $BACKUP_DIR"
echo ""
echo "🧪 Next steps:"
echo "  1. Test the application: npm run dev"
echo "  2. Check login functionality"
echo "  3. Verify OCR service works"
echo "  4. If issues occur, restore from: $BACKUP_DIR"
echo ""
echo "=================================================="
