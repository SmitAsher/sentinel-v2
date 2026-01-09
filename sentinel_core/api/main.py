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
    
    @app.get("/health")
    async def health():
        return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
    
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
