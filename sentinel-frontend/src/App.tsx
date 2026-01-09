import { useState } from 'react';
import { FlowProvider } from './context/FlowContext';
import GlobeComponent from './components/Globe';
import Analytics from './components/Analytics';
import DecryptedFlows from './components/DecryptedFlows';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('globe');

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
        {activeTab === 'globe' && <GlobeComponent />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'decrypted' && <DecryptedFlows />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FlowProvider>
      <AppContent />
    </FlowProvider>
  );
}

