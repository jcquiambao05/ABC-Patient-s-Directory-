#!/bin/bash
# ABCare OmniFlow — Start Script (Post-Overhaul)
# Starts: Web App (Node + Vite), Ollama AI (optional), OCR Service (optional)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

check_port() { lsof -i:"$1" > /dev/null 2>&1; }

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   ABCare OmniFlow — Clinic Management System${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

OLLAMA_STATUS="skipped"
OCR_STATUS="skipped"
WEBAPP_STATUS="starting"

# ── Step 1: Kill anything on port 3000 first ──────────────────────────────
if check_port 3000; then
  echo -e "${YELLOW}   Clearing port 3000...${NC}"
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  sleep 2
fi

# ── Step 2: Ollama AI (optional) ──────────────────────────────────────────
echo -e "${BLUE}[1/3] AI Assistant (Ollama)${NC}"
if ! command -v ollama &> /dev/null; then
  echo -e "      ${YELLOW}⚠  Ollama not installed — chatbot unavailable${NC}"
  OLLAMA_STATUS="not installed"
else
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "      ${GREEN}✓  Ollama already running${NC}"
    OLLAMA_STATUS="running"
  else
    echo -e "      ${BLUE}   Starting Ollama...${NC}"
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    echo $OLLAMA_PID > "$SCRIPT_DIR/.ollama_pid"
    for i in {1..10}; do
      sleep 1
      if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "      ${GREEN}✓  Ollama started (PID: $OLLAMA_PID)${NC}"
        OLLAMA_STATUS="started"
        break
      fi
      [ "$i" -eq 10 ] && { echo -e "      ${YELLOW}⚠  Ollama slow to start${NC}"; OLLAMA_STATUS="slow"; }
    done
  fi
  if ollama list 2>/dev/null | grep -q "llama3.2"; then
    echo -e "      ${GREEN}✓  llama3.2 model ready${NC}"
  else
    echo -e "      ${YELLOW}⚠  llama3.2 not found — pulling now (~2GB)...${NC}"
    ollama pull llama3.2 && echo -e "      ${GREEN}✓  llama3.2 downloaded${NC}" \
      || echo -e "      ${RED}✗  Pull failed${NC}"
  fi
fi
echo ""

# ── Step 3: OCR Service (optional) ────────────────────────────────────────
echo -e "${BLUE}[2/3] OCR Service (chart pre-fill)${NC}"
OCR_FILE="$SCRIPT_DIR/ocr_service.py"
if [ ! -f "$OCR_FILE" ]; then
  echo -e "      ${YELLOW}⚠  ocr_service.py not found — chart pre-fill unavailable${NC}"
  OCR_STATUS="file missing"
else
  MISSING_DEPS=""
  python3 -c "import flask" 2>/dev/null        || MISSING_DEPS="$MISSING_DEPS flask"
  python3 -c "import pytesseract" 2>/dev/null  || MISSING_DEPS="$MISSING_DEPS pytesseract"
  python3 -c "from PIL import Image" 2>/dev/null || MISSING_DEPS="$MISSING_DEPS Pillow"
  if [ -n "$MISSING_DEPS" ]; then
    echo -e "      ${YELLOW}⚠  Missing Python packages:${MISSING_DEPS} — OCR skipped${NC}"
    OCR_STATUS="deps missing"
  else
    check_port 5000 && { lsof -ti:5000 | xargs kill -9 2>/dev/null; sleep 1; }
    nohup python3 "$OCR_FILE" > "$SCRIPT_DIR/ocr_service.log" 2>&1 &
    OCR_PID=$!
    echo $OCR_PID > "$SCRIPT_DIR/.ocr_pid"
    sleep 3
    if check_port 5000; then
      echo -e "      ${GREEN}✓  OCR service started (PID: $OCR_PID)${NC}"
      OCR_STATUS="running (PID: $OCR_PID)"
    else
      echo -e "      ${YELLOW}⚠  OCR failed to start — check ocr_service.log${NC}"
      OCR_STATUS="failed"
    fi
  fi
fi
echo ""

# ── Step 4: Web Application (required) ────────────────────────────────────
echo -e "${BLUE}[3/3] Web Application${NC}"
if ! command -v node &> /dev/null; then
  echo -e "      ${RED}✗  Node.js not installed${NC}"; exit 1
fi
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo -e "      ${YELLOW}   Installing dependencies...${NC}"
  npm install --prefix "$SCRIPT_DIR" || { echo -e "      ${RED}✗  npm install failed${NC}"; exit 1; }
fi

nohup npm run dev --prefix "$SCRIPT_DIR" > "$SCRIPT_DIR/webapp.log" 2>&1 &
WEBAPP_PID=$!
echo $WEBAPP_PID > "$SCRIPT_DIR/.webapp_pid"

echo -e "      ${BLUE}   Waiting for app to be ready...${NC}"
for i in {1..20}; do
  sleep 1
  if python3 -c "import socket; s=socket.socket(); s.settimeout(1); r=s.connect_ex(('127.0.0.1',3000)); s.close(); exit(0 if r==0 else 1)" 2>/dev/null; then
    echo -e "      ${GREEN}✓  Web app started (PID: $WEBAPP_PID)${NC}"
    WEBAPP_STATUS="running (PID: $WEBAPP_PID)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo -e "      ${RED}✗  Web app did not start in time${NC}"
    echo -e "      ${RED}   Check webapp.log for errors:${NC}"
    tail -20 "$SCRIPT_DIR/webapp.log"
    exit 1
  fi
done

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}   ✓  ABCare OmniFlow is ready!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   ${BOLD}Open in browser:${NC}  http://localhost:3000"
echo ""
echo -e "   ${BOLD}Service Status:${NC}"
echo -e "   ├─ Web App     ${GREEN}●${NC}  $WEBAPP_STATUS"
if [[ "$OLLAMA_STATUS" == "running" || "$OLLAMA_STATUS" == "started" ]]; then
  echo -e "   ├─ AI Chat     ${GREEN}●${NC}  $OLLAMA_STATUS"
else
  echo -e "   ├─ AI Chat     ${YELLOW}○${NC}  $OLLAMA_STATUS"
fi
if [[ "$OCR_STATUS" == running* ]]; then
  echo -e "   └─ OCR Scan    ${GREEN}●${NC}  $OCR_STATUS"
else
  echo -e "   └─ OCR Scan    ${YELLOW}○${NC}  $OCR_STATUS"
fi
echo ""
echo -e "   ${BOLD}Logs:${NC}  tail -f webapp.log"
echo -e "   ${BOLD}Stop:${NC}  ./stop-mediflow.sh"
echo ""
