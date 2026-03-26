# ABC Patient Directory - Production Deployment Guide

## Overview

This guide covers deploying the system to production for real-world use in medical clinics.

## Deployment Options

### Option 1: Cloud-Only Deployment (Simplest)

**Architecture:**
- Web app + OCR service on single cloud server
- Managed PostgreSQL database
- All processing in cloud

**Pros:**
- Easiest to set up
- No on-premise hardware needed
- Automatic backups
- Easy scaling

**Cons:**
- Higher monthly costs ($50-100/month)
- Patient data processed in cloud
- Requires HIPAA compliance measures

**Recommended For:**
- Small clinics (1-2 locations)
- Limited IT resources
- Budget for ongoing cloud costs

### Option 2: Hybrid Deployment (Recommended)

**Architecture:**
- Web app in cloud (cheap hosting)
- OCR processing on-premise
- Database on-premise
- VPN connection between cloud and local

**Pros:**
- Lower costs ($10-30/month cloud)
- Patient data stays on-premise
- Better HIPAA compliance
- Control over sensitive data

**Cons:**
- Requires local hardware
- More complex setup
- Need to maintain local server

**Recommended For:**
- Multi-location clinics
- Security-conscious organizations
- Long-term deployment (2+ years)

### Option 3: Fully On-Premise (Most Secure)

**Architecture:**
- Everything runs locally
- No cloud dependency
- Access via local network or VPN

**Pros:**
- Maximum security
- No monthly cloud costs
- Complete data control
- No internet dependency

**Cons:**
- Requires dedicated hardware
- Need IT staff for maintenance
- No automatic backups
- Limited remote access

**Recommended For:**
- Large clinics with IT department
- Maximum security requirements
- Existing server infrastructure

## Cloud-Only Deployment

### 1. Choose Cloud Provider

**Budget Options:**
- **DigitalOcean:** $12/month (2GB RAM, 1 vCPU)
- **Hetzner:** $5/month (2GB RAM, 1 vCPU)
- **Vultr:** $12/month (2GB RAM, 1 vCPU)
- **Linode:** $12/month (2GB RAM, 1 vCPU)

**Recommended:** Hetzner CX21 ($5/month) or DigitalOcean Basic ($12/month)

### 2. Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt-get update && apt-get upgrade -y

# Install dependencies
apt-get install -y \
  nodejs \
  npm \
  python3 \
  python3-pip \
  python3-flask \
  python3-flask-cors \
  python3-pil \
  tesseract-ocr \
  tesseract-ocr-eng \
  postgresql \
  nginx \
  certbot \
  python3-certbot-nginx

# Install PM2 for process management
npm install -g pm2
```

### 3. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-repo/ABC-Patient-Directory.git
cd ABC-Patient-Directory

# Install dependencies
npm install

# Build frontend
npm run build

# Setup environment
cp .env.example .env
nano .env  # Edit with production values
```

### 4. Configure Database

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE patient_directory;"
sudo -u postgres psql -c "CREATE USER admin WITH PASSWORD 'strong_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE patient_directory TO admin;"

# Update .env with connection string
DATABASE_URL=postgresql://admin:strong_password_here@localhost:5432/patient_directory
```

### 5. Setup Process Manager

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'web-app',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'ocr-service',
      script: 'python3',
      args: 'ocr_service_simple.py',
      interpreter: 'none'
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configure Nginx

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/patient-directory << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/patient-directory /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7. Setup SSL Certificate

```bash
# Get Let's Encrypt certificate
certbot --nginx -d your-domain.com

# Auto-renewal
certbot renew --dry-run
```

### 8. Configure Firewall

```bash
# Allow HTTP, HTTPS, SSH
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

## Hybrid Deployment

### Cloud Setup (Web App Only)

```bash
# Minimal cloud server (Hetzner CX11 - $3.50/month)
# Install only Node.js and Nginx
apt-get install -y nodejs npm nginx certbot python3-certbot-nginx

# Deploy frontend only
git clone https://github.com/your-repo/ABC-Patient-Directory.git
cd ABC-Patient-Directory
npm install
npm run build

# Serve static files with Nginx
cp -r dist/* /var/www/html/
```

### On-Premise Setup (Database + OCR)

```bash
# Local server setup
# Install all dependencies
apt-get install -y \
  python3 \
  python3-flask \
  python3-flask-cors \
  python3-pil \
  tesseract-ocr \
  postgresql

# Setup database
sudo -u postgres psql -c "CREATE DATABASE patient_directory;"

# Start OCR service
python3 ocr_service_simple.py

# Setup VPN (WireGuard)
apt-get install wireguard
# Configure WireGuard connection to cloud server
```

### VPN Configuration

**Cloud Server (wg0.conf):**
```ini
[Interface]
PrivateKey = <cloud-private-key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <clinic-public-key>
AllowedIPs = 10.0.0.2/32
```

**Clinic Server (wg0.conf):**
```ini
[Interface]
PrivateKey = <clinic-private-key>
Address = 10.0.0.2/24

[Peer]
PublicKey = <cloud-public-key>
Endpoint = cloud-server-ip:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25
```

## Production Checklist

### Security

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Disable unnecessary services
- [ ] Setup fail2ban for SSH protection
- [ ] Regular security updates
- [ ] Backup encryption keys securely

### Database

- [ ] Use strong database password
- [ ] Restrict database access to localhost
- [ ] Enable connection pooling
- [ ] Setup automated backups
- [ ] Test backup restoration
- [ ] Monitor disk space
- [ ] Setup replication (optional)

### Monitoring

- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log rotation
- [ ] Setup error alerting
- [ ] Monitor disk space
- [ ] Monitor CPU/RAM usage
- [ ] Track OCR processing times
- [ ] Monitor database performance

### Backups

- [ ] Daily database backups
- [ ] Weekly full system backups
- [ ] Off-site backup storage
- [ ] Test restoration procedure
- [ ] Document backup process
- [ ] Automate backup verification

### Performance

- [ ] Enable Nginx gzip compression
- [ ] Configure browser caching
- [ ] Optimize database queries
- [ ] Setup CDN for static assets (optional)
- [ ] Monitor response times
- [ ] Load testing before launch

### Documentation

- [ ] Document server access credentials
- [ ] Document backup procedures
- [ ] Document recovery procedures
- [ ] Create runbook for common issues
- [ ] Train staff on system usage
- [ ] Document emergency contacts

## Maintenance

### Daily Tasks

- Check system health
- Review error logs
- Monitor disk space
- Verify backups completed

### Weekly Tasks

- Review security logs
- Check for system updates
- Test backup restoration
- Review performance metrics

### Monthly Tasks

- Security audit
- Performance review
- Update dependencies
- Review and archive old logs

### Quarterly Tasks

- Full system backup test
- Disaster recovery drill
- Security penetration test
- Performance optimization review

## Scaling

### Vertical Scaling (Single Server)

Upgrade server resources:
- More RAM (4GB → 8GB → 16GB)
- More CPU cores (1 → 2 → 4)
- Faster storage (HDD → SSD → NVMe)

### Horizontal Scaling (Multiple Servers)

Add more servers:
- Load balancer (Nginx/HAProxy)
- Multiple web app instances
- Multiple OCR workers
- Database replication
- Redis for session storage

## Disaster Recovery

### Backup Strategy

**What to Backup:**
- PostgreSQL database (daily)
- Environment files (.env)
- SSL certificates
- Application code (git)
- Uploaded documents

**Backup Script:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-bucket/

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

### Recovery Procedure

1. **Restore Database:**
```bash
gunzip backup.sql.gz
psql $DATABASE_URL < backup.sql
```

2. **Restore Application:**
```bash
git pull origin main
npm install
pm2 restart all
```

3. **Verify System:**
```bash
curl http://localhost:3000/api/health
curl http://localhost:5000/health
```

## Cost Estimates

### Cloud-Only (Small Clinic)
- Server: $12/month (DigitalOcean)
- Database: Included
- Domain: $12/year
- SSL: Free (Let's Encrypt)
- **Total: ~$150/year**

### Hybrid (Multi-Location)
- Cloud server: $5/month (Hetzner)
- Local hardware: $400 one-time
- Electricity: $20/month
- Domain: $12/year
- **Total: Year 1: $700, Year 2+: $300/year**

### Fully On-Premise
- Hardware: $800 one-time
- Electricity: $30/month
- **Total: Year 1: $1,160, Year 2+: $360/year**

## Support

For deployment issues:
- Check TROUBLESHOOTING.md
- Review server logs
- Test connectivity
- Verify firewall rules
- Check DNS configuration

## Production URLs

After deployment, update:
- Frontend API endpoint
- CORS allowed origins
- JWT token issuer
- Callback URLs
