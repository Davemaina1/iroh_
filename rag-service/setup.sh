#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo ""
echo "Setup complete. To start the sidecar:"
echo "  cd $(pwd) && ./run.sh"
