import { useContext, useState, useEffect } from 'react';
import { FlowContext } from '../context/FlowContext';
import '../styles/DecryptedFlows.css';

const DecryptedFlows = () => {
  const { flows } = useContext(FlowContext);
  const [filter, setFilter] = useState<'ALL' | 'HTTP' | 'HTTPS'>('ALL');
  const [filteredFlows, setFilteredFlows] = useState(flows);

  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredFlows(flows);
    } else {
      setFilteredFlows(flows.filter((f) => f.protocol === filter));
    }
  }, [flows, filter]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#ff3232',
      high: '#ffc800',
      medium: '#ffeb3b',
      low: '#00ff64',
    };
    return colors[severity.toLowerCase()] || '#90caf9';
  };

  return (
    <div className="decrypted-flows-container">
      <div className="flows-header">
        <h2>🔐 Decrypted Network Flows</h2>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            📡 ALL ({flows.length})
          </button>
          <button
            className={`filter-btn ${filter === 'HTTP' ? 'active' : ''}`}
            onClick={() => setFilter('HTTP')}
          >
            🌐 HTTP
          </button>
          <button
            className={`filter-btn ${filter === 'HTTPS' ? 'active' : ''}`}
            onClick={() => setFilter('HTTPS')}
          >
            🔒 HTTPS
          </button>
        </div>
      </div>

      <div className="flows-table-wrapper">
        <table className="flows-table">
          <thead>
            <tr>
              <th>⏱️ Time</th>
              <th>🔗 Protocol</th>
              <th>🏠 Host</th>
              <th>📝 Method</th>
              <th>🛣️ Path</th>
              <th>🎯 Attack Type</th>
              <th>⚠️ Severity</th>
              <th>📊 CVSS</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlows.slice(0, 50).map((flow) => (
              <tr key={flow.flow_id} className={`severity-${flow.severity?.toLowerCase()}`}>
                <td className="time-cell">{new Date(flow.timestamp).toLocaleTimeString()}</td>
                <td>
                  <span className={`proto-badge proto-${flow.protocol.toLowerCase()}`}>
                    {flow.protocol}
                  </span>
                </td>
                <td className="host-cell">{flow.host}</td>
                <td>
                  <span className={`method-badge method-${flow.method.toLowerCase()}`}>
                    {flow.method}
                  </span>
                </td>
                <td className="path-cell" title={flow.path}>
                  {flow.path.substring(0, 50)}
                  {flow.path.length > 50 ? '...' : ''}
                </td>
                <td className="attack-cell">{flow.attack_type}</td>
                <td style={{ color: getSeverityColor(flow.severity || 'low') }}>
                  <strong>{flow.severity?.toUpperCase()}</strong>
                </td>
                <td>
                  <span className={`cvss-score cvss-${Math.floor((flow.cvss_score || 0) / 3)}`}>
                    {(flow.cvss_score || 0).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredFlows.length === 0 && (
          <div className="no-flows">
            <p>No flows captured yet...</p>
          </div>
        )}
      </div>

      <div className="flows-footer">
        <span className="flow-count">
          Showing {Math.min(50, filteredFlows.length)} of {filteredFlows.length} flows
        </span>
      </div>
    </div>
  );
};

export default DecryptedFlows;