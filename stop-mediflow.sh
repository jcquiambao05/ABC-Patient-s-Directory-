#!/bin/bash
# ============================================================
# ABCare OmniFlow — LOCAL DEV STOP
# Stops the web app + Supabase database started by start-mediflow.sh
# NOT for Docker/production — use: bash manage.sh stop
#
# Usage:
#   bash stop-mediflow.sh           → stop app only (keep DB running)
#   bash stop-mediflow.sh --all     → stop app + Supabase database
#   bash stop-mediflow.sh --db-only → stop Supabase only
# ============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/.webapp_pid"

# Parse flags
STOP_APP=true
STOP_DB=false
for arg in "$@"; do
  case "$arg" in
    --all)     STOP_DB=true ;;
    --db-only) STOP_APP=false; STOP_DB=true ;;
  esac
done

echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   ABCare OmniFlow — Local Dev Stop${NC}"
if $STOP_DB && $STOP_APP; then
  echo -e "${BOLD}${CYAN}   Mode: App + Database (full stop)${NC}"
elif $STOP_DB; then
  echo -e "${BOLD}${CYAN}   Mode: Database only${NC}"
else
  echo -e "${BOLD}${CYAN}   Mode: App only (Supabase stays running)${NC}"
fi
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

STOPPED=0

# ════════════════════════════════════════════════════════════
# STOP WEB APP
# ════════════════════════════════════════════════════════════
if $STOP_APP; then
  echo ""
  echo -e "${BOLD}[1/2] Stopping web app...${NC}"

  # ── Kill by PID file ───────────────────────────────────────
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo -e "${CYAN}   Stopping app (PID $PID)...${NC}"
      kill "$PID" 2>/dev/null
      sleep 1
      # Force kill if still alive
      kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null
      echo -e "${GREEN}   ✓  App process stopped${NC}"
      STOPPED=1
    else
      echo -e "${YELLOW}   ⚠  PID $PID in .webapp_pid is no longer running${NC}"
    fi
    rm -f "$PID_FILE"
  else
    echo -e "${YELLOW}   ⚠  No .webapp_pid file found${NC}"
  fi

  # ── Kill anything still on port 3000 (safety net) ──────────
  PORT_PID=$(lsof -ti:3000 2>/dev/null)
  if [ -n "$PORT_PID" ]; then
    echo -e "${CYAN}   Clearing port 3000 (PID $PORT_PID)...${NC}"
    kill -9 $PORT_PID 2>/dev/null
    sleep 0.5
    echo -e "${GREEN}   ✓  Port 3000 cleared${NC}"
    STOPPED=1
  fi

  # ── Kill any stray tsx server.ts processes ──────────────────
  STRAY=$(pgrep -f "tsx server.ts" 2>/dev/null)
  if [ -n "$STRAY" ]; then
    echo -e "${CYAN}   Killing stray tsx process (PID $STRAY)...${NC}"
    kill -9 $STRAY 2>/dev/null
    echo -e "${GREEN}   ✓  Stray process killed${NC}"
    STOPPED=1
  fi

  if [ $STOPPED -eq 0 ] && ! $STOP_DB; then
    echo -e "${YELLOW}   App was already stopped${NC}"
  fi
fi

# ════════════════════════════════════════════════════════════
# STOP SUPABASE (DATABASE)
# ════════════════════════════════════════════════════════════
if $STOP_DB; then
  echo ""
  echo -e "${BOLD}[2/2] Stopping Supabase database...${NC}"

  if command -v supabase &>/dev/null; then
    # Check if Supabase is actually running first
    if pg_isready -h 127.0.0.1 -p 54322 -U postgres -q 2>/dev/null; then
      echo -e "${CYAN}   Running: supabase stop${NC}"
      cd "$SCRIPT_DIR"
      supabase stop 2>&1 | while IFS= read -r line; do
        echo -e "   ${line}"
      done
      echo -e "${GREEN}   ✓  Supabase stopped${NC}"
      STOPPED=1
    else
      echo -e "${YELLOW}   ⚠  Supabase is not running (port 54322 not active)${NC}"
    fi
  else
    echo -e "${RED}   ✗  supabase CLI not found — cannot stop database${NC}"
    echo -e "   Install it: https://supabase.com/docs/guides/cli"
  fi
fi

# ════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $STOPPED -eq 1 ]; then
  echo -e "${BOLD}${GREEN}   ✓  ABCare OmniFlow fully stopped${NC}"
else
  echo -e "${BOLD}${YELLOW}   Nothing was running — already stopped${NC}"
fi
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   ${BOLD}Restart everything:${NC}  bash start-mediflow.sh"
echo -e "   ${BOLD}Logs (last session):${NC} tail -f .webapp_dev.log"
echo ""
