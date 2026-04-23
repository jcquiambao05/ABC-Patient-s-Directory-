# ABCare OmniFlow — Windows 11 Setup Guide

> Complete step-by-step guide to run ABCare OmniFlow on a fresh Windows 11 machine using Docker.
> No Node.js, Python, or PostgreSQL installation required on the host — everything runs inside Docker containers.

---

## What You Need to Download

| Software | Version | Download Link | Why |
|----------|---------|---------------|-----|
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop/ | Runs all containers |
| **Git for Windows** | Latest | https://git-scm.com/download/win | Clone the repository |
| **Windows Terminal** | Latest (optional) | Microsoft Store → search "Windows Terminal" | Better PowerShell experience |

> **Minimum Hardware:**
> - RAM: 8 GB (16 GB recommended — Ollama AI needs ~4 GB)
> - Disk: 20 GB free (Ollama models are ~4 GB each)
> - CPU: 4 cores recommended

---

## Step 1 — Enable WSL 2 (Required for Docker Desktop)

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Restart your computer when prompted. After restart, WSL 2 will finish installing Ubuntu automatically.

> If WSL is already installed, verify it's version 2:
> ```powershell
> wsl --set-default-version 2
> ```

---

## Step 2 — Install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Run the installer (`Docker Desktop Installer.exe`)
3. During install, make sure **"Use WSL 2 instead of Hyper-V"** is checked
4. After install, restart your computer
5. Open Docker Desktop — wait for it to show **"Engine running"** (green dot in the bottom left)

**Verify Docker works:**
```powershell
docker --version
docker compose version
```

Expected output:
```
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

---

## Step 3 — Install Git for Windows

1. Download from https://git-scm.com/download/win
2. Run the installer with default settings
3. Verify:
```powershell
git --version
```

---

## Step 4 — Get the Application Code

Open **PowerShell** (not as admin) and run:

```powershell
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

> Replace `YOUR_USERNAME/YOUR_REPO_NAME` with your actual GitHub repository URL.
>
> **If you have the code as a ZIP file instead:**
> 1. Extract the ZIP to `C:\Users\YourName\abccare`
> 2. Open PowerShell and run: `cd C:\Users\YourName\abccare`

---

## Step 5 — Configure Environment Variables

```powershell
# Copy the example config file
Copy-Item .env.example .env
```

Now open `.env` in Notepad and fill in your values:

```powershell
notepad .env
```

**Required changes in `.env`:**

```env
# Change the DATABASE_URL to use the Docker postgres container:
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres

# Generate new random secrets (run this in PowerShell to get values):
# [System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
JWT_SECRET=PASTE_YOUR_RANDOM_SECRET_HERE
SESSION_SECRET=PASTE_ANOTHER_RANDOM_SECRET_HERE
```

**Optional — add your API keys:**
```env
# Google OAuth (leave blank to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_EMAILS=your@gmail.com

# SMS Reminders (Semaphore API)
SMS_API_KEY=your_semaphore_api_key
SMS_SENDER_NAME=ABCClinic
```

---

## Step 6 — Run the One-Command Setup

```powershell
.\setup.ps1
```

This script will:
1. ✅ Check Docker is running
2. ✅ Pull PostgreSQL and Ollama images
3. ✅ Build the ABCare app container
4. ✅ Start all services
5. ✅ Wait for the app to be healthy
6. ✅ Open your browser to http://localhost:3000

> **First run takes 10–20 minutes** because it downloads:
> - PostgreSQL 15 image (~80 MB)
> - Ollama image (~1 GB)
> - llama3.2 AI model (~2 GB)
> - llava vision model (~4 GB)
> - Node.js dependencies and builds the frontend

---

## Step 7 — Verify Everything is Running

```powershell
docker compose ps
```

You should see all containers with status **"healthy"**:

```
NAME                STATUS
abccare-postgres    Up (healthy)
abccare-ollama      Up (healthy)
abccare-app         Up (healthy)
```

Open your browser: **http://localhost:3000**

---

## Default Login Accounts

| Role | Username / Email | Password |
|------|-----------------|----------|
| **Super Admin** | `adminabcare` | `Admin@ABCare2026` |
| **Doctor** | `doctor@abcclinic.com` | `Doctor@ABC2026!` |
| **Staff** | `staff@abcclinic.com` | `Staff@ABC2026!` |

> ⚠️ **Change all passwords immediately after first login** via Settings → Change Password.

---

## Daily Usage Commands

Open PowerShell in the project folder and use:

```powershell
# Start the app
docker compose up -d

# Stop the app
docker compose down

# View logs (all services)
docker compose logs -f

# View logs (app only)
docker compose logs -f app

# Restart just the app (after code changes)
docker compose restart app

# Check status
docker compose ps
```

---

## Updating the App (After Code Changes)

```powershell
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build app
```

---

## Backup the Database

```powershell
# Create a backup
docker compose exec postgres pg_dump -U postgres postgres > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Restore from backup
Get-Content backup_20260101_120000.sql | docker compose exec -T postgres psql -U postgres postgres
```

---

## Troubleshooting

### Docker Desktop won't start
- Make sure WSL 2 is installed: `wsl --status`
- Restart Docker Desktop from the system tray
- Check Windows Features: search "Turn Windows features on or off" → enable "Virtual Machine Platform" and "Windows Subsystem for Linux"

### Port 3000 already in use
Edit `.env` and change `APP_PORT=3001`, then restart: `docker compose up -d`

### App shows "Cannot connect to database"
```powershell
# Check postgres is healthy
docker compose ps postgres

# View postgres logs
docker compose logs postgres
```

### Ollama models not downloading
```powershell
# Check ollama logs
docker compose logs ollama

# Manually pull models
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull llava
```

### Reset everything (fresh start)
```powershell
# WARNING: This deletes all data
docker compose down -v
docker compose up -d
```

---

## What Each Container Does

| Container | Port | Purpose |
|-----------|------|---------|
| `abccare-postgres` | 5432 | PostgreSQL database — stores all patient data |
| `abccare-ollama` | 11434 | Local AI — powers the Health Assistant and OCR |
| `abccare-app` | 3000 | The web application (Node.js + React) |

---

## File Structure Reference

```
abccare/
├── Dockerfile              ← App container definition
├── docker-compose.yml      ← All services configuration
├── .env                    ← Your secrets (never commit this)
├── .env.example            ← Template for .env
├── setup.ps1               ← Windows one-command setup
├── setup.sh                ← Linux/Mac one-command setup
├── database/
│   └── full_schema.sql     ← Complete database schema (auto-runs on first start)
├── src/                    ← React frontend source
├── server.ts               ← Express backend
└── uploads/                ← Patient photos, charts (persisted in Docker volume)
```

---

## Security Notes

- The `.env` file contains secrets — **never share it or commit it to Git**
- The `uploads/` folder contains patient data — back it up regularly
- Change all default passwords after first login
- For clinic network access, configure your router to forward port 3000 to this machine's local IP

---

*Generated for ABCare OmniFlow — Windows 11 Deployment*
