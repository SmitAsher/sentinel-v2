import React, { useContext, useEffect, useState, useRef } from 'react';
import { FlowContext } from '../context/FlowContext';
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import '../styles/ThreatMapLayout.css';

interface ThreatMapLayoutProps {
  organization: string;
  onLogout: () => void;
}

const SEV_COLOR: Record<string, string> = {
  critical: '#ff0a2e',
  high:     '#ff5500',
  medium:   '#ff9900',
  low:      '#cc2244',
};

const ATTACK_ICONS: Record<string, string> = {
  'DDoS Flood':          '🌊',
  'Ransomware C2':       '🔒',
  'Zero-Day Exploit':    '💀',
  'SQL Injection':       '💉',
  'Credential Stuffing': '🔑',
  'Brute Force SSH':     '🔨',
  'Phishing Kit':        '🎣',
  'Port Scan':           '🔍',
  'DNS Exfiltration':    '📡',
  'Man-in-the-Middle':   '👥',
  'Backdoor Beacon':     '🚪',
  'Recon Scan':          '📻',
  'Botnet Ping':         '🤖',
  'XSS Probe':           '⚡',
};

export default function ThreatMapLayout({ organization, onLogout }: ThreatMapLayoutProps) {
  const { flows, stats } = useContext(FlowContext);
  const [displayCount, setDisplayCount] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeline data (attacks per 5-min bucket)
  const [timelineData, setTimelineData] = useState<{ t: string; v: number }[]>([]);

  // Packet rate data (simulated network throughput)
  const [packetData, setPacketData] = useState<{ t: string; mbps: number; pps: number }[]>(() =>
    Array.from({ length: 20 }, (_, i) => ({
      t: `${i}`,
      mbps: Math.random() * 40 + 10,
      pps: Math.random() * 800 + 200,
    }))
  );

  // Attack type distribution for bar chart
  const [attackDist, setAttackDist] = useState<{ name: string; count: number }[]>([]);

  // Animated counter
  useEffect(() => {
    const target = stats.total_alerts || 0;
    const diff = target - displayCount;
    if (diff === 0) return;
    const step = Math.ceil(Math.abs(diff) / 10);
    animRef.current = setTimeout(() => {
      setDisplayCount(prev => (diff > 0 ? Math.min(prev + step, target) : prev));
    }, 60);
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [stats.total_alerts, displayCount]);

  // Build timeline
  useEffect(() => {
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 5 * 60000);
      const key = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      buckets[key] = 0;
    }
    flows.forEach(f => {
      const k = new Date(f.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (k in buckets) buckets[k]++;
    });
    setTimelineData(Object.entries(buckets).map(([t, v]) => ({ t, v })));
  }, [flows]);

  // Simulate packet rate ticking every 1.5s
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPacketData(prev => [
        ...prev.slice(-19),
        { t: now, mbps: Math.random() * 60 + 15, pps: Math.random() * 1200 + 300 }
      ]);
    }, 1500);
    return () => clearInterval(iv);
  }, []);

  // Build attack type distribution
  useEffect(() => {
    const counts: Record<string, number> = {};
    flows.forEach(f => {
      const name = f.attack_type || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    // Pad with static entries if no real data
    if (Object.keys(counts).length === 0) {
      const defaults = [
        { name: 'DDoS Flood', count: 42 },
        { name: 'Brute Force', count: 31 },
        { name: 'SQL Inject', count: 27 },
        { name: 'Phishing', count: 19 },
        { name: 'Ransomware', count: 14 },
        { name: 'Port Scan', count: 11 },
      ];
      setAttackDist(defaults);
    } else {
      setAttackDist(
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name: name.split(' ')[0], count }))
      );
    }
  }, [flows]);

  const recentFlows = flows.slice(0, 8);
  const isLive = stats.total_alerts > 0;

  return (
    <div className="tl-root">

      {/* ── TOP BAR ── */}
      <div className="tl-topbar">
        <div className="tl-branding">
          <span className="tl-brand-icon">⚔</span>
          <span className="tl-brand-name">SENTINEL <span>ENTERPRISE</span></span>
        </div>

        <div className="tl-scoreboard">
          <div className="tl-title">LIVE CYBER THREAT MAP</div>
          <div className="tl-count">{displayCount.toLocaleString()}</div>
          <div className="tl-count-label">ATTACKS DETECTED — {organization.toUpperCase()}</div>
        </div>

        <div className="tl-topbar-right">
          <div className={`tl-status ${isLive ? 'live' : 'idle'}`}>
            <span className="tl-status-dot" />
            {isLive ? 'LIVE THREATS' : 'MONITORING'}
          </div>
          <button className="tl-logout" onClick={onLogout}>Switch Org</button>
        </div>
      </div>

      {/* ── LEFT PANEL ── */}
      <div className="tl-panel tl-left">

        {/* Attack timeline */}
        <div className="tl-section">
          <div className="tl-section-title">
            ATTACK TIMELINE
            <span className="tl-rate">⚡ {recentFlows.length}/min</span>
          </div>
          <div className="tl-chart">
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff0a2e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff0a2e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#ff0a2e" strokeWidth={2}
                  fill="url(#areaGrad)" dot={false}/>
                <Tooltip
                  contentStyle={{ background:'#0a0000', border:'1px solid #ff0a2e', fontSize:10 }}
                  labelStyle={{ color:'#888' }} itemStyle={{ color:'#ff0a2e' }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Packet transfer rate graph */}
        <div className="tl-section">
          <div className="tl-section-title">
            PACKET TRANSFER RATE
            <span className="tl-rate tl-rate--green">
              {packetData[packetData.length-1]?.pps?.toFixed(0)} pps
            </span>
          </div>
          <div className="tl-chart">
            <ResponsiveContainer width="100%" height={75}>
              <LineChart data={packetData}>
                <Line type="monotone" dataKey="mbps" stroke="#ff5500"
                  strokeWidth={1.8} dot={false} strokeDasharray="none"/>
                <Line type="monotone" dataKey="pps" stroke="#ff0a2e"
                  strokeWidth={1.2} dot={false} strokeDasharray="3 3" opacity={0.6}/>
                <Tooltip
                  contentStyle={{ background:'#0a0000', border:'1px solid #ff5500', fontSize:10 }}
                  labelStyle={{ color:'#666' }}
                  itemStyle={{ color:'#ff5500' }}
                  formatter={(val: any, name: string) =>
                    name === 'mbps' ? [`${Number(val).toFixed(1)} Mbps`, 'Throughput']
                                   : [`${Number(val).toFixed(0)} pps`, 'Packets/sec']
                  }
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="tl-packet-legend">
            <span><span className="tl-pl-dot" style={{background:'#ff5500'}}/>Throughput (Mbps)</span>
            <span><span className="tl-pl-dot" style={{background:'#ff0a2e'}}/>Packets/sec</span>
          </div>
        </div>

        {/* Live feed */}
        <div className="tl-section tl-feed-section">
          <div className="tl-section-title">LIVE ATTACK FEED</div>
          <ul className="tl-feed">
            {recentFlows.length === 0 && (
              <li className="tl-feed-empty">Waiting for attack data…</li>
            )}
            {recentFlows.map((flow, i) => (
              <li key={flow.flow_id + i} className="tl-feed-item">
                <span className="tl-feed-dot"
                  style={{ background: SEV_COLOR[flow.severity], boxShadow: `0 0 6px ${SEV_COLOR[flow.severity]}` }}/>
                <div className="tl-feed-body">
                  <div className="tl-feed-name">
                    {ATTACK_ICONS[flow.attack_type] || '⚠️'} {flow.attack_type || 'Unknown Exploit'}
                  </div>
                  <div className="tl-feed-sub">
                    {new Date(flow.timestamp).toLocaleTimeString()}
                    &nbsp;·&nbsp;{flow.src_ip} ➔ {organization}
                  </div>
                </div>
                <span className="tl-feed-sev" style={{ color: SEV_COLOR[flow.severity] }}>
                  {flow.severity?.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="tl-panel tl-right">

        {/* Attack type bar chart */}
        <div className="tl-section">
          <div className="tl-section-title">TOP ATTACK VECTORS</div>
          <div className="tl-chart">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={attackDist} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" hide/>
                <YAxis type="category" dataKey="name" width={70}
                  tick={{ fontSize: 9, fill: 'rgba(220,120,120,0.7)', fontFamily: 'Inter,monospace' }}/>
                <Tooltip
                  contentStyle={{ background:'#0a0000', border:'1px solid #ff0a2e', fontSize:10 }}
                  itemStyle={{ color:'#ff5500' }}/>
                <Bar dataKey="count" radius={[0,3,3,0]}>
                  {attackDist.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#ff0a2e' : i === 1 ? '#ff3300' : i === 2 ? '#ff5500' : '#991122'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top targeted offices */}
        <div className="tl-section">
          <div className="tl-section-title">TOP TARGETED OFFICES</div>
          <p className="tl-subtext">Highest attack concentration per office</p>
          {[
            { name: 'Mountain View', country: '🇺🇸', pct: 90 },
            { name: 'Dublin',        country: '🇮🇪', pct: 65 },
            { name: 'Tokyo',         country: '🇯🇵', pct: 48 },
            { name: 'New York',      country: '🇺🇸', pct: 35 },
            { name: 'Mumbai',        country: '🇮🇳', pct: 24 },
          ].map(o => (
            <div key={o.name} className="tl-rank-item">
              <span className="tl-rank-flag">{o.country}</span>
              <span className="tl-rank-name">{o.name}</span>
              <div className="tl-rank-bar-bg">
                <div className="tl-rank-bar" style={{ width: `${o.pct}%` }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Severity breakdown */}
        <div className="tl-section">
          <div className="tl-section-title">SEVERITY BREAKDOWN</div>
          {['critical', 'high', 'medium', 'low'].map(sev => (
            <div key={sev} className="tl-sev-row">
              <span className="tl-sev-dot" style={{ background: SEV_COLOR[sev], boxShadow: `0 0 6px ${SEV_COLOR[sev]}` }}/>
              <span className="tl-sev-label">{sev.toUpperCase()}</span>
              <div className="tl-sev-bar-bg">
                <div className="tl-sev-bar"
                  style={{
                    width: `${Math.min(100, ((stats.severity_distribution?.[sev] ?? 0) / Math.max(1, stats.total_alerts || 1)) * 100)}%`,
                    background: SEV_COLOR[sev]
                  }}/>
              </div>
              <span className="tl-sev-val">{stats.severity_distribution?.[sev] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Geo distribution donut-style bars */}
        <div className="tl-section">
          <div className="tl-section-title">ATTACK ORIGIN REGIONS</div>
          {[
            { region: 'East Asia',    pct: 38, col: '#ff0a2e' },
            { region: 'East Europe',  pct: 27, col: '#ff3300' },
            { region: 'Middle East',  pct: 14, col: '#ff5500' },
            { region: 'South Asia',   pct: 12, col: '#cc1133' },
            { region: 'Americas',     pct: 9,  col: '#991122' },
          ].map(r => (
            <div key={r.region} className="tl-rank-item">
              <span className="tl-rank-name" style={{ color: 'rgba(220,140,140,0.75)' }}>{r.region}</span>
              <div className="tl-rank-bar-bg">
                <div className="tl-rank-bar" style={{ width: `${r.pct}%`, background: r.col }}/>
              </div>
              <span className="tl-rank-pct">{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM LEGEND ── */}
      <div className="tl-legend">
        {[
          { label: 'Critical', color: '#ff0a2e' },
          { label: 'High',     color: '#ff5500' },
          { label: 'Medium',   color: '#ff9900' },
          { label: 'Low',      color: '#cc2244' },
        ].map(l => (
          <div key={l.label} className="tl-legend-item">
            <span className="tl-legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }}/>
            {l.label}
          </div>
        ))}
        <div className="tl-legend-drag">🖱 Drag map · Scroll to zoom · Click country</div>
      </div>
    </div>
  );
}
