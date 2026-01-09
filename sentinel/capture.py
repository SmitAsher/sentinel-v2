"""Capture layer (simulated by default).

This module provides a simple capture simulator that emits flow-like metadata.
Real capture hooks can be added later; by default this runs without root.
"""
import threading
import time
import random
import queue
from typing import Callable

DEFAULT_INTERVAL = 1.0

def _random_domain():
    choices = ["example.com", "auth.example.org", "cdn.example.net", "video.example.tv", "files.example.com"]
    return random.choice(choices)

def _make_flow(i: int):
    start = time.time()
    tls = random.random() > 0.2
    domain = _random_domain()
    flow = {
        "id": f"flow-{int(start)}-{i}",
        "src_ip": f"192.168.1.{random.randint(2,250)}",
        "dst_ip": f"93.184.216.{random.randint(1,250)}",
        "domain": domain,
        "server_name": domain if tls and random.random() > 0.5 else "",
        "tls": tls,
        "ja3": f"{random.randint(1000,9999)}-{random.randint(1000,9999)}" if tls else "",
        "bytes": random.randint(200, 2000000),
        "packets": random.randint(1, 4000),
        "start_time": start,
        "end_time": start + random.random() * 5,
        "protocol": "tcp",
    }
    return flow

def start_capture(out_queue: queue.Queue, stop_event: threading.Event, interval: float = DEFAULT_INTERVAL):
    """Start emitting simulated flows into `out_queue` until `stop_event` is set."""
    i = 0
    while not stop_event.is_set():
        flow = _make_flow(i)
        out_queue.put(flow)
        i += 1
        time.sleep(interval)
