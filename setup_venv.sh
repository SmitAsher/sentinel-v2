#!/usr/bin/env bash
set -euo pipefail

# Create a Python virtual environment in .venv and install requirements
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required"
  exit 1
fi

python3 -m venv .venv
echo "Created virtualenv at .venv"

# Activate and install
source .venv/bin/activate
python -m pip install --upgrade pip
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

echo "Setup complete. Activate with: source .venv/bin/activate"
