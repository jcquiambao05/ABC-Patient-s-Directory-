#!/bin/bash

# ABC Patient Directory AI - Stop Script
# Kills ALL MediFlow processes (Node, Python, npm, PostgreSQL connections, etc.)

echo "Stopping ABCare Clinic Management ..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ── Stop Ollama only if WE started it (don't kill system-wide Ollama) ──
if [ -f "$SCRIPT_DIR/.ollama_pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.ollama_pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Ollama (PID: $PID)${NC}"
    fi
    rm "$SCRIPT_DIR/.ollama_pid"
else
    echo -e "${YELLOW}ℹ️  Ollama was not started by this script — leaving it running${NC}"
fi

# Kill by PID files
if [ -f "$SCRIPT_DIR/.ocr_pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.ocr_pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped OCR service (PID: $PID)${NC}"
    fi
    rm "$SCRIPT_DIR/.ocr_pid"
fi

if [ -f "$SCRIPT_DIR/.webapp_pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.webapp_pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null && echo -e "${GREEN}✅ Stopped web app (PID: $PID)${NC}"
    fi
    rm "$SCRIPT_DIR/.webapp_pid"
fi

# Kill by port (with force)
echo ""
echo " Killing processes on ports..."
for port in 5000 3000 5432; do
    if lsof -ti:$port > /dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null && echo -e "${GREEN}✅ Killed port $port${NC}"
    fi
done

# Kill by process name (OCR services)
echo ""
echo "🏥 ABC Patient Directory OCR processes..."
pkill -9 -f "ocr_service_simple.py" 2>/dev/null && echo -e "${GREEN}✅ Killed OCR simple service${NC}"
pkill -9 -f "ocr_service_with_templates.py" 2>/dev/null && echo -e "${GREEN}✅ Killed OCR template service${NC}"

# Kill npm and build processes
echo ""
echo " Killing npm and build processes..."
pkill -9 -f "npm run dev" 2>/dev/null && echo -e "${GREEN}✅ Killed npm dev${NC}"
pkill -9 -f "vite" 2>/dev/null && echo -e "${GREEN}✅ Killed vite${NC}"
pkill -9 -f "tsx.*server.ts" 2>/dev/null && echo -e "${GREEN}✅ Killed tsx server${NC}"
pkill -9 -f "tsx watch" 2>/dev/null && echo -e "${GREEN}✅ Killed tsx watch${NC}"
pkill -9 -f "esbuild" 2>/dev/null && echo -e "${GREEN}✅ Killed esbuild${NC}"

# Kill any node processes in this directory
echo ""
echo " Killing Node.js processes in project..."
ps aux | grep node | grep "$SCRIPT_DIR" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null && echo -e "${GREEN}✅ Killed project node processes${NC}"

# Kill any Python processes related to mediflow
echo ""
echo "🧹 Killing Python processes..."
ps aux | grep python | grep mediflow | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null && echo -e "${GREEN}✅ Killed mediflow python processes${NC}"
ps aux | grep python | grep "ocr_service" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null && echo -e "${GREEN}✅ Killed OCR python processes${NC}"

# Kill any remaining Flask processes
pkill -9 -f "flask" 2>/dev/null && echo -e "${GREEN}✅ Killed flask processes${NC}"

# Final cleanup - kill all node processes (nuclear option)
echo ""
echo "🧹 Final cleanup (nuclear option)..."
if pgrep -x "node" > /dev/null; then
    killall -9 node 2>/dev/null && echo -e "${YELLOW}⚠️  Killed all node processes${NC}"
fi

# Kill any remaining npm processes
if pgrep -x "npm" > /dev/null; then
    killall -9 npm 2>/dev/null && echo -e "${YELLOW}⚠️  Killed all npm processes${NC}"
fi

# Verify ports are free
echo ""
echo "🔍 Verifying ports are free..."
for port in 5000 3000; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${RED}❌ Port $port still in use!${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
    else
        echo -e "${GREEN}✅ Port $port is free${NC}"
    fi
done

echo ""
echo -e "${GREEN} All ABCare processes stopped!${NC}"
echo ""
echo "To start again: ./start-mediflow.sh"
echo ""
