# MediFlow AI - Kubuntu/Linux Setup Guide

Complete installation guide for setting up MediFlow AI on Kubuntu/Ubuntu/Debian-based Linux systems.

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
- **OS**: Kubuntu 20.04 LTS or newer (Ubuntu/Debian-based)
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

### 1. Update System Packages

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### 2. Install Node.js 20.x (LTS)

```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

### 3. Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package lists
sudo apt update

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verify installation
psql --version  # Should show PostgreSQL 15.x
```

### 4. Install Git

```bash
# Install Git
sudo apt install -y git

# Verify installation
git --version
```

### 5. Install Build Tools (Required for some npm packages)

```bash
# Install build essentials
sudo apt install -y build-essential python3 python3-pip

# Verify installations
gcc --version
python3 --version
```

### 6. Install Docker (Optional - for containerized deployment)

```bash
# Install Docker dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package lists
sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Application Setup

### 1. Clone or Download the Repository

```bash
# If using Git
cd ~
git clone <your-repository-url> mediflow-ai
cd mediflow-ai

# OR if you have the files already, navigate to the directory
cd /path/to/mediflow-ai
```

### 2. Install Node.js Dependencies

```bash
# Install all required packages
npm install

# This will install:
# - Express (web server)
# - React (frontend framework)
# - PostgreSQL client (pg)
# - Authentication libraries (bcrypt, jsonwebtoken, passport)
# - Google Gemini AI SDK
# - And all other dependencies
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env
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

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### 1. Start PostgreSQL Service

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE mediflow;
CREATE USER mediflow_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mediflow TO mediflow_user;
\q
```

### 3. Initialize Database Schema

```bash
# Run the auth schema SQL file
sudo -u postgres psql -d mediflow -f database/auth_schema.sql

# Verify tables were created
sudo -u postgres psql -d mediflow -c "\dt"
```

### 4. Update DATABASE_URL in .env

```bash
# Edit .env file
nano .env

# Update this line with your password:
DATABASE_URL=postgresql://mediflow_user:your_secure_password@localhost:5432/mediflow
```

---

## Running the Application

### Development Mode (with hot reload)

```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:3000
```

### Production Mode

```bash
# Build the frontend
npm run build

# Start the production server
npm start

# The application will be available at:
# http://localhost:3000
```

### Run as Background Service (using PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start npm --name "mediflow-ai" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# View logs
pm2 logs mediflow-ai

# Stop the application
pm2 stop mediflow-ai

# Restart the application
pm2 restart mediflow-ai
```

---

## Docker Setup (Alternative)

If you prefer to run MediFlow AI in Docker containers:

### 1. Build and Start with Docker Compose

```bash
# Navigate to project directory
cd /path/to/mediflow-ai

# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### 2. Access the Application

```
http://localhost:3000
```

### 3. Docker Management Commands

```bash
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

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change the port in server.ts
```

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Permission Denied Errors

```bash
# Fix file permissions
chmod +x node_modules/.bin/*

# Fix npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Node.js Version Issues

```bash
# Check current version
node --version

# If wrong version, reinstall Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Build Errors

```bash
# Clear build cache
rm -rf dist/ node_modules/.vite/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Database Schema Issues

```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS mediflow;"
sudo -u postgres psql -c "CREATE DATABASE mediflow;"
sudo -u postgres psql -d mediflow -f database/auth_schema.sql
```

---

## Default Login Credentials

After setup, you can login with:

- **Email**: `admin@mediflow.ai`
- **Password**: `Admin@123456`

**⚠️ IMPORTANT**: Change this password immediately after first login!

---

## Firewall Configuration (Optional)

```bash
# Allow port 3000 through firewall
sudo ufw allow 3000/tcp

# Check firewall status
sudo ufw status
```

---

## Updating the Application

```bash
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

```bash
# Stop the application
pm2 stop mediflow-ai
pm2 delete mediflow-ai
# OR
docker compose down -v

# Remove database
sudo -u postgres psql -c "DROP DATABASE mediflow;"

# Remove application files
cd ~
rm -rf mediflow-ai

# Optional: Remove PostgreSQL
sudo apt remove --purge postgresql-15 postgresql-contrib-15
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
