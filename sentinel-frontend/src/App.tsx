import React, { useState, useContext } from 'react';
import { FlowProvider, FlowContext } from './context/FlowContext';
import Login from './components/Login';
import Map2D from './components/Map2D';
import ThreatMapLayout from './components/ThreatMapLayout';
import { useTabAlerts } from './hooks/useTabAlerts';

// To remove the old styles cleanly and rely on the new ones
import './styles/Login.css';
import './styles/Map2D.css';
import './styles/ThreatMapLayout.css';

function MainApp() {
  const [organization, setOrganization] = useState<string>('');
  const { stats } = useContext(FlowContext);

  // Hook handles browser tab modifications
  useTabAlerts(stats.total_alerts || 0, organization);

  if (!organization) {
    return <Login onLogin={setOrganization} />;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0b0c10' }}>
      {/* Background Interactive 2D Map */}
      <Map2D organization={organization} />
      
      {/* Enterprise Analytics Overlay */}
      <ThreatMapLayout organization={organization} onLogout={() => setOrganization('')} />
    </div>
  );
}

export default function App() {
  return (
    <FlowProvider>
      <MainApp />
    </FlowProvider>
  );
}

