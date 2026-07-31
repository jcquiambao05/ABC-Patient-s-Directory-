#!/bin/bash
# ============================================================
# ABCare OmniFlow — LOCAL DEV START
# For local testing with Supabase + npm run dev
# NOT for Docker/production — use manage.sh for that
# ============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/.webapp_pid"

echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   ABCare OmniFlow — Local Dev Start${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Kill anything already on port 3000 ──────────────────────────────────
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  echo -e "${YELLOW}⚠  Port 3000 in use (PID $PORT_PID) — killing...${NC}"
  kill -9 $PORT_PID 2>/dev/null
  sleep 1
fi

# ── Kill previous PID if stale ───────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill -0 "$OLD_PID" 2>/dev/null && kill "$OLD_PID" 2>/dev/null
  rm -f "$PID_FILE"
fi

# ── Check Supabase is running ────────────────────────────────────────────
echo -e "${CYAN}   Checking Supabase...${NC}"
if ! pg_isready -h 127.0.0.1 -p 54322 -U postgres -q 2>/dev/null; then
  echo -e "${YELLOW}⚠  Supabase not detected on port 54322${NC}"
  echo -e "${YELLOW}   Starting Supabase...${NC}"
  supabase start 2>/dev/null &
  # Wait up to 30s for Supabase
  for i in {1..30}; do
    pg_isready -h 127.0.0.1 -p 54322 -U postgres -q 2>/dev/null && break
    sleep 1
  done
  if ! pg_isready -h 127.0.0.1 -p 54322 -U postgres -q 2>/dev/null; then
    echo -e "${RED}✗  Supabase failed to start. Run: supabase start${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓  Supabase is running${NC}"

# ── Start the web app ────────────────────────────────────────────────────
echo -e "${CYAN}   Starting web app (npm run dev)...${NC}"
cd "$SCRIPT_DIR"

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Start in background, log to .webapp_dev.log
nohup npm run dev > "$SCRIPT_DIR/.webapp_dev.log" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"

# ── Wait for health check ────────────────────────────────────────────────
echo -e "${CYAN}   Waiting for app to respond...${NC}"
for i in {1..30}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo ""
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${GREEN}   ✓  ABCare OmniFlow is ready!${NC}"
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "   ${BOLD}Open in browser:${NC}  http://localhost:3000"
    echo -e "   ${BOLD}PID:${NC}              $APP_PID  (saved to .webapp_pid)"
    echo -e "   ${BOLD}Logs:${NC}             tail -f .webapp_dev.log"
    echo -e "   ${BOLD}Stop:${NC}             ./stop-mediflow.sh"
    echo ""
    exit 0
  fi
  sleep 2
done

echo -e "${RED}✗  App did not respond in time.${NC}"
echo "   Check logs: tail -f .webapp_dev.log"
exit 1
