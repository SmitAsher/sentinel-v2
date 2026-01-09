"""Live packet capture using Scapy with TLS decryption support via SSLKEYLOG."""
import os
import time
import json
import logging
from typing import Dict, List, Optional, Callable
from collections import defaultdict
from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP, Raw, conf
from scapy.layers.inet import IP
from scapy.layers.l2 import Ether

# Import TLS decryption module
try:
    from .tls_decryption import SSLKeyLogParser, TLSPacketInspector
    TLS_DECRYPTION_AVAILABLE = True
except ImportError:
    TLS_DECRYPTION_AVAILABLE = False

logger = logging.getLogger(__name__)

# Disable Scapy warnings
conf.verb = 0


class FlowKey:
    """Represents a network flow (5-tuple)."""
    def __init__(self, src_ip: str, dst_ip: str, src_port: int, dst_port: int, protocol: str):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol

    def __hash__(self):
        return hash((self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol))

    def __eq__(self, other):
        return (self.src_ip == other.src_ip and self.dst_ip == other.dst_ip and
                self.src_port == other.src_port and self.dst_port == other.dst_port and
                self.protocol == other.protocol)


class FlowStats:
    """Aggregates statistics for a flow."""
    def __init__(self, flow_key: FlowKey):
        self.flow_key = flow_key
        self.start_time = time.time()
        self.last_seen = time.time()
        self.packets = 0
        self.bytes_sent = 0
        self.bytes_received = 0
        self.tls_version = None
        self.sni = None
        self.ja3 = None
        self.app_type = "unknown"
        self.payload_hashes = set()
        self.ports_seen = set()

    def to_dict(self) -> Dict:
        return {
            "src_ip": self.flow_key.src_ip,
            "dst_ip": self.flow_key.dst_ip,
            "src_port": self.flow_key.src_port,
            "dst_port": self.flow_key.dst_port,
            "protocol": self.flow_key.protocol,
            "packets": self.packets,
            "bytes_sent": self.bytes_sent,
            "bytes_received": self.bytes_received,
            "duration": self.last_seen - self.start_time,
            "tls_version": self.tls_version,
            "sni": self.sni,
            "ja3": self.ja3,
            "app_type": self.app_type,
            "timestamp": self.start_time
        }


class PacketCapture:
    """Live packet capture with flow aggregation and TLS metadata extraction."""
    
    def __init__(self, interface: Optional[str] = None, callback: Optional[Callable] = None):
        self.interface = interface or self._default_interface()
        self.callback = callback
        self.flows = {}
        self.packet_count = 0
        
        # Initialize TLS decryption if available
        if TLS_DECRYPTION_AVAILABLE:
            self.keylog_parser = SSLKeyLogParser()
            self.tls_inspector = TLSPacketInspector()
            logger.info(f"TLS decryption initialized (SSLKEYLOGFILE={os.getenv('SSLKEYLOGFILE', 'not set')})")
        else:
            self.keylog_parser = None
            self.tls_inspector = None
        
    @staticmethod
    def _default_interface() -> str:
        """Get default network interface."""
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            interface = s.getsockname()[0]
            s.close()
            return interface
        except:
            return "eth0"

    def _extract_tls_metadata(self, packet):
        """Extract TLS metadata (SNI, version, JA3 stub)."""
        result = {"sni": None, "tls_version": None, "decryptable": False}
        
        if not self.tls_inspector or not TCP in packet:
            return result
        
        try:
            # Check if this is HTTPS (port 443)
            if TCP in packet and packet[TCP].dport == 443:
                if Raw in packet:
                    payload = bytes(packet[Raw].load)
                    
                    # Extract SNI from CLIENT_HELLO
                    sni = self.tls_inspector.extract_sni(payload)
                    if sni:
                        result["sni"] = sni
                    
                    # Extract TLS version
                    tls_version = self.tls_inspector.extract_tls_version(payload)
                    if tls_version:
                        result["tls_version"] = tls_version
                    
                    # Check if we have decryption keys
                    if self.keylog_parser and sni:
                        result["decryptable"] = True
                        logger.debug(f"SNI={sni} - decryption keys available: {bool(self.keylog_parser.keys_by_client_random)}")
        except Exception as e:
            logger.debug(f"TLS metadata extraction error: {e}")
        
        return result

    def _guess_app_type(self, packet, flow_key: FlowKey) -> str:
        """Heuristically classify application type based on port and payload."""
        port = flow_key.dst_port
        
        # Common ports
        port_map = {
            80: "HTTP", 8080: "HTTP", 8000: "HTTP",
            443: "HTTPS", 8443: "HTTPS",
            25: "SMTP", 587: "SMTP", 465: "SMTPS",
            110: "POP3", 995: "POP3S",
            143: "IMAP", 993: "IMAPS",
            53: "DNS",
            22: "SSH", 2222: "SSH",
            3306: "MySQL", 5432: "PostgreSQL",
            6379: "Redis", 27017: "MongoDB",
            3389: "RDP", 5900: "VNC",
            5672: "AMQP", 9092: "Kafka"
        }
        
        if port in port_map:
            return port_map[port]
        
        # Check payload signatures
        if Raw in packet:
            payload = bytes(packet[Raw].load)[:100]
            if b"HTTP/" in payload or b"GET " in payload or b"POST " in payload:
                return "HTTP"
            if b"SSH" in payload:
                return "SSH"
            if b"SMTP" in payload:
                return "SMTP"
        
        return "Unknown"

    def process_packet(self, packet):
        """Process a single packet and update flow stats."""
        self.packet_count += 1
        
        # Extract basic info
        src_ip = dst_ip = src_port = dst_port = protocol = None
        
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            
            if TCP in packet:
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
                protocol = "TCP"
            elif UDP in packet:
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
                protocol = "UDP"
            elif ICMP in packet:
                protocol = "ICMP"
                src_port = 0
                dst_port = 0
        
        elif IPv6 in packet:
            src_ip = packet[IPv6].src
            dst_ip = packet[IPv6].dst
            
            if TCP in packet:
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
                protocol = "TCP"
            elif UDP in packet:
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
                protocol = "UDP"
        
        if not src_ip or not protocol:
            return
        
        # Create flow key
        flow_key = FlowKey(src_ip, dst_ip, src_port or 0, dst_port or 0, protocol)
        
        # Update or create flow stats
        if flow_key not in self.flows:
            self.flows[flow_key] = FlowStats(flow_key)
        
        flow = self.flows[flow_key]
        flow.packets += 1
        flow.last_seen = time.time()
        
        # Extract layer sizes
        if Raw in packet:
            payload_size = len(packet[Raw].load)
            # Simple heuristic: if src == local and dst == remote, it's sent; else received
            # In real scenario, you'd need interface info
            flow.bytes_sent += payload_size
        
        # Extract TLS metadata if present
        if protocol == "TCP" and dst_port == 443:
            tls_meta = self._extract_tls_metadata(packet)
            if tls_meta["sni"]:
                flow.sni = tls_meta["sni"]
            if tls_meta["tls_version"]:
                flow.tls_version = tls_meta["tls_version"]
        
        # Guess app type
        flow.app_type = self._guess_app_type(packet, flow_key)
        
        # Callback
        if self.callback:
            self.callback(flow.to_dict())

    def start_sniffing(self, packet_count: int = 0, timeout: int = 60):
        """Start live packet capture."""
        logger.info(f"Starting packet capture on {self.interface}...")
        try:
            sniff(iface=self.interface, prn=self.process_packet, store=False, 
                  count=packet_count, timeout=timeout, verbose=False)
        except PermissionError:
            logger.error("Packet capture requires root/CAP_NET_RAW. Run with: sudo python3 ...")
            raise
        except Exception as e:
            logger.error(f"Capture error: {e}")
            raise

    def get_active_flows(self, max_age: int = 300) -> List[Dict]:
        """Return active flows (not older than max_age seconds)."""
        now = time.time()
        active = [
            flow.to_dict() for flow in self.flows.values()
            if (now - flow.last_seen) <= max_age
        ]
        return active

    def export_flows(self, filepath: str):
        """Export flows to JSON."""
        flows = [flow.to_dict() for flow in self.flows.values()]
        with open(filepath, 'w') as f:
            json.dump(flows, f, indent=2, default=str)
        logger.info(f"Exported {len(flows)} flows to {filepath}")
