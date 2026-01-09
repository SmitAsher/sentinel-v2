# Project Sentinel v2 — Advanced Threat Intelligence Platform

## Overview
A full-stack red-team research platform demonstrating network-layer visibility with packet capture, TLS decryption, and AI-driven threat classification. Features a 3D globe visualization, interactive analytics, and industry-standard attack type detection (OWASP Top 10, CWE, CVSS).

**STRICT ETHICAL FRAMING:** Research/educational only. Authorization and informed consent required.

---

## Architecture

### 1. Backend (Python)
```
sentinel-backend/
├── sentinel_core/
│   ├── capture/           # Scapy-based packet capture + decryption
│   │   ├── live_capture.py     # Live pcap + TLS SSLKEYLOG decryption
│   │   ├── mitm_setup.py       # Wireshark/Ettercap CA cert config
│   │   └── pcap_processor.py   # Flow normalization
│   ├── analysis/          # Attack classification & CVSS
│   │   ├── classifier.py       # Traffic classification (app, protocol, attack type)
│   │   ├── cvss_scorer.py      # CVSS 3.1 scoring for detected issues
│   │   ├── attack_patterns.py  # Industry-standard attack signatures
│   │   └── anomaly_detector.py # Behavioral + statistical anomalies
│   ├── database/          # SQLite/PostgreSQL flows & alerts
│   │   └── models.py           # Flow, Alert, Vulnerability, Metric schemas
│   └── api/               # FastAPI endpoints
│       ├── flows.py            # /api/flows, /api/flows/{id}
│       ├── alerts.py           # /api/alerts, /api/alerts/stream (WebSocket)
│       ├── analytics.py        # /api/analytics (globe data, timeseries)
│       └── main.py             # FastAPI app initialization
├── requirements.txt        # Dependencies: scapy, fastapi, sqlalchemy, etc.
└── README.md              # Setup & deployment
```

### 2. Frontend (React + Three.js/Babylon.js)
```
sentinel-frontend/
├── src/
│   ├── components/
│   │   ├── Globe.tsx           # 3D globe with packet flows, Three.js
│   │   ├── Dashboard.tsx        # Main layout
│   │   ├── Analytics.tsx        # Charts: traffic distribution, CVSS, attack types
│   │   ├── AlertsPanel.tsx      # Real-time alerts with severity
│   │   ├── AttackTypeSelector.tsx # Filter by OWASP/CWE
│   │   └── FlowtimelineChart.tsx  # Recharts timeline
│   ├── hooks/
│   │   ├── useWebSocket.ts      # WebSocket for live updates
│   │   └── useAnalytics.ts      # Fetch analytics data
│   ├── types/
│   │   ├── Flow.ts              # Flow data structure
│   │   └── Alert.ts             # Alert structure
│   ├── App.tsx
│   └── index.css
├── package.json
└── README.md
```

### 3. Database Schema
```
tables:
  - flows: id, src_ip, dst_ip, src_port, dst_port, protocol, app_type, 
           tls_version, sni, ja3_hash, bytes_sent, bytes_received, 
           duration, timestamp, decrypted_payload (or hash), attack_type, cvss_score
  - alerts: id, flow_id, alert_type, severity (critical/high/medium/low), 
            attack_classification, reasons, confidence, timestamp
  - vulnerabilities: id, flow_id, cve_id, description, cvss_score, owasp_category, cwe_ids
  - metrics: timestamp, total_flows, attack_count, avg_cvss, threat_level
```

---

## Key Features

### 1. Packet Capture + Decryption
- **Live capture**: Scapy on Kali (requires root for sniffing)
- **TLS decryption**: SSLKEYLOG environment variable + OpenSSL key extraction
- **Wireshark integration**: Export keys for offline analysis
- **Ettercap/MITM**: Optional CA cert setup for transparent HTTPS interception (educational only)

### 2. Attack Type Classification (Industry Standard)
- **OWASP Top 10**: Injection, Broken Auth, Sensitive Data Exposure, XML External Entities, Broken Access Control, Security Misconfiguration, Cross-Site Scripting, Insecure Deserialization, Using Components with Known Vulnerabilities, Insufficient Logging & Monitoring
- **CWE (Common Weakness Enumeration)**: Proper attack/weakness mapping
- **CVSS 3.1 Scoring**: Base, Temporal, Environmental scores for detected vulnerabilities
- **Attack signatures**: SQL injection, XSS, CSRF, path traversal, auth bypass, data exfiltration, DDoS patterns, malware indicators

### 3. Dynamic Dashboard
- **3D Globe**: Source → Destination packet flows with real-time animation
- **Analytics Panels**:
  - Traffic volume by app type, protocol, geography
  - Attack type distribution (pie/bar charts)
  - CVSS score distribution (histogram)
  - Top threats over time (timeline)
- **Alerts**: Real-time feed with severity/confidence
- **Flow Details**: Drill-down with metadata, payload preview (if decrypted), CVSS justification

### 4. Parameters for Different Attack Types

| Attack Type | Pattern Signals | CVSS Base | Detection |
|-------------|-----------------|-----------|-----------|
| **SQL Injection** | URL with `' OR '1'='1`, `UNION SELECT`, `DROP`, `EXEC`; Content-Type: form/json with suspicious keywords | 9.8 | Regex + payload inspection |
| **XSS** | URL `<script>`, `javascript:`, `onerror=`, `onclick=`; Content in response with unescaped user input | 8.2 | Pattern matching + response analysis |
| **Brute Force Auth** | Multiple failed 401/403 within <30s, repeated POST to `/login`, `/api/auth` with different passwords | 7.5 | Behavioral (request rate + failure count) |
| **Sensitive Data Exposure** | HTTP (unencrypted), cookie without HttpOnly/Secure, hardcoded API keys in URLs, PII in plaintext payloads | 8.6 | Heuristics + payload scanning |
| **Path Traversal** | URL with `../`, `..\\`, `%2e%2e`, `....`, files like `/etc/passwd`, `C:\windows\system32` | 6.5 | Pattern + file path analysis |
| **DDoS/Flood** | Packet rate >10k/s from single source, low payload size, sequential port scanning | 8.0 | Rate + entropy analysis |
| **Malware Indicator** | Known C2 domains, suspicious file extensions (`.exe` in HTTPS), entropy spikes, anomalous DNS | 9.0 | Threat intelligence + entropy |
| **Data Exfiltration** | Large outbound bytes (>1MB), multiple simultaneous connections, unusual protocols for data transfer | 7.8 | Volume + entropy analysis |

---

## Setup (Kali Linux)

### Prerequisites
```bash
# System packages
sudo apt-get update
sudo apt-get install -y python3-dev python3-venv libpcap-dev libssl-dev

# Optional: Wireshark, Ettercap for manual inspection
sudo apt-get install -y wireshark-common tshark ettercap-text-only

# Node.js for React frontend
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Backend Setup
```bash
cd sentinel-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# For live capture, run as root or with CAP_NET_RAW
sudo .venv/bin/python -m sentinel_core.api.main
```

### Frontend Setup
```bash
cd sentinel-frontend
npm install
npm run dev  # localhost:3000
```

### TLS Decryption (SSLKEYLOG)
```bash
# Export keys for decryption
export SSLKEYLOGFILE=/tmp/sslkeys.log
# Run your browser or application
# Sentinel will use keys from this file to decrypt TLS traffic

# For Wireshark: Edit → Preferences → Protocols → TLS → (Pre)-Master-Secret log filename
```

---

## Ethical & Legal Notes

- **Research Only**: Decryption of HTTPS is only legal/ethical when:
  - You own/manage the network
  - You have written authorization from endpoint owners
  - It's a lab environment with consent
  
- **No Bypass Instructions**: This platform demonstrates *visibility*, not exploitation. Encryption remains critical for real-world defense.

- **Blue Team Use**: Defenders can use this to understand network baseline, detect insider threats, and validate firewall rules.

---

## Next Steps
1. Implement Python capture layer (Scapy + SSLKEYLOG)
2. Build attack type classifier with CVSS integration
3. Create React frontend with globe and interactive charts
4. Wire FastAPI endpoints for real-time streaming
