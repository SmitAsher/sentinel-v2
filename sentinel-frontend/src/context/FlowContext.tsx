import React, { createContext, useState, useEffect } from 'react';

export interface Flow {
  flow_id: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  host: string;
  method: string;
  path: string;
  attack_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvss_score: number;
  timestamp: string;
}

export interface Stats {
  total_flows: number;
  total_alerts: number;
  attack_counts: Record<string, number>;
  severity_distribution: Record<string, number>;
}

interface FlowContextType {
  flows: Flow[];
  stats: Stats;
  connected: boolean;
}

export const FlowContext = createContext<FlowContextType>({
  flows: [],
  stats: {
    total_flows: 0,
    total_alerts: 0,
    attack_counts: {},
    severity_distribution: { critical: 0, high: 0, medium: 0, low: 0 },
  },
  connected: false,
});

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_flows: 0,
    total_alerts: 0,
    attack_counts: {},
    severity_distribution: { critical: 0, high: 0, medium: 0, low: 0 },
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
          setConnected(true);
          console.log('✅ WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'flow' && data.payload) {
              setFlows((prev) => [data.payload, ...prev].slice(0, 500));
            } else if (data.type === 'stats' && data.payload) {
              setStats(data.payload);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
          console.log('❌ WebSocket disconnected, reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Error connecting WebSocket:', error);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <FlowContext.Provider value={{ flows, stats, connected }}>
      {children}
    </FlowContext.Provider>
  );
};
