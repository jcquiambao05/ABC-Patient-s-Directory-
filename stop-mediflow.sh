#!/bin/bash
# ABCare OmniFlow — Stop Script

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Stopping ABCare OmniFlow..."

# ── Stop by PID files ──────────────────────────────────────────────────────
for pidfile in .webapp_pid .ocr_pid .ollama_pid; do
  if [ -f "$SCRIPT_DIR/$pidfile" ]; then
    PID=$(cat "$SCRIPT_DIR/$pidfile")
    if ps -p "$PID" > /dev/null 2>&1; then
      kill -9 "$PID" 2>/dev/null && echo -e "${GREEN}✓ Stopped $(basename $pidfile .pid) (PID: $PID)${NC}"
    fi
    rm -f "$SCRIPT_DIR/$pidfile"
  fi
done

# ── Kill by process name ───────────────────────────────────────────────────
pkill -9 -f "tsx server.ts" 2>/dev/null && echo -e "${GREEN}✓ Killed tsx server${NC}"
pkill -9 -f "npm run dev" 2>/dev/null && echo -e "${GREEN}✓ Killed npm dev${NC}"
pkill -9 -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Killed vite${NC}"
pkill -9 -f "ocr_service.py" 2>/dev/null && echo -e "${GREEN}✓ Killed OCR service${NC}"

# ── Kill by port ───────────────────────────────────────────────────────────
for port in 3000 5000; do
  PIDS=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Freed port $port${NC}"
  fi
done

# ── Verify ─────────────────────────────────────────────────────────────────
sleep 1
for port in 3000 5000; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo -e "${RED}✗ Port $port still in use${NC}"
  else
    echo -e "${GREEN}✓ Port $port is free${NC}"
  fi
done

echo ""
echo "All services stopped. Run ./start-mediflow.sh to restart."
