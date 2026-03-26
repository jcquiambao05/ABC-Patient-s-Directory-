# MediFlow AI - Complete Startup Guide

## Quick Start (Recommended)

```bash
./start-mediflow.sh
```

This will:
1. Check all dependencies
2. Start OCR service on port 5000
3. Start web application on port 3000
4. Verify both services are healthy

## Manual Start (Step by Step)

### 1. Start OCR Service

```bash
# From project directory
python3 ocr_service_simple.py
```

**Expected Output:**
```
============================================================
MediFlow Simple OCR Service - Tesseract + TrOCR
============================================================
✅ Loaded 2 templates
✅ Tesseract OCR available
⚠️  TrOCR not available
============================================================
Device: CPU
Tesseract: ✅
TrOCR: ❌
============================================================

🚀 MediFlow Simple OCR Service Started
📍 Listening on http://0.0.0.0:5000
💻 Device: CPU
🔍 OCR Engines: Tesseract
📋 Templates: 2 loaded
============================================================
```

**Verify OCR Service:**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "device": "cpu",
  "gpu_available": false,
  "models": {
    "tesseract": true,
    "trocr": false
  },
  "templates_loaded": 2,
  "mode": "simple_fallback"
}
```

### 2. Start Web Application

```bash
# In a new terminal, from project directory
npm run dev
```

**Expected Output:**
```
> abc-patient-directory@1.0.0 dev
> tsx watch server.ts

✅ Connected to PostgreSQL/Supabase successfully.
✅ Database schema verified/created.
Server JWT_SECRET: your_secre...
Server running on http://localhost:3000
```

**Verify Web App:**
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T...",
  "database": "connected",
  "auth": "configured"
}
```

### 3. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

**Default Login:**
- Email: `admin@mediflow.ai`
- Password: `Admin@123456`

## Stop Services

### Quick Stop (Recommended)

```bash
./stop-mediflow.sh
```

This will:
1. Kill OCR service (port 5000)
2. Kill web application (port 3000)
3. Clean up PID files
4. Verify ports are free

### Manual Stop

```bash
# Stop OCR service
pkill -f ocr_service_simple.py

# Stop web application
pkill -f "npm run dev"
pkill -f "tsx watch"

# Or kill by port
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

## Restart Services

```bash
./restart-mediflow.sh
```

This will:
1. Stop all services
2. Wait 3 seconds
3. Start all services
4. Verify health

## Troubleshooting

### Port Already in Use

**Problem:** Port 5000 or 3000 is already in use

**Solution:**
```bash
# Check what's using the port
lsof -i:5000
lsof -i:3000

# Kill the process
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Or use the stop script
./stop-mediflow.sh
```

### OCR Service Won't Start

**Problem:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
# Install Flask system-wide
sudo apt-get install python3-flask python3-flask-cors

# Verify installation
python3 -c "import flask; print(flask.__version__)"
```

**Problem:** `ModuleNotFoundError: No module named 'pytesseract'`

**Solution:**
```bash
# Install pytesseract
pip3 install pytesseract --break-system-packages

# Or use system package
sudo apt-get install python3-pytesseract
```

**Problem:** Tesseract not found

**Solution:**
```bash
# Install Tesseract OCR
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# Verify installation
tesseract --version
```

### Web Application Won't Start

**Problem:** `Cannot find module` errors

**Solution:**
```bash
# Install dependencies
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem:** Database connection error

**Solution:**
```bash
# Check if Supabase is running
supabase status

# If not running, start it
supabase start

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or change port in server.ts (line 92)
const PORT = 3001;  // Use different port
```

### Authentication Issues

**Problem:** "Invalid or expired token" errors

**Solution:**
```bash
# Check JWT_SECRET is set in .env
cat .env | grep JWT_SECRET

# If missing, add it
echo "JWT_SECRET=your-super-secret-jwt-key-change-this-in-production" >> .env

# Restart server
./restart-mediflow.sh
```

### OCR Extraction Issues

**Problem:** Name extracted as "MEDICAL CHART"

**Solution:**
- This is now fixed in the updated templates
- Restart OCR service to load new patterns:
```bash
pkill -f ocr_service
python3 ocr_service_simple.py
```

**Problem:** All fields show "N/A"

**Solution:**
1. Check OCR service is running: `curl http://localhost:5000/health`
2. Check image quality (clear, high contrast)
3. Verify field labels match patterns (e.g., "Name:", "DOB:")
4. Check ocr_service.log for errors

## Dependencies Checklist

### System Packages (Ubuntu/Debian)
```bash
sudo apt-get install -y \
  tesseract-ocr \
  tesseract-ocr-eng \
  python3-flask \
  python3-flask-cors \
  python3-pil \
  nodejs \
  npm
```

### Python Packages
```bash
pip3 list | grep -E "(flask|pytesseract|Pillow)"
```

Expected output:
```
Flask                        3.1.2
Flask-Cors                   6.0.1
Pillow                       11.3.0
pytesseract                  0.3.13
```

### Node.js Packages
```bash
npm list --depth=0
```

Should include:
- express
- pg (PostgreSQL client)
- jsonwebtoken
- bcrypt
- vite
- react
- typescript

## Log Files

### View Logs

```bash
# OCR service logs
tail -f ocr_service.log

# Web application logs
tail -f webapp.log

# Or view last 50 lines
tail -50 ocr_service.log
tail -50 webapp.log
```

### Clear Logs

```bash
# Clear OCR logs
> ocr_service.log

# Clear web app logs
> webapp.log

# Or delete them
rm ocr_service.log webapp.log
```

## Process Management

### Check Running Processes

```bash
# Check OCR service
ps aux | grep ocr_service | grep -v grep

# Check web app
ps aux | grep "npm run dev" | grep -v grep

# Check ports
lsof -i:5000  # OCR service
lsof -i:3000  # Web app
```

### View Process IDs

```bash
# OCR service PID
cat .ocr_pid

# Web app PID
cat .webapp_pid
```

### Kill Specific Process

```bash
# Kill OCR service
kill $(cat .ocr_pid)

# Kill web app
kill $(cat .webapp_pid)
```

## Environment Variables

### Required Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI (Optional - for chatbot)
GEMINI_API_KEY=your-gemini-api-key

# Ollama (Optional - for local AI)
OLLAMA_HOST=http://localhost:11434
DEFAULT_MODEL=llama3
```

### Verify Environment

```bash
# Check all variables
cat .env

# Check specific variable
grep JWT_SECRET .env
```

## Health Checks

### Quick Health Check

```bash
# Check both services
curl -s http://localhost:5000/health && echo "OCR: ✅"
curl -s http://localhost:3000/api/health && echo "Web: ✅"
```

### Detailed Health Check

```bash
# OCR service
curl -s http://localhost:5000/health | python3 -m json.tool

# Web application
curl -s http://localhost:3000/api/health | python3 -m json.tool

# OCR templates
curl -s http://localhost:5000/templates | python3 -m json.tool
```

## Startup Sequence

The correct startup order is:

1. **Database** (Supabase) - Must be running first
2. **OCR Service** (Port 5000) - Start second
3. **Web Application** (Port 3000) - Start last

This ensures:
- Database is ready for connections
- OCR service is available for document processing
- Web app can connect to both services

## Production Deployment

For production deployment, see:
- `.kiro/specs/mediflow-production-enhancements/requirements.md`
- `.kiro/specs/mediflow-production-enhancements/design.md`

Key differences:
- Use production WSGI server (gunicorn) for OCR service
- Use PM2 or systemd for process management
- Set up proper logging and monitoring
- Use environment-specific .env files
- Enable HTTPS with SSL certificates

## Quick Reference

```bash
# Start everything
./start-mediflow.sh

# Stop everything
./stop-mediflow.sh

# Restart everything
./restart-mediflow.sh

# Check health
curl http://localhost:5000/health  # OCR
curl http://localhost:3000/api/health  # Web

# View logs
tail -f ocr_service.log  # OCR
tail -f webapp.log  # Web

# Access app
http://localhost:3000
admin@mediflow.ai / Admin@123456
```

## Support

If you encounter issues not covered here:
1. Check the logs (ocr_service.log, webapp.log)
2. Review SYSTEM-STATUS-CHECK.md
3. Review OCR-EXTRACTION-FIX-COMPLETE.md
4. Check that all dependencies are installed
5. Verify ports 3000 and 5000 are free
