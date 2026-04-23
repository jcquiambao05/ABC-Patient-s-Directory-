#!/bin/bash
# ============================================================
# ABCare OmniFlow — One-Command Setup (Linux / Mac)
# Usage: bash setup.sh
# ============================================================
set -e

echo "╔══════════════════════════════════════════╗"
echo "║   ABCare OmniFlow — Setup Script         ║"
echo "╚══════════════════════════════════════════╝"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install from https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose not found. Install Docker Desktop or docker-compose-plugin."
  exit 1
fi
echo "✅ Docker found: $(docker --version)"

# 2. Create .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate random secrets
  JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
  SESSION=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
  sed -i "s/CHANGE_ME_generate_a_random_64_char_hex_string/$JWT/" .env
  sed -i "s/CHANGE_ME_generate_another_random_64_char_hex_string/$SESSION/" .env
  echo "✅ .env created with random secrets"
  echo "⚠️  Edit .env to add your Google OAuth / SMS API keys if needed"
else
  echo "✅ .env already exists"
fi

# 3. Pull images and build
echo ""
echo "📦 Building Docker images (this may take a few minutes on first run)..."
docker compose pull postgres ollama
docker compose build app

# 4. Start services
echo ""
echo "🚀 Starting services..."
docker compose up -d

# 5. Wait for health
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ App is healthy!"
    break
  fi
  echo "   Waiting... ($i/30)"
  sleep 5
done

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ ABCare OmniFlow is running!          ║"
echo "║   Open: http://localhost:3000             ║"
echo "╠══════════════════════════════════════════╣"
echo "║   Default Accounts:                      ║"
echo "║   Superadmin: adminabcare                ║"
echo "║   Password:   Admin@ABCare2026           ║"
echo "║   Doctor:     doctor@abcclinic.com       ║"
echo "║   Password:   Doctor@ABC2026!            ║"
echo "║   Staff:      staff@abcclinic.com        ║"
echo "║   Password:   Staff@ABC2026!             ║"
echo "╠══════════════════════════════════════════╣"
echo "║   ⚠️  Change all passwords after login!   ║"
echo "╚══════════════════════════════════════════╝"
