#!/usr/bin/env python3
"""Sentinel backend entrypoint: capture + analysis + API."""
import os
import sys
import logging
import asyncio
import threading
from sentinel_core.capture.live_capture import PacketCapture
from sentinel_core.analysis.attack_classifier import AttackClassifier, CVSSScore
from sentinel_core.api.main import create_app
import uvicorn
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global app instance
app = create_app()


def packet_callback(flow: dict):
    """Called when a new flow is detected."""
    try:
        # Classify the flow
        attack_type, confidence, reasons = AttackClassifier.classify_flow(flow)
        
        # Get CVSS parameters
        cvss_params = AttackClassifier.get_cvss_for_attack(attack_type)
        cvss_score = cvss_params.get("base", 0.0)
        
        # Determine severity
        if cvss_score >= 9.0:
            severity = "critical"
        elif cvss_score >= 7.0:
            severity = "high"
        elif cvss_score >= 4.0:
            severity = "medium"
        else:
            severity = "low"
        
        # Enrich flow
        flow["attack_type"] = attack_type.value
        flow["cvss_score"] = cvss_score
        flow["confidence"] = confidence
        flow["severity"] = severity
        flow["detection_reasons"] = reasons
        flow["timestamp"] = datetime.utcnow().isoformat()
        
        # Broadcast to WebSocket clients
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        if severity in ("critical", "high"):
            alert = {
                "type": "THREAT_DETECTED",
                "attack_type": attack_type.value,
                "flow_id": f"{flow.get('src_ip')}:{flow.get('src_port')}-{flow.get('dst_ip')}:{flow.get('dst_port')}",
                "severity": severity,
                "cvss_score": cvss_score,
                "reasons": reasons,
                "timestamp": flow["timestamp"]
            }
            loop.run_until_complete(app.broadcast_alert(alert))
        
        loop.run_until_complete(app.broadcast_flow(flow))
        loop.close()
        
        logger.info(f"[{severity.upper()}] {attack_type.value} - CVSS {cvss_score} - {reasons}")
    except Exception as e:
        logger.error(f"Error processing flow: {e}")


def run_capture_thread(interface: str = None):
    """Run packet capture in background thread."""
    try:
        logger.info("Initializing packet capture...")
        capture = PacketCapture(interface=interface, callback=packet_callback)
        logger.info(f"Starting live packet capture on {capture.interface}...")
        logger.warning("⚠️  Packet capture requires root privileges!")
        logger.info("Run with: sudo python3 -m sentinel_core.run_server")
        capture.start_sniffing(timeout=None)
    except PermissionError:
        logger.error("Packet capture requires root. Run with: sudo python3 -m sentinel_core.run_server")
    except Exception as e:
        logger.error(f"Capture error: {e}")


def main():
    """Main entrypoint."""
    interface = os.getenv("SENTINEL_INTERFACE", None)
    api_host = os.getenv("SENTINEL_API_HOST", "0.0.0.0")
    api_port = int(os.getenv("SENTINEL_API_PORT", 8000))
    
    logger.info("=" * 60)
    logger.info("SENTINEL v2.0 — Network Threat Intelligence Platform")
    logger.info("=" * 60)
    
    # Start packet capture in background
    capture_thread = threading.Thread(target=run_capture_thread, args=(interface,), daemon=True)
    capture_thread.start()
    
    # Start API server
    logger.info(f"Starting API server on {api_host}:{api_port}...")
    uvicorn.run(app, host=api_host, port=api_port, log_level="info")


if __name__ == "__main__":
    main()
