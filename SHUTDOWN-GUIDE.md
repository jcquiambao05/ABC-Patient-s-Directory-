# ABC PATIENT DIRECTORY - SHUTDOWN GUIDE

Complete guide for shutting down all development services and processes.

---

## QUICK START

### Linux/Mac
```bash
./shutdown-all-services.sh
```

### Windows
```powershell
.\shutdown-all-services.ps1
```

---

## WHAT GETS SHUT DOWN

### 1. ABC Patient Directory Application
- **Express Backend** (port 3000)
- **Vite Dev Server** (port 5173)
- **Node.js processes** (tsx, ts-node, npm)
- **React frontend** (if running separately)

### 2. OCR Service
- **Python Flask server** (port 5000)
- **Tesseract OCR processes**
- **Python worker processes**

### 3. Database Services
- **Supabase** (ports 54321-54328)
  - PostgreSQL (54322)
  - Studio (54323)
  - API (54321)
  - Auth (54324)
  - Storage (54325)
  - Realtime (54326)
  - Analytics (54328)
- **PostgreSQL standalone** (port 5432)

### 4. Web Servers
- **Apache** (ports 80, 443, 8080)
- **Nginx** (ports 80, 443)

### 5. Cache/Queue Services
- **Redis** (port 6379)

### 6. Container Services
- **Docker containers** (all running containers)

### 7. Cleanup
- **PID files** (.ocr_pid, .webapp_pid, *.pid)
- **Temporary processes**

---

## MANUAL SHUTDOWN (IF SCRIPT FAILS)

### Stop Individual Services

#### 1. Stop Express Backend
```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Or by process name
pkill -f "tsx server.ts"
pkill -f "node.*server.ts"
```

#### 2. Stop OCR Service
```bash
# Find process on port 5000
lsof -ti:5000 | xargs kill -9

# Or by process name
pkill -f "python.*ocr_service"

# Using PID file
kill -9 $(cat .ocr_pid)
rm .ocr_pid
```

#### 3. Stop Supabase
```bash
# Using Supabase CLI
cd ~/Documents/Repo/mediflow-ai
supabase stop

# Or manually
lsof -ti:54322 | xargs kill -9  # PostgreSQL
lsof -ti:54321 | xargs kill -9  # API
lsof -ti:54323 | xargs kill -9  # Studio
```

#### 4. Stop PostgreSQL
```bash
# Using systemctl (Linux)
sudo systemctl stop postgresql

# Or manually
pkill postgres
lsof -ti:5432 | xargs kill -9
```

#### 5. Stop Apache
```bash
# Using systemctl (Linux)
sudo systemctl stop apache2

# Or manually
pkill apache2
pkill httpd
lsof -ti:80 | xargs kill -9
lsof -ti:443 | xargs kill -9
```

#### 6. Stop Docker Containers
```bash
# Stop all containers
docker stop $(docker ps -q)

# Stop specific container
docker stop supabase_db_Agentic_Workflow
```

---

## VERIFICATION

### Check if ports are free
```bash
# Linux/Mac
lsof -i :3000  # Express
lsof -i :5000  # OCR
lsof -i :54322 # Supabase PostgreSQL
lsof -i :5432  # PostgreSQL

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :54322
```

### Check running processes
```bash
# Linux/Mac
ps aux | grep node
ps aux | grep python
ps aux | grep postgres
ps aux | grep apache

# Windows
Get-Process -Name node
Get-Process -Name python
Get-Process -Name postgres
```

### Check Docker containers
```bash
docker ps
```

---

## TROUBLESHOOTING

### Problem: "Permission denied"
**Solution:**
```bash
# Make script executable
chmod +x shutdown-all-services.sh

# Or run with bash
bash shutdown-all-services.sh
```

### Problem: "Port still in use"
**Solution:**
```bash
# Force kill process on port
sudo lsof -ti:3000 | xargs kill -9

# Windows
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

### Problem: "Supabase won't stop"
**Solution:**
```bash
# Stop Docker containers
docker stop $(docker ps --filter "name=supabase" -q)

# Remove containers if needed
docker rm $(docker ps -a --filter "name=supabase" -q)

# Nuclear option - restart Docker
sudo systemctl restart docker
```

### Problem: "PostgreSQL won't stop"
**Solution:**
```bash
# Find all postgres processes
ps aux | grep postgres

# Kill all postgres processes
sudo pkill -9 postgres

# Or stop service
sudo systemctl stop postgresql
```

### Problem: "Process keeps restarting"
**Solution:**
```bash
# Check for systemd services
systemctl list-units --type=service | grep -E "node|postgres|apache"

# Disable auto-restart
sudo systemctl disable <service-name>
sudo systemctl stop <service-name>

# Check for PM2 or other process managers
pm2 list
pm2 stop all
pm2 delete all
```

---

## EMERGENCY SHUTDOWN

If the script fails completely, use this nuclear option:

### Linux/Mac
```bash
#!/bin/bash
# Kill everything related to the project

# Kill by port
for port in 3000 5000 5173 54322 54321 54323 5432 80 443; do
    sudo lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Kill by process name
pkill -9 node
pkill -9 tsx
pkill -9 python
pkill -9 postgres
pkill -9 apache2
pkill -9 nginx
pkill -9 redis-server

# Stop all Docker containers
docker stop $(docker ps -q)

# Stop services
sudo systemctl stop postgresql apache2 nginx redis

# Clean up
rm -f .ocr_pid .webapp_pid *.pid
```

### Windows
```powershell
# Kill by port
3000, 5000, 5173, 54322, 5432, 80, 443 | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess | 
    Stop-Process -Force -ErrorAction SilentlyContinue
}

# Kill by process name
Get-Process -Name node, python, postgres, httpd, nginx, redis-server -ErrorAction SilentlyContinue | 
Stop-Process -Force

# Stop Docker
docker stop $(docker ps -q)

# Stop services
Stop-Service -Name "postgresql*", "Apache*", "nginx", "Redis" -Force -ErrorAction SilentlyContinue

# Clean up
Remove-Item -Path ".ocr_pid", ".webapp_pid", "*.pid" -Force -ErrorAction SilentlyContinue
```

---

## RESTART SERVICES

After shutdown, restart services with:

### Linux/Mac
```bash
./start-mediflow.sh
```

### Windows
```powershell
.\start-mediflow.ps1
```

Or manually:
```bash
# 1. Start Supabase
cd ~/Documents/Repo/mediflow-ai
supabase start

# 2. Start OCR Service
python ocr_service_robust.py &
echo $! > .ocr_pid

# 3. Start Express Backend
npm run dev
```

---

## SCHEDULED SHUTDOWN

### Linux Cron Job
```bash
# Edit crontab
crontab -e

# Add line to shutdown at 6 PM daily
0 18 * * * /path/to/shutdown-all-services.sh
```

### Windows Task Scheduler
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\path\to\shutdown-all-services.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 6PM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ABC-Shutdown" -Description "Shutdown ABC Patient Directory services"
```

---

## BEST PRACTICES

1. **Always use the script** - Don't manually kill processes unless necessary
2. **Verify shutdown** - Check ports and processes after running script
3. **Clean shutdown** - Use script instead of force killing when possible
4. **Save work first** - Commit code changes before shutdown
5. **Check logs** - Review logs for any errors before shutdown
6. **Backup data** - Ensure database is backed up before major shutdowns

---

## SCRIPT CUSTOMIZATION

### Add custom services
Edit the script and add your service in a new section:

```bash
# ============================================================================
# X. STOP YOUR CUSTOM SERVICE
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "X. Stopping Your Custom Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kill_port 8000 "Custom Service"
kill_process "custom-process-name"
```

### Exclude services
Comment out sections you don't want to stop:

```bash
# # ============================================================================
# # 5. STOP APACHE (IF USED)
# # ============================================================================
# echo ""
# echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# echo "5. Stopping Apache"
# echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# # ... rest of section commented out
```

---

## SUPPORT

If you encounter issues:
1. Check the troubleshooting section above
2. Review script output for error messages
3. Try manual shutdown commands
4. Use emergency shutdown as last resort
5. Restart your computer if all else fails

---

**Last Updated:** March 2024
**Version:** 1.0
**Tested On:** Ubuntu 22.04, Windows 11, macOS Sonoma
