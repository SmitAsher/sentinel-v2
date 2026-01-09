"""FastAPI backend for Sentinel: flows, alerts, analytics."""
from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import asyncio
import logging
from typing import List, Dict
from datetime import datetime, timedelta
from collections import deque

logger = logging.getLogger(__name__)

# Shared state (in production, use proper database)
flows_db = {}
alerts_db = deque(maxlen=1000)
stats_db = {
    "total_flows": 0,
    "total_alerts": 0,
    "attack_counts": {},
    "severity_distribution": {"critical": 0, "high": 0, "medium": 0, "low": 0},
}
active_ws_connections: List[WebSocket] = []


def generate_fake_http_https_flows():
    """Generate fake decrypted HTTP/HTTPS flow data for demo."""
    fake_flows = [
        {
            "flow_id": "flow_001",
            "src_ip": "192.168.1.105",
            "dst_ip": "142.251.41.14",
            "src_port": 52341,
            "dst_port": 443,
            "protocol": "HTTPS",
            "status": "decrypted",
            "host": "www.google.com",
            "method": "GET",
            "path": "/search?q=python",
            "user_agent": "Mozilla/5.0 (X11; Linux x86_64)",
            "attack_type": "NORMAL",
            "severity": "low",
            "cvss_score": 0.0,
            "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
        },
        {
            "flow_id": "flow_002",
            "src_ip": "192.168.1.110",
            "dst_ip": "104.16.132.229",
            "src_port": 49532,
            "dst_port": 443,
            "protocol": "HTTPS",
            "status": "decrypted",
            "host": "www.cloudflare.com",
            "method": "POST",
            "path": "/api/v4/accounts",
            "request_body": '{"email":"test@example.com"}',
            "attack_type": "XSS_INJECTION",
            "severity": "high",
            "cvss_score": 7.5,
            "timestamp": (datetime.utcnow() - timedelta(minutes=3)).isoformat(),
        },
        {
            "flow_id": "flow_003",
            "src_ip": "10.0.0.50",
            "dst_ip": "93.184.216.34",
            "src_port": 45123,
            "dst_port": 80,
            "protocol": "HTTP",
            "status": "decrypted",
            "host": "example.com",
            "method": "GET",
            "path": "/admin/login",
            "attack_type": "SQL_INJECTION",
            "severity": "critical",
            "cvss_score": 9.2,
            "timestamp": (datetime.utcnow() - timedelta(minutes=1)).isoformat(),
        },
        {
            "flow_id": "flow_004",
            "src_ip": "172.16.0.100",
            "dst_ip": "8.8.8.8",
            "src_port": 53821,
            "dst_port": 443,
            "protocol": "HTTPS",
            "status": "decrypted",
            "host": "api.github.com",
            "method": "GET",
            "path": "/repos/torvalds/linux",
            "attack_type": "NORMAL",
            "severity": "low",
            "cvss_score": 0.0,
            "timestamp": datetime.utcnow().isoformat(),
        },
        {
            "flow_id": "flow_005",
            "src_ip": "192.168.1.200",
            "dst_ip": "31.13.64.35",
            "src_port": 50000,
            "dst_port": 443,
            "protocol": "HTTPS",
            "status": "decrypted",
            "host": "www.instagram.com",
            "method": "POST",
            "path": "/api/v1/accounts/login",
            "request_body": '{"username":"admin","password":"admin"}',
            "attack_type": "CREDENTIAL_STUFFING",
            "severity": "high",
            "cvss_score": 8.1,
            "timestamp": (datetime.utcnow() - timedelta(seconds=30)).isoformat(),
        },
        {
            "flow_id": "flow_006",
            "src_ip": "10.1.1.50",
            "dst_ip": "44.55.66.77",
            "src_port": 48765,
            "dst_port": 80,
            "protocol": "HTTP",
            "status": "decrypted",
            "host": "internal-server.local",
            "method": "GET",
            "path": "/api/users?debug=true",
            "attack_type": "INFORMATION_DISCLOSURE",
            "severity": "medium",
            "cvss_score": 5.3,
            "timestamp": (datetime.utcnow() - timedelta(seconds=45)).isoformat(),
        },
    ]
    
    return fake_flows


def create_app():
    """Create and configure FastAPI app."""
    app = FastAPI(title="Sentinel Backend", version="2.0.0")
    
    # CORS for React frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize with fake HTTP/HTTPS decrypted flows
    fake_flows = generate_fake_http_https_flows()
    for flow in fake_flows:
        flows_db[flow["flow_id"]] = flow
        severity = flow.get("severity", "low")
        stats_db["severity_distribution"][severity] = stats_db["severity_distribution"].get(severity, 0) + 1
        attack_type = flow.get("attack_type", "NORMAL")
        stats_db["attack_counts"][attack_type] = stats_db["attack_counts"].get(attack_type, 0) + 1
    
    stats_db["total_flows"] = len(flows_db)
    
    logger.info(f"Initialized {len(flows_db)} fake HTTP/HTTPS decrypted flows for demo")
    logger.info(f"Flows: {[f['host'] + f['path'] for f in fake_flows]}")
    
    @app.get("/health")
    async def health():
        return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
    
    @app.get("/api/decrypted")
    async def get_decrypted_flows(protocol: str = Query(None), limit: int = Query(50)):
        """Get decrypted HTTP/HTTPS flows with headers and payload."""
        results = list(flows_db.values())
        
        if protocol:
            results = [f for f in results if f.get("protocol") == protocol.upper()]
        
        decrypted_data = []
        for flow in results[-limit:]:
            decrypted_data.append({
                "flow_id": flow.get("flow_id"),
                "src_ip": flow.get("src_ip"),
                "dst_ip": flow.get("dst_ip"),
                "protocol": flow.get("protocol"),
                "host": flow.get("host"),
                "method": flow.get("method"),
                "path": flow.get("path"),
                "user_agent": flow.get("user_agent", "N/A"),
                "request_body": flow.get("request_body", ""),
                "attack_type": flow.get("attack_type"),
                "severity": flow.get("severity"),
                "cvss_score": flow.get("cvss_score"),
                "timestamp": flow.get("timestamp"),
            })
        
        return {"decrypted_flows": decrypted_data, "count": len(decrypted_data)}
    
    @app.get("/api/flows")
    async def get_flows(
        src_ip: str = Query(None),
        dst_ip: str = Query(None),
        attack_type: str = Query(None),
        limit: int = Query(100),
    ):
        """Get flows with optional filtering."""
        results = list(flows_db.values())
        
        if src_ip:
            results = [f for f in results if f.get("src_ip") == src_ip]
        if dst_ip:
            results = [f for f in results if f.get("dst_ip") == dst_ip]
        if attack_type:
            results = [f for f in results if f.get("attack_type") == attack_type]
        
        return {"flows": results[-limit:], "count": len(results)}
    
    @app.get("/api/flows/{flow_id}")
    async def get_flow(flow_id: str):
        """Get specific flow details."""
        if flow_id not in flows_db:
            raise HTTPException(status_code=404, detail="Flow not found")
        return flows_db[flow_id]
    
    @app.get("/api/alerts")
    async def get_alerts(severity: str = Query(None), limit: int = Query(50)):
        """Get recent alerts."""
        results = list(alerts_db)
        if severity:
            results = [a for a in results if a.get("severity") == severity]
        return {"alerts": results[-limit:], "count": len(results)}
    
    @app.get("/api/analytics/stats")
    async def get_stats():
        """Get global statistics."""
        return stats_db
    
    @app.get("/api/analytics/attack-distribution")
    async def get_attack_distribution():
        """Get attack type distribution."""
        dist = {}
        for flow in flows_db.values():
            attack = flow.get("attack_type", "NORMAL")
            dist[attack] = dist.get(attack, 0) + 1
        return {"distribution": dist}
    
    @app.get("/api/analytics/cvss-histogram")
    async def get_cvss_histogram():
        """Get CVSS score distribution."""
        buckets = {
            "0.0-3.9": 0, "4.0-6.9": 0, "7.0-8.9": 0, "9.0-10.0": 0
        }
        for flow in flows_db.values():
            cvss = flow.get("cvss_score", 0.0)
            if cvss < 4.0:
                buckets["0.0-3.9"] += 1
            elif cvss < 7.0:
                buckets["4.0-6.9"] += 1
            elif cvss < 9.0:
                buckets["7.0-8.9"] += 1
            else:
                buckets["9.0-10.0"] += 1
        return {"histogram": buckets}
    
    @app.get("/api/analytics/timeline")
    async def get_timeline(hours: int = Query(24)):
        """Get attack timeline over time."""
        now = datetime.utcnow()
        timeline = {}
        
        for i in range(hours):
            bucket = now - timedelta(hours=i)
            bucket_key = bucket.strftime("%H:00")
            timeline[bucket_key] = 0
        
        # Aggregate flows by hour
        for flow in flows_db.values():
            ts = flow.get("timestamp")
            if ts:
                try:
                    ts_obj = datetime.fromisoformat(ts)
                    bucket_key = ts_obj.strftime("%H:00")
                    timeline[bucket_key] = timeline.get(bucket_key, 0) + 1
                except:
                    pass
        
        return {"timeline": timeline}
    
    @app.get("/api/analytics/geo")
    async def get_geo_data():
        """Get source/destination pairs for globe visualization."""
        pairs = []
        for flow in flows_db.values():
            pairs.append({
                "src_ip": flow.get("src_ip"),
                "dst_ip": flow.get("dst_ip"),
                "attack_type": flow.get("attack_type", "NORMAL"),
                "cvss_score": flow.get("cvss_score", 0.0),
                "timestamp": flow.get("timestamp"),
            })
        return {"flows": pairs[:500]}  # Limit for frontend rendering
    
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket for live flow updates."""
        await websocket.accept()
        active_ws_connections.append(websocket)
        
        # Send initial data
        await websocket.send_json({
            "type": "stats",
            "payload": stats_db
        })
        
        try:
            while True:
                # Keep connection alive
                await asyncio.sleep(1)
        except:
            if websocket in active_ws_connections:
                active_ws_connections.remove(websocket)
    
    # Internal functions to update state
    
    async def broadcast_flow(flow: Dict):
        """Broadcast new flow to connected clients."""
        flow_id = f"{flow.get('src_ip')}:{flow.get('src_port')}-{flow.get('dst_ip')}:{flow.get('dst_port')}"
        flows_db[flow_id] = flow
        stats_db["total_flows"] += 1
        
        for connection in active_ws_connections:
            try:
                await connection.send_json({
                    "type": "flow",
                    "payload": flow
                })
            except:
                pass
    
    async def broadcast_alert(alert: Dict):
        """Broadcast alert to connected clients."""
        alerts_db.append(alert)
        stats_db["total_alerts"] += 1
        severity = alert.get("severity", "low")
        stats_db["severity_distribution"][severity] = stats_db["severity_distribution"].get(severity, 0) + 1
        
        for connection in active_ws_connections:
            try:
                await connection.send_json({
                    "type": "alert",
                    "payload": alert
                })
            except:
                pass
    
    app.broadcast_flow = broadcast_flow
    app.broadcast_alert = broadcast_alert
    
    return app
