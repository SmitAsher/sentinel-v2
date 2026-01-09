import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

interface Stats {
  total_flows?: number;
  total_alerts?: number;
  severity_distribution?: Record<string, number>;
  [key: string]: any;
}

interface ChartData {
  name?: string;
  value?: number;
  time?: string;
  count?: number;
  [key: string]: any;
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attackDistribution, setAttackDistribution] = useState<ChartData[]>([]);
  const [cvssHistogram, setCvssHistogram] = useState<ChartData[]>([]);
  const [timeline, setTimeline] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [statsRes, attackRes, cvssRes, timelineRes] = await Promise.all([
          axios.get('http://localhost:8000/api/analytics/stats'),
          axios.get('http://localhost:8000/api/analytics/attack-distribution'),
          axios.get('http://localhost:8000/api/analytics/cvss-histogram'),
          axios.get('http://localhost:8000/api/analytics/timeline'),
        ]);

        setStats(statsRes.data);
        setAttackDistribution(
          Object.entries(attackRes.data.distribution || {}).map(([k, v]: [string, any]) => ({ 
            name: k, 
            value: typeof v === 'number' ? v : 0 
          }))
        );
        setCvssHistogram(
          Object.entries(cvssRes.data.histogram || {}).map(([k, v]: [string, any]) => ({ 
            name: k, 
            value: typeof v === 'number' ? v : 0 
          }))
        );
        setTimeline(
          Object.entries(timelineRes.data.timeline || {}).map(([k, v]: [string, any]) => ({ 
            time: k, 
            count: typeof v === 'number' ? v : 0 
          }))
        );
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Use default empty data on error
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#00ff64', '#ffc800', '#ff3232', '#ff6464'];

  if (loading) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#0a0e27', color: '#e0e0e0', textAlign: 'center' }}>
        <h2>Analytics Dashboard</h2>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0e27', color: '#e0e0e0' }}>
      <h2>Analytics Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(30,30,50,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
          <h3>Attack Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={attackDistribution} cx="50%" cy="50%" labelLine={false} label outerRadius={80} fill="#00d4ff" dataKey="value">
                {attackDistribution.map((_entry: ChartData, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'rgba(30,30,50,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
          <h3>CVSS Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cvssHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00d4ff" />
              <XAxis dataKey="name" stroke="#e0e0e0" />
              <YAxis stroke="#e0e0e0" />
              <Tooltip />
              <Bar dataKey="value" fill="#00ff64" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: 'rgba(30,30,50,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
        <h3>Threat Timeline (24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00d4ff" />
            <XAxis dataKey="time" stroke="#e0e0e0" />
            <YAxis stroke="#e0e0e0" />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#ff3232" strokeWidth={2} dot={{ fill: '#ff3232' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ background: 'rgba(0,255,100,0.1)', padding: '15px', borderRadius: '4px', border: '1px solid #00ff64' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff64' }}>{stats.total_flows || 0}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Total Flows</div>
          </div>
          <div style={{ background: 'rgba(255,50,50,0.1)', padding: '15px', borderRadius: '4px', border: '1px solid #ff3232' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff3232' }}>{stats.total_alerts || 0}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Total Alerts</div>
          </div>
          <div style={{ background: 'rgba(255,200,0,0.1)', padding: '15px', borderRadius: '4px', border: '1px solid #ffc800' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc800' }}>{stats.severity_distribution?.critical || 0}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Critical</div>
          </div>
          <div style={{ background: 'rgba(0,212,255,0.1)', padding: '15px', borderRadius: '4px', border: '1px solid #00d4ff' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>-</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Status: Live</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
