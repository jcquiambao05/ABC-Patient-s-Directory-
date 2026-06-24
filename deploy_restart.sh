#!/bin/bash
# ABCare OmniFlow — Restart (Docker)
# Usage: bash deploy_restart.sh
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Restarting ABCare OmniFlow..."
bash "$SCRIPT_DIR/deploy_stop.sh"
echo "Waiting 3 seconds..."
sleep 3
bash "$SCRIPT_DIR/deploy_start.sh"
