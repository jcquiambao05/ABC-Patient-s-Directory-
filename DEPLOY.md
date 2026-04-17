# ABCare OmniFlow — Deployment Guide

## Requirements on the new computer

- Docker + Docker Compose installed
- 8GB+ RAM (Ollama needs ~4GB for llava)
- 15GB+ free disk (models: llama3.2 2GB + llava 4GB + app)

Install Docker on Xubuntu/Ubuntu:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

---

## Deploy in 3 steps

### Step 1 — Copy the project
Copy the entire project folder to the new computer (USB, network share, or git).

### Step 2 — Configure environment
```bash
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET and SESSION_SECRET
nano .env
```

### Step 3 — Start everything
```bash
docker compose up -d
```

This will:
- Start PostgreSQL and run all migrations automatically
- Pull and start Ollama with llama3.2 and llava models (~6GB download, first time only)
- Build and start the web application

Wait ~2 minutes for Ollama to download models on first run.

Access the app at: **http://localhost:3000**

---

## Default accounts (change passwords after first login)

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Staff | staff@abcclinic.com | Staff@ABC2026! | Staff |
| Doctor | doctor@abcclinic.com | Doctor@ABC2026! | Doctor/Admin |

---

## Useful commands

```bash
# View logs
docker compose logs -f app

# Stop everything
docker compose down

# Stop and delete all data (WARNING: deletes database)
docker compose down -v

# Restart just the app
docker compose restart app

# Run database migrations manually
docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/03-audit_logs_migration.sql
```

---

## Access from other devices on the same network

Find your IP:
```bash
hostname -I | awk '{print $1}'
```

Other devices connect to: `http://YOUR_IP:3000`

---

## Without Docker (manual setup)

If Docker is not available, use the existing start script:
```bash
# Install dependencies
npm install
pip3 install flask flask-cors pytesseract pillow

# Install and start Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama pull llava

# Start the app
./start-mediflow.sh
```
