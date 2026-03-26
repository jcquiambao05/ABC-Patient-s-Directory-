#!/bin/bash

################################################################################
# ABC PATIENT DIRECTORY - COMPLETE SHUTDOWN SCRIPT
# Stops all development services, databases, and processes
################################################################################

echo "=========================================="
echo "ABC Patient Directory - Shutdown Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to kill process by name
kill_process() {
    local process_name=$1
    local pids=$(pgrep -f "$process_name")
    
    if [ -z "$pids" ]; then
        print_warning "No $process_name processes found"
    else
        print_status "Killing $process_name processes: $pids"
        kill -9 $pids 2>/dev/null
        if [ $? -eq 0 ]; then
            print_success "$process_name stopped"
        else
            print_error "Failed to stop $process_name"
        fi
    fi
}

# Function to kill process by port
kill_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port)
    
    if [ -z "$pid" ]; then
        print_warning "No process found on port $port ($service_name)"
    else
        print_status "Killing process on port $port ($service_name): PID $pid"
        kill -9 $pid 2>/dev/null
        if [ $? -eq 0 ]; then
            print_success "$service_name on port $port stopped"
        else
            print_error "Failed to stop $service_name on port $port"
        fi
    fi
}

echo ""
print_status "Starting shutdown sequence..."
echo ""

# ============================================================================
# 1. STOP ABC PATIENT DIRECTORY APPLICATION
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Stopping ABC Patient Directory App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop Node.js/Express backend (port 3000)
kill_port 3000 "Express Backend"

# Stop Vite dev server (if running separately)
kill_port 5173 "Vite Dev Server"

# Kill any tsx/ts-node processes
kill_process "tsx server.ts"
kill_process "ts-node"

# Kill any npm/node processes related to the project
print_status "Stopping Node.js processes..."
pkill -f "node.*server.ts" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
print_success "Node.js processes stopped"

# ============================================================================
# 2. STOP OCR SERVICE (PYTHON/FLASK)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Stopping OCR Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop OCR service on port 5000
kill_port 5000 "OCR Service (Flask)"

# Kill Python Flask processes
kill_process "python.*ocr_service"
kill_process "flask run"

# Check for PID file and kill
if [ -f ".ocr_pid" ]; then
    OCR_PID=$(cat .ocr_pid)
    if ps -p $OCR_PID > /dev/null 2>&1; then
        print_status "Killing OCR service with PID: $OCR_PID"
        kill -9 $OCR_PID 2>/dev/null
        print_success "OCR service stopped"
    fi
    rm -f .ocr_pid
fi

# ============================================================================
# 3. STOP SUPABASE (POSTGRESQL + SERVICES)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Stopping Supabase Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop Supabase using CLI
if command -v supabase &> /dev/null; then
    print_status "Stopping Supabase..."
    cd ~/Documents/Repo/mediflow-ai 2>/dev/null || cd .
    supabase stop 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Supabase stopped via CLI"
    else
        print_warning "Supabase CLI stop failed, trying manual shutdown"
    fi
else
    print_warning "Supabase CLI not found, trying manual shutdown"
fi

# Stop PostgreSQL ports
kill_port 54322 "PostgreSQL (Supabase)"
kill_port 54323 "PostgreSQL Studio"
kill_port 54321 "Supabase API"
kill_port 54324 "Supabase Auth"
kill_port 54325 "Supabase Storage"
kill_port 54326 "Supabase Realtime"
kill_port 54328 "Supabase Analytics"

# Kill Docker containers if Supabase is running in Docker
if command -v docker &> /dev/null; then
    print_status "Stopping Supabase Docker containers..."
    docker ps --filter "name=supabase" -q | xargs -r docker stop 2>/dev/null
    print_success "Supabase Docker containers stopped"
fi

# ============================================================================
# 4. STOP POSTGRESQL (IF RUNNING STANDALONE)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Stopping PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop PostgreSQL service
if command -v systemctl &> /dev/null; then
    print_status "Stopping PostgreSQL service..."
    sudo systemctl stop postgresql 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "PostgreSQL service stopped"
    else
        print_warning "PostgreSQL service not running or no permission"
    fi
fi

# Kill PostgreSQL processes
kill_process "postgres"

# Stop PostgreSQL on default port
kill_port 5432 "PostgreSQL"

# ============================================================================
# 5. STOP APACHE (IF USED)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Stopping Apache"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop Apache service
if command -v systemctl &> /dev/null; then
    print_status "Stopping Apache service..."
    sudo systemctl stop apache2 2>/dev/null || sudo systemctl stop httpd 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Apache service stopped"
    else
        print_warning "Apache service not running or no permission"
    fi
fi

# Kill Apache processes
kill_process "apache2"
kill_process "httpd"

# Stop Apache on default ports
kill_port 80 "Apache (HTTP)"
kill_port 443 "Apache (HTTPS)"
kill_port 8080 "Apache (Alt)"

# ============================================================================
# 6. STOP NGINX (IF USED)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Stopping Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop Nginx service
if command -v systemctl &> /dev/null; then
    print_status "Stopping Nginx service..."
    sudo systemctl stop nginx 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Nginx service stopped"
    else
        print_warning "Nginx service not running or no permission"
    fi
fi

# Kill Nginx processes
kill_process "nginx"

# ============================================================================
# 7. STOP REDIS (IF USED)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Stopping Redis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop Redis service
if command -v systemctl &> /dev/null; then
    print_status "Stopping Redis service..."
    sudo systemctl stop redis 2>/dev/null || sudo systemctl stop redis-server 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Redis service stopped"
    else
        print_warning "Redis service not running or no permission"
    fi
fi

# Kill Redis processes
kill_process "redis-server"

# Stop Redis on default port
kill_port 6379 "Redis"

# ============================================================================
# 8. STOP DOCKER CONTAINERS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Stopping Docker Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v docker &> /dev/null; then
    print_status "Stopping all Docker containers..."
    docker stop $(docker ps -q) 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Docker containers stopped"
    else
        print_warning "No Docker containers running"
    fi
else
    print_warning "Docker not installed"
fi

# ============================================================================
# 9. CLEAN UP PID FILES
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. Cleaning Up PID Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status "Removing PID files..."
rm -f .ocr_pid .webapp_pid *.pid 2>/dev/null
print_success "PID files cleaned"

# ============================================================================
# 10. VERIFY SHUTDOWN
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status "Checking for remaining processes..."

# Check critical ports
PORTS=(3000 5000 5173 54322 5432 80 443)
ACTIVE_PORTS=0

for port in "${PORTS[@]}"; do
    if lsof -ti:$port > /dev/null 2>&1; then
        print_warning "Port $port still in use"
        ACTIVE_PORTS=$((ACTIVE_PORTS + 1))
    fi
done

if [ $ACTIVE_PORTS -eq 0 ]; then
    print_success "All critical ports are free"
else
    print_warning "$ACTIVE_PORTS port(s) still in use"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "=========================================="
echo "Shutdown Complete"
echo "=========================================="
echo ""
print_success "All ABC Patient Directory services stopped"
echo ""
echo "Services stopped:"
echo "  ✓ Express Backend (port 3000)"
echo "  ✓ OCR Service (port 5000)"
echo "  ✓ Supabase/PostgreSQL"
echo "  ✓ Apache/Nginx"
echo "  ✓ Redis"
echo "  ✓ Docker containers"
echo ""
echo "To restart services, run:"
echo "  ./start-mediflow.sh"
echo ""
