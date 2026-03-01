# MediFlow AI - Windows Setup Guide

Complete installation guide for setting up MediFlow AI on Windows 10/11.

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Application Setup](#application-setup)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Docker Setup (Alternative)](#docker-setup-alternative)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit) or Windows 11
- **CPU**: AMD Ryzen 5 1600 or equivalent (4+ cores)
- **RAM**: 8GB minimum, 16GB recommended
- **GPU**: AMD RX 580 8GB or equivalent (for AI features)
- **Storage**: 20GB free space
- **Network**: Internet connection for package downloads

### Recommended for Production
- **RAM**: 16GB+
- **GPU**: 8GB+ VRAM for local AI processing
- **Storage**: SSD with 50GB+ free space

---

## Prerequisites Installation

### 1. Install Node.js 20.x (LTS)

**Download and Install:**

1. Visit: https://nodejs.org/
2. Download the **LTS version** (20.x.x)
3. Run the installer (`node-v20.x.x-x64.msi`)
4. Follow the installation wizard:
   - ✅ Accept the license agreement
   - ✅ Keep default installation path: `C:\Program Files\nodejs\`
   - ✅ Check "Automatically install necessary tools" (includes Python and Visual Studio Build Tools)
5. Click "Install" and wait for completion

**Verify Installation:**

Open **Command Prompt** (cmd) or **PowerShell**:

```powershell
# Check Node.js version
node --version
# Should show: v20.x.x

# Check npm version
npm --version
# Should show: 10.x.x or higher
```

### 2. Install PostgreSQL 15

**Download and Install:**

1. Visit: https://www.postgresql.org/download/windows/
2. Download **PostgreSQL 15** installer
3. Run the installer (`postgresql-15.x-windows-x64.exe`)
4. Follow the installation wizard:
   - Installation Directory: `C:\Program Files\PostgreSQL\15`
   - Select Components: ✅ PostgreSQL Server, ✅ pgAdmin 4, ✅ Command Line Tools
   - Data Directory: `C:\Program Files\PostgreSQL\15\data`
   - **Set Password**: Choose a strong password for the `postgres` superuser (remember this!)
   - Port: `5432` (default)
   - Locale: Default locale
5. Click "Next" and complete installation
6. ❌ Uncheck "Launch Stack Builder" at the end

**Verify Installation:**

Open **Command Prompt** as Administrator:

```powershell
# Add PostgreSQL to PATH (if not already added)
setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"

# Close and reopen Command Prompt, then verify
psql --version
# Should show: psql (PostgreSQL) 15.x
```

### 3. Install Git for Windows

**Download and Install:**

1. Visit: https://git-scm.com/download/win
2. Download **Git for Windows**
3. Run the installer (`Git-2.x.x-64-bit.exe`)
4. Follow the installation wizard:
   - Use default settings
   - Select "Git from the command line and also from 3rd-party software"
   - Use "Checkout Windows-style, commit Unix-style line endings"
5. Complete installation

**Verify Installation:**

```powershell
git --version
# Should show: git version 2.x.x
```

### 4. Install Visual Studio Build Tools (Required for some npm packages)

If you didn't install build tools with Node.js:

**Option A: Using npm (Recommended)**

Open **PowerShell as Administrator**:

```powershell
npm install --global windows-build-tools
```

**Option B: Manual Installation**

1. Visit: https://visualstudio.microsoft.com/downloads/
2. Download **Build Tools for Visual Studio 2022**
3. Run installer and select:
   - ✅ Desktop development with C++
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   - ✅ Windows 10/11 SDK

### 5. Install Docker Desktop (Optional - for containerized deployment)

**Download and Install:**

1. Visit: https://www.docker.com/products/docker-desktop/
2. Download **Docker Desktop for Windows**
3. Run the installer (`Docker Desktop Installer.exe`)
4. Follow the installation wizard:
   - ✅ Use WSL 2 instead of Hyper-V (recommended)
   - Complete installation
5. Restart your computer
6. Launch Docker Desktop
7. Accept the service agreement
8. Skip the tutorial (optional)

**Verify Installation:**

Open **PowerShell**:

```powershell
docker --version
# Should show: Docker version 24.x.x

docker compose version
# Should show: Docker Compose version v2.x.x
```

---

## Application Setup

### 1. Download or Clone the Repository

**Option A: Using Git**

Open **PowerShell** or **Command Prompt**:

```powershell
# Navigate to your desired location
cd C:\Users\YourUsername\Documents

# Clone the repository
git clone <your-repository-url> mediflow-ai
cd mediflow-ai
```

**Option B: Download ZIP**

1. Download the project ZIP file
2. Extract to: `C:\Users\YourUsername\Documents\mediflow-ai`
3. Open **PowerShell** and navigate:

```powershell
cd C:\Users\YourUsername\Documents\mediflow-ai
```

### 2. Install Node.js Dependencies

```powershell
# Install all required packages
npm install

# This will install:
# - Express (web server)
# - React (frontend framework)
# - PostgreSQL client (pg)
# - Authentication libraries (bcrypt, jsonwebtoken, passport)
# - Google Gemini AI SDK
# - And all other dependencies

# Wait for installation to complete (may take 5-10 minutes)
```

### 3. Configure Environment Variables

```powershell
# Copy the example environment file
copy .env.example .env

# Edit the .env file with Notepad
notepad .env
```

**Required Configuration in `.env`:**

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mediflow

# JWT Configuration (Generate secure random strings)
JWT_SECRET=your_secure_jwt_secret_here_minimum_32_characters
SESSION_SECRET=your_secure_session_secret_here_minimum_32_characters

# Google Gemini API Key (Get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,your-email@gmail.com
```

**Generate Secure Secrets:**

Open **PowerShell** and run:

```powershell
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the generated strings to your .env file
```

---

## Database Setup

### 1. Start PostgreSQL Service

**Using Services Manager:**

1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "postgresql-x64-15"
4. Right-click → Start
5. Right-click → Properties → Startup type: Automatic

**Using Command Prompt (as Administrator):**

```powershell
# Start PostgreSQL service
net start postgresql-x64-15

# Check service status
sc query postgresql-x64-15
```

### 2. Create Database and User

Open **Command Prompt** or **PowerShell**:

```powershell
# Connect to PostgreSQL (enter the password you set during installation)
psql -U postgres

# In PostgreSQL prompt, run:
CREATE DATABASE mediflow;
CREATE USER mediflow_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mediflow TO mediflow_user;
\q
```

### 3. Initialize Database Schema

```powershell
# Navigate to your project directory
cd C:\Users\YourUsername\Documents\mediflow-ai

# Run the auth schema SQL file
psql -U postgres -d mediflow -f database\auth_schema.sql

# Enter your postgres password when prompted

# Verify tables were created
psql -U postgres -d mediflow -c "\dt"
```

### 4. Update DATABASE_URL in .env

```powershell
# Edit .env file
notepad .env

# Update this line with your password:
DATABASE_URL=postgresql://mediflow_user:your_secure_password@localhost:5432/mediflow
```

---

## Running the Application

### Development Mode (with hot reload)

Open **PowerShell** or **Command Prompt**:

```powershell
# Navigate to project directory
cd C:\Users\YourUsername\Documents\mediflow-ai

# Start the development server
npm run dev

# The application will be available at:
# http://localhost:3000

# Press Ctrl+C to stop the server
```

### Production Mode

```powershell
# Build the frontend
npm run build

# Start the production server
npm start

# The application will be available at:
# http://localhost:3000
```

### Run as Windows Service (using PM2)

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Configure PM2 to run as Windows service
pm2-startup install

# Navigate to project directory
cd C:\Users\YourUsername\Documents\mediflow-ai

# Start the application
pm2 start npm --name "mediflow-ai" -- start

# Save PM2 configuration
pm2 save

# View logs
pm2 logs mediflow-ai

# Stop the application
pm2 stop mediflow-ai

# Restart the application
pm2 restart mediflow-ai

# Remove from PM2
pm2 delete mediflow-ai
```

---

## Docker Setup (Alternative)

If you prefer to run MediFlow AI in Docker containers:

### 1. Start Docker Desktop

1. Launch **Docker Desktop** from Start Menu
2. Wait for Docker to start (whale icon in system tray should be steady)

### 2. Build and Start with Docker Compose

Open **PowerShell**:

```powershell
# Navigate to project directory
cd C:\Users\YourUsername\Documents\mediflow-ai

# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### 3. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

### 4. Docker Management Commands

```powershell
# View running containers
docker ps

# View logs for specific service
docker compose logs -f app
docker compose logs -f postgres

# Restart a service
docker compose restart app

# Rebuild after code changes
docker compose up -d --build

# Execute commands in container
docker compose exec app sh
docker compose exec postgres psql -U postgres -d mediflow
```

---

## Troubleshooting

### Port Already in Use

```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change the port in server.ts
```

### PostgreSQL Connection Issues

```powershell
# Check if PostgreSQL service is running
sc query postgresql-x64-15

# Start PostgreSQL service
net start postgresql-x64-15

# Restart PostgreSQL service
net stop postgresql-x64-15
net start postgresql-x64-15

# Check PostgreSQL logs
# Location: C:\Program Files\PostgreSQL\15\data\log\
```

### Permission Denied Errors

Run **PowerShell as Administrator**:

```powershell
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Node.js Version Issues

```powershell
# Check current version
node --version

# If wrong version, uninstall and reinstall Node.js 20
# Go to: Control Panel → Programs → Uninstall Node.js
# Then download and install Node.js 20 from nodejs.org
```

### Build Errors

```powershell
# Clear build cache
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force node_modules\.vite

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Rebuild
npm run build
```

### Database Schema Issues

```powershell
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS mediflow;"
psql -U postgres -c "CREATE DATABASE mediflow;"
psql -U postgres -d mediflow -f database\auth_schema.sql
```

### Windows Firewall Blocking

1. Open **Windows Defender Firewall**
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings"
4. Click "Allow another app"
5. Browse to: `C:\Program Files\nodejs\node.exe`
6. Add and allow for both Private and Public networks

### Antivirus Blocking npm Install

Temporarily disable antivirus or add exceptions for:
- `C:\Program Files\nodejs\`
- `C:\Users\YourUsername\Documents\mediflow-ai\`

---

## Default Login Credentials

After setup, you can login with:

- **Email**: `admin@mediflow.ai`
- **Password**: `Admin@123456`

**⚠️ IMPORTANT**: Change this password immediately after first login!

---

## Updating the Application

```powershell
# Navigate to project directory
cd C:\Users\YourUsername\Documents\mediflow-ai

# Pull latest changes (if using Git)
git pull

# Install new dependencies
npm install

# Rebuild frontend
npm run build

# Restart the application
pm2 restart mediflow-ai
# OR
docker compose up -d --build
```

---

## Uninstallation

### Remove Application

```powershell
# Stop the application
pm2 stop mediflow-ai
pm2 delete mediflow-ai
# OR
docker compose down -v

# Remove database
psql -U postgres -c "DROP DATABASE mediflow;"

# Remove application files
cd C:\Users\YourUsername\Documents
Remove-Item -Recurse -Force mediflow-ai
```

### Uninstall Software (Optional)

1. **Node.js**: Control Panel → Programs → Uninstall Node.js
2. **PostgreSQL**: Control Panel → Programs → Uninstall PostgreSQL 15
3. **Docker Desktop**: Control Panel → Programs → Uninstall Docker Desktop
4. **Git**: Control Panel → Programs → Uninstall Git

---

## Quick Start Commands Reference

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Using PM2
pm2 start npm --name "mediflow-ai" -- start
pm2 logs mediflow-ai
pm2 stop mediflow-ai
pm2 restart mediflow-ai

# Using Docker
docker compose up -d
docker compose logs -f
docker compose down
```

---

## Support

For issues and questions:
- Check `TROUBLESHOOT_WHITE_SCREEN.md`
- Check `GOOGLE_OAUTH_SETUP.md` for OAuth configuration
- Review server logs: `pm2 logs mediflow-ai` or `docker compose logs -f`

---

**Last Updated**: 2025
**Version**: 1.0.0
