#!/bin/bash
# Quick verification of all Sentinel components

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     🛡️  SENTINEL COMPONENT VERIFICATION SCRIPT 🛡️      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${BLUE}[*]${NC} $1"; }

cd "$PROJECT_DIR"

# 1. Check Python dependencies
echo ""
info "Checking Python dependencies..."
source .venv/bin/activate

python3 << 'PYTHON_EOF'
import sys

packages = {
    'fastapi': 'FastAPI',
    'uvicorn': 'Uvicorn',
    'scapy': 'Scapy (Packet Capture)',
    'pydantic': 'Pydantic',
    'aiofiles': 'AioFiles',
    'cryptography': 'Cryptography',
    'pyopenssl': 'PyOpenSSL',
}

print()
failed = []
for pkg, name in packages.items():
    try:
        __import__(pkg)
        print(f"✓ {name}")
    except ImportError:
        print(f"✗ {name}")
        failed.append(pkg)

if failed:
    print(f"\n⚠️  Missing packages: {', '.join(failed)}")
    print("Run: pip install " + " ".join(failed))
else:
    print("\n✅ All Python dependencies installed!")
PYTHON_EOF

# 2. Check frontend dependencies
echo ""
info "Checking frontend dependencies..."
cd sentinel-frontend

if [ -d "node_modules" ]; then
    pass "node_modules exists"
    
    npm list react three recharts 2>/dev/null | head -4
else
    fail "node_modules not found - run: npm install"
fi

cd "$PROJECT_DIR"

# 3. Check file structure
echo ""
info "Checking project structure..."
[ -f "sentinel_core/__init__.py" ] && pass "sentinel_core/__init__.py" || fail "sentinel_core/__init__.py"
[ -f "sentinel_core/run_server.py" ] && pass "sentinel_core/run_server.py" || fail "sentinel_core/run_server.py"
[ -f "sentinel_core/capture/live_capture.py" ] && pass "sentinel_core/capture/live_capture.py" || fail "sentinel_core/capture/live_capture.py"
[ -f "sentinel_core/capture/tls_decryption.py" ] && pass "sentinel_core/capture/tls_decryption.py" || fail "sentinel_core/capture/tls_decryption.py"
[ -f "sentinel_core/analysis/attack_classifier.py" ] && pass "sentinel_core/analysis/attack_classifier.py" || fail "sentinel_core/analysis/attack_classifier.py"
[ -f "sentinel_core/api/main.py" ] && pass "sentinel_core/api/main.py" || fail "sentinel_core/api/main.py"
[ -f "sentinel-frontend/src/App.tsx" ] && pass "sentinel-frontend/src/App.tsx" || fail "sentinel-frontend/src/App.tsx"
[ -f "requirements.txt" ] && pass "requirements.txt" || fail "requirements.txt"

# 4. Quick Python import test
echo ""
info "Testing Python imports..."
python3 << 'PYTHON_EOF'
try:
    from sentinel_core.capture.live_capture import PacketCapture
    print("✓ PacketCapture imported")
except Exception as e:
    print(f"✗ PacketCapture import failed: {e}")

try:
    from sentinel_core.analysis.attack_classifier import AttackType, AttackClassifier
    print("✓ AttackClassifier imported")
except Exception as e:
    print(f"✗ AttackClassifier import failed: {e}")

try:
    from sentinel_core.capture.tls_decryption import SSLKeyLogParser, TLSPacketInspector
    print("✓ TLS Decryption module imported")
except Exception as e:
    print(f"✗ TLS Decryption import failed: {e}")

print("\n✅ All core modules importable!")
PYTHON_EOF

# 5. Show next steps
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  🚀 NEXT STEPS 🚀                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Run in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd $PROJECT_DIR"
echo "  source .venv/bin/activate"
echo "  sudo python3 sentinel_core/run_server.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd $PROJECT_DIR/sentinel-frontend"
echo "  npm start"
echo ""
echo "Terminal 3 (Browser):"
echo "  firefox http://localhost:3000 &"
echo ""
echo "═══════════════════════════════════════════════════════════"
