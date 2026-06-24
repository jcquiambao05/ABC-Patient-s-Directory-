#!/bin/bash
# ============================================================
# ABCare OmniFlow — Start (Docker)
# Usage: bash deploy_start.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   ABCare OmniFlow — Starting Services${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo -e "${YELLOW}⚠  .env not found — copying from .env.example${NC}"
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  echo -e "${YELLOW}   Edit .env before going to production!${NC}"
fi

# Detect docker compose command
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  echo -e "${RED}✗  Docker not found. Install Docker first.${NC}"; exit 1
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
    echo -e "   ${BOLD}Stop:${NC}             bash deploy_stop.sh"
    echo -e "   ${BOLD}Logs:${NC}             $DC logs -f app"
    echo ""
    exit 0
  fi
  sleep 3
done

echo -e "${RED}✗  App did not start in time. Check logs:${NC}"
echo "   $DC logs app"
exit 1
