# ============================================
# MediFlow AI - Security Check Script (Windows)
# ============================================
# Run this before pushing to GitHub
# Usage: powershell -ExecutionPolicy Bypass -File security-check.ps1

$ErrorActionPreference = "Continue"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     MediFlow AI - Pre-Push Security Check                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0
$WARNINGS = 0

# ============================================
# 1. Check for .env files
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "1. Checking for .env files..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$envFiles = Get-ChildItem -Path . -Filter ".env" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.git" }

if ($envFiles) {
    Write-Host "✗ CRITICAL: .env files found!" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Red }
    Write-Host "   → These files contain secrets and must NOT be committed" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No .env files found in git" -ForegroundColor Green
}

# Check if .env is properly ignored
$gitIgnoreCheck = git check-ignore .env 2>$null
if ($gitIgnoreCheck) {
    Write-Host "✓ .env is properly ignored by git" -ForegroundColor Green
} else {
    Write-Host "✗ CRITICAL: .env is NOT in .gitignore!" -ForegroundColor Red
    $ERRORS++
}

Write-Host ""

# ============================================
# 2. Check for credential files
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "2. Checking for credential files..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$credFiles = Get-ChildItem -Path . -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        ($_.Name -like "*credential*" -or $_.Name -like "*secret*.json" -or $_.Name -eq "token.json" -or $_.Name -eq "auth.json") -and
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git" -and
        $_.Name -notlike "*.example*" -and
        $_.Name -notlike "*.sample*"
    }

if ($credFiles) {
    Write-Host "✗ CRITICAL: Credential files found!" -ForegroundColor Red
    $credFiles | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Red }
    Write-Host "   → These files must be added to .gitignore" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No credential files found" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 3. Check for Google OAuth files
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "3. Checking for Google OAuth files..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$googleFiles = Get-ChildItem -Path . -Filter "client_secret*.json" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.git" }

if ($googleFiles) {
    Write-Host "✗ CRITICAL: Google OAuth client secret files found!" -ForegroundColor Red
    $googleFiles | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Red }
    Write-Host "   → These contain OAuth secrets and must NOT be committed" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No Google OAuth secret files found" -ForegroundColor Green
}

if (Test-Path "google JSON") {
    Write-Host "⚠ WARNING: 'google JSON' directory exists" -ForegroundColor Yellow
    Write-Host "   → Ensure this is in .gitignore" -ForegroundColor Yellow
    $WARNINGS++
}

Write-Host ""

# ============================================
# 4. Check for SQL dumps
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "4. Checking for SQL dumps and backups..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$sqlFiles = Get-ChildItem -Path . -Filter "*.sql" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git" -and
        $_.FullName -notmatch "database\\auth_schema.sql"
    }

if ($sqlFiles) {
    Write-Host "✗ CRITICAL: SQL dump files found!" -ForegroundColor Red
    $sqlFiles | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Red }
    Write-Host "   → These may contain patient data (PHI)" -ForegroundColor Yellow
    Write-Host "   → SQL dumps must NOT be committed" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No SQL dump files found" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 5. Check for API keys in code
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "5. Scanning for hardcoded API keys..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$geminiKeys = Select-String -Path . -Pattern "AIza[0-9A-Za-z_-]{35}" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Path -notmatch "node_modules" -and 
        $_.Path -notmatch "\.git" -and
        $_.Path -notmatch "\.md$"
    }

if ($geminiKeys) {
    Write-Host "✗ CRITICAL: Gemini API keys found in code!" -ForegroundColor Red
    $geminiKeys | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    Write-Host "   → API keys must be in .env, not hardcoded" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No Gemini API keys found in code" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 6. Check for hardcoded secrets
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "6. Scanning for hardcoded secrets..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$jwtSecrets = Select-String -Path . -Pattern "JWT_SECRET.*=.*['\`"][a-f0-9]{32,}" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Path -notmatch "node_modules" -and 
        $_.Path -notmatch "\.git" -and
        $_.Path -notmatch "\.env\.example" -and
        $_.Path -notmatch "\.md$"
    }

if ($jwtSecrets) {
    Write-Host "✗ CRITICAL: JWT secrets found in code!" -ForegroundColor Red
    $jwtSecrets | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    Write-Host "   → JWT secrets must be in .env, not hardcoded" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No JWT secrets found in code" -ForegroundColor Green
}

$dbUrls = Select-String -Path . -Pattern "postgresql://.*:.*@" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Path -notmatch "node_modules" -and 
        $_.Path -notmatch "\.git" -and
        $_.Path -notmatch "\.env\.example" -and
        $_.Path -notmatch "\.md$"
    }

if ($dbUrls) {
    Write-Host "✗ CRITICAL: Database URLs with passwords found!" -ForegroundColor Red
    $dbUrls | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    Write-Host "   → Database URLs must be in .env, not hardcoded" -ForegroundColor Yellow
    $ERRORS++
} else {
    Write-Host "✓ No database URLs with passwords found" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 7. Check for sensitive email addresses
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "7. Checking for real email addresses..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$emails = Select-String -Path . -Pattern "@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Path -notmatch "node_modules" -and 
        $_.Path -notmatch "\.git" -and
        $_.Path -notmatch "\.env\.example" -and
        $_.Path -notmatch "GITHUB-SECURITY\.md" -and
        $_.Path -notmatch "SETUP-.*\.md"
    }

if ($emails) {
    Write-Host "⚠ WARNING: Real email addresses found" -ForegroundColor Yellow
    $emails | Select-Object -First 5 | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Yellow }
    Write-Host "   → Consider using example emails (admin@example.com)" -ForegroundColor Yellow
    $WARNINGS++
} else {
    Write-Host "✓ No real email addresses found" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 8. Check for large files
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "8. Checking for large files..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$largeFiles = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Length -gt 1MB -and
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git"
    }

if ($largeFiles) {
    Write-Host "⚠ WARNING: Large files found (>1MB)" -ForegroundColor Yellow
    $largeFiles | ForEach-Object { Write-Host "   $($_.FullName) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor Yellow }
    Write-Host "   → Verify these don't contain patient data" -ForegroundColor Yellow
    $WARNINGS++
} else {
    Write-Host "✓ No large files found" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 9. Check git status
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "9. Checking git status..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$gitCheck = git rev-parse --git-dir 2>$null
if ($gitCheck) {
    Write-Host "Files to be committed:" -ForegroundColor White
    git diff --cached --name-only
    Write-Host ""
    
    $stagedEnv = git diff --cached --name-only | Select-String -Pattern "^\.env$"
    if ($stagedEnv) {
        Write-Host "✗ CRITICAL: .env is staged for commit!" -ForegroundColor Red
        Write-Host "   → Run: git reset HEAD .env" -ForegroundColor Yellow
        $ERRORS++
    }
} else {
    Write-Host "⚠ Not a git repository" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 10. Summary
# ============================================
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    SECURITY CHECK SUMMARY                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($ERRORS -eq 0 -and $WARNINGS -eq 0) {
    Write-Host "✓ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your repository appears safe to push to GitHub." -ForegroundColor White
    Write-Host ""
    exit 0
} elseif ($ERRORS -eq 0) {
    Write-Host "⚠ $WARNINGS WARNING(S) FOUND" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Review the warnings above before pushing." -ForegroundColor White
    Write-Host "Warnings are not critical but should be addressed." -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "✗ $ERRORS CRITICAL ERROR(S) FOUND" -ForegroundColor Red
    Write-Host "⚠ $WARNINGS WARNING(S) FOUND" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║                    DO NOT PUSH TO GITHUB!                  ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix all critical errors before pushing." -ForegroundColor White
    Write-Host "See GITHUB-SECURITY.md for detailed instructions." -ForegroundColor White
    Write-Host ""
    exit 1
}
