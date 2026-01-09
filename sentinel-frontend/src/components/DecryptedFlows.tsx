import { useState, useEffect } from 'react';
import '../styles/DecryptedFlows.css';

interface DecryptedFlow {
  flow_id: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  host: string;
  method: string;
  path: string;
  user_agent?: string;
  request_body?: string;
  attack_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvss_score: number;
  timestamp: string;
}

const DecryptedFlows = () => {
  const [flows, setFlows] = useState<DecryptedFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'HTTP' | 'HTTPS'>('ALL');

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const protocol = filter === 'ALL' ? '' : `?protocol=${filter}`;
        const response = await fetch(`http://localhost:8000/api/decrypted${protocol}`);
        const data = await response.json();
        setFlows(data.decrypted_flows || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching decrypted flows:', error);
        setLoading(false);
      }
    };

    fetchFlows();
    const interval = setInterval(fetchFlows, 2000); // Real-time refresh every 2s
    return () => clearInterval(interval);
  }, [filter]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#ff3232',
      high: '#ffc800',
      medium: '#ffeb3b',
      low: '#00ff64',
    };
    return colors[severity] || '#6699ff';
  };

  if (loading) return <div className="decrypted-flows loading">Loading decrypted flows...</div>;

  return (
    <div className="decrypted-flows">
      <div className="df-header">
        <h2>🔐 Decrypted HTTP/HTTPS Flows</h2>
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
            {flows.map((flow) => (
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
        {flows.length === 0 && (
          <div className="no-flows">No flows detected</div>
        )}
      </div>
    </div>
  );
};

export default DecryptedFlows;
