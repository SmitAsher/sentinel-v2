"""Dynamic FastAPI dashboard with real-time Plotly charts, color-coded packets, and multi-panel analytics.

Uses WebSocket to push live packet streams, alerts, and aggregated statistics to the browser.
"""
import json
import queue
import threading
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse


DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sentinel Dashboard</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            overflow: hidden;
        }
        .header {
            background: rgba(0, 0, 0, 0.5);
            border-bottom: 2px solid #00d4ff;
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #00d4ff;
            font-size: 28px;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
        .status {
            display: flex;
            gap: 20px;
            font-size: 14px;
        }
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #00ff00;
            box-shadow: 0 0 8px #00ff00;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: auto auto;
            gap: 15px;
            padding: 20px;
            height: calc(100vh - 80px);
            overflow-y: auto;
        }
        .panel {
            background: rgba(30, 30, 50, 0.8);
            border: 1px solid #00d4ff;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .panel h2 {
            color: #00d4ff;
            font-size: 16px;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #00d4ff;
            padding-bottom: 8px;
        }
        .packets-panel {
            grid-column: 1 / 3;
            grid-row: 1;
        }
        .stats-panel {
            grid-column: 3;
            grid-row: 1 / 3;
        }
        .alerts-panel {
            grid-column: 1 / 4;
            grid-row: 2;
        }
        .packets-list {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .packet {
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            border-left: 3px solid #00d4ff;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        }
        .packet:hover {
            transform: translateX(5px);
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
        }
        .packet.normal {
            background: rgba(0, 255, 100, 0.1);
            border-left-color: #00ff64;
        }
        .packet.suspicious {
            background: rgba(255, 200, 0, 0.1);
            border-left-color: #ffc800;
        }
        .packet.critical {
            background: rgba(255, 50, 50, 0.1);
            border-left-color: #ff3232;
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .packet-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 8px;
            text-transform: uppercase;
        }
        .badge-normal {
            background: #00ff64;
            color: #000;
        }
        .badge-suspicious {
            background: #ffc800;
            color: #000;
        }
        .badge-critical {
            background: #ff3232;
            color: #fff;
        }
        .stats-item {
            background: rgba(0, 212, 255, 0.05);
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
            border-left: 2px solid #00d4ff;
        }
        .stats-value {
            font-size: 24px;
            font-weight: bold;
            color: #00ff64;
            text-shadow: 0 0 10px rgba(0, 255, 100, 0.5);
        }
        .stats-label {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
        }
        .chart-container {
            flex: 1;
            min-height: 250px;
        }
        .alerts-list {
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 10px;
        }
        .alert-card {
            background: rgba(255, 50, 50, 0.1);
            border: 1px solid #ff3232;
            border-radius: 4px;
            padding: 10px;
            position: relative;
        }
        .alert-title {
            color: #ff6464;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .alert-detail {
            font-size: 11px;
            color: #bbb;
        }
        .confidence {
            margin-top: 5px;
            font-size: 10px;
            color: #00d4ff;
        }
        .scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 212, 255, 0.1);
        }
        .scrollbar::-webkit-scrollbar-thumb {
            background: #00d4ff;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚔️ SENTINEL OPERATIONAL DASHBOARD</h1>
        <div class="status">
            <div class="status-item">
                <div class="status-dot"></div>
                <span>LIVE</span>
            </div>
        </div>
    </div>
    
    <div class="container scrollbar">
        <div class="panel packets-panel">
            <h2>🔴 Live Packet Stream</h2>
            <div class="packets-list scrollbar" id="packets"></div>
        </div>
        
        <div class="panel" style="grid-column: 1 / 3; grid-row: 2;">
            <h2>📊 Traffic Analysis</h2>
            <div class="chart-container" id="traffic-chart"></div>
        </div>
        
        <div class="panel stats-panel">
            <h2>📈 Statistics</h2>
            <div id="stats" style="flex: 1; overflow-y: auto;"></div>
        </div>
        
        <div class="panel alerts-panel">
            <h2>🚨 Active Alerts & Anomalies</h2>
            <div class="alerts-list scrollbar" id="alerts"></div>
        </div>
    </div>
    
    <script>
        const state = {
            packets: [],
            alerts: [],
            stats: { total: 0, normal: 0, suspicious: 0, critical: 0 },
            trafficData: { timestamps: [], volumes: [] }
        };
        
        const ws = new WebSocket('ws://' + window.location.host + '/ws');
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            if (data.type === 'packet') {
                addPacket(data.payload);
            } else if (data.type === 'alert') {
                addAlert(data.payload);
            } else if (data.type === 'stats') {
                updateStats(data.payload);
            }
        };
        
        function addPacket(packet) {
            state.packets.unshift(packet);
            if (state.packets.length > 100) state.packets.pop();
            
            const severity = getSeverity(packet.confidence);
            state.stats[severity] = (state.stats[severity] || 0) + 1;
            state.stats.total++;
            
            renderPackets();
            updateTrafficChart();
        }
        
        function addAlert(alert) {
            state.alerts.unshift(alert);
            if (state.alerts.length > 50) state.alerts.pop();
            renderAlerts();
        }
        
        function getSeverity(confidence) {
            if (confidence >= 0.7) return 'critical';
            if (confidence >= 0.5) return 'suspicious';
            return 'normal';
        }
        
        function renderPackets() {
            const container = document.getElementById('packets');
            container.innerHTML = state.packets.slice(0, 30).map(p => `
                <div class="packet ${getSeverity(p.confidence)}">
                    <span class="packet-badge badge-${getSeverity(p.confidence)}">${p.label}</span>
                    <strong>${p.meta.domain}</strong><br>
                    <small>Confidence: ${(p.confidence * 100).toFixed(0)}% | ${p.meta.src} → ${p.meta.dst}</small>
                </div>
            `).join('');
        }
        
        function renderAlerts() {
            const container = document.getElementById('alerts');
            container.innerHTML = state.alerts.slice(0, 10).map(a => `
                <div class="alert-card">
                    <div class="alert-title">⚠️ ${a.type}</div>
                    <div class="alert-detail"><strong>Domain:</strong> ${a.domain}</div>
                    <div class="alert-detail"><strong>Reason:</strong> ${a.reason}</div>
                    <div class="confidence">Threat Level: ${a.severity.toUpperCase()}</div>
                </div>
            `).join('');
        }
        
        function updateStats(stats) {
            state.stats = stats;
            const container = document.getElementById('stats');
            const total = state.stats.total || 1;
            container.innerHTML = `
                <div class="stats-item">
                    <div class="stats-value">${state.stats.total}</div>
                    <div class="stats-label">Total Packets</div>
                </div>
                <div class="stats-item">
                    <div class="stats-value" style="color: #00ff64;">${state.stats.normal}</div>
                    <div class="stats-label">Normal (${Math.round(state.stats.normal/total*100)}%)</div>
                </div>
                <div class="stats-item">
                    <div class="stats-value" style="color: #ffc800;">${state.stats.suspicious}</div>
                    <div class="stats-label">Suspicious (${Math.round(state.stats.suspicious/total*100)}%)</div>
                </div>
                <div class="stats-item">
                    <div class="stats-value" style="color: #ff3232;">${state.stats.critical}</div>
                    <div class="stats-label">Critical (${Math.round(state.stats.critical/total*100)}%)</div>
                </div>
            `;
        }
        
        function updateTrafficChart() {
            const normal = state.stats.normal || 0;
            const suspicious = state.stats.suspicious || 0;
            const critical = state.stats.critical || 0;
            
            const data = [{
                x: ['Normal', 'Suspicious', 'Critical'],
                y: [normal, suspicious, critical],
                type: 'bar',
                marker: {
                    color: ['#00ff64', '#ffc800', '#ff3232']
                }
            }];
            
            const layout = {
                title: 'Packet Classification Distribution',
                xaxis: { title: 'Classification' },
                yaxis: { title: 'Count' },
                plot_bgcolor: 'rgba(30, 30, 50, 0.8)',
                paper_bgcolor: 'rgba(30, 30, 50, 0)',
                font: { color: '#e0e0e0' },
                margin: { t: 30, r: 10, l: 50, b: 40 }
            };
            
            Plotly.newPlot('traffic-chart', data, layout, { responsive: true });
        }
        
        // Initialize
        updateStats(state.stats);
        updateTrafficChart();
    </script>
</body>
</html>
"""


def create_app(event_queue: queue.Queue, stats_dict: dict) -> FastAPI:
    app = FastAPI()
    
    # Keep recent events for client broadcast
    recent_events = deque(maxlen=1000)
    active_connections = []

    @app.get("/", response_class=HTMLResponse)
    async def index():
        return HTMLResponse(DASHBOARD_HTML)
    
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        active_connections.append(websocket)
        
        # Send recent events to new client
        for event in list(recent_events)[-20:]:
            try:
                await websocket.send_json(event)
            except:
                pass
        
        # Keep connection alive and relay new events
        try:
            while True:
                # Non-blocking check for new events
                try:
                    item = event_queue.get(timeout=0.1)
                    recent_events.append(item)
                    
                    # Broadcast to all connected clients
                    for conn in active_connections:
                        try:
                            await conn.send_json(item)
                        except:
                            pass
                except queue.Empty:
                    # Send periodic stats update
                    stats_msg = {
                        "type": "stats",
                        "payload": stats_dict.copy()
                    }
                    try:
                        await websocket.send_json(stats_msg)
                    except:
                        pass
        except:
            if websocket in active_connections:
                active_connections.remove(websocket)
    
    return app
