# ABCare OmniFlow — Windows 11 Setup Guide (Docker)

> **Target:** Windows 11 (Home or Pro), fresh machine, no prior setup required.  
> **Method:** Docker Desktop — everything runs in containers, nothing installed directly on Windows.  
> **Time:** ~20–30 minutes (mostly waiting for downloads)

---

## What Gets Installed on Windows

| Software | Purpose | Size |
|----------|---------|------|
| Git for Windows | Clone the repo | ~50 MB |
| Docker Desktop | Run all containers | ~600 MB |
| WSL 2 (auto-installed by Docker) | Linux kernel for containers | ~200 MB |

**Nothing else.** Node.js, Python, PostgreSQL, Tesseract — all run inside Docker containers.

---

## System Requirements

- Windows 11 (Home or Pro) — 64-bit
- RAM: **8 GB minimum**, 16 GB recommended (Ollama AI needs ~4 GB)
- Disk: **20 GB free** (Docker images + AI models)
- CPU: Any modern Intel/AMD (virtualization must be enabled — it is by default on most Win 11 machines)
- Internet connection for first-time setup

---

## Step 1 — Enable WSL 2 (Windows Subsystem for Linux)

Open **PowerShell as Administrator** (right-click Start → Terminal (Admin)):

```powershell
wsl --install
```

Restart your computer when prompted.

After restart, open PowerShell again and verify:

```powershell
wsl --version
```

You should see `WSL version: 2.x.x`. If it shows WSL 1, run:

```powershell
wsl --set-default-version 2
```

---

## Step 2 — Install Git for Windows

1. Download from: **https://git-scm.com/download/win**
2. Run the installer — accept all defaults
3. Verify in PowerShell:

```powershell
git --version
# Expected: git version 2.x.x.windows.x
```

---

## Step 3 — Install Docker Desktop

1. Download from: **https://www.docker.com/products/docker-desktop/**
2. Run `Docker Desktop Installer.exe`
3. During install:
   - ✅ Check **"Use WSL 2 instead of Hyper-V"**
   - ✅ Check **"Add shortcut to desktop"**
4. Click Install, then **Restart** when prompted
5. After restart, Docker Desktop opens automatically — wait for the whale icon in the taskbar to stop animating (means Docker is ready)

Verify in PowerShell:

```powershell
docker --version
# Expected: Docker version 27.x.x

docker compose version
# Expected: Docker Compose version v2.x.x
```

> **Troubleshooting:** If Docker says "WSL 2 installation is incomplete", run `wsl --update` in PowerShell as Admin, then restart Docker Desktop.

---

## Step 4 — Get the Application Code

### Option A — Clone from Git (recommended)

```powershell
# Navigate to where you want the project (e.g., Desktop)
cd $env:USERPROFILE\Desktop

# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Enter the project folder
cd YOUR_REPO_NAME
```

### Option B — Copy from USB / Network Drive

Copy the entire project folder to your Desktop, then:

```powershell
cd $env:USERPROFILE\Desktop\ABC-Patients-Directory
```

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

**Required changes:**

```env
# Generate new secrets — run this in PowerShell to get random values:
# -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

JWT_SECRET=PASTE_YOUR_RANDOM_64_CHAR_HEX_HERE
SESSION_SECRET=PASTE_ANOTHER_RANDOM_64_CHAR_HEX_HERE
```

**Optional (leave blank to skip):**

```env
# Google OAuth — only if you want Google sign-in
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_EMAILS=

# SMS reminders — only if you have a Semaphore account
SMS_API_KEY=
```

Save and close Notepad.

---

## Step 6 — Start the Application

```powershell
# Build and start all containers (first run takes 10–15 minutes)
docker compose up -d
```

Watch the progress:

```powershell
docker compose logs -f app
```

Wait until you see:
```
abccare-app  | Server running on port 3000
```

Press `Ctrl+C` to stop watching logs (containers keep running).

---

## Step 7 — Verify Everything is Running

```powershell
# Check all containers are healthy
docker compose ps
```

Expected output:
```
NAME                STATUS
abccare-postgres    running (healthy)
abccare-ollama      running (healthy)
abccare-app         running (healthy)
```

Test the app:

```powershell
# Should return {"status":"ok"}
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

---

## Step 8 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

### Default Login Accounts

| Role | Username / Email | Password |
|------|-----------------|----------|
| **Super Admin** | `adminabcare` | `Admin@ABCare2026` |
| **Doctor** | `doctor@abcclinic.com` | `Doctor@ABC2026!` |
| **Staff** | `staff@abcclinic.com` | `Staff@ABC2026!` |

> ⚠️ **Change all passwords immediately after first login** via Settings → Change Password.

---

## Daily Operations

### Start the app (after PC restart)

Docker Desktop starts automatically with Windows. Containers restart automatically (`restart: unless-stopped`).

If you need to manually start:

```powershell
cd $env:USERPROFILE\Desktop\YOUR_REPO_NAME
docker compose up -d
```

### Stop the app

```powershell
docker compose down
```

### Restart the app

```powershell
docker compose restart
```

### View logs

```powershell
# All services
docker compose logs -f

# Just the app
docker compose logs -f app

# Just the database
docker compose logs -f postgres
```

### Update to latest code

```powershell
git pull
docker compose down
docker compose build app
docker compose up -d
```

---

## Accessing from Other Devices on the Same Network

To access from a phone or another computer on the same WiFi:

1. Find your Windows IP address:
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter, e.g., 192.168.1.37
```

2. Open on other devices: `http://192.168.1.37:3000`

> **Note:** Windows Firewall may block this. If it does:
> - Open Windows Defender Firewall → Advanced Settings
> - Inbound Rules → New Rule → Port → TCP 3000 → Allow

---

## Backup & Data

All data is stored in Docker volumes. To back up:

```powershell
# Backup database
docker compose exec postgres pg_dump -U postgres postgres > backup.sql

# Backup uploaded files
docker run --rm -v abccare_uploads_data:/data -v ${PWD}:/backup alpine tar czf /backup/uploads-backup.tar.gz /data
```

To restore on a new machine:

```powershell
# Restore database
Get-Content backup.sql | docker compose exec -T postgres psql -U postgres postgres

# Restore uploads
docker run --rm -v abccare_uploads_data:/data -v ${PWD}:/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /
```

---

## Troubleshooting

### "Docker Desktop is not running"
- Open Docker Desktop from the Start menu
- Wait for the whale icon in the taskbar to stop animating

### "Port 3000 is already in use"
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000
# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

### "WSL 2 kernel update required"
```powershell
wsl --update
# Then restart Docker Desktop
```

### App shows "Cannot connect to database"
```powershell
# Check postgres is healthy
docker compose ps postgres
# If not healthy, check logs
docker compose logs postgres
```

### Ollama AI not responding (chat/vision features)
The AI models take 5–10 minutes to download on first start. Check:
```powershell
docker compose logs ollama
# Wait for: "llama3.2" and "llava" to finish downloading
```

### Reset everything (nuclear option)
```powershell
docker compose down -v   # removes all data volumes too
docker compose up -d     # fresh start
```

---

## Container Architecture

```
Windows 11
└── Docker Desktop (WSL 2 backend)
    ├── abccare-postgres  (PostgreSQL 15)  → port 5432
    ├── abccare-ollama    (Ollama AI)      → port 11434
    └── abccare-app       (Node.js + OCR)  → port 3000
        ├── Express.js server (TypeScript)
        ├── Vite React frontend (built static)
        └── Python OCR service (Tesseract)
```

All containers communicate on the internal `abccare-network`. Only port 3000 is exposed to your browser.

---

## File Locations

| What | Where on Windows |
|------|-----------------|
| Project code | `Desktop\YOUR_REPO_NAME\` |
| Environment config | `Desktop\YOUR_REPO_NAME\.env` |
| Database data | Docker volume `abccare_postgres_data` |
| Uploaded files | Docker volume `abccare_uploads_data` |
| AI models | Docker volume `abccare_ollama_data` |

---

*Last updated: ABCare OmniFlow v1.0 — Windows 11 Docker Deployment*
