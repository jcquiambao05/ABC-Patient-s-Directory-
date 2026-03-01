# MediFlow AI - Docker Deployment Guide

Complete guide for deploying MediFlow AI using Docker and Docker Compose.

---

## Table of Contents
1. [Why Docker?](#why-docker)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Production Deployment](#production-deployment)
6. [Management Commands](#management-commands)
7. [Monitoring and Logs](#monitoring-and-logs)
8. [Backup and Restore](#backup-and-restore)
9. [Troubleshooting](#troubleshooting)

---

## Why Docker?

### Benefits of Docker Deployment

✅ **Consistency**: Same environment across development, staging, and production  
✅ **Isolation**: Application runs in isolated containers  
✅ **Portability**: Deploy anywhere Docker runs (Linux, Windows, macOS, Cloud)  
✅ **Easy Updates**: Update with a single command  
✅ **Resource Efficiency**: Lightweight compared to virtual machines  
✅ **Scalability**: Easy to scale horizontally  

---

## Prerequisites

### System Requirements

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 10GB free space
- **OS**: Linux, Windows 10/11, or macOS

### Install Docker

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**Windows/macOS:**
- Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
- Install and restart your computer

**Verify Installation:**
```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Prepare Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env  # Linux/macOS
notepad .env  # Windows
```

**Minimum Required Configuration:**

```bash
# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your_secure_jwt_secret_here_minimum_32_characters
SESSION_SECRET=your_secure_session_secret_here_minimum_32_characters

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=admin@mediflow.ai,your-email@gmail.com
```

### 2. Start the Application

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Wait for services to be healthy (check with)
docker compose ps
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

**Default Login:**
- Email: `admin@mediflow.ai`
- Password: `Admin@123456`

---

## Configuration

### Docker Compose Services

The `docker-compose.yml` file defines two services:

#### 1. PostgreSQL Database (`postgres`)
- **Image**: `postgres:15-alpine`
- **Port**: `5432`
- **Volume**: `postgres_data` (persistent storage)
- **Health Check**: Automatic readiness check

#### 2. MediFlow Application (`app`)
- **Build**: From local Dockerfile
- **Port**: `3000`
- **Depends On**: PostgreSQL (waits for database to be healthy)
- **Health Check**: HTTP check on `/api/health`

### Environment Variables

All environment variables are loaded from `.env` file:

```yaml
environment:
  NODE_ENV: production
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/mediflow
  JWT_SECRET: ${JWT_SECRET}
  SESSION_SECRET: ${SESSION_SECRET}
  GEMINI_API_KEY: ${GEMINI_API_KEY}
  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
  GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
  GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL}
  GOOGLE_ALLOWED_EMAILS: ${GOOGLE_ALLOWED_EMAILS}
```

### Volumes

**Persistent Data Storage:**

```yaml
volumes:
  postgres_data:
    driver: local
```

This ensures your database data persists even when containers are stopped or removed.

### Networks

All services run on a custom network:

```yaml
networks:
  default:
    name: mediflow-network
```

This allows services to communicate using service names (e.g., `postgres`, `app`).

---

## Production Deployment

### 1. Security Hardening

**Update docker-compose.yml for production:**

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    # Remove port exposure (only accessible within Docker network)
    # ports:
    #   - "5432:5432"

  app:
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    restart: always
```

**Update .env for production:**

```bash
# Strong database credentials
DB_USER=mediflow_prod
DB_PASSWORD=your_very_strong_password_here
DB_NAME=mediflow_production

# Strong JWT secrets (64+ characters)
JWT_SECRET=your_very_long_secure_jwt_secret_minimum_64_characters_recommended
SESSION_SECRET=your_very_long_secure_session_secret_minimum_64_characters

# Production callback URL
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

### 2. Use Reverse Proxy (Nginx)

**Add Nginx service to docker-compose.yml:**

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: always
```

**Create nginx.conf:**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream mediflow {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://mediflow;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 3. Enable SSL/TLS

Use Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

### 4. Resource Limits

**Add resource limits to docker-compose.yml:**

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

---

## Management Commands

### Starting and Stopping

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d app

# Stop all services
docker compose stop

# Stop specific service
docker compose stop app

# Stop and remove containers (data persists)
docker compose down

# Stop and remove containers + volumes (deletes data)
docker compose down -v
```

### Rebuilding

```bash
# Rebuild after code changes
docker compose build

# Rebuild and restart
docker compose up -d --build

# Rebuild specific service
docker compose build app
docker compose up -d app

# Force rebuild (no cache)
docker compose build --no-cache
```

### Scaling

```bash
# Scale app service to 3 instances
docker compose up -d --scale app=3

# Note: You'll need a load balancer for this to work properly
```

### Updating

```bash
# Pull latest code (if using Git)
git pull

# Rebuild and restart
docker compose up -d --build

# Or use rolling update (zero downtime)
docker compose up -d --no-deps --build app
```

---

## Monitoring and Logs

### View Logs

```bash
# View all logs
docker compose logs

# Follow logs (real-time)
docker compose logs -f

# View logs for specific service
docker compose logs app
docker compose logs postgres

# Follow logs for specific service
docker compose logs -f app

# View last 100 lines
docker compose logs --tail=100 app

# View logs with timestamps
docker compose logs -t app
```

### Container Status

```bash
# View running containers
docker compose ps

# View all containers (including stopped)
docker compose ps -a

# View resource usage
docker stats

# View detailed container info
docker inspect mediflow-app
```

### Health Checks

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-01T00:00:00.000Z","database":"connected","auth":"configured"}
```

### Execute Commands in Containers

```bash
# Open shell in app container
docker compose exec app sh

# Open shell in postgres container
docker compose exec postgres sh

# Run psql in postgres container
docker compose exec postgres psql -U postgres -d mediflow

# Run Node.js command in app container
docker compose exec app node -e "console.log('Hello')"

# View environment variables
docker compose exec app env
```

---

## Backup and Restore

### Database Backup

**Create Backup:**

```bash
# Backup to file
docker compose exec postgres pg_dump -U postgres mediflow > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
docker compose exec postgres pg_dump -U postgres mediflow | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup all databases
docker compose exec postgres pg_dumpall -U postgres > backup_all_$(date +%Y%m%d_%H%M%S).sql
```

**Restore Backup:**

```bash
# Restore from file
docker compose exec -T postgres psql -U postgres mediflow < backup_20250101_120000.sql

# Restore from compressed file
gunzip -c backup_20250101_120000.sql.gz | docker compose exec -T postgres psql -U postgres mediflow

# Restore all databases
docker compose exec -T postgres psql -U postgres < backup_all_20250101_120000.sql
```

### Volume Backup

**Backup Docker Volume:**

```bash
# Create backup of postgres_data volume
docker run --rm \
  -v mediflow-ai_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

**Restore Docker Volume:**

```bash
# Stop services
docker compose down

# Restore volume
docker run --rm \
  -v mediflow-ai_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres_volume_backup_20250101_120000.tar.gz"

# Start services
docker compose up -d
```

### Automated Backups

**Create backup script (backup.sh):**

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T postgres pg_dump -U postgres mediflow | gzip > $BACKUP_DIR/mediflow_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "mediflow_*.sql.gz" -mtime +7 -delete

echo "Backup completed: mediflow_$DATE.sql.gz"
```

**Schedule with cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/mediflow-backup.log 2>&1
```

---

## Troubleshooting

### Container Won't Start

```bash
# View detailed logs
docker compose logs app

# Check container status
docker compose ps

# Inspect container
docker inspect mediflow-app

# Check for port conflicts
sudo netstat -tulpn | grep 3000
sudo lsof -i :3000
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Test database connection
docker compose exec postgres psql -U postgres -d mediflow -c "SELECT 1;"

# Check DATABASE_URL in app
docker compose exec app env | grep DATABASE_URL
```

### Permission Issues

```bash
# Fix volume permissions
docker compose down
sudo chown -R $USER:$USER .
docker compose up -d

# Or run as root (not recommended for production)
docker compose exec -u root app sh
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Remove unused Docker resources
docker system prune -a

# Remove unused volumes
docker volume prune

# Remove specific volume (WARNING: deletes data)
docker volume rm mediflow-ai_postgres_data
```

### Container Keeps Restarting

```bash
# View logs to identify issue
docker compose logs --tail=100 app

# Check health check status
docker inspect mediflow-app | grep -A 10 Health

# Disable restart policy temporarily
docker update --restart=no mediflow-app
```

### Network Issues

```bash
# List Docker networks
docker network ls

# Inspect network
docker network inspect mediflow-network

# Recreate network
docker compose down
docker network rm mediflow-network
docker compose up -d
```

### Build Failures

```bash
# Clear build cache
docker builder prune -a

# Rebuild without cache
docker compose build --no-cache

# Check Dockerfile syntax
docker compose config
```

---

## Performance Optimization

### Enable BuildKit

```bash
# Add to .env or export
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Rebuild with BuildKit
docker compose build
```

### Use Multi-Stage Builds

Already implemented in Dockerfile for optimal image size.

### Optimize Images

```bash
# View image sizes
docker images

# Remove dangling images
docker image prune

# Remove all unused images
docker image prune -a
```

---

## Security Best Practices

1. ✅ Use strong passwords for database
2. ✅ Don't expose PostgreSQL port in production
3. ✅ Use environment variables for secrets
4. ✅ Keep Docker and images updated
5. ✅ Use non-root user in containers (already configured)
6. ✅ Enable Docker Content Trust
7. ✅ Scan images for vulnerabilities
8. ✅ Use secrets management (Docker Swarm secrets or Kubernetes secrets)

---

## Support

For issues and questions:
- Check application logs: `docker compose logs -f app`
- Check database logs: `docker compose logs -f postgres`
- Review `TROUBLESHOOT_WHITE_SCREEN.md`
- Check Docker documentation: https://docs.docker.com/

---

**Last Updated**: 2025
**Version**: 1.0.0
