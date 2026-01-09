#!/bin/bash
# Project Sentinel - Automated Setup Script
# This script sets up the complete environment for Sentinel v2

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/sentinel-frontend"
BACKEND_DIR="$PROJECT_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🛡️  PROJECT SENTINEL - Quick Start 🛡️          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Project Directory: $PROJECT_DIR"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 1. Check prerequisites
print_status "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not found. Install with: sudo apt install python3 python3-venv"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing frontend dependencies will fail."
    print_warning "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_warning "npm not found. Skipping frontend setup."
    SKIP_FRONTEND=1
else
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION found"
fi

echo ""

# 2. Create Python virtual environment
print_status "Setting up Python environment..."

if [ -d "$BACKEND_DIR/.venv" ]; then
    print_warning "Virtual environment already exists at $BACKEND_DIR/.venv"
    read -p "Do you want to recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$BACKEND_DIR/.venv"
        python3 -m venv "$BACKEND_DIR/.venv"
        print_success "Virtual environment recreated"
    fi
else
    python3 -m venv "$BACKEND_DIR/.venv"
    print_success "Virtual environment created at $BACKEND_DIR/.venv"
fi

# Activate virtual environment
source "$BACKEND_DIR/.venv/bin/activate"
print_success "Virtual environment activated"

# 3. Install Python dependencies
print_status "Installing Python dependencies..."
echo "(This may take a few minutes...)"
echo ""

pip install --upgrade pip setuptools wheel > /dev/null 2>&1
print_success "pip, setuptools, wheel updated"

# Install requirements
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    pip install -r "$BACKEND_DIR/requirements.txt" 2>&1 | grep -E "^(Successfully|Collecting|Installing|Requirement)" | head -20
    print_success "Python dependencies installed"
    
    # Verify critical packages
    echo ""
    print_status "Verifying critical packages..."
    
    CRITICAL_PACKAGES=("fastapi" "scapy" "pydantic" "uvicorn" "aiofiles")
    
    for pkg in "${CRITICAL_PACKAGES[@]}"; do
        if python3 -c "import ${pkg//-/_}" 2>/dev/null; then
            VERSION=$(pip show "$pkg" 2>/dev/null | grep Version | cut -d' ' -f2)
            print_success "$pkg ($VERSION)"
        else
            print_warning "$pkg - NOT FOUND"
        fi
    done
else
    print_error "requirements.txt not found"
    exit 1
fi

echo ""

# 4. Install frontend dependencies (optional)
if [ -z "$SKIP_FRONTEND" ] && [ -d "$FRONTEND_DIR" ]; then
    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    
    if [ -f "package.json" ]; then
        npm install 2>&1 | tail -5
        print_success "Frontend dependencies installed"
    else
        print_error "package.json not found in $FRONTEND_DIR"
    fi
    
    cd "$BACKEND_DIR"
else
    print_warning "Skipping frontend setup (Node.js/npm not available)"
fi

echo ""
print_success "Setup complete!"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  🚀 NEXT STEPS 🚀                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Activate the virtual environment:"
echo "   source $BACKEND_DIR/.venv/bin/activate"
echo ""
echo "2️⃣  Start the backend server (in terminal 1):"
echo "   cd $BACKEND_DIR"
echo "   source .venv/bin/activate"
echo "   python3 sentinel_core/run_server.py"
echo ""
echo "3️⃣  Start the frontend (in terminal 2):"
echo "   cd $FRONTEND_DIR"
echo "   npm start"
echo ""
echo "4️⃣  Open browser to http://localhost:3000"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          📚 HTTPS Decryption Setup (Optional) 📚       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "For HTTPS traffic decryption with Wireshark:"
echo ""
echo "Option A - Browser SSLKEYLOG (Recommended):"
echo "  export SSLKEYLOGFILE=/tmp/ssl_keys.log"
echo "  firefox &  # or google-chrome"
echo "  # Browse HTTPS sites, keys saved to /tmp/ssl_keys.log"
echo ""
echo "Option B - Wireshark Setup:"
echo "  cd $BACKEND_DIR"
echo "  source .venv/bin/activate"
echo "  python3 -c \"from sentinel_core.capture.tls_decryption import WiresharkExporter; WiresharkExporter.create_wireshark_config('/tmp/ssl_keys.log')\""
echo ""
echo "Option C - Ettercap MITM (Lab use only, requires authorization):"
echo "  cd $BACKEND_DIR"
echo "  source .venv/bin/activate"
echo "  sudo python3 -c \"from sentinel_core.capture.tls_decryption import setup_tls_decryption; setup_tls_decryption()\""
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Keep venv activated
exec $SHELL

echo -e "${GREEN}[+] Frontend ready${NC}"

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}To start Sentinel:${NC}"
echo ""
echo "Terminal 1 (Backend - REQUIRES ROOT):"
echo "  cd /home/kali/BE"
echo "  source .venv/bin/activate"
echo "  sudo .venv/bin/python sentinel_core/run_server.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd /home/kali/BE/sentinel-frontend"
echo "  npm start"
echo ""
echo -e "${BLUE}Then open http://localhost:3000 in your browser${NC}"
echo ""
echo "API Docs: http://localhost:8000/docs"
echo "WebSocket: ws://localhost:8000/ws"
echo ""
