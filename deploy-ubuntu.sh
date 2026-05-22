#!/bin/bash
# ============================================================
# ABCare OmniFlow — Ubuntu 22.04 LTS Production Deploy Script
# Run as root or with sudo on a fresh Ubuntu 22.04 server
# Usage: sudo bash deploy-ubuntu.sh
# ============================================================

set -e  # Exit on any error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ABCare OmniFlow — Ubuntu Production Setup  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Require root ──────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Please run as root: sudo bash deploy-ubuntu.sh"
fi

# ── Get domain/IP from user ───────────────────────────────
read -p "Enter your domain name or server IP (e.g. clinic.example.com or 192.168.1.100): " SERVER_DOMAIN
read -p "Enter your email for SSL certificate (leave blank if using IP): " SSL_EMAIL
read -p "Enter the path to clone the repo (default: /opt/abccare): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/abccare}

echo ""
info "Installing to: $INSTALL_DIR"
info "Domain/IP: $SERVER_DOMAIN"
echo ""

# ============================================================
# STEP 1 — System Update
# ============================================================
info "Step 1/10 — Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git ufw fail2ban \
  nginx certbot python3-certbot-nginx \
  ca-certificates gnupg lsb-release \
  unattended-upgrades apt-listchanges
log "System packages updated"

# ============================================================
# STEP 2 — Install Docker
# ============================================================
info "Step 2/10 — Installing Docker..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  log "Docker installed"
else
  log "Docker already installed"
fi

# ============================================================
# STEP 3 — Clone Repository
# ============================================================
info "Step 3/10 — Setting up application..."
if [ ! -d "$INSTALL_DIR" ]; then
  git clone https://github.com/jcquiambao05/ABC-Patient-s-Directory-.git "$INSTALL_DIR"
  log "Repository cloned to $INSTALL_DIR"
else
  warn "Directory $INSTALL_DIR already exists — pulling latest..."
  cd "$INSTALL_DIR" && git pull origin main
fi

cd "$INSTALL_DIR"

# ============================================================
# STEP 4 — Configure Environment
# ============================================================
info "Step 4/10 — Configuring environment..."
if [ ! -f "$INSTALL_DIR/.env" ]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  
  # Generate secure secrets
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
  
  # Update .env with generated secrets
  sed -i "s/CHANGE_ME_generate_a_random_64_char_hex_string/$JWT_SECRET/" "$INSTALL_DIR/.env"
  sed -i "s/CHANGE_ME_generate_another_random_64_char_hex_string/$SESSION_SECRET/" "$INSTALL_DIR/.env"
  sed -i "s|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres|" "$INSTALL_DIR/.env"
  
  warn ".env created with generated secrets"
  warn "IMPORTANT: Edit $INSTALL_DIR/.env to add your EMAIL, SMS, and other credentials"
  warn "Press Enter to continue after reviewing .env..."
  read -r
else
  log ".env already exists — skipping"
fi

# Set secure permissions on .env
chmod 600 "$INSTALL_DIR/.env"
log ".env permissions set to 600"

# ============================================================
# STEP 5 — Build and Start Docker Containers
# ============================================================
info "Step 5/10 — Building and starting Docker containers..."
cd "$INSTALL_DIR"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d
log "Docker containers started"

# Wait for app to be ready
info "Waiting for app to start..."
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "App is running on port 3000"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    err "App failed to start. Check: docker compose logs"
  fi
done

# ============================================================
# STEP 6 — Configure Nginx Reverse Proxy
# ============================================================
info "Step 6/10 — Configuring Nginx..."

cat > /etc/nginx/sites-available/abccare << EOF
server {
    listen 80;
    server_name $SERVER_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # File upload size limit (match app limits)
    client_max_body_size 25M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Deny direct access to uploads (serve through app instead)
    location /uploads/ {
        deny all;
        return 403;
    }

    # Health check (allow direct)
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
    }
}
EOF

ln -sf /etc/nginx/sites-available/abccare /etc/nginx/sites-enabled/abccare
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx configured"

# ============================================================
# STEP 7 — SSL Certificate (Let's Encrypt)
# ============================================================
info "Step 7/10 — Setting up SSL..."

# Check if it's an IP address (can't use Let's Encrypt with IP)
if [[ $SERVER_DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  warn "IP address detected — skipping Let's Encrypt SSL"
  warn "For production, use a domain name and re-run: certbot --nginx -d yourdomain.com"
else
  if [ -n "$SSL_EMAIL" ]; then
    certbot --nginx -d "$SERVER_DOMAIN" --email "$SSL_EMAIL" --agree-tos --non-interactive --redirect
    log "SSL certificate installed"
    
    # Update Nginx with HSTS after SSL
    sed -i '/add_header Referrer-Policy/a\    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' /etc/nginx/sites-available/abccare
    nginx -t && systemctl reload nginx
  else
    warn "No email provided — skipping SSL. Run manually: certbot --nginx -d $SERVER_DOMAIN"
  fi
fi

# ============================================================
# STEP 8 — Firewall Configuration
# ============================================================
info "Step 8/10 — Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
# Block direct access to app port from outside (Nginx handles it)
ufw deny 3000/tcp
ufw deny 5432/tcp
ufw --force enable
log "Firewall configured (SSH, HTTP, HTTPS only)"

# ============================================================
# STEP 9 — Fail2Ban (Brute Force Protection)
# ============================================================
info "Step 9/10 — Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter  = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log "Fail2Ban configured"

# ============================================================
# STEP 10 — Automated Backups
# ============================================================
info "Step 10/10 — Setting up automated backups..."
mkdir -p /opt/abccare-backups

cat > /opt/abccare-backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash
# ABCare OmniFlow — Automated Backup Script
BACKUP_DIR="/opt/abccare-backups"
DATE=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="/opt/abccare"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

# Database backup
docker exec abccare-postgres pg_dump -U postgres postgres > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"

# Uploads backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$INSTALL_DIR" uploads/ 2>/dev/null || true

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup completed: db_$DATE.sql.gz"
BACKUP_SCRIPT

chmod +x /opt/abccare-backup.sh

# Schedule daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/abccare-backup.sh >> /var/log/abccare-backup.log 2>&1") | crontab -
log "Daily backups scheduled at 2 AM → /opt/abccare-backups/"

# ============================================================
# Auto-restart on reboot
# ============================================================
cat > /etc/systemd/system/abccare.service << EOF
[Unit]
Description=ABCare OmniFlow
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable abccare
log "Auto-restart on reboot configured"

# ============================================================
# Enable automatic security updates
# ============================================================
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
log "Automatic security updates enabled"

# ============================================================
# Final Status Check
# ============================================================
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           DEPLOYMENT COMPLETE                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
log "App health: $(curl -sf http://localhost:3000/api/health || echo 'FAILED')"
log "Nginx: $(systemctl is-active nginx)"
log "Docker: $(systemctl is-active docker)"
log "Fail2Ban: $(systemctl is-active fail2ban)"
log "Firewall: $(ufw status | head -1)"
echo ""
echo "🌐 Access your app at:"
if [[ $SERVER_DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "   http://$SERVER_DOMAIN"
else
  echo "   https://$SERVER_DOMAIN"
fi
echo ""
echo "📋 Next steps:"
echo "   1. Edit /opt/abccare/.env — add EMAIL_PASS, SMS_API_KEY"
echo "   2. Change default passwords in the app"
echo "   3. Review SECURITY-AUDIT.md for remaining issues"
echo "   4. Run: docker compose logs -f  (to monitor)"
echo ""
warn "⚠️  IMPORTANT: Change all default passwords immediately!"
warn "⚠️  Review .env and ensure no test credentials are used"
