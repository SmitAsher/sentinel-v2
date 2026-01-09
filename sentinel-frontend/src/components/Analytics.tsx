import { useContext, useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FlowContext } from '../context/FlowContext';
import '../styles/Analytics.css';

interface ChartData {
  name?: string;
  value?: number;
  time?: string;
  count?: number;
  [key: string]: any;
}

const COLORS = {
  critical: '#ff3232',
  high: '#ffc800',
  medium: '#ffeb3b',
  low: '#00ff64',
  normal: '#6699ff',
};

const Analytics = () => {
  const { stats, flows } = useContext(FlowContext);
  const [attackDistribution, setAttackDistribution] = useState<ChartData[]>([]);
  const [cvssHistogram, setCvssHistogram] = useState<ChartData[]>([]);
  const [timeline, setTimeline] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Update charts from context data
    if (!stats) return;

    // Attack distribution
    const attackDist = Object.entries(stats.attack_counts || {}).map(([type, count]) => ({
      name: type,
      value: count as number,
    }));
    setAttackDistribution(attackDist);

    // CVSS histogram (from flows)
    const cvssData = {
      '0.0-3.9': 0,
      '4.0-6.9': 0,
      '7.0-8.9': 0,
      '9.0-10.0': 0,
    };
    flows.forEach((flow) => {
      const cvss = flow.cvss_score || 0;
      if (cvss < 4.0) cvssData['0.0-3.9']++;
      else if (cvss < 7.0) cvssData['4.0-6.9']++;
      else if (cvss < 9.0) cvssData['7.0-8.9']++;
      else cvssData['9.0-10.0']++;
    });
    setCvssHistogram(
      Object.entries(cvssData).map(([range, count]) => ({
        name: range,
        value: count,
      }))
    );

    // Timeline
    const now = new Date();
    const timelineData: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const time = new Date(now.getTime() - i * 5 * 60000);
      const key = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      timelineData[key] = 0;
    }
    flows.forEach((flow) => {
      const time = new Date(flow.timestamp);
      const key = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (key in timelineData) timelineData[key]++;
    });
    setTimeline(
      Object.entries(timelineData).reverse().map(([time, count]) => ({
        time,
        count,
      }))
    );
  }, [stats, flows]);        setStats(statsRes.data);
        setAttackDistribution(
          Object.entries(attackRes.data.distribution || {})
            .map(([k, v]: [string, any]) => ({ name: k, value: typeof v === 'number' ? v : 0 }))
            .sort((a, b) => (b.value || 0) - (a.value || 0))
        );
        setCvssHistogram(
          Object.entries(cvssRes.data.histogram || {}).map(([k, v]: [string, any]) => ({ 
            name: k, 
            value: typeof v === 'number' ? v : 0 
          }))
        );
        setTimeline(
          Object.entries(timelineRes.data.timeline || {})
            .slice(-12)
            .map(([k, v]: [string, any]) => ({ time: k, count: typeof v === 'number' ? v : 0 }))
        );
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Use default empty data on error
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 3000); // Real-time: every 3 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="analytics-container loading">
        <div className="loading-spinner">
          <h2>📊 Analytics Dashboard</h2>
          <p>Loading real-time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Real-Time Analytics Dashboard</h2>
        <div className="update-indicator">
          <span className="live-dot"></span>
          Last update: {lastUpdate?.toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card critical">
            <div className="stat-icon">🚨</div>
            <div className="stat-value">{stats.total_flows || 0}</div>
            <div className="stat-label">Total Flows</div>
          </div>
          <div className="stat-card alert">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats.total_alerts || 0}</div>
            <div className="stat-label">Alerts</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">🔴</div>
            <div className="stat-value">{stats.severity_distribution?.critical || 0}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">💻</div>
            <div className="stat-value">{Object.keys(stats.attack_counts || {}).length}</div>
            <div className="stat-label">Attack Types</div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Attack Distribution */}
        <div className="chart-card">
          <h3>🎯 Attack Type Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={attackDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#00d4ff"
                dataKey="value"
              >
                {attackDistribution.map((_entry: ChartData, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={Object.values(COLORS)[index % Object.values(COLORS).length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #00d4ff' }}
                labelStyle={{ color: '#00d4ff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* CVSS Histogram */}
        <div className="chart-card">
          <h3>📈 CVSS Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cvssHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.2)" />
              <XAxis dataKey="name" stroke="#90caf9" />
              <YAxis stroke="#90caf9" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #00d4ff' }}
                labelStyle={{ color: '#00d4ff' }}
              />
              <Bar dataKey="value" fill="#00ff64" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Timeline */}
        <div className="chart-card full-width">
          <h3>📊 Threat Timeline (Last 12 Hours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.2)" />
              <XAxis dataKey="time" stroke="#90caf9" />
              <YAxis stroke="#90caf9" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #00d4ff' }}
                labelStyle={{ color: '#00d4ff' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ff3232"
                strokeWidth={3}
                dot={{ fill: '#ff3232', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
