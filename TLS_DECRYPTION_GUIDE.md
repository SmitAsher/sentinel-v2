# 🔐 Sentinel TLS/HTTPS Decryption Guide

## Overview

Project Sentinel includes comprehensive HTTPS traffic decryption support via multiple methods:

1. **SSLKEYLOG** - Browser-based key logging (Firefox/Chrome)
2. **Wireshark Integration** - Offline pcap analysis with decrypted payloads
3. **Ettercap MITM** - Man-in-the-middle for network-level interception
4. **Scapy TLS Metadata** - Direct packet analysis for SNI, version, ciphersuites

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│        sentinel_core/capture/tls_decryption.py      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  SSLKeyLogParser                             │  │
│  │  - Parse SSLKEYLOG files                     │  │
│  │  - Extract CLIENT_RANDOM → secret mappings   │  │
│  │  - Support TLS 1.2 & 1.3                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  TLSPacketInspector                          │  │
│  │  - Extract SNI from CLIENT_HELLO             │  │
│  │  - Identify TLS version                      │  │
│  │  - Parse cipher suite negotiation            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  WiresharkExporter                           │  │
│  │  - Generate pcap files                       │  │
│  │  - Export SSLKEYLOG for Wireshark            │  │
│  │  - Configuration guides                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  EttercapMITMSetup                           │  │
│  │  - Generate CA certificates                  │  │
│  │  - Create MITM configuration scripts         │  │
│  │  - Browser trust installation guides         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  TLSDecryptionPipeline                       │  │
│  │  - Orchestrate all components                │  │
│  │  - Analyze packet handshakes                 │  │
│  │  - Setup Wireshark/Ettercap                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
         │                          │
         │                          │
    Integration:              Integration:
    sentinel_core/            sentinel_core/
    capture/                  api/
    live_capture.py           main.py
```

---

## Quick Start Methods

### 🟢 Method 1: Browser SSLKEYLOG (Easiest, Recommended)

**Best for:** Local testing, home lab, single-machine analysis

```bash
# Setup environment variable
export SSLKEYLOGFILE=/tmp/ssl_keys.log

# Launch browser
firefox &

# Browse HTTPS sites
# https://www.google.com
# https://github.com
# https://stackoverflow.com

# Keys automatically saved to /tmp/ssl_keys.log
ls -lh /tmp/ssl_keys.log
```

**Advantages:**
- ✅ No setup required
- ✅ Works automatically with Firefox/Chrome
- ✅ Can analyze later with Wireshark
- ✅ No MITM, no trust warnings

**Supported Browsers:**
- Firefox (all versions)
- Chrome/Chromium (with flag)
- Edge (with flag)

**How it works:**
1. Browser logs all TLS session keys to file during handshake
2. Each line = one session key with its CLIENT_RANDOM
3. Can be imported into Wireshark for offline analysis

---

### 🟡 Method 2: Wireshark + SSLKEYLOG (Best for Packet Analysis)

**Best for:** Detailed traffic analysis, forensics, pcap review

**Step 1: Capture traffic with Wireshark**
```bash
# Option A: Capture while generating keys
export SSLKEYLOGFILE=/tmp/ssl_keys.log
firefox &

# In Wireshark:
# Capture → Start
# Browse HTTPS sites
# Capture → Stop
# File → Export as → PCAP

# Option B: Capture without keys initially
# File → Capture Interfaces
# Select interface → Start
# Browse sites
# Stop capture
```

**Step 2: Configure Wireshark for decryption**
```bash
# Start Wireshark
sudo wireshark &

# Open your pcap file
# File → Open → select pcap

# Configure decryption
# Edit → Preferences → Protocols → TLS
# (Pre)-Master-Secret log filename: /tmp/ssl_keys.log
# Click OK
```

**Step 3: Analyze decrypted traffic**
```bash
# Apply filters
# Filter bar: tls or http
# tls.record → View handshake details
# http → View HTTP requests/responses

# Export decrypted objects
# File → Export Objects → HTTP
# Save images, files, documents
```

**Advantages:**
- ✅ Visual packet analysis
- ✅ Export decrypted files
- ✅ Protocol tree inspection
- ✅ Flow visualization
- ✅ Statistics and graphs

**Requirements:**
- Wireshark 2.4+ (4.0+ recommended)
- SSLKEYLOG file with keys

---

### 🔴 Method 3: Ettercap MITM (Most Powerful, Requires Lab Auth)

**Best for:** Network-level analysis, multi-client testing, encrypted tunnel penetration

**⚠️ WARNING**: Only use on authorized networks with explicit permission!

**Step 1: Generate CA Certificate**
```bash
source .venv/bin/activate
python3 << 'EOF'
from sentinel_core.capture.tls_decryption import EttercapMITMSetup

# Generate self-signed CA
ca_key, ca_cert = EttercapMITMSetup.generate_ca_certificate(
    key_path="/tmp/sentinel_ca.key",
    cert_path="/tmp/sentinel_ca.crt",
    days=365
)

print(f"CA Certificate: {ca_cert}")
print(f"CA Key: {ca_key}")
EOF
```

**Step 2: Install CA in Browser**
```bash
# Firefox:
# Preferences → Privacy & Security → View Certificates
# Authorities → Import /tmp/sentinel_ca.crt
# Check "Trust this CA to identify websites"

# Chrome:
# Settings → Privacy & Security → Manage certificates
# Authorities → Import /tmp/sentinel_ca.crt
# Check trust options
```

**Step 3: Create Ettercap MITM Script**
```bash
python3 << 'EOF'
from sentinel_core.capture.tls_decryption import EttercapMITMSetup

# Create MITM setup script
script = EttercapMITMSetup.create_ettercap_config(
    ca_cert_path="/tmp/sentinel_ca.crt",
    ca_key_path="/tmp/sentinel_ca.key",
    target1="192.168.1.0/24",    # Subnet to intercept
    target2="192.168.1.1",        # Gateway
    output_path="/tmp/ettercap_mitm.sh"
)

print(f"Setup script: {script}")
EOF
```

**Step 4: Run MITM**
```bash
# Start Sentinel server
cd /home/kali/BE
source .venv/bin/activate
sudo python3 sentinel_core/run_server.py

# In another terminal, setup SSLKEYLOG
export SSLKEYLOGFILE=/tmp/ssl_keys.log

# Run Ettercap MITM
sudo bash /tmp/ettercap_mitm.sh

# Monitor Sentinel dashboard at http://localhost:3000
```

**Advantages:**
- ✅ Network-level interception
- ✅ Intercept multiple clients
- ✅ Man-in-the-middle attacks (with authorization)
- ✅ Full request/response inspection
- ✅ Payload modification capability

**Requirements:**
- Kali Linux or similar
- Ettercap installed: `sudo apt install ettercap-graphical`
- CAP_NET_RAW privileges or root
- Explicit network authorization
- Browser with CA trust configured

**Important Warnings:**
- ⚠️ Only use on networks you own/control
- ⚠️ Illegal on unauthorized networks
- ⚠️ Users will see self-signed cert warnings
- ⚠️ Can break application certificate pinning
- ⚠️ Log all activities for compliance

---

## Code Examples

### Example 1: Parsing SSLKEYLOG Programmatically

```python
from sentinel_core.capture.tls_decryption import SSLKeyLogParser

# Parse existing SSLKEYLOG
parser = SSLKeyLogParser("/tmp/ssl_keys.log")

print(f"Loaded {len(parser.entries)} TLS session keys")
for entry in parser.entries[:5]:
    print(f"  {entry.label}: {entry.client_random[:16]}... → {entry.secret[:16]}...")

# Lookup secret by CLIENT_RANDOM
client_random = "abcd1234ef567890..."
secret = parser.get_secret_for_client_random(client_random)
if secret:
    print(f"Secret found: {secret}")
```

### Example 2: Extracting TLS Metadata from Packets

```python
from sentinel_core.capture.tls_decryption import TLSPacketInspector
from scapy.all import IP, TCP, Raw

# Assume packet is a Scapy packet
inspector = TLSPacketInspector()

# Extract SNI (Server Name Indication)
sni = inspector.extract_sni(bytes(packet[Raw].load))
print(f"Target domain: {sni}")

# Extract TLS version
tls_version = inspector.extract_tls_version(bytes(packet[Raw].load))
print(f"TLS version: {tls_version}")
```

### Example 3: Setting up Wireshark Integration

```python
from sentinel_core.capture.tls_decryption import WiresharkExporter

# Create Wireshark config
config = WiresharkExporter.create_wireshark_config(
    sslkeylog_path="/tmp/ssl_keys.log",
    output_path="/tmp/wireshark_setup.txt"
)

print("Wireshark setup guide:")
print(config)

# Now:
# 1. Edit → Preferences → Protocols → TLS
# 2. Set log file to /tmp/ssl_keys.log
# 3. Open pcap file
# 4. Inspect decrypted HTTP traffic
```

### Example 4: Complete TLS Decryption Pipeline

```python
from sentinel_core.capture.tls_decryption import TLSDecryptionPipeline
import os

# Initialize pipeline
pipeline = TLSDecryptionPipeline()

# Check if keys are available
if pipeline.keylog_parser.keys_by_client_random:
    print(f"✓ {len(pipeline.keylog_parser.keys_by_client_random)} TLS keys loaded")
else:
    print("✗ No TLS keys available yet")
    print("  1. Set: export SSLKEYLOGFILE=/tmp/ssl_keys.log")
    print("  2. Open browser and visit HTTPS sites")
    print("  3. Keys saved to /tmp/ssl_keys.log")

# Setup Wireshark
pipeline.setup_wireshark("/tmp/capture.pcap")

# Setup Ettercap MITM (if authorized)
# mitm_script = pipeline.setup_ettercap_mitm()
```

---

## Integration with Sentinel Capture

The TLS decryption module is automatically integrated into `live_capture.py`:

```python
from sentinel_core.capture.live_capture import PacketCapture

# Create capture with TLS support
capture = PacketCapture(interface="eth0")

# Flows now include TLS metadata:
# {
#   "sni": "google.com",
#   "tls_version": "TLS 1.3",
#   "decryptable": true  # if keys available
# }

# Export for Wireshark
capture.export_flows("/tmp/sentinel_flows.json")
```

---

## Environment Variables

```bash
# Set SSLKEYLOG file path
export SSLKEYLOGFILE=/tmp/ssl_keys.log

# Optional: Custom Wireshark binary
export WIRESHARK_BIN=/usr/bin/wireshark

# Optional: Ettercap interface
export ETTERCAP_INTERFACE=eth0

# Optional: Custom CA paths
export SENTINEL_CA_KEY=/custom/path/ca.key
export SENTINEL_CA_CERT=/custom/path/ca.crt
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSLKEYLOG not created | Ensure Firefox is run with `export SSLKEYLOGFILE=/tmp/ssl_keys.log` BEFORE starting |
| "File not found" in Wireshark | Check path: usually `/tmp/ssl_keys.log` |
| Decryption not working in Wireshark | 1. Verify SSLKEYLOG has content: `wc -l /tmp/ssl_keys.log` 2. Check TLS version matches Wireshark support 3. Restart Wireshark after updating config |
| Ettercap fails to start | Run with `sudo`: `sudo bash /tmp/ettercap_mitm.sh` |
| Certificate warning in browser | Normal - browser doesn't trust self-signed CA. Click "Accept" if authorized. |
| "Permission denied" for packet capture | Run with `sudo` or add CAP_NET_RAW capability |

---

## Security Considerations

### SSLKEYLOG Method
- ✅ Safe for local development
- ✅ No MITM needed
- ❌ Only captures current browser session
- ❌ Requires SSLKEYLOGFILE enabled (not by default)

### Wireshark Method
- ✅ Offline analysis (no live interception)
- ✅ Works with existing pcaps
- ❌ Requires SSLKEYLOG from original capture
- ❌ Cannot modify traffic

### Ettercap MITM Method
- ✅ Can intercept any client on network
- ✅ Can modify traffic
- ❌ Users see certificate warnings
- ❌ Breaks certificate pinning
- ❌ Requires explicit authorization
- ❌ Creates audit trail

**Compliance Notes:**
- Only use Ettercap MITM on networks you own/control
- Require written authorization before testing
- Document all intercepted data
- Follow organizational security policies
- Comply with local laws and regulations

---

## Advanced Usage

### Custom SSLKEYLOG Parsing

```python
# Parse with custom path
from sentinel_core.capture.tls_decryption import SSLKeyLogParser

parser = SSLKeyLogParser("/custom/path/keys.log")
parser.parse()  # Re-parse if file changed

# Export to different format
parser.export_for_wireshark("/tmp/exported_keys.txt")
```

### Analyzing Network-wide Traffic

```bash
# Capture all HTTPS traffic
sudo tcpdump -i eth0 "port 443" -w /tmp/https.pcap

# Set browser SSLKEYLOG
export SSLKEYLOGFILE=/tmp/ssl_keys.log
firefox &

# Import pcap + keys into Wireshark
# Analyze decrypted payloads for threats
```

### Certificate Pinning Bypass

```python
# Ettercap + custom CA can break certificate pinning
# Useful for testing app security

# 1. Generate CA
EttercapMITMSetup.generate_ca_certificate()

# 2. Install CA in browser
# Manually add to trust store

# 3. Run MITM
# Will now intercept even pinned certificates
```

---

## Performance Considerations

- **SSLKEYLOG**: Minimal overhead, just logging keys
- **Wireshark**: Depends on pcap size, can handle GB+ files
- **Ettercap MITM**: Adds network latency, ~10-50ms per packet
- **TLS Inspection**: Fast for SNI (string scan), slower for full handshake parsing

---

## References

- [SSLKEYLOG Format](https://wiki.wireshark.org/TLS#using-the-sslkeylog-file)
- [Wireshark TLS Decryption](https://wireshark.org/docs/man-pages/tshark.html)
- [Ettercap Documentation](https://www.ettercap-project.org/)
- [Scapy TLS Support](https://scapy.readthedocs.io/en/latest/)
- [OWASP SSL/TLS Testing](https://owasp.org/www-community/attacks/SSL_Stripping)

---

**Last Updated**: January 2024
**Status**: Production Ready
