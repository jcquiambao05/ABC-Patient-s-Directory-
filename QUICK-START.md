# MediFlow AI - Quick Start Guide

Fast setup guide to get MediFlow AI running in minutes.

---

## Choose Your Setup Method

### 🐳 Docker (Recommended - Easiest)
**Best for**: Quick deployment, consistent environments, production use

```bash
# 1. Install Docker
# Linux: curl -fsSL https://get.docker.com | sh
# Windows/Mac: Download from docker.com

# 2. Configure environment
cp .env.example .env
nano .env  # Add your API keys

# 3. Start everything
docker compose up -d

# 4. Access at http://localhost:3000
```

**Time**: ~10 minutes  
**Difficulty**: ⭐ Easy  
**Full Guide**: See `DOCKER-DEPLOYMENT.md`

---

### 🐧 Kubuntu/Linux Native
**Best for**: Development, maximum performance, local control

```bash
# 1. Install prerequisites
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql-15 git build-essential

# 2. Setup project
git clone <repo-url> mediflow-ai
cd mediflow-ai
npm install

# 3. Configure environment
cp .env.example .env
nano .env  # Add your API keys

# 4. Setup database
sudo -u postgres psql -c "CREATE DATABASE mediflow;"
sudo -u postgres psql -d mediflow -f database/auth_schema.sql

# 5. Start application
npm run dev

# 6. Access at http://localhost:3000
```

**Time**: ~20 minutes  
**Difficulty**: ⭐⭐ Moderate  
**Full Guide**: See `SETUP-KUBUNTU.md`

---

### 🪟 Windows Native
**Best for**: Windows users, development, local testing

```powershell
# 1. Install prerequisites
# - Node.js 20 from nodejs.org
# - PostgreSQL 15 from postgresql.org
# - Git from git-scm.com

# 2. Setup project
git clone <repo-url> mediflow-ai
cd mediflow-ai
npm install

# 3. Configure environment
copy .env.example .env
notepad .env  # Add your API keys

# 4. Setup database
psql -U postgres -c "CREATE DATABASE mediflow;"
psql -U postgres -d mediflow -f database\auth_schema.sql

# 5. Start application
npm run dev

# 6. Access at http://localhost:3000
```

**Time**: ~25 minutes  
**Difficulty**: ⭐⭐ Moderate  
**Full Guide**: See `SETUP-WINDOWS.md`

---

## Required Configuration

### Minimum .env Configuration

```bash
# Database (Docker uses default, native needs your password)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mediflow

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_secure_jwt_secret_here_minimum_32_characters
SESSION_SECRET=your_secure_session_secret_here_minimum_32_characters

# Google Gemini API (Get from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,your-email@gmail.com
```

### Generate Secure Secrets

**Linux/Mac:**
```bash
openssl rand -hex 32
```

**Windows/All Platforms:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Default Login

After setup, login with:

- **Email**: `admin@mediflow.ai`
- **Password**: `Admin@123456`

⚠️ **Change this password immediately after first login!**

---

## Common Commands

### Development

```bash
# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Docker

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild after changes
docker compose up -d --build
```

### Database

```bash
# Connect to database
psql -U postgres -d mediflow

# Backup database
pg_dump -U postgres mediflow > backup.sql

# Restore database
psql -U postgres -d mediflow < backup.sql
```

---

## Verification Checklist

After setup, verify everything works:

- [ ] Application loads at http://localhost:3000
- [ ] Login page displays correctly
- [ ] Can login with default credentials
- [ ] Patient directory loads (may be empty)
- [ ] Can add a new patient
- [ ] Health check returns OK: http://localhost:3000/api/health

---

## Troubleshooting Quick Fixes

### White Screen After Login
```bash
# Clear browser cache and hard refresh
Ctrl + Shift + R (Linux/Windows)
Cmd + Shift + R (Mac)
```

### Port 3000 Already in Use
```bash
# Linux/Mac
sudo lsof -i :3000
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
# Linux
sudo systemctl status postgresql

# Windows
sc query postgresql-x64-15

# Docker
docker compose ps postgres
```

### npm install Fails
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. ✅ Change default admin password
2. ✅ Configure Google OAuth (optional)
3. ✅ Add your Gemini API key for AI features
4. ✅ Add patient records
5. ✅ Test document upload and OCR
6. ✅ Configure backup strategy
7. ✅ Review security settings

---

## Getting Help

### Documentation
- **Docker Setup**: `DOCKER-DEPLOYMENT.md`
- **Kubuntu Setup**: `SETUP-KUBUNTU.md`
- **Windows Setup**: `SETUP-WINDOWS.md`
- **Troubleshooting**: `TROUBLESHOOT_WHITE_SCREEN.md`
- **Google OAuth**: `GOOGLE_OAUTH_SETUP.md`
- **Security**: `.kiro/specs/mediflow-production-enhancements/SECURITY.md`

### Common Issues
- White screen after login → Clear cache, check console logs
- 401/403 errors → Check JWT_SECRET matches in .env
- Database errors → Verify DATABASE_URL and PostgreSQL is running
- Build errors → Clear node_modules and reinstall

### Logs
```bash
# Native
npm run dev  # Shows logs in terminal

# Docker
docker compose logs -f app
docker compose logs -f postgres

# PM2 (if using)
pm2 logs mediflow-ai
```

---

## System Requirements

### Minimum
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 20GB
- **OS**: Linux, Windows 10/11, macOS

### Recommended
- **CPU**: 6+ cores
- **RAM**: 16GB
- **GPU**: 8GB VRAM (for local AI)
- **Storage**: 50GB SSD

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         MediFlow AI Stack               │
├─────────────────────────────────────────┤
│  Frontend: React + TypeScript + Vite   │
│  Backend: Node.js + Express             │
│  Database: PostgreSQL 15                │
│  Auth: JWT + Google OAuth + MFA         │
│  AI: Google Gemini (OCR + Chat)         │
└─────────────────────────────────────────┘
```

---

## Port Usage

- **3000**: MediFlow AI Application
- **5432**: PostgreSQL Database (Docker: internal only)
- **80/443**: Nginx (if using reverse proxy)

---

## Security Notes

1. ✅ Always use HTTPS in production
2. ✅ Change default passwords immediately
3. ✅ Use strong JWT secrets (64+ characters)
4. ✅ Whitelist Google OAuth emails
5. ✅ Enable MFA for admin accounts
6. ✅ Regular database backups
7. ✅ Keep dependencies updated
8. ✅ Don't expose PostgreSQL port in production

---

**Last Updated**: 2025  
**Version**: 1.0.0  
**License**: Apache-2.0
