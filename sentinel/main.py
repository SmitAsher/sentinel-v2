"""Entrypoint: wire capture, analysis, and dashboard together.

Run as: `python3 -m sentinel.main`
"""
import threading
import queue
import time
import signal
import uvicorn
from sentinel.capture import start_capture
from sentinel.analysis import classify_flow
from sentinel.dashboard import create_app


def capture_worker(out_q, stop_event):
    start_capture(out_q, stop_event, interval=1.0)


def analysis_worker(in_q, out_q, alert_q, stats, stop_event):
    while not stop_event.is_set():
        try:
            flow = in_q.get(timeout=1.0)
        except Exception:
            continue
        
        result = classify_flow(flow)
        severity = "critical" if result['confidence'] >= 0.7 else ("suspicious" if result['confidence'] >= 0.5 else "normal")
        
        # Update stats
        stats['total'] = stats.get('total', 0) + 1
        stats[severity] = stats.get(severity, 0) + 1
        
        # Redact PII from metadata
        meta = result.get('meta', {})
        original_src = meta.get('src', '?')
        original_dst = meta.get('dst', '?')
        meta['src'] = 'REDACTED'
        meta['dst'] = 'REDACTED'
        result['meta'] = meta
        
        # Create packet event for dashboard
        packet_event = {
            "type": "packet",
            "payload": result
        }
        out_q.put(packet_event)
        
        # Generate alerts for suspicious/critical traffic
        if severity in ("suspicious", "critical"):
            alert = {
                "type": "alert",
                "payload": {
                    "type": "ANOMALY_DETECTED",
                    "domain": result['meta'].get('domain', '?'),
                    "reason": ";".join(result.get('reasons', [])) or "unknown pattern",
                    "severity": severity,
                    "timestamp": time.time()
                }
            }
            out_q.put(alert)


def run_server(event_q, stats):
    app = create_app(event_q, stats)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


def main():
    in_q = queue.Queue()
    event_q = queue.Queue()
    alert_q = queue.Queue()
    stop_event = threading.Event()
    stats = {"total": 0, "normal": 0, "suspicious": 0, "critical": 0}

    cap = threading.Thread(target=capture_worker, args=(in_q, stop_event), daemon=True)
    anl = threading.Thread(target=analysis_worker, args=(in_q, event_q, alert_q, stats, stop_event), daemon=True)
    server = threading.Thread(target=run_server, args=(event_q, stats), daemon=True)

    cap.start()
    anl.start()
    server.start()

    def handle(sig, frame):
        stop_event.set()
        print("Shutting down...")

    signal.signal(signal.SIGINT, handle)
    signal.signal(signal.SIGTERM, handle)

    try:
        while not stop_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        stop_event.set()


if __name__ == "__main__":
    main()
