#!/bin/bash

# ============================================
# MediFlow AI - Security Check Script
# ============================================
# Run this before pushing to GitHub
# Usage: bash security-check.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     MediFlow AI - Pre-Push Security Check                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# ============================================
# 1. Check for .env files
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking for .env files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILES=$(find . -name ".env" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)

if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}✗ CRITICAL: .env files found!${NC}"
    echo "$ENV_FILES"
    echo "   → These files contain secrets and must NOT be committed"
    echo "   → Verify .env is in .gitignore"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No .env files found in git${NC}"
fi

# Check if .env is properly ignored
if git check-ignore .env > /dev/null 2>&1; then
    echo -e "${GREEN}✓ .env is properly ignored by git${NC}"
else
    echo -e "${RED}✗ CRITICAL: .env is NOT in .gitignore!${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================
# 2. Check for credential files
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking for credential files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CRED_FILES=$(find . \( -name "*credential*" -o -name "*secret*.json" -o -name "token.json" -o -name "auth.json" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -name "*.example*" \
    -not -name "*.sample*" \
    2>/dev/null || true)

if [ -n "$CRED_FILES" ]; then
    echo -e "${RED}✗ CRITICAL: Credential files found!${NC}"
    echo "$CRED_FILES"
    echo "   → These files must be added to .gitignore"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No credential files found${NC}"
fi

echo ""

# ============================================
# 3. Check for Google OAuth files
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking for Google OAuth files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GOOGLE_FILES=$(find . -name "client_secret*.json" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)

if [ -n "$GOOGLE_FILES" ]; then
    echo -e "${RED}✗ CRITICAL: Google OAuth client secret files found!${NC}"
    echo "$GOOGLE_FILES"
    echo "   → These contain OAuth secrets and must NOT be committed"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No Google OAuth secret files found${NC}"
fi

if [ -d "google JSON" ]; then
    echo -e "${YELLOW}⚠ WARNING: 'google JSON' directory exists${NC}"
    echo "   → Ensure this is in .gitignore"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================
# 4. Check for SQL dumps
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking for SQL dumps and backups..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SQL_FILES=$(find . -name "*.sql" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./database/auth_schema.sql" \
    2>/dev/null || true)

if [ -n "$SQL_FILES" ]; then
    echo -e "${RED}✗ CRITICAL: SQL dump files found!${NC}"
    echo "$SQL_FILES"
    echo "   → These may contain patient data (PHI)"
    echo "   → SQL dumps must NOT be committed"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No SQL dump files found${NC}"
fi

echo ""

# ============================================
# 5. Check for API keys in code
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Scanning for hardcoded API keys..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for Gemini API keys (start with AIza)
GEMINI_KEYS=$(grep -r "AIza[0-9A-Za-z_-]\{35\}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude="*.md" \
    2>/dev/null || true)

if [ -n "$GEMINI_KEYS" ]; then
    echo -e "${RED}✗ CRITICAL: Gemini API keys found in code!${NC}"
    echo "$GEMINI_KEYS"
    echo "   → API keys must be in .env, not hardcoded"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No Gemini API keys found in code${NC}"
fi

# Check for generic API key patterns
API_PATTERNS=$(grep -r "api[_-]key.*=.*['\"][a-zA-Z0-9]\{20,\}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude=".env.example" \
    --exclude="*.md" \
    2>/dev/null || true)

if [ -n "$API_PATTERNS" ]; then
    echo -e "${YELLOW}⚠ WARNING: Possible API keys found in code${NC}"
    echo "$API_PATTERNS"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================
# 6. Check for hardcoded secrets
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Scanning for hardcoded secrets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for JWT secrets
JWT_SECRETS=$(grep -r "JWT_SECRET.*=.*['\"][a-f0-9]\{32,\}" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude=".env.example" \
    --exclude="*.md" \
    2>/dev/null || true)

if [ -n "$JWT_SECRETS" ]; then
    echo -e "${RED}✗ CRITICAL: JWT secrets found in code!${NC}"
    echo "$JWT_SECRETS"
    echo "   → JWT secrets must be in .env, not hardcoded"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No JWT secrets found in code${NC}"
fi

# Check for database URLs with passwords
DB_URLS=$(grep -r "postgresql://.*:.*@" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude=".env.example" \
    --exclude="*.md" \
    2>/dev/null || true)

if [ -n "$DB_URLS" ]; then
    echo -e "${RED}✗ CRITICAL: Database URLs with passwords found!${NC}"
    echo "$DB_URLS"
    echo "   → Database URLs must be in .env, not hardcoded"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No database URLs with passwords found${NC}"
fi

echo ""

# ============================================
# 7. Check for sensitive email addresses
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking for real email addresses..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EMAILS=$(grep -r "@gmail.com\|@yahoo.com\|@hotmail.com\|@outlook.com" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude=".env.example" \
    --exclude="GITHUB-SECURITY.md" \
    --exclude="SETUP-*.md" \
    2>/dev/null || true)

if [ -n "$EMAILS" ]; then
    echo -e "${YELLOW}⚠ WARNING: Real email addresses found${NC}"
    echo "$EMAILS"
    echo "   → Consider using example emails (admin@example.com)"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No real email addresses found${NC}"
fi

echo ""

# ============================================
# 8. Check for large files (may contain data)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Checking for large files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LARGE_FILES=$(find . -type f -size +1M \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    2>/dev/null || true)

if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠ WARNING: Large files found (>1MB)${NC}"
    echo "$LARGE_FILES"
    echo "   → Verify these don't contain patient data"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No large files found${NC}"
fi

echo ""

# ============================================
# 9. Check git status
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. Checking git status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Files to be committed:"
    git diff --cached --name-only
    echo ""
    
    # Check if .env is staged
    if git diff --cached --name-only | grep -q "^\.env$"; then
        echo -e "${RED}✗ CRITICAL: .env is staged for commit!${NC}"
        echo "   → Run: git reset HEAD .env"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository${NC}"
fi

echo ""

# ============================================
# 10. Summary
# ============================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    SECURITY CHECK SUMMARY                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your repository appears safe to push to GitHub."
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS WARNING(S) FOUND${NC}"
    echo ""
    echo "Review the warnings above before pushing."
    echo "Warnings are not critical but should be addressed."
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS CRITICAL ERROR(S) FOUND${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS WARNING(S) FOUND${NC}"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    DO NOT PUSH TO GITHUB!                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Fix all critical errors before pushing."
    echo "See GITHUB-SECURITY.md for detailed instructions."
    echo ""
    exit 1
fi
