# Project Sentinel v2.0 — Advanced Network Threat Intelligence Platform

## Overview

Sentinel is a full-stack red-team research platform demonstrating network-layer visibility combined with AI-driven threat intelligence. Features live packet capture with TLS decryption, industry-standard attack classification (OWASP Top 10, CVSS), and a 3D interactive dashboard with globe visualization.

**STRICT ETHICAL FRAMING:** This is research and educational software. Authorization and informed consent are mandatory.

---

## Quick Start (Kali Linux)

### Prerequisites
```bash
sudo apt-get update
sudo apt-get install -y python3-venv python3-dev libpcap-dev libssl-dev nodejs npm
```

### Backend Setup
```bash
cd /home/kali/BE
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run with root for packet capture
sudo .venv/bin/python sentinel_core/run_server.py
```

API will be available at `http://localhost:8000`

### Frontend Setup
```bash
cd sentinel-frontend
npm install
npm start
```

Frontend will open at `http://localhost:3000`

---

## Architecture

### Backend (Python)
- **Packet Capture**: Scapy-based live capture from network interface
- **TLS Decryption**: SSLKEYLOG environment variable support
- **Attack Classification**: OWASP Top 10 + CWE signatures with CVSS 3.1 scoring
- **API**: FastAPI with WebSocket for real-time updates

### Frontend (React)
- **3D Globe**: Three.js visualization of packet flows with source→destination animation
- **Analytics**: Recharts for attack distribution, CVSS histograms, timelines
- **Real-time Updates**: WebSocket connection for live threat feed

---

## Attack Types & CVSS Scoring

| Attack | Base CVSS | Detection Method |
|--------|-----------|------------------|
| SQL Injection | 9.8 | Pattern matching: `' OR '1'='1`, `UNION SELECT`, `DROP` |
| XSS | 6.1 | Payload scanning: `<script>`, `javascript:`, `onerror=` |
| Brute Force Auth | 9.8 | Behavioral: >10 failed 401/403 in <30s |
| Sensitive Data Exposure | 7.5 | Heuristics: HTTP (unencrypted), PII in plaintext |
| Path Traversal | 7.5 | Pattern: `../`, `%2e%2e`, `/etc/passwd` |
| Command Injection | 9.8 | Signature: shell metacharacters + system commands |
| Malware Indicator | 8.7 | C2 domains, `.exe` payloads, entropy spikes |
| Data Exfiltration | 7.8 | Volume: >1MB outbound, anomalous protocols |
| DDoS/Flood | 7.5 | Rate: >10k pps from single source, low entropy |

---

## TLS Decryption Setup (Optional)

### Browser-Based Decryption
```bash
# Set SSLKEYLOG environment variable
export SSLKEYLOGFILE=/tmp/sslkeys.log

# Run your browser
# Sentinel will read keys from this file
```

### Wireshark Integration
1. Edit → Preferences → Protocols → TLS
2. Set "(Pre)-Master-Secret log filename" to your SSLKEYLOGFILE
3. Restart Wireshark

### Ettercap MITM (Controlled Lab Only)
```bash
# Install Ettercap
sudo apt-get install ettercap-text-only

# Generate custom CA (for lab only!)
openssl genrsa -out /tmp/ca.key 2048
openssl req -new -x509 -key /tmp/ca.key -out /tmp/ca.crt

# Configure Ettercap to use custom CA and export keys
sudo ettercap -T -q -i eth0 -M ARP:remote /target1/ /target2/
```

**WARNING**: MITM decryption is only legal/ethical with explicit authorization.

---

## API Endpoints

### Flows
- `GET /api/flows` - List all flows
- `GET /api/flows/{flow_id}` - Get specific flow
- Query: `?src_ip=`, `?dst_ip=`, `?attack_type=`, `?limit=`

### Alerts
- `GET /api/alerts` - Get recent alerts
- Query: `?severity=critical|high|medium|low`, `?limit=`

### Analytics
- `GET /api/analytics/stats` - Global statistics
- `GET /api/analytics/attack-distribution` - Attack type breakdown
- `GET /api/analytics/cvss-histogram` - CVSS score distribution
- `GET /api/analytics/timeline` - 24h threat timeline
- `GET /api/analytics/geo` - Geo data for globe

### WebSocket
- `WS /ws` - Real-time flow and alert stream

---

## Configuration

### Environment Variables
```bash
SENTINEL_INTERFACE=eth0          # Network interface (default: auto-detect)
SENTINEL_API_HOST=0.0.0.0        # API bind address
SENTINEL_API_PORT=8000           # API port
SSLKEYLOGFILE=/tmp/sslkeys.log   # TLS key export file
```

---

## Ethical & Legal

- **Authorization Required**: Only deploy in networks you own/manage or with written consent
- **Encryption Intact**: This platform demonstrates network visibility, not privacy bypass
- **Blue Team Use**: Defenders can use to understand baselines and detect insider threats
- **No Exploit Code**: This is a visibility/analytics platform, not an exploitation toolkit

---

## Troubleshooting

### "Permission Denied" on Packet Capture
```bash
sudo setcap cap_net_raw=ep ~/.venv/bin/python3
```

### Frontend Cannot Connect to Backend
Check CORS: ensure API is running and accessible at `http://localhost:8000`

### No Flows Appearing
- Verify network interface: `ip link show`
- Check firewall rules
- Ensure traffic is actually traversing the monitored interface

---

## Files & Directory Structure

```
/home/kali/BE/
├── sentinel_core/
│   ├── capture/               # Packet capture (Scapy)
│   │   └── live_capture.py
│   ├── analysis/              # Attack classification
│   │   └── attack_classifier.py
│   └── api/                   # FastAPI
│       └── main.py
├── sentinel-frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Globe.tsx
│   │   │   └── Analytics.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   └── package.json
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

---

## References

- OWASP Top 10 2021: https://owasp.org/www-project-top-ten/
- CVSS Calculator: https://www.first.org/cvss/v3.1/calculator
- CWE List: https://cwe.mitre.org/
- Scapy Docs: https://scapy.readthedocs.io/
