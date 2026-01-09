# 🛡️ Project Sentinel v2.0 - Quick Reference Card

## 🚀 One-Minute Startup

```bash
# Terminal 1: Backend
cd /home/kali/BE
source .venv/bin/activate
sudo python3 sentinel_core/run_server.py

# Terminal 2: Frontend
cd /home/kali/BE/sentinel-frontend
npm start

# Terminal 3: Browser
firefox http://localhost:3000
```

---

## 📦 What's Installed

| Component | Status | Version |
|-----------|--------|---------|
| Python | ✅ | 3.13 |
| Scapy | ✅ | 2.7.0 |
| FastAPI | ✅ | 0.128.0 |
| Uvicorn | ✅ | 0.40.0 |
| React | ✅ | 18.3.1 |
| Three.js | ✅ | 0.160.0 |
| Recharts | ✅ | 2.10.0 |

---

## 🔐 TLS Decryption Methods

### Quick Method (1 minute)
```bash
export SSLKEYLOGFILE=/tmp/ssl_keys.log
firefox &
# Visit HTTPS sites → keys logged
```
✅ Easiest | ⭐⭐⭐⭐⭐

### Wireshark (5 minutes)
```bash
# 1. Capture with Wireshark
# 2. Edit → Preferences → Protocols → TLS
# 3. Set log: /tmp/ssl_keys.log
# 4. View decrypted traffic
```
✅ Detailed | ⭐⭐⭐⭐

### Ettercap MITM (10 minutes)
```bash
python3 -c "from sentinel_core.capture.tls_decryption import \
setup_tls_decryption; setup_tls_decryption()"
```
✅ Powerful | ⚠️ Auth Required | ⭐⭐⭐

---

## 📊 Dashboard Tabs

| Tab | Shows | Real-time? |
|-----|-------|-----------|
| **Dashboard** | Live packets, attacks, stats | ✅ WebSocket |
| **Globe** | 3D visualization of flows | ✅ WebSocket |
| **Analytics** | Charts, attack types, severity | ✅ WebSocket |

---

## 🔍 Testing Commands

### Test Backend
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/flows
curl http://localhost:8000/api/stats
```

### Test WebSocket
```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws
```

### Test TLS Module
```bash
source .venv/bin/activate
python3 << 'EOF'
from sentinel_core.capture.tls_decryption import setup_tls_decryption
setup_tls_decryption()
EOF
```

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Permission denied (backend) | Use: `sudo python3 ...` |
| WebSocket fails | Check backend is running |
| Frontend blank | Clear browser cache, hard refresh |
| npm install fails | `npm cache clean --force` |
| SSLKEYLOG empty | Ensure Firefox runs with env var set |
| Scapy not found | `pip install scapy` |

---

## 📈 What Sentinel Detects

### Network Attacks
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- XXE (XML External Entity)
- LFI/RFI (Path Traversal)
- Command Injection

### Threat Metrics
- CVSS Score (0-10)
- Severity: Critical/High/Medium/Low
- OWASP Top 10 mapping
- Attack classification

### Traffic Analysis
- Flow aggregation (5-tuple)
- TLS version detection
- SNI (domain) extraction
- Application type guessing
- Bytes in/out per flow

---

## 🎯 File Locations

```
Backend files:    /home/kali/BE/sentinel_core/
Frontend files:   /home/kali/BE/sentinel-frontend/
Virtual env:      /home/kali/BE/.venv/
Docs:             /home/kali/BE/*.md
```

---

## 📚 Documentation Map

```
START HERE:
  └─ SETUP_COMPLETE.md ← You are here!
  └─ SETUP_VERIFICATION.md ← Step-by-step guide

USAGE:
  └─ README_v2.md ← Main usage guide
  └─ CHEATSHEET.md ← Quick commands

ADVANCED:
  └─ TLS_DECRYPTION_GUIDE.md ← HTTPS analysis
  └─ ARCHITECTURE_DIAGRAM.md ← System design
  └─ PROJECT_ARCHITECTURE.md ← Full details
```

---

## 🔑 Key Features

✅ **Live Packet Capture** with Scapy
✅ **Real-time Flow Aggregation** (5-tuple)
✅ **Attack Classification** (OWASP Top 10)
✅ **CVSS Scoring** (Vulnerability severity)
✅ **TLS Metadata Extraction** (SNI, version)
✅ **SSLKEYLOG Support** (Browser-based keys)
✅ **Wireshark Integration** (Offline analysis)
✅ **Ettercap MITM** (Network-level capture)
✅ **3D Globe Visualization** (Three.js)
✅ **Interactive Charts** (Recharts)
✅ **Real-time WebSocket** (Live events)
✅ **REST API** (Programmatic access)

---

## 💾 Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/api/flows` | GET | Get active flows |
| `/api/stats` | GET | Get server stats |
| `/ws` | WS | Live packet stream |

---

## 🎨 Frontend Structure

```
App.tsx (Main)
├── Dashboard Tab
│   └── Real-time stats
├── Globe Tab
│   └── Globe.tsx (Three.js)
└── Analytics Tab
    └── Analytics.tsx (Recharts)
```

---

## ⚙️ Configuration Env Vars

```bash
# TLS decryption
export SSLKEYLOGFILE=/tmp/ssl_keys.log

# Custom interfaces
export SENTINEL_INTERFACE=eth0

# Wireshark path
export WIRESHARK_BIN=/usr/bin/wireshark
```

---

## 🔐 Security Reminders

⚠️ **Wireshark/Ettercap**: Lab use only with authorization
✅ **SSLKEYLOG**: Safe for personal testing
🔒 **Keep keys private**: Don't share SSLKEYLOG files
📋 **Document usage**: Log all analysis sessions
🛡️ **Follow laws**: Comply with local regulations

---

## 🎯 Performance Tips

- Reduce log verbosity: `conf.verb = 0`
- Limit active flows: Set max_flows = 1000
- Increase update interval: packet_interval = 5.0
- Clear old flows: flow_timeout = 300 seconds

---

## 📞 Help Commands

```bash
# Verify setup
bash verify_setup.sh

# Show next steps
cat SETUP_VERIFICATION.md

# Python help
python3 -c "from sentinel_core.capture.tls_decryption import SSLKeyLogParser; help(SSLKeyLogParser)"

# Check logs
tail -f /tmp/sentinel.log
```

---

## 🎓 Learning Path

1. **Getting Started** (5 min)
   - Run quick_start.sh
   - Open dashboard at localhost:3000

2. **Basic Usage** (15 min)
   - Browse HTTPS sites
   - Watch attacks detected
   - Check globe visualization

3. **Packet Analysis** (30 min)
   - Export SSLKEYLOG
   - Open in Wireshark
   - View decrypted traffic

4. **Advanced** (1+ hours)
   - Setup Ettercap MITM
   - Configure network interception
   - Analyze multi-client traffic
   - Custom threat detection

---

## 🚀 Next Steps

1. ✅ Verify setup: `bash verify_setup.sh`
2. ✅ Start backend: `sudo python3 sentinel_core/run_server.py`
3. ✅ Start frontend: `npm start`
4. ✅ Open browser: `http://localhost:3000`
5. ✅ Generate traffic: Browse HTTPS sites
6. ✅ Watch dashboard: See attacks detected in real-time
7. ✅ Export data: Use Wireshark for offline analysis

---

## 📊 Statistics Tracked

Per Flow:
- Packets sent/received
- Bytes in/out
- Duration
- Application type
- TLS version
- SNI (domain)
- CVSS score
- Attack type

Per Attack:
- Attack classification
- Severity (Critical/High/Medium/Low)
- Source/destination IPs
- Port numbers
- Timestamp

---

## 🎉 You're Ready!

**Status**: ✅ Fully installed and verified
**Version**: 2.0 Production Ready
**Last Updated**: January 2024

```
    🛡️  Project Sentinel v2.0  🛡️
    
    ✅ Backend: Ready
    ✅ Frontend: Ready
    ✅ TLS Decryption: Ready
    ✅ Attack Detection: Ready
    ✅ Documentation: Complete
    
    Ready for Network Analysis!
```

---

**For detailed information, see:**
- Full guide: `SETUP_VERIFICATION.md`
- TLS guide: `TLS_DECRYPTION_GUIDE.md`
- Architecture: `ARCHITECTURE_DIAGRAM.md`

**Support**: Check documentation files or review code comments
