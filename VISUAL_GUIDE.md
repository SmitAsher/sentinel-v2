# 🛡️ Project Sentinel v2.0 — Visual Quick Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    KALI LINUX                               │
│                                                              │
│  ┌────────────────┐        ┌──────────────────────────┐    │
│  │ Network Traffic│        │  SENTINEL PLATFORM       │    │
│  │  (Live Capture)│───────→│  ┌─ Packet Capture      │    │
│  │                │        │  │  ┌─ Attack Detect    │    │
│  │ eth0: packets ▶│───────→│  │  │  ┌─ CVSS Score   │    │
│  │               │        │  │  │  ▼                 │    │
│  └────────────────┘        │  │  FastAPI API         │    │
│                            │  │  Port: 8000          │    │
│                            │  └──────────────────────┘    │
│                            │          ▲                    │
│                            │          │ WebSocket         │
│                            │          │ JSON Stream       │
│                            └──────────┼──────────────────┘    │
│                                       │                     │
│                    ┌──────────────────┘                     │
│                    │                                        │
│                    ▼                                        │
│            ┌────────────────┐                              │
│            │ REACT DASHBOARD│                              │
│            ├────────────────┤                              │
│            │ 🌍 3D GLOBE    │ (Real-time packet flows)    │
│            │ 📊 ANALYTICS   │ (Charts & statistics)       │
│            │ 🚨 ALERTS      │ (Severity-color coded)      │
│            │ Port: 3000     │                              │
│            └────────────────┘                              │
│                    ▲                                        │
│                    │ Browser                               │
│                    │ http://localhost:3000                 │
│                    │                                        │
│            [Your Computer 💻]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Packet → Dashboard)

```
Network Packet
     ↓
[Scapy Capture] ──→ Extract: src/dst IP, port, protocol
     ↓
[5-tuple Flow] ──→ Aggregate: conversations
     ↓
[Flow Analysis] ──→ Check: attack patterns, CVSS
     ↓
[Classification] ──→ Label: SQL Injection, XSS, etc.
     ↓
[Enrichment] ──→ Add: severity, confidence, reasons
     ↓
[State Update] ──→ Store: in-memory database
     ↓
[WebSocket] ──→ Broadcast JSON to browser
     ↓
[React State] ──→ Update: component state
     ↓
[Render] ──→ Draw globe particle, update charts
     ↓
👁️ You see: Real-time threat visualization
```

---

## 3-Step Installation

```
Step 1: Setup
┌─────────────────────────────────┐
│ $ cd /home/kali/BE              │
│ $ chmod +x quick_start.sh       │
│ $ ./quick_start.sh              │
│                                 │
│ ✅ Backend venv created         │
│ ✅ Dependencies installed       │
│ ✅ Frontend packages installed  │
└─────────────────────────────────┘
        ↓

Step 2: Run Backend (Terminal 1)
┌─────────────────────────────────┐
│ $ source .venv/bin/activate     │
│ $ sudo python3 \                │
│   sentinel_core/run_server.py   │
│                                 │
│ 🔴 Captures packets from eth0   │
│ 🟡 Analyzes for attacks         │
│ 🟢 Serves API on :8000          │
└─────────────────────────────────┘
        ↓

Step 3: Run Frontend (Terminal 2)
┌─────────────────────────────────┐
│ $ cd sentinel-frontend          │
│ $ npm start                     │
│                                 │
│ 🌍 3D Globe spinning            │
│ 📊 Charts updating              │
│ 🚨 Alerts flowing in            │
│ 🌐 http://localhost:3000        │
└─────────────────────────────────┘
```

---

## Attack Type Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│ ATTACK TYPE DETECTOR — QUICK REFERENCE                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 🔴 SQL INJECTION (CVSS 9.8)                                     │
│    Pattern: ' OR '1'='1, UNION SELECT, DROP, EXEC              │
│    Color: RED (critical)                                        │
│                                                                  │
│ 🔴 XSS (CVSS 6.1)                                              │
│    Pattern: <script>, javascript:, onerror=, onclick=           │
│    Color: RED (high)                                            │
│                                                                  │
│ 🟠 BRUTE FORCE AUTH (CVSS 9.8)                                 │
│    Pattern: >10 failed 401/403 in <30 seconds                  │
│    Color: RED (critical)                                        │
│                                                                  │
│ 🟡 SENSITIVE DATA EXPOSURE (CVSS 7.5)                          │
│    Pattern: HTTP unencrypted, PII in plain, cookie without SSL │
│    Color: YELLOW (high)                                         │
│                                                                  │
│ 🟡 PATH TRAVERSAL (CVSS 7.5)                                   │
│    Pattern: ../, %2e%2e, /etc/passwd, C:\windows\system32      │
│    Color: YELLOW (high)                                         │
│                                                                  │
│ 🔴 COMMAND INJECTION (CVSS 9.8)                               │
│    Pattern: Shell metacharacters + system commands             │
│    Color: RED (critical)                                        │
│                                                                  │
│ 🔴 MALWARE INDICATOR (CVSS 8.7)                               │
│    Pattern: C2 domains, .exe payloads, high entropy            │
│    Color: RED (critical)                                        │
│                                                                  │
│ 🟡 DATA EXFILTRATION (CVSS 7.8)                               │
│    Pattern: >50MB outbound, anomalous protocol                 │
│    Color: YELLOW (high)                                         │
│                                                                  │
│ 🟡 DDoS/FLOOD (CVSS 7.5)                                       │
│    Pattern: >10k pps, low entropy, small payloads              │
│    Color: YELLOW (high)                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Color Legend:
🟢 GREEN  = Normal (CVSS 0-3.9)
🟡 YELLOW = Medium/Suspicious (CVSS 4.0-8.9)
🔴 RED    = Critical (CVSS 9.0+)
```

---

## API Endpoints Cheat Sheet

```
╔════════════════════════════════════════════════════════════════╗
║                  API ENDPOINTS (localhost:8000)                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ FLOWS (List & Filter)                                         ║
║ GET  /api/flows                    → All flows (100 limit)    ║
║ GET  /api/flows?src_ip=192.168...  → Filter by source       ║
║ GET  /api/flows?attack_type=XSS    → Filter by type         ║
║ GET  /api/flows/{id}               → Specific flow details   ║
║                                                                ║
║ ALERTS (Real-time threats)                                    ║
║ GET  /api/alerts                   → Recent alerts (50)       ║
║ GET  /api/alerts?severity=critical → Critical only           ║
║                                                                ║
║ ANALYTICS (Charts & Stats)                                    ║
║ GET  /api/analytics/stats          → Counters               ║
║ GET  /api/analytics/attack-distribution → Pie data          ║
║ GET  /api/analytics/cvss-histogram → Histogram data         ║
║ GET  /api/analytics/timeline       → 24h timeline           ║
║ GET  /api/analytics/geo            → Globe particle data    ║
║                                                                ║
║ WEBSOCKET (Live Streaming)                                   ║
║ WS   /ws                           → Live JSON stream       ║
║      (connects automatically from frontend)                  ║
║                                                                ║
║ DOCUMENTATION                                                 ║
║ GET  /docs                         → Swagger UI            ║
║ GET  /health                       → Health check          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Example curl requests:
$ curl http://localhost:8000/api/flows | jq
$ curl http://localhost:8000/api/analytics/stats | jq
$ wscat -c ws://localhost:8000/ws
```

---

## Dashboard Views

```
┌─────────────────────────────────────────────────────────────────┐
│                  SENTINEL DASHBOARD                             │
│  ⚔️ SENTINEL OPERATIONAL DASHBOARD        LIVE 🟢              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ GLOBE ]  [ ANALYTICS ]  ← Tab Navigation                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🌍 GLOBE VIEW (currently selected)                      │  │
│  │                                                          │  │
│  │        ╭─────────────────────────────────╮             │  │
│  │       ╱   🌍  (Rotating Earth)          ╲            │  │
│  │      │ Particles flowing:                │           │  │
│  │      │ 🟢 Normal   → Destination        │           │  │
│  │      │ 🟡 Suspicious                    │           │  │
│  │      │ 🔴 Critical                      │           │  │
│  │       ╲                                  ╱            │  │
│  │        ╰─────────────────────────────────╯             │  │
│  │                                                          │  │
│  │ Updates in real-time via WebSocket                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Alternative: ANALYTICS VIEW

┌─────────────────────────────────────────────────────────────────┐
│ 📊 ATTACK DISTRIBUTION       📊 CVSS DISTRIBUTION             │
│ ┌────────────┐               ┌────────────────┐                │
│ │   PIE      │               │  BAR CHART     │                │
│ │ 🟢 45%     │               │  CVSS 9-10: 15│                │
│ │ 🟡 30%     │               │  CVSS 7-8: 22 │                │
│ │ 🔴 25%     │               │  CVSS 4-6: 18 │                │
│ │            │               │  CVSS 0-3: 12 │                │
│ └────────────┘               └────────────────┘                │
│                                                                 │
│ 📈 THREAT TIMELINE (24 hours)   📊 STATS                      │
│ ┌─────────────────────────────┐  🟢 Total: 1,247             │
│ │ /\                          │  🔴 Alerts: 87               │
│ │/  \  /\                     │  🟡 Critical: 12             │
│ │    \/  \  /\  /            │  ▼ Status: LIVE              │
│ │         \/  \/             │                               │
│ │ 0h  6h  12h  18h  24h      │                               │
│ └─────────────────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Commands

```
┌──────────────────────────────────────────────────────────────┐
│                    QUICK COMMANDS                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ SETUP & RUN                                                 │
│ $ ./quick_start.sh                  # Auto setup           │
│ $ source .venv/bin/activate         # Activate venv        │
│ $ sudo python3 sentinel_core/run_server.py  # Backend      │
│ $ npm start                         # Frontend             │
│                                                              │
│ API TESTING                                                 │
│ $ curl http://localhost:8000/health                        │
│ $ curl http://localhost:8000/api/flows | jq               │
│ $ curl http://localhost:8000/api/analytics/stats | jq     │
│ $ wscat -c ws://localhost:8000/ws                          │
│                                                              │
│ MONITORING                                                  │
│ $ tail -f /tmp/sentinel.log                                │
│ $ watch 'curl -s localhost:8000/api/analytics/stats | jq' │
│                                                              │
│ TROUBLESHOOTING                                             │
│ $ netstat -tulpn | grep 8000       # Check port binding   │
│ $ ip link show                      # List network ifaces  │
│ $ dmesg | tail -20                  # Check system logs    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Tree

```
/home/kali/BE/
│
├── 📄 Documentation (Read these!)
│   ├── README_v2.md              ← START HERE: Setup guide
│   ├── DELIVERY_SUMMARY.md       ← What you got
│   ├── MANIFEST.md              ← Complete file list
│   ├── IMPLEMENTATION_COMPLETE.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   ├── PROJECT_ARCHITECTURE.md
│   └── CHEATSHEET.md            ← Common commands
│
├── 🐍 Backend (Python)
│   ├── sentinel_core/
│   │   ├── run_server.py        ← MAIN: Start here
│   │   ├── capture/
│   │   │   └── live_capture.py  (Scapy packet capture)
│   │   ├── analysis/
│   │   │   └── attack_classifier.py (OWASP + CVSS)
│   │   └── api/
│   │       └── main.py          (FastAPI server)
│   └── requirements.txt          (Python packages)
│
├── ⚛️  Frontend (React)
│   └── sentinel-frontend/
│       ├── src/
│       │   ├── App.tsx          (Main app)
│       │   ├── components/
│       │   │   ├── Globe.tsx    (3D visualization)
│       │   │   └── Analytics.tsx (Charts)
│       │   └── index.tsx        (React root)
│       └── package.json         (NPM packages)
│
├── 🔧 Configuration
│   ├── .gitignore
│   ├── setup_venv.sh
│   └── quick_start.sh
│
└── 📦 Legacy (v1 - for reference)
    └── sentinel/                (Old simulated version)
```

---

## Status Dashboard

```
✅ BACKEND
   ├─ Packet Capture............ ✅ Live Scapy
   ├─ Flow Aggregation......... ✅ 5-tuple flows
   ├─ Attack Detection......... ✅ OWASP Top 10
   ├─ CVSS Scoring............ ✅ Base v3.1
   ├─ FastAPI Server.......... ✅ Port 8000
   └─ WebSocket Streaming..... ✅ Real-time

✅ FRONTEND
   ├─ React App................ ✅ Port 3000
   ├─ 3D Globe................. ✅ Three.js
   ├─ Interactive Charts....... ✅ Recharts
   ├─ Real-time Updates........ ✅ WebSocket
   └─ Color Coding............ ✅ Red/Yellow/Green

✅ DOCUMENTATION
   ├─ Setup Guide.............. ✅ README_v2.md
   ├─ Architecture............. ✅ ARCHITECTURE_DIAGRAM.md
   ├─ Operations Guide......... ✅ CHEATSHEET.md
   ├─ API Reference........... ✅ README_v2.md
   └─ Delivery Summary......... ✅ DELIVERY_SUMMARY.md

✅ READY FOR DEPLOYMENT
   └─ Kali Linux Compatible... ✅ TESTED
```

---

## Next: Your First Run

```
1. Open Terminal 1:
   $ cd /home/kali/BE
   $ source .venv/bin/activate
   $ sudo python3 sentinel_core/run_server.py

2. Open Terminal 2:
   $ cd /home/kali/BE/sentinel-frontend
   $ npm start

3. Open Browser:
   → http://localhost:3000

4. Watch the magic! 🎆
   Globe spins, packets flow, charts update
```

---

**Welcome to Project Sentinel v2.0!** 🛡️

Read [README_v2.md](README_v2.md) for detailed setup.
