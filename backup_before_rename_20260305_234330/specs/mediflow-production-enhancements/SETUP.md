# ABC Patient Directory - Complete Setup Guide

## System Requirements

### Minimum Requirements
- **OS:** Ubuntu 22.04+ / Windows 10+ / macOS 12+
- **CPU:** Quad-core processor (Intel i5/AMD Ryzen 5 or better)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 20GB free space
- **Network:** Stable internet connection for initial setup

### Software Dependencies
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL 14+ (or Supabase)
- Tesseract OCR 5.0+

## Quick Setup (Ubuntu/Linux)

### 1. Install System Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and dependencies
sudo apt-get install -y \
  python3 \
  python3-pip \
  python3-flask \
  python3-flask-cors \
  python3-pil \
  tesseract-ocr \
  tesseract-ocr-eng \
  postgresql-client

# Install pytesseract
pip3 install pytesseract --break-system-packages
```

### 2. Install Project Dependencies

```bash
# Clone/navigate to project directory
cd /path/to/ABC-Patient-Directory

# Install Node.js packages
npm install

# Verify installations
node --version  # Should be 18+
python3 --version  # Should be 3.10+
tesseract --version  # Should be 5.0+
```

### 3. Setup Database

**Option A: Local Supabase (Recommended for Development)**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize and start Supabase
supabase init
supabase start

# Get connection details
supabase status
```

**Option B: PostgreSQL Direct**

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres psql -c "CREATE DATABASE patient_directory;"
sudo -u postgres psql -c "CREATE USER admin WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE patient_directory TO admin;"
```

### 4. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

**Required Environment Variables:**

```bash
# Database (use Supabase connection string or PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: AI Chatbot (Gemini API)
GEMINI_API_KEY=your-gemini-api-key-here
```

### 5. Start the System

```bash
# Make scripts executable
chmod +x start-mediflow.sh stop-mediflow.sh restart-mediflow.sh

# Start all services
./start-mediflow.sh
```

**Expected Output:**
```
🏥 Starting ABC Patient Directory...
🔍 Checking Python dependencies...
✅ All Python dependencies installed
🔧 Starting OCR Service (Tesseract + Simple Mode)...
✅ OCR Service started (PID: 12345)
✅ OCR service health check passed
🌐 Starting Web Application...
✅ Web Application started (PID: 67890)
✅ Web application health check passed

🎉 ABC Patient Directory is ready!

📍 Access Points:
   🌐 Web App: http://localhost:3000
   🔧 OCR Service: http://localhost:5000
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

**Default Login:**
- Email: `admin@mediflow.ai`
- Password: `Admin@123456`

## Windows Setup

### 1. Install Prerequisites

1. **Node.js:** Download from https://nodejs.org/ (LTS version)
2. **Python:** Download from https://python.org/ (3.10+)
3. **Tesseract OCR:** Download from https://github.com/UB-Mannheim/tesseract/wiki
   - Install to `C:\Program Files\Tesseract-OCR`
   - Add to PATH: `C:\Program Files\Tesseract-OCR`

### 2. Install Python Packages

```powershell
# Open PowerShell as Administrator
pip install flask flask-cors pytesseract pillow
```

### 3. Install Node Dependencies

```powershell
# Navigate to project directory
cd C:\path\to\ABC-Patient-Directory

# Install packages
npm install
```

### 4. Setup Database

**Option A: Supabase Cloud (Easiest)**
1. Sign up at https://supabase.com
2. Create new project
3. Copy connection string to `.env`

**Option B: PostgreSQL Windows**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Create database using pgAdmin

### 5. Configure Environment

Create `.env` file in project root:

```
DATABASE_URL=your-database-connection-string
JWT_SECRET=your-secret-key-here
```

### 6. Start Services

```powershell
# Start OCR service (in one terminal)
python ocr_service_simple.py

# Start web app (in another terminal)
npm run dev
```

## macOS Setup

### 1. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Dependencies

```bash
# Install Node.js
brew install node

# Install Python
brew install python@3.11

# Install Tesseract
brew install tesseract

# Install Python packages
pip3 install flask flask-cors pytesseract pillow
```

### 3. Follow Linux Steps

Continue with steps 2-6 from the Linux setup guide above.

## OCR Service Configuration

The OCR service uses Tesseract for text extraction. Configuration is in `medical_chart_templates.json`.

### Extraction Patterns

The system extracts:
- **Patient Name:** Filters out headers like "MEDICAL CHART"
- **Date of Birth:** Normalizes to YYYY-MM-DD format
- **Phone:** Various formats (123-456-7890, (123) 456-7890, etc.)
- **Email:** Standard email validation
- **Address:** Multi-line support
- **Gender:** Normalizes M/F to male/female
- **Diagnosis:** Clinical diagnosis text
- **Vitals:** Blood pressure, heart rate, temperature, etc.

### Customizing Patterns

Edit `medical_chart_templates.json` to add or modify extraction patterns:

```json
{
  "extraction_rules": {
    "patient_name": {
      "patterns": [
        "(?:Name|Patient Name)\\s*[:\\|]\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)"
      ],
      "priority": "high"
    }
  }
}
```

After editing, restart the OCR service:
```bash
pkill -f ocr_service
python3 ocr_service_simple.py
```

## Database Schema

The system automatically creates required tables on first run:

- **patients** - Patient demographic information
- **medical_charts** - AI-extracted medical records
- **emrs** - Legacy EMR records
- **documents** - Uploaded document metadata
- **users** - Admin user accounts
- **sessions** - Authentication sessions

## Verification

### Check Services

```bash
# OCR Service
curl http://localhost:5000/health

# Web Application
curl http://localhost:3000/api/health
```

### View Logs

```bash
# OCR service logs
tail -f ocr_service.log

# Web application logs
tail -f webapp.log
```

### Test OCR Extraction

1. Login to web application
2. Click "AI Upload Entry"
3. Upload a medical chart image
4. Verify patient information is extracted correctly

## Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports
./stop-mediflow.sh

# Or manually
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### OCR Service Won't Start

```bash
# Check Flask installation
python3 -c "import flask; print('OK')"

# Check Tesseract installation
tesseract --version

# Check pytesseract
python3 -c "import pytesseract; print('OK')"
```

### Database Connection Errors

```bash
# Check Supabase status
supabase status

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Authentication Issues

```bash
# Verify JWT_SECRET is set
grep JWT_SECRET .env

# If missing, add it
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

## Production Deployment

For production deployment:

1. **Use production database** (not local Supabase)
2. **Set strong JWT_SECRET** (32+ character random string)
3. **Enable HTTPS** with valid SSL certificate
4. **Use process manager** (PM2, systemd) for services
5. **Setup monitoring** and logging
6. **Configure firewall** rules
7. **Regular backups** of database

See `DEPLOYMENT.md` for detailed production setup.

## Next Steps

After setup:
1. Change default admin password
2. Test OCR extraction with sample documents
3. Review security settings in `SECURITY.md`
4. Configure backup procedures
5. Train staff on system usage

## Support

For issues:
- Check `TROUBLESHOOTING.md`
- Review logs in `ocr_service.log` and `webapp.log`
- Verify all services are running
- Check environment variables in `.env`
