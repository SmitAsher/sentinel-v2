# Project Sentinel v2.0 — Operations Cheat Sheet

## Quick Commands

### Setup
```bash
# Initial setup (one time)
cd /home/kali/BE
chmod +x quick_start.sh
./quick_start.sh

# Or manual setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd sentinel-frontend && npm install
```

### Running the System

**Terminal 1: Backend (requires root)**
```bash
cd /home/kali/BE
source .venv/bin/activate
sudo .venv/bin/python sentinel_core/run_server.py
# Or with environment variables
export SSLKEYLOGFILE=/tmp/sslkeys.log
export SENTINEL_INTERFACE=eth0
sudo .venv/bin/python sentinel_core/run_server.py
```

**Terminal 2: Frontend**
```bash
cd /home/kali/BE/sentinel-frontend
npm start
# Opens http://localhost:3000 automatically
```

### Accessing the System
- **Dashboard**: http://localhost:3000 (Globe, Analytics)
- **API Docs**: http://localhost:8000/docs (Swagger)
- **WebSocket Test**: `wscat -c ws://localhost:8000/ws`

---

## API Quick Reference

### Get Current Flows
```bash
curl http://localhost:8000/api/flows | jq
curl http://localhost:8000/api/flows?limit=5 | jq '.flows[].attack_type'
curl http://localhost:8000/api/flows?attack_type=SQL_INJECTION | jq
```

### Get Alerts
```bash
curl http://localhost:8000/api/alerts | jq
curl http://localhost:8000/api/alerts?severity=critical | jq
```

### Get Statistics
```bash
curl http://localhost:8000/api/analytics/stats | jq
curl http://localhost:8000/api/analytics/attack-distribution | jq
curl http://localhost:8000/api/analytics/cvss-histogram | jq
curl http://localhost:8000/api/analytics/timeline | jq
```

### WebSocket (Raw JSON events)
```bash
# Using wscat (npm install -g wscat)
wscat -c ws://localhost:8000/ws

# Or using websocat
websocat ws://localhost:8000/ws
```

---

## TLS Decryption Recipes

### Firefox SSLKEYLOG
```bash
export SSLKEYLOGFILE=/tmp/sslkeys.log
firefox &
# Browse normally
# Keys saved to /tmp/sslkeys.log
```

### Wireshark with Decryption
```bash
# 1. Set environment and capture
export SSLKEYLOGFILE=/tmp/sslkeys.log
# Run app/browser that creates traffic

# 2. Open Wireshark
sudo wireshark

# 3. Edit → Preferences → Protocols → TLS
#    Set (Pre)-Master-Secret log filename: /tmp/sslkeys.log

# 4. Open pcap file, view decrypted HTTP/TLS
```

### Ettercap MITM (Lab Only)
```bash
# Generate custom CA
openssl genrsa -out /tmp/ca.key 2048
openssl req -new -x509 -days 365 -key /tmp/ca.key -out /tmp/ca.crt

# Run Ettercap with MITM
sudo ettercap -T -q -i eth0 -M ARP:remote /192.168.1.0/24/ /192.168.1.1/
# Configure Ettercap to use custom CA (advanced)
# Export SSL keys for Sentinel analysis
```

---

## Troubleshooting

### Backend Issues

**"Permission denied" on capture**
```bash
# Option 1: Use setcap
sudo setcap cap_net_raw=ep ~/.venv/bin/python3
# Then run without sudo
python3 sentinel_core/run_server.py

# Option 2: Run with sudo (always works)
sudo .venv/bin/python sentinel_core/run_server.py
```

**No flows appearing**
```bash
# Check if interface has traffic
sudo tcpdump -i eth0 -n -c 5

# Check network interface name
ip link show
export SENTINEL_INTERFACE=<name>

# Check if Sentinel is listening
netstat -tulpn | grep 8000
```

**Scapy import error**
```bash
# Install system dependencies
sudo apt-get install libpcap-dev libssl-dev
pip install --upgrade scapy
```

### Frontend Issues

**CORS errors**
```bash
# Make sure backend is running on 0.0.0.0
curl http://localhost:8000/health

# Check frontend is connecting to right API
# (should be http://localhost:8000 in development)
```

**Three.js globe not rendering**
```bash
# Check browser console for errors
# Ensure WebGL support
# Try different browser (Firefox/Chrome)
```

**WebSocket connection fails**
```bash
# Backend must be running
curl http://localhost:8000/health

# Test WebSocket directly
wscat -c ws://localhost:8000/ws
```

---

## Performance Tuning

### Increase Capture Rate
```bash
# Increase number of flows kept in memory
# Edit sentinel_core/api/main.py: alerts_db = deque(maxlen=10000)
# Restart backend
```

### Reduce Memory Usage
```bash
# Decrease flow retention
# Edit sentinel_core/api/main.py: maxlen=100 (smaller)
```

### Frontend Optimization
```bash
# Reduce number of particles on globe
# Edit sentinel-frontend/src/components/Globe.tsx:
# Change flows={flows} to flows={flows.slice(0, 50)}
```

---

## Attack Pattern Testing

### Generate SQL Injection Detection
```bash
# Create a fake attack flow
curl -X POST http://localhost:8000/api/test/sql-injection \
  -H "Content-Type: application/json" \
  -d '{"url": "/?id=1 OR 1=1", "method": "GET"}'
```

### Generate XSS Detection
```bash
# These patterns should trigger XSS detection
# In packet payload: <script>alert(1)</script>
# In SNI: javascript:alert('xss')
```

### DDoS Simulation
```bash
# Simulate high-rate traffic
for i in {1..1000}; do
  curl http://target.local/ &
done
wait
```

---

## Export & Analysis

### Export Flows to JSON
```bash
# From Sentinel Python console
from sentinel_core.capture.live_capture import PacketCapture
cap = PacketCapture()
cap.export_flows('/tmp/flows.json')
```

### Parse Alerts
```bash
curl http://localhost:8000/api/alerts | jq '.alerts[] | {type, severity, cvss_score}'
```

### Timeline Analysis
```bash
curl http://localhost:8000/api/analytics/timeline?hours=12 | \
  jq '.timeline | to_entries[] | "\(.key): \(.value)"'
```

---

## Environment Setup Reference

### Kali Linux Full Install
```bash
# System packages
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-dev \
  libpcap-dev libssl-dev wireshark-common ettercap-text-only \
  nodejs npm git curl

# Install Sentinel
git clone <repo> /home/kali/BE
cd /home/kali/BE
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd sentinel-frontend
npm install
```

### Docker (Future)
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.yml up -d

# Logs
docker-compose logs -f sentinel-backend
docker-compose logs -f sentinel-frontend

# Stop
docker-compose down
```

---

## Common Workflows

### 1. Analyze Network Segment
```bash
export SENTINEL_INTERFACE=eth0
sudo python3 sentinel_core/run_server.py &
sleep 2
open http://localhost:3000
# Let it run for 5-10 minutes
# Export flows to JSON
curl http://localhost:8000/api/flows > /tmp/flows.json
jq '.flows[] | select(.cvss_score >= 7.0)' /tmp/flows.json
```

### 2. Monitor for Specific Attack
```bash
# Start backend
sudo python3 sentinel_core/run_server.py &

# Watch for SQL injection
watch -n 1 'curl -s http://localhost:8000/api/flows?attack_type=SQL_INJECTION | jq ".count"'
```

### 3. Decrypt HTTPS Traffic
```bash
# Start sniffer
export SSLKEYLOGFILE=/tmp/ssl.log
firefox &  # Generate HTTPS traffic

# In Sentinel
export SSLKEYLOGFILE=/tmp/ssl.log
sudo python3 sentinel_core/run_server.py

# View in Wireshark
sudo wireshark
# Preferences → Protocols → TLS → Log file: /tmp/ssl.log
```

### 4. Generate Report
```bash
# Fetch all data
curl http://localhost:8000/api/flows > /tmp/flows.json
curl http://localhost:8000/api/alerts > /tmp/alerts.json
curl http://localhost:8000/api/analytics/stats > /tmp/stats.json

# Parse and create report
jq '.flows | length' /tmp/flows.json  # Total flows
jq '.alerts | length' /tmp/alerts.json  # Total alerts
jq '.severity_distribution' /tmp/stats.json  # Breakdown
```

---

## Key Metrics to Monitor

- **Total Flows**: `GET /api/analytics/stats` → `total_flows`
- **Critical Alerts**: `GET /api/alerts?severity=critical` → count
- **Attack Distribution**: `GET /api/analytics/attack-distribution`
- **CVSS Score Breakdown**: `GET /api/analytics/cvss-histogram`
- **Threat Timeline**: `GET /api/analytics/timeline`

---

## Support & Documentation

- **Architecture**: See [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)
- **Implementation**: See [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **API Docs**: http://localhost:8000/docs
- **Project Details**: See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
