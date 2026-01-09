# 🛡️ Project Sentinel - Setup Verification Guide

## ✅ Installation Status

### Backend Dependencies
```bash
source .venv/bin/activate
pip list | grep -E "scapy|fastapi|uvicorn|cryptography|pydantic"
```

**Expected Output:**
- ✅ fastapi 0.128.0+
- ✅ scapy 2.7.0+
- ✅ uvicorn 0.40.0+
- ✅ cryptography 46.0.0+
- ✅ pydantic 2.0+
- ✅ aiofiles
- ✅ pyopenssl 25.3.0+

### Frontend Dependencies
```bash
cd sentinel-frontend
npm list | grep -E "react|three|recharts"
```

**Expected Output:**
- ✅ react 18.2.0+
- ✅ react-dom 18.2.0+
- ✅ three 0.160.0+
- ✅ recharts 2.10.0+

---

## 🚀 Running the System

### Terminal 1: Backend Server
```bash
cd /home/kali/BE
source .venv/bin/activate
sudo python3 sentinel_core/run_server.py
```

**Expected Output:**
```
🛡️  Sentinel Core Server Started
[INFO] FastAPI server running on http://0.0.0.0:8000
[INFO] WebSocket endpoint: ws://localhost:8000/ws
[INFO] Packet capture started on eth0
[INFO] Processing live network traffic...
```

### Terminal 2: Frontend Server
```bash
cd /home/kali/BE/sentinel-frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view sentinel-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### Terminal 3: Access Dashboard
```bash
# Open in your browser
firefox http://localhost:3000 &
```

**Expected Views:**
1. **Dashboard Tab**: Real-time packet statistics
2. **Globe Tab**: 3D globe with packet animation
3. **Analytics Tab**: Traffic charts and attack classification

---

## 🔐 HTTPS Decryption & Wireshark Integration

### Option A: Browser SSLKEYLOG (Recommended)
```bash
export SSLKEYLOGFILE=/tmp/ssl_keys.log
firefox &
# Browse HTTPS sites (e.g., https://www.google.com)
# Keys are automatically logged to /tmp/ssl_keys.log
```

### Option B: Wireshark Integration
```bash
# Terminal 1: Run Sentinel
source .venv/bin/activate
sudo python3 sentinel_core/run_server.py

# Terminal 2: Start Wireshark
sudo wireshark &

# In Wireshark:
# 1. Edit → Preferences → Protocols → TLS
# 2. Set "(Pre)-Master-Secret log filename" to: /tmp/ssl_keys.log
# 3. Open your pcap file or start new capture
# 4. Filter: tls or http
# 5. Right-click → Follow → TLS Stream to see decrypted traffic
```

### Option C: Ettercap MITM (Lab Use Only - Requires Authorization)
```bash
source .venv/bin/activate
python3 << 'EOF'
from sentinel_core.capture.tls_decryption import setup_tls_decryption
setup_tls_decryption()
EOF
```

**⚠️ WARNING**: Ettercap MITM should only be used:
- On networks you own/control
- With explicit authorization from network owner
- In isolated lab environments

---

## 🔍 Testing Components

### 1. Test Backend API
```bash
# Health check
curl http://localhost:8000/health

# Get API endpoints
curl http://localhost:8000/api/flows

# Get server stats
curl http://localhost:8000/api/stats
```

### 2. Test WebSocket Connection
```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/ws

# You should see live packet events in JSON format
```

### 3. Test Frontend Build
```bash
cd sentinel-frontend
npm run build

# Check build output
ls -lh build/
```

### 4. Test TLS Decryption Module
```bash
source .venv/bin/activate
python3 << 'EOF'
from sentinel_core.capture.tls_decryption import (
    SSLKeyLogParser, 
    TLSPacketInspector,
    WiresharkExporter,
    setup_tls_decryption
)

# Test SSLKEYLOG parsing
parser = SSLKeyLogParser("/tmp/ssl_keys.log")
print(f"Loaded {len(parser.entries)} TLS keys")

# Test Wireshark exporter
WiresharkExporter.create_wireshark_config("/tmp/ssl_keys.log")

# Show TLS decryption options
setup_tls_decryption()
EOF
```

---

## 📊 Expected Packet Capture Output

When running, you should see live packet events like:
```json
{
  "src_ip": "192.168.1.100",
  "dst_ip": "142.251.33.46",
  "src_port": 54321,
  "dst_port": 443,
  "protocol": "TCP",
  "packets": 42,
  "bytes_sent": 3045,
  "bytes_received": 18234,
  "duration": 5.432,
  "tls_version": "TLS 1.3",
  "sni": "google.com",
  "app_type": "HTTPS",
  "timestamp": 1704811234.123
}
```

---

## 🔧 Troubleshooting

### Issue: "Permission denied" when starting backend
**Solution**: Packet capture requires root
```bash
sudo python3 sentinel_core/run_server.py
```

### Issue: WebSocket connection fails
**Solution**: Check backend is running
```bash
curl http://localhost:8000/health
```

### Issue: Frontend blank/not loading
**Solution**: Clear browser cache and check console
```bash
# In browser developer tools (F12)
# Check Console tab for errors
# Check Network tab for failed requests
```

### Issue: npm install fails
**Solution**: Clear npm cache
```bash
cd sentinel-frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Scapy import errors
**Solution**: Ensure Scapy is installed
```bash
source .venv/bin/activate
pip install scapy cryptography pyopenssl --upgrade
```

### Issue: SSLKEYLOG not being created
**Solution**: Firefox/Chrome must support SSLKEYLOGFILE
```bash
# Firefox: Always supported
firefox &

# Chrome: Requires flag
google-chrome --ssl-key-log-file=/tmp/ssl_keys.log &
```

---

## 📈 Performance Tuning

### Reduce CPU Usage
```python
# In sentinel_core/run_server.py, increase update interval
packet_interval = 5.0  # seconds (instead of 1.0)
```

### Optimize Memory
```python
# In sentinel_core/capture/live_capture.py
max_flows = 1000  # Limit active flows stored
flow_timeout = 300  # Seconds before removing inactive flows
```

---

## 📚 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Browser / Dashboard (React + Three.js)         │
│              http://localhost:3000                       │
└──────────────────────────┬──────────────────────────────┘
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────┐
│         FastAPI Backend (sentinel_core/api)              │
│          http://localhost:8000                           │
│  ├─ REST API: /api/flows, /api/stats                    │
│  └─ WebSocket: /ws (live packet events)                 │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Capture    │  │  Analysis    │  │     TLS      │
    │  (Scapy)    │  │ (OWASP Top10)│  │ Decryption   │
    │             │  │ (CVSS Score) │  │ (SSLKEYLOG)  │
    └─────────────┘  └──────────────┘  └──────────────┘
         │ eth0
         ▼
    Network Traffic
    (HTTP/HTTPS/DNS/etc)
```

---

## ✨ Key Features Checklist

- [x] Live packet capture (Scapy)
- [x] Real-time flow aggregation
- [x] OWASP Top 10 attack classification
- [x] CVSS 3.1 vulnerability scoring
- [x] TLS/HTTPS metadata extraction (SNI, version)
- [x] SSLKEYLOG file parsing
- [x] Wireshark integration guide
- [x] Ettercap MITM setup code
- [x] 3D globe visualization
- [x] Interactive charts (Recharts)
- [x] WebSocket streaming
- [x] REST API endpoints
- [x] Docker-ready architecture

---

## 🆘 Support

For detailed documentation, see:
- [README_v2.md](README_v2.md) - Complete usage guide
- [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) - System design
- [CHEATSHEET.md](CHEATSHEET.md) - Quick command reference
- [sentinel_core/capture/tls_decryption.py](sentinel_core/capture/tls_decryption.py) - TLS module code

**Last Updated**: 2024
**Version**: 2.0 Production Ready
