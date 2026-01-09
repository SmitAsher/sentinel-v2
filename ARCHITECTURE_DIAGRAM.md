# Project Sentinel v2.0 — System Architecture Diagram

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NETWORK INTERFACE (eth0)                          │
│                     Live packet stream (tap/mirror)                      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SENTINEL BACKEND (Python)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CAPTURE LAYER (Scapy)                                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ - Live packet sniffing                                          │   │
│  │ - 5-tuple flow aggregation (src_ip:port, dst_ip:port, proto)  │   │
│  │ - TLS metadata extraction (SNI, JA3)                           │   │
│  │ - App detection (HTTP, SSH, DNS, MySQL, etc.)                 │   │
│  │ - SSLKEYLOG integration for TLS decryption                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼ (flow dict)                            │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ANALYSIS LAYER (Attack Classification)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ - OWASP Top 10 detection                                        │   │
│  │   └─ SQL Injection, XSS, Brute Force, Path Traversal, etc.    │   │
│  │ - Pattern matching (regex signatures)                           │   │
│  │ - Behavioral analysis (rate, entropy, volume)                  │   │
│  │ - CVSS 3.1 scoring (base metric)                               │   │
│  │ - Severity classification (critical/high/medium/low)           │   │
│  │ - Confidence scoring (0.0-1.0)                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼ (enriched flow + alerts)               │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STATE MANAGEMENT (In-Memory)                                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ - flows_db: dict of active flows                                │   │
│  │ - alerts_db: deque of recent alerts (max 1000)                 │   │
│  │ - stats_db: aggregated statistics                              │   │
│  │   └─ total_flows, total_alerts, attack_counts, severity_dist.  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ API LAYER (FastAPI + WebSocket)                                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ REST Endpoints:                                                 │   │
│  │ - GET /api/flows?src_ip=&dst_ip=&attack_type=                 │   │
│  │ - GET /api/alerts?severity=&limit=                            │   │
│  │ - GET /api/analytics/stats                                     │   │
│  │ - GET /api/analytics/attack-distribution                       │   │
│  │ - GET /api/analytics/cvss-histogram                            │   │
│  │ - GET /api/analytics/timeline                                  │   │
│  │ - GET /api/analytics/geo (for globe)                           │   │
│  │                                                                 │   │
│  │ WebSocket:                                                      │   │
│  │ - WS /ws (live flow & alert streaming)                         │   │
│  │   └─ Broadcasts: flow events, alerts, stats updates            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼ (HTTP/WebSocket on :8000)
                                    
┌─────────────────────────────────────────────────────────────────────────┐
│                   SENTINEL FRONTEND (React + Three.js)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   GLOBE VIEW         │  │   ANALYTICS VIEW                       │  │
│  ├──────────────────────┤  ├────────────────────────────────────────┤  │
│  │                      │  │ - Attack Distribution (Pie)            │  │
│  │  [3D Earth Sphere]   │  │ - CVSS Histogram (Bar)                 │  │
│  │       ↳ Rotation     │  │ - Threat Timeline (Line)               │  │
│  │       ↳ Lighting     │  │ - Stats Cards                          │  │
│  │                      │  │   └─ Total flows, alerts, critical     │  │
│  │  Packet Particles:   │  │                                        │  │
│  │  🟢 Normal (src→dst) │  │ Severity Colors:                       │  │
│  │  🟡 Suspicious       │  │ 🟢 Normal (CVSS 0-3.9)               │  │
│  │  🔴 Critical         │  │ 🟡 Medium (CVSS 4.0-6.9)              │  │
│  │                      │  │ 🟠 High (CVSS 7.0-8.9)                │  │
│  │  Real-time updates   │  │ 🔴 Critical (CVSS 9.0+)               │  │
│  │  via WebSocket       │  │                                        │  │
│  └──────────────────────┘  └────────────────────────────────────────┘  │
│                                                                           │
│  Connection: ws://localhost:8000/ws                                      │
│  Port: 3000 (dev) / :3000 (production)                                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Attack Classification Pipeline

```
Flow Input
    ↓
┌─ Classify Flow (5-tuple metadata)
│  ├─ Check ports (suspicious: 4444, 5555, etc.)
│  ├─ Check SNI (C2 domains)
│  ├─ Check volume (exfiltration: >50MB)
│  ├─ Check rate (DDoS: >10k pps)
│  └─ Check app type (HTTP/SSH/DNS)
│
├─ Classify Payload (if available)
│  ├─ SQL Injection patterns
│  ├─ XSS patterns
│  ├─ Command Injection
│  ├─ Path Traversal
│  └─ Malware Indicators
│
└─ CVSS Scoring
   ├─ Attack Vector (NETWORK, LOCAL, PHYSICAL)
   ├─ Attack Complexity (LOW, HIGH)
   ├─ Privileges Required (NONE, LOW, HIGH)
   ├─ User Interaction (NONE, REQUIRED)
   ├─ Impact (Confidentiality, Integrity, Availability)
   └─ Base Score → Severity (critical/high/medium/low)
```

---

## Module Dependency Graph

```
sentinel_core/
├── capture/
│   └── live_capture.py
│       └─ Depends: Scapy, logging, time
│
├── analysis/
│   └── attack_classifier.py
│       └─ Depends: re, enum, hashlib
│
├── api/
│   └── main.py
│       ├─ Depends: fastapi, websockets, asyncio
│       └─ Uses: attack_classifier, logging
│
└── run_server.py
    ├─ Depends: threading, asyncio, uvicorn
    └─ Uses: live_capture, attack_classifier, api.main

sentinel-frontend/
├── src/
│   ├── components/
│   │   ├── Globe.tsx
│   │   │   └─ Depends: React, Three.js
│   │   └── Analytics.tsx
│   │       └─ Depends: React, Recharts, axios
│   ├── App.tsx
│   │   └─ Uses: Globe, Analytics
│   └── index.tsx
│       └─ Uses: App
│
└── package.json
    └─ Deps: react, react-dom, three, recharts, axios, ws
```

---

## TLS Decryption Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│ SSLKEYLOG Environment Variable                              │
│ export SSLKEYLOGFILE=/tmp/sslkeys.log                      │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    Sentinel          Wireshark              Ettercap
    (optional)        (offline)              (MITM)
    - Reads keys      - Import keys          - CA cert
    - Decrypts flow   - Decrypt pcaps        - Transparent HTTPS
    - Enriches        - Export data          - Export keys
      metadata                               - Optional sandbox

        ▼
    Enhanced Flow Dict:
    {
      "src_ip": "192.168.1.10",
      "dst_ip": "93.184.216.34",
      "tls_version": "TLS1.2",
      "sni": "www.example.com",
      "decrypted_payload": "GET /api/data HTTP/1.1...",  (if available)
      "payload_hash": "sha256:abc123...",
      "attack_type": "SQL_INJECTION",
      "cvss_score": 9.8
    }
```

---

## Real-Time Data Flow (WebSocket)

```
Frontend (Browser)          ←→        Backend (Python)
                            
1. Connect WS /ws
                            ← Accept connection
2. Receive recent events
                            ← Send last 20 events
3. Listen for updates       
                            │ (continuous loop)
                            └─→ Packet captured
                                Analyzed
                                Classified
                                If alert: send alert JSON
                                If flow: send flow JSON
                                ↓ broadcast to all clients
4. Receive alert JSON
   {
     "type": "alert",
     "payload": {
       "type": "THREAT_DETECTED",
       "attack_type": "SQL_INJECTION",
       "severity": "critical",
       "cvss_score": 9.8,
       "reasons": ["Matched pattern for A03:2021 – Injection"],
       "timestamp": "2026-01-08T...",
     }
   }
5. Update state
   Rerender dashboard
```

---

## Deployment Architecture (Optional Docker)

```
┌──────────────────────────────────────────────────────┐
│           Docker Compose (future)                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────┐  ┌──────────────────────┐  │
│  │  Sentinel Backend  │  │ Sentinel Frontend    │  │
│  ├────────────────────┤  ├──────────────────────┤  │
│  │ Python 3.10+       │  │ Node.js 18+          │  │
│  │ Port: 8000         │  │ Port: 3000           │  │
│  │ Volumes:           │  │ Environment:         │  │
│  │  - /dev/eth0       │  │  REACT_APP_API_URL=  │  │
│  │  - /tmp/pcaps      │  │  http://backend:8000 │  │
│  │ CAP: CAP_NET_RAW   │  │                      │  │
│  │ ENV:               │  │ Depends: backend     │  │
│  │  SSLKEYLOGFILE     │  │                      │  │
│  └────────────────────┘  └──────────────────────┘  │
│           ↓                      ↓                   │
│        Network Bridge                                │
└──────────────────────────────────────────────────────┘
```

---

## Performance Characteristics (Estimated)

| Metric | Value | Notes |
|--------|-------|-------|
| Packet Throughput | 10k-50k pps | Depends on CPU, may need optimization |
| Flow Aggregation Latency | <100ms | Per-packet heuristics |
| Detection Latency | 10-50ms | Pattern matching on 100-byte payload |
| WebSocket Update Rate | 100ms | Broadcasts to all clients |
| Memory Usage | 50-200MB | In-memory flow/alert deques |
| Frontend Re-render | 60 FPS | Three.js particle updates |

---

## Security Considerations

```
Data Handling:
├─ Flows: Redacted by default (src/dst → "REDACTED")
├─ Payloads: Not stored; only hashes/signatures
├─ Alerts: Kept in memory, cleared on restart
└─ Export: JSON format, no PII in default config

Network:
├─ API: Localhost only (production: add authentication)
├─ WebSocket: No authentication (production: JWT/session)
└─ TLS: Optional decryption (lab use only)

Privilege:
├─ Capture: Requires CAP_NET_RAW or root
├─ Storage: No elevated privileges needed
└─ API: Runs as unprivileged user (optional)
```

---

## Scalability Path

For larger deployments:
1. **Database**: Move in-memory state → PostgreSQL
2. **Caching**: Redis for recent flows
3. **Processing**: Move analysis to separate worker queue (Celery/RQ)
4. **Streaming**: Kafka for decoupling capture → analysis
5. **Frontend**: Nginx reverse proxy, CDN for assets
6. **Monitoring**: Prometheus metrics + Grafana dashboards
