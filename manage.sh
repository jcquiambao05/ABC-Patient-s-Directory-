#!/bin/bash
# ============================================================
# ABCare OmniFlow — Management Script
# Replaces: deploy_start.sh, deploy_stop.sh, deploy_restart.sh
# Usage: bash manage.sh [start|stop|restart|status|logs|build]
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Detect docker compose command (plugin vs standalone)
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  echo -e "${RED}✗  Docker not found. Install Docker first.${NC}"; exit 1
fi

CMD="${1:-help}"

case "$CMD" in

  start)
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}   ABCare OmniFlow — Starting${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ ! -f "$SCRIPT_DIR/.env" ]; then
      echo -e "${YELLOW}⚠  .env not found — copying from .env.example${NC}"
      cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
      echo -e "${YELLOW}   Edit .env before going to production!${NC}"
    fi

    $DC -f "$SCRIPT_DIR/docker-compose.yml" up -d

    echo -e "${CYAN}   Waiting for app to be ready...${NC}"
    for i in {1..30}; do
      if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo ""
        echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BOLD}${GREEN}   ✓  ABCare OmniFlow is ready!${NC}"
        echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "   ${BOLD}Open in browser:${NC}  http://localhost:3000"
        echo -e "   ${BOLD}Stop:${NC}             bash manage.sh stop"
        echo -e "   ${BOLD}Logs:${NC}             bash manage.sh logs"
        echo ""
        exit 0
      fi
      sleep 3
    done
    echo -e "${RED}✗  App did not start in time.${NC}"
    echo "   Check logs: bash manage.sh logs"
    exit 1
    ;;

  stop)
    echo "Stopping ABCare OmniFlow..."
    $DC -f "$SCRIPT_DIR/docker-compose.yml" down
    echo -e "${GREEN}✓  All services stopped.${NC}"
    ;;

  restart)
    echo "Restarting ABCare OmniFlow..."
    $DC -f "$SCRIPT_DIR/docker-compose.yml" down
    sleep 2
    bash "$0" start
    ;;

  status)
    echo "=== Container Status ==="
    $DC -f "$SCRIPT_DIR/docker-compose.yml" ps
    echo ""
    echo "=== Health Check ==="
    if curl -sf http://localhost:3000/api/health 2>/dev/null; then
      echo -e "\n${GREEN}✓  App is healthy${NC}"
    else
      echo -e "${RED}✗  App is not responding${NC}"
    fi
    ;;

  logs)
    $DC -f "$SCRIPT_DIR/docker-compose.yml" logs -f --tail=100 app
    ;;

  build)
    echo "Rebuilding Docker image..."
    $DC -f "$SCRIPT_DIR/docker-compose.yml" build --no-cache
    echo -e "${GREEN}✓  Build complete. Run: bash manage.sh start${NC}"
    ;;

  security)
    bash "$SCRIPT_DIR/security-check.sh"
    ;;

  update)
    echo "Pulling latest code and restarting..."
    git -C "$SCRIPT_DIR" pull origin main
    bash "$0" build
    bash "$0" restart
    ;;

  backup)
    # ── Manual backup — run anytime ──────────────────────────────────────
    BACKUP_DIR="${SCRIPT_DIR}/backups"
    mkdir -p "$BACKUP_DIR"
    DATE=$(date +%Y%m%d_%H%M%S)

    # Check postgres container is running
    if ! $DC -f "$SCRIPT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running\|Up"; then
      echo -e "${RED}✗  PostgreSQL container is not running. Start the app first.${NC}"
      exit 1
    fi

    echo -e "${CYAN}Creating database backup...${NC}"
    DB_FILE="$BACKUP_DIR/db_${DATE}.sql"
    $DC -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
      pg_dump -U postgres postgres > "$DB_FILE"

    # Compress it
    gzip "$DB_FILE"
    DB_SIZE=$(du -sh "${DB_FILE}.gz" | cut -f1)
    echo -e "${GREEN}✓  Database backup: backups/db_${DATE}.sql.gz (${DB_SIZE})${NC}"

    # Backup uploads folder if it exists
    if [ -d "$SCRIPT_DIR/uploads" ] && [ "$(ls -A "$SCRIPT_DIR/uploads" 2>/dev/null)" ]; then
      echo -e "${CYAN}Backing up uploads...${NC}"
      UPLOADS_FILE="$BACKUP_DIR/uploads_${DATE}.tar.gz"
      tar -czf "$UPLOADS_FILE" -C "$SCRIPT_DIR" uploads/ 2>/dev/null || true
      UP_SIZE=$(du -sh "$UPLOADS_FILE" | cut -f1)
      echo -e "${GREEN}✓  Uploads backup: backups/uploads_${DATE}.tar.gz (${UP_SIZE})${NC}"
    fi

    echo ""
    echo -e "${BOLD}Backup complete.${NC} Files saved to: ${SCRIPT_DIR}/backups/"
    echo "Run 'bash manage.sh backup-list' to see all backups."
    ;;

  backup-list)
    # ── List all backups with sizes ───────────────────────────────────────
    BACKUP_DIR="${SCRIPT_DIR}/backups"
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
      echo -e "${YELLOW}No backups found. Run: bash manage.sh backup${NC}"
      exit 0
    fi
    echo ""
    echo -e "${BOLD}Available Backups (${BACKUP_DIR}):${NC}"
    echo "────────────────────────────────────────"
    ls -lh "$BACKUP_DIR" | grep -v '^total' | awk '{print $5 "\t" $9}'
    echo ""
    TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "Total size: ${TOTAL}"
    echo ""
    ;;

  restore)
    # ── Restore from a backup file ────────────────────────────────────────
    # Usage: bash manage.sh restore backups/db_20260723_020000.sql.gz
    BACKUP_FILE="${2:-}"
    if [ -z "$BACKUP_FILE" ]; then
      echo -e "${RED}Usage: bash manage.sh restore <backup_file>${NC}"
      echo "Example: bash manage.sh restore backups/db_20260723_020000.sql.gz"
      echo ""
      echo "Available backups:"
      ls "${SCRIPT_DIR}/backups/"*.sql.gz 2>/dev/null | xargs -I{} basename {} || echo "  None found"
      exit 1
    fi

    # Resolve path relative to script dir if not absolute
    [[ "$BACKUP_FILE" != /* ]] && BACKUP_FILE="${SCRIPT_DIR}/${BACKUP_FILE}"

    if [ ! -f "$BACKUP_FILE" ]; then
      echo -e "${RED}✗  File not found: ${BACKUP_FILE}${NC}"
      exit 1
    fi

    echo -e "${YELLOW}⚠  WARNING: This will REPLACE all current data with the backup.${NC}"
    echo -e "${YELLOW}   File: $(basename "$BACKUP_FILE")${NC}"
    echo ""
    read -p "   Type YES to confirm restore: " CONFIRM
    if [ "$CONFIRM" != "YES" ]; then
      echo "Restore cancelled."
      exit 0
    fi

    # Make sure postgres is running
    if ! $DC -f "$SCRIPT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running\|Up"; then
      echo -e "${CYAN}Starting PostgreSQL...${NC}"
      $DC -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres
      sleep 5
    fi

    echo -e "${CYAN}Restoring database from backup...${NC}"

    # Drop and recreate database, then restore
    $DC -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
      psql -U postgres -c "DROP DATABASE IF EXISTS postgres_restore_temp;" 2>/dev/null || true

    # Decompress and pipe into psql
    if [[ "$BACKUP_FILE" == *.gz ]]; then
      gunzip -c "$BACKUP_FILE" | $DC -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
        psql -U postgres postgres
    else
      $DC -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
        psql -U postgres postgres < "$BACKUP_FILE"
    fi

    echo -e "${GREEN}✓  Database restored from: $(basename "$BACKUP_FILE")${NC}"
    echo ""
    echo -e "${YELLOW}Restart the app to apply restored data:${NC}"
    echo "   bash manage.sh restart"
    ;;

  backup-setup)
    # ── Install daily automatic backup cron job ───────────────────────────
    BACKUP_SCRIPT="/opt/abccare-backup.sh"
    BACKUP_DIR="${SCRIPT_DIR}/backups"
    KEEP_DAYS=7

    echo -e "${CYAN}Installing automatic daily backup (2 AM)...${NC}"

    # Write the backup script
    cat > "$BACKUP_SCRIPT" << BSCRIPT
#!/bin/bash
# ABCare OmniFlow — Automated Daily Backup
# Runs via cron at 2 AM. Do not edit manually.
SCRIPT_DIR="${SCRIPT_DIR}"
BACKUP_DIR="${BACKUP_DIR}"
KEEP_DAYS=${KEEP_DAYS}
DATE=\$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/abccare-backup.log"

mkdir -p "\$BACKUP_DIR"

# Detect docker compose
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  echo "[\$(date)] ERROR: Docker not found" >> "\$LOG_FILE"
  exit 1
fi

# Check postgres is running
if ! \$DC -f "\$SCRIPT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running\|Up"; then
  echo "[\$(date)] WARN: PostgreSQL not running — skipping backup" >> "\$LOG_FILE"
  exit 0
fi

# Database backup
DB_FILE="\$BACKUP_DIR/db_\${DATE}.sql"
if \$DC -f "\$SCRIPT_DIR/docker-compose.yml" exec -T postgres pg_dump -U postgres postgres > "\$DB_FILE"; then
  gzip "\$DB_FILE"
  echo "[\$(date)] OK: db_\${DATE}.sql.gz" >> "\$LOG_FILE"
else
  echo "[\$(date)] ERROR: pg_dump failed" >> "\$LOG_FILE"
  rm -f "\$DB_FILE"
  exit 1
fi

# Uploads backup
if [ -d "\$SCRIPT_DIR/uploads" ] && [ -n "\$(ls -A "\$SCRIPT_DIR/uploads" 2>/dev/null)" ]; then
  tar -czf "\$BACKUP_DIR/uploads_\${DATE}.tar.gz" -C "\$SCRIPT_DIR" uploads/ 2>/dev/null
  echo "[\$(date)] OK: uploads_\${DATE}.tar.gz" >> "\$LOG_FILE"
fi

# Remove backups older than KEEP_DAYS
find "\$BACKUP_DIR" -name "*.sql.gz"    -mtime +\${KEEP_DAYS} -delete
find "\$BACKUP_DIR" -name "*.tar.gz"    -mtime +\${KEEP_DAYS} -delete

echo "[\$(date)] Backup complete. Files in \$BACKUP_DIR" >> "\$LOG_FILE"
BSCRIPT

    chmod +x "$BACKUP_SCRIPT"

    # Install cron job (runs at 2:00 AM daily)
    CRON_LINE="0 2 * * * $BACKUP_SCRIPT >> /var/log/abccare-backup.log 2>&1"
    # Remove any existing abccare backup cron entry first
    (crontab -l 2>/dev/null | grep -v "abccare-backup") | crontab -
    # Add the new entry
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

    echo -e "${GREEN}✓  Backup script installed: ${BACKUP_SCRIPT}${NC}"
    echo -e "${GREEN}✓  Cron job scheduled: daily at 2:00 AM${NC}"
    echo -e "${GREEN}✓  Backups saved to: ${BACKUP_DIR}/${NC}"
    echo -e "${GREEN}✓  Retention: ${KEEP_DAYS} days${NC}"
    echo -e "${GREEN}✓  Log file: /var/log/abccare-backup.log${NC}"
    echo ""
    echo "Run a test backup now:"
    echo "   bash manage.sh backup"
    echo ""
    echo "Check backup log:"
    echo "   tail -f /var/log/abccare-backup.log"
    ;;

  help|*)
    echo ""
    echo -e "${BOLD}ABCare OmniFlow — Management Script${NC}"
    echo ""
    echo "Usage: bash manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start          Start all services (Docker)"
    echo "  stop           Stop all services"
    echo "  restart        Stop then start"
    echo "  status         Show container status + health"
    echo "  logs           Tail app logs (Ctrl+C to exit)"
    echo "  build          Rebuild Docker image (after code changes)"
    echo "  security       Run security checks"
    echo "  update         git pull + rebuild + restart"
    echo "  backup         Create a manual backup right now"
    echo "  backup-list    Show all saved backups with sizes"
    echo "  backup-setup   Install daily 2 AM automatic backup cron"
    echo "  restore <file> Restore database from a backup file"
    echo ""
    ;;
esac
