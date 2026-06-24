#!/bin/bash
# ABCare OmniFlow — Security Check (pre-push)
# Usage: bash deploy_security_check.sh
# Renamed from security-check.sh for deployment clarity
exec bash "$(dirname "$0")/security-check.sh"
