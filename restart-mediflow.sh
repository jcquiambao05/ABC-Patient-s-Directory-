#!/bin/bash
# ABCare OmniFlow — Restart Script

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Restarting ABCare OmniFlow..."
echo ""

"$SCRIPT_DIR/stop-mediflow.sh"

echo ""
echo "Waiting 3 seconds..."
sleep 3
echo ""

"$SCRIPT_DIR/start-mediflow.sh"
