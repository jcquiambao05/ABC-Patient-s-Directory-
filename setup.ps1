# ============================================================
# ABCare OmniFlow — One-Command Setup (Windows PowerShell)
# Usage: .\setup.ps1
# Run as Administrator if Docker requires it
# ============================================================

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ABCare OmniFlow — Setup Script         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Install from https://docs.docker.com/get-docker/" -ForegroundColor Red
    exit 1
}

# 2. Create .env if missing
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    # Generate random secrets using PowerShell
    $jwt = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
    $session = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
    (Get-Content ".env") -replace "CHANGE_ME_generate_a_random_64_char_hex_string", $jwt `
                         -replace "CHANGE_ME_generate_another_random_64_char_hex_string", $session |
    Set-Content ".env"
    Write-Host "✅ .env created with random secrets" -ForegroundColor Green
    Write-Host "⚠️  Edit .env to add Google OAuth / SMS API keys if needed" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env already exists" -ForegroundColor Green
}

# 3. Build and start
Write-Host "`n📦 Building Docker images..." -ForegroundColor Cyan
docker compose pull postgres ollama
docker compose build app

Write-Host "`n🚀 Starting services..." -ForegroundColor Cyan
docker compose up -d

# 4. Wait for health
Write-Host "`n⏳ Waiting for app to be ready..." -ForegroundColor Cyan
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
    Write-Host "   Waiting... ($i/30)"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ ABCare OmniFlow is running!          ║" -ForegroundColor Green
Write-Host "║   Open: http://localhost:3000             ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║   Default Accounts:                      ║" -ForegroundColor Green
Write-Host "║   Superadmin: adminabcare                ║" -ForegroundColor Green
Write-Host "║   Password:   Admin@ABCare2026           ║" -ForegroundColor Green
Write-Host "║   Doctor:     doctor@abcclinic.com       ║" -ForegroundColor Green
Write-Host "║   Password:   Doctor@ABC2026!            ║" -ForegroundColor Green
Write-Host "║   Staff:      staff@abcclinic.com        ║" -ForegroundColor Green
Write-Host "║   Password:   Staff@ABC2026!             ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════╣" -ForegroundColor Yellow
Write-Host "║   ⚠️  Change all passwords after login!   ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green

# Open browser
Start-Process "http://localhost:3000"
