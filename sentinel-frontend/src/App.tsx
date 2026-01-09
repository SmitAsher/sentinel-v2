import { useState, useEffect } from 'react';
import GlobeComponent from './components/Globe';
import Analytics from './components/Analytics';
import DecryptedFlows from './components/DecryptedFlows';
import './App.css';

interface Flow {
  src_ip: string;
  dst_ip: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  [key: string]: any;
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('globe');
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    // WebSocket connection with reconnect logic
    let ws: WebSocket | null = null;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws');

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'flow' && data.payload) {
              setFlows((prev) => [data.payload, ...prev].slice(0, 500));
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setTimeout(connectWebSocket, 3000); // Reconnect after 3s
        };

        ws.onclose = () => {
          setTimeout(connectWebSocket, 3000); // Reconnect after 3s
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>⚔️ SENTINEL v2.0</h1>
        <p className="subtitle">Network Threat Intelligence & TLS Decryption</p>
        <div className="nav-tabs">
          <button
            className={activeTab === 'globe' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('globe')}
          >
            🌍 Globe View
          </button>
          <button
            className={activeTab === 'analytics' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            className={activeTab === 'decrypted' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('decrypted')}
          >
            🔐 Decrypted Flows
          </button>
        </div>
      </header>

      <main className="content">
        {activeTab === 'globe' && <GlobeComponent flows={flows} />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'decrypted' && <DecryptedFlows />}
      </main>
    </div>
  );
}

export default App;

