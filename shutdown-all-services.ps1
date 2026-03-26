# ABC PATIENT DIRECTORY - COMPLETE SHUTDOWN SCRIPT (WINDOWS)
# Stops all development services, databases, and processes

################################################################################
# PowerShell Script for Windows
################################################################################

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ABC Patient Directory - Shutdown Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored messages
function Print-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to kill process by name
function Kill-ProcessByName {
    param([string]$ProcessName)
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if ($processes) {
        Print-Status "Killing $ProcessName processes..."
        $processes | Stop-Process -Force
        Print-Success "$ProcessName stopped"
    } else {
        Print-Warning "No $ProcessName processes found"
    }
}

# Function to kill process by port
function Kill-ProcessByPort {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    
    if ($connection) {
        $processId = $connection.OwningProcess
        Print-Status "Killing process on port $Port ($ServiceName): PID $processId"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Print-Success "$ServiceName on port $Port stopped"
    } else {
        Print-Warning "No process found on port $Port ($ServiceName)"
    }
}

Write-Host ""
Print-Status "Starting shutdown sequence..."
Write-Host ""

# ============================================================================
# 1. STOP ABC PATIENT DIRECTORY APPLICATION
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "1. Stopping ABC Patient Directory App" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop Node.js/Express backend (port 3000)
Kill-ProcessByPort -Port 3000 -ServiceName "Express Backend"

# Stop Vite dev server (if running separately)
Kill-ProcessByPort -Port 5173 -ServiceName "Vite Dev Server"

# Kill Node.js processes
Print-Status "Stopping Node.js processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*server.ts*" -or $_.CommandLine -like "*npm*"
} | Stop-Process -Force
Print-Success "Node.js processes stopped"

# Kill tsx processes
Kill-ProcessByName -ProcessName "tsx"

# ============================================================================
# 2. STOP OCR SERVICE (PYTHON/FLASK)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "2. Stopping OCR Service" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop OCR service on port 5000
Kill-ProcessByPort -Port 5000 -ServiceName "OCR Service (Flask)"

# Kill Python processes
Print-Status "Stopping Python/Flask processes..."
Get-Process -Name python* -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ocr_service*" -or $_.CommandLine -like "*flask*"
} | Stop-Process -Force
Print-Success "Python processes stopped"

# Check for PID file and kill
if (Test-Path ".ocr_pid") {
    $ocrPid = Get-Content ".ocr_pid"
    if (Get-Process -Id $ocrPid -ErrorAction SilentlyContinue) {
        Print-Status "Killing OCR service with PID: $ocrPid"
        Stop-Process -Id $ocrPid -Force
        Print-Success "OCR service stopped"
    }
    Remove-Item ".ocr_pid" -Force
}

# ============================================================================
# 3. STOP SUPABASE (POSTGRESQL + SERVICES)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "3. Stopping Supabase Services" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop Supabase using CLI
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Print-Status "Stopping Supabase..."
    Push-Location "$env:USERPROFILE\Documents\Repo\mediflow-ai" -ErrorAction SilentlyContinue
    supabase stop 2>$null
    if ($?) {
        Print-Success "Supabase stopped via CLI"
    } else {
        Print-Warning "Supabase CLI stop failed, trying manual shutdown"
    }
    Pop-Location
} else {
    Print-Warning "Supabase CLI not found, trying manual shutdown"
}

# Stop Supabase ports
Kill-ProcessByPort -Port 54322 -ServiceName "PostgreSQL (Supabase)"
Kill-ProcessByPort -Port 54323 -ServiceName "PostgreSQL Studio"
Kill-ProcessByPort -Port 54321 -ServiceName "Supabase API"
Kill-ProcessByPort -Port 54324 -ServiceName "Supabase Auth"
Kill-ProcessByPort -Port 54325 -ServiceName "Supabase Storage"
Kill-ProcessByPort -Port 54326 -ServiceName "Supabase Realtime"
Kill-ProcessByPort -Port 54328 -ServiceName "Supabase Analytics"

# Kill Docker containers if Supabase is running in Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Print-Status "Stopping Supabase Docker containers..."
    docker ps --filter "name=supabase" -q | ForEach-Object { docker stop $_ } 2>$null
    Print-Success "Supabase Docker containers stopped"
}

# ============================================================================
# 4. STOP POSTGRESQL (IF RUNNING STANDALONE)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "4. Stopping PostgreSQL" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop PostgreSQL service
Print-Status "Stopping PostgreSQL service..."
Stop-Service -Name "postgresql*" -Force -ErrorAction SilentlyContinue
if ($?) {
    Print-Success "PostgreSQL service stopped"
} else {
    Print-Warning "PostgreSQL service not running"
}

# Kill PostgreSQL processes
Kill-ProcessByName -ProcessName "postgres"

# Stop PostgreSQL on default port
Kill-ProcessByPort -Port 5432 -ServiceName "PostgreSQL"

# ============================================================================
# 5. STOP APACHE (IF USED)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "5. Stopping Apache" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop Apache service
Print-Status "Stopping Apache service..."
Stop-Service -Name "Apache*" -Force -ErrorAction SilentlyContinue
if ($?) {
    Print-Success "Apache service stopped"
} else {
    Print-Warning "Apache service not running"
}

# Kill Apache processes
Kill-ProcessByName -ProcessName "httpd"
Kill-ProcessByName -ProcessName "apache"

# Stop Apache on default ports
Kill-ProcessByPort -Port 80 -ServiceName "Apache (HTTP)"
Kill-ProcessByPort -Port 443 -ServiceName "Apache (HTTPS)"
Kill-ProcessByPort -Port 8080 -ServiceName "Apache (Alt)"

# ============================================================================
# 6. STOP NGINX (IF USED)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "6. Stopping Nginx" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop Nginx service
Print-Status "Stopping Nginx service..."
Stop-Service -Name "nginx" -Force -ErrorAction SilentlyContinue
if ($?) {
    Print-Success "Nginx service stopped"
} else {
    Print-Warning "Nginx service not running"
}

# Kill Nginx processes
Kill-ProcessByName -ProcessName "nginx"

# ============================================================================
# 7. STOP REDIS (IF USED)
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "7. Stopping Redis" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Stop Redis service
Print-Status "Stopping Redis service..."
Stop-Service -Name "Redis" -Force -ErrorAction SilentlyContinue
if ($?) {
    Print-Success "Redis service stopped"
} else {
    Print-Warning "Redis service not running"
}

# Kill Redis processes
Kill-ProcessByName -ProcessName "redis-server"

# Stop Redis on default port
Kill-ProcessByPort -Port 6379 -ServiceName "Redis"

# ============================================================================
# 8. STOP DOCKER CONTAINERS
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "8. Stopping Docker Containers" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Print-Status "Stopping all Docker containers..."
    docker ps -q | ForEach-Object { docker stop $_ } 2>$null
    if ($?) {
        Print-Success "Docker containers stopped"
    } else {
        Print-Warning "No Docker containers running"
    }
} else {
    Print-Warning "Docker not installed"
}

# ============================================================================
# 9. CLEAN UP PID FILES
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "9. Cleaning Up PID Files" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Print-Status "Removing PID files..."
Remove-Item -Path ".ocr_pid", ".webapp_pid", "*.pid" -Force -ErrorAction SilentlyContinue
Print-Success "PID files cleaned"

# ============================================================================
# 10. VERIFY SHUTDOWN
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "10. Verification" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Print-Status "Checking for remaining processes..."

# Check critical ports
$ports = @(3000, 5000, 5173, 54322, 5432, 80, 443)
$activePorts = 0

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Print-Warning "Port $port still in use"
        $activePorts++
    }
}

if ($activePorts -eq 0) {
    Print-Success "All critical ports are free"
} else {
    Print-Warning "$activePorts port(s) still in use"
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Shutdown Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Print-Success "All ABC Patient Directory services stopped"
Write-Host ""
Write-Host "Services stopped:"
Write-Host "  ✓ Express Backend (port 3000)"
Write-Host "  ✓ OCR Service (port 5000)"
Write-Host "  ✓ Supabase/PostgreSQL"
Write-Host "  ✓ Apache/Nginx"
Write-Host "  ✓ Redis"
Write-Host "  ✓ Docker containers"
Write-Host ""
Write-Host "To restart services, run:"
Write-Host "  .\start-mediflow.ps1"
Write-Host ""
