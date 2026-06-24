#!/bin/bash
# ============================================================
# ABCare OmniFlow — Stop (Docker)
# Usage: bash deploy_stop.sh
# ============================================================
GREEN='\033[0;32m'; NC='\033[0m'
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if docker compose version &>/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose &>/dev/null; then DC="docker-compose"
else echo "Docker not found"; exit 1; fi

echo "Stopping ABCare OmniFlow..."
$DC -f "$SCRIPT_DIR/docker-compose.yml" down
echo -e "${GREEN}✓  All services stopped.${NC}"
echo "   Run bash deploy_start.sh to restart."
