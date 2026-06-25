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

  help|*)
    echo ""
    echo -e "${BOLD}ABCare OmniFlow — Management Script${NC}"
    echo ""
    echo "Usage: bash manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start      Start all services (Docker)"
    echo "  stop       Stop all services"
    echo "  restart    Stop then start"
    echo "  status     Show container status + health"
    echo "  logs       Tail app logs (Ctrl+C to exit)"
    echo "  build      Rebuild Docker image (after code changes)"
    echo "  security   Run security checks"
    echo "  update     git pull + rebuild + restart"
    echo ""
    ;;
esac
