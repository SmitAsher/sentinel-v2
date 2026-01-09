import { useState, useContext, useEffect } from 'react';
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
    return colors[severity] || '#6699ff';
  };

  if (!flows || flows.length === 0) {
    return <div className="decrypted-flows loading">Waiting for flows...</div>;
  }

  return (
    <div className="decrypted-flows">
      <div className="df-header">
        <h2>🔐 Decrypted HTTP/HTTPS Flows ({filteredFlows.length})</h2>
        <div className="df-filters">
          {(['ALL', 'HTTP', 'HTTPS'] as const).map((proto) => (
            <button
              key={proto}
              className={`filter-btn ${filter === proto ? 'active' : ''}`}
              onClick={() => setFilter(proto)}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      <div className="df-table-container">
        <table className="df-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Protocol</th>
              <th>Host</th>
              <th>Method</th>
              <th>Path</th>
              <th>Attack Type</th>
              <th>Severity</th>
              <th>CVSS</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlows.slice(0, 50).map((flow) => (
              <tr key={flow.flow_id} className={`severity-${flow.severity}`}>
                <td className="time">
                  {new Date(flow.timestamp).toLocaleTimeString()}
                </td>
                <td className="protocol">
                  <span className={`proto-badge ${flow.protocol.toLowerCase()}`}>
                    {flow.protocol}
                  </span>
                </td>
                <td className="host">{flow.host}</td>
                <td className="method">
                  <span className={`method-badge ${flow.method.toLowerCase()}`}>
                    {flow.method}
                  </span>
                </td>
                <td className="path" title={flow.path}>
                  {flow.path.substring(0, 50)}
                  {flow.path.length > 50 ? '...' : ''}
                </td>
                <td className="attack">{flow.attack_type}</td>
                <td className="severity">
                  <span
                    className="severity-badge"
                    style={{ color: getSeverityColor(flow.severity) }}
                  >
                    {flow.severity.toUpperCase()}
                  </span>
                </td>
                <td className="cvss">
                  <span className={`cvss-score cvss-${Math.floor(flow.cvss_score / 3)}`}>
                    {flow.cvss_score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredFlows.length === 0 && (
          <div className="no-flows">No flows detected</div>
        )}
      </div>
    </div>
  );
};

export default DecryptedFlows;
