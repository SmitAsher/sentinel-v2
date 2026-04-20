import React, {
  useEffect, useState, useContext, useRef, useCallback
} from 'react';
import * as d3geo from 'd3-geo';
import { feature } from 'topojson-client';
import { FlowContext } from '../context/FlowContext';
import '../styles/Map2D.css';

interface Map2DProps { organization: string; }

interface AttackArc {
  id: string;
  srcLat: number; srcLon: number; srcLabel: string;
  tgtLat: number; tgtLon: number; tgtLabel: string;
  tgtId: string;
  severity: string;
  attackType: string;
  protocol: string;
  progress: number;
  born: number;
}

const W = 1010, H = 505;

const ATTACK_TYPES = [
  { type: 'DDoS Flood',          severity: 'critical', protocol: 'UDP',   icon: '🌊' },
  { type: 'Ransomware C2',       severity: 'critical', protocol: 'HTTPS', icon: '🔒' },
  { type: 'Zero-Day Exploit',    severity: 'critical', protocol: 'TCP',   icon: '💀' },
  { type: 'SQL Injection',       severity: 'high',     protocol: 'HTTP',  icon: '💉' },
  { type: 'Credential Stuffing', severity: 'high',     protocol: 'HTTPS', icon: '🔑' },
  { type: 'Brute Force SSH',     severity: 'high',     protocol: 'SSH',   icon: '🔨' },
  { type: 'Phishing Kit',        severity: 'high',     protocol: 'SMTP',  icon: '🎣' },
  { type: 'Port Scan',           severity: 'medium',   protocol: 'TCP',   icon: '🔍' },
  { type: 'DNS Exfiltration',    severity: 'medium',   protocol: 'DNS',   icon: '📡' },
  { type: 'Man-in-the-Middle',   severity: 'medium',   protocol: 'TLS',   icon: '👥' },
  { type: 'Backdoor Beacon',     severity: 'medium',   protocol: 'HTTP',  icon: '🚪' },
  { type: 'Recon Scan',          severity: 'low',      protocol: 'ICMP',  icon: '📻' },
  { type: 'Botnet Ping',         severity: 'low',      protocol: 'UDP',   icon: '🤖' },
  { type: 'XSS Probe',           severity: 'low',      protocol: 'HTTP',  icon: '⚡' },
];

const INFRASTRUCTURE = [
  // Offices
  { id: 'us-west',    type: 'Office',      lat: 37.386,  lon: -122.083, name: 'Mountain View HQ', flag: '🇺🇸' },
  { id: 'us-east',    type: 'Office',      lat: 40.712,  lon:  -74.006, name: 'New York Branch',  flag: '🇺🇸' },
  { id: 'eu-west',    type: 'Office',      lat: 53.349,  lon:   -6.260, name: 'Dublin EMEA',      flag: '🇮🇪' },
  { id: 'asia-east',  type: 'Office',      lat: 35.676,  lon:  139.650, name: 'Tokyo APAC',       flag: '🇯🇵' },
  { id: 'asia-south', type: 'Office',      lat: 19.076,  lon:   72.877, name: 'Mumbai IN',        flag: '🇮🇳' },
  // Data Centers
  { id: 'dc-frankfurt',type: 'Data Center',lat: 50.110,  lon:    8.682, name: 'FRA-1 Core',       flag: '🇩🇪' },
  { id: 'dc-singapore',type: 'Data Center',lat:  1.352,  lon:  103.819, name: 'SGP-1 Core',       flag: '🇸🇬' },
  // Cloud Regions
  { id: 'cloud-aws-nv',type: 'Cloud Region',lat: 39.043, lon:  -77.487, name: 'AWS us-east-1',    flag: '☁️' },
  { id: 'cloud-gcp-eu',type: 'Cloud Region',lat: 50.450, lon:    4.469, name: 'GCP europe-west1', flag: '☁️' },
  // Edge Nodes
  { id: 'edge-syd',    type: 'Edge Node',   lat:-33.868, lon:  151.209, name: 'SYD Edge',         flag: '📡' },
  { id: 'edge-gru',    type: 'Edge Node',   lat:-23.550, lon:  -46.633, name: 'GRU Edge',         flag: '📡' },
  { id: 'edge-cpt',    type: 'Edge Node',   lat:-33.924, lon:   18.423, name: 'CPT Edge',         flag: '📡' },
];

const SOURCES = [
  { lat: 55.751, lon:  37.618, label: 'Moscow'      },
  { lat: 39.929, lon: 116.388, label: 'Beijing'     },
  { lat:  1.352, lon: 103.820, label: 'Singapore'   },
  { lat: 51.507, lon:  -0.127, label: 'London'      },
  { lat: 48.856, lon:   2.352, label: 'Paris'       },
  { lat:-33.868, lon: 151.209, label: 'Sydney'      },
  { lat: 37.566, lon: 126.977, label: 'Seoul'       },
  { lat:-23.547, lon: -46.633, label: 'São Paulo'   },
  { lat: 19.432, lon: -99.133, label: 'Mexico City' },
  { lat:  6.524, lon:   3.379, label: 'Lagos'       },
  { lat: 30.033, lon:  31.233, label: 'Cairo'       },
  { lat: 28.613, lon:  77.209, label: 'Delhi'       },
  { lat: 41.015, lon:  28.979, label: 'Istanbul'    },
  { lat: 34.052, lon:-118.243, label: 'LA'          },
  { lat: 52.520, lon:  13.405, label: 'Berlin'      },
  { lat: 59.913, lon:  10.752, label: 'Oslo'        },
  { lat: 25.204, lon:  55.270, label: 'Dubai'       },
  { lat: 22.572, lon:  88.363, label: 'Kolkata'     },
  { lat: 31.228, lon: 121.474, label: 'Shanghai'    },
  { lat: 47.606, lon:-122.332, label: 'Seattle'     },
];

// ── Black/Red severity palette ──
const SEV_COLOR: Record<string, string> = {
  critical: '#ff0a2e',
  high:     '#ff5500',
  medium:   '#ff9900',
  low:      '#cc2244',
};

const ARC_DURATION = 2800;
// Packet offsets — 4 trailing dots per arc
const PACKET_OFFSETS = [0, 0.07, 0.14, 0.21];

// ── Bezier helpers ──
function bezierPt(t:number,[x0,y0]:[number,number],[cx,cy]:[number,number],[x1,y1]:[number,number]):[number,number]{
  const m=1-t;
  return [m*m*x0+2*m*t*cx+t*t*x1, m*m*y0+2*m*t*cy+t*t*y1];
}
function ctrlPt(s:[number,number],d:[number,number]):[number,number]{
  const mx=(s[0]+d[0])/2,my=(s[1]+d[1])/2;
  const dx=d[0]-s[0],dy=d[1]-s[1];
  const len=Math.sqrt(dx*dx+dy*dy)||1;
  const h=Math.min(len*0.42,130);
  return [mx+(-dy/len)*h,my+(dx/len)*h];
}
function partialPath(s:[number,number],c:[number,number],d:[number,number],t:number):string{
  const steps=60,maxI=Math.floor(t*steps);
  if(maxI<1) return '';
  const pts=[];
  for(let i=0;i<=maxI;i++){const[px,py]=bezierPt(i/steps,s,c,d);pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);}
  return 'M '+pts.join(' L ');
}

export default function Map2D({ organization }: Map2DProps) {
  const { flows } = useContext(FlowContext);
  const [countries, setCountries] = useState<any[]>([]);
  const [proj, setProj] = useState<d3geo.GeoProjection|null>(null);
  const [activeCountry, setActiveCountry] = useState<string|null>(null);
  const [arcs, setArcs] = useState<AttackArc[]>([]);
  const arcsRef = useRef<AttackArc[]>([]);
  const rafRef  = useRef<number>(0);
  const lastFlowId = useRef('');
  const [transform, setTransform] = useState({x:0,y:0,scale:1});
  const dragRef = useRef<{x:number;y:number}|null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);
  const [hits, setHits] = useState<string[]>([]);
  const [eventLog, setEventLog] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text?: string;
    node?: any;
    recentHits?: any[];
  }|null>(null);

  // Load world map
  useEffect(()=>{
    (async()=>{
      try{
        const res=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const world=await res.json();
        const p=d3geo.geoMercator().scale(W/(2*Math.PI)).translate([W/2,H/2+H*0.08]);
        setProj(()=>p);
        const path=d3geo.geoPath().projection(p);
        const feats=(feature(world,world.objects.countries) as any).features as any[];
        setCountries(feats.map((f:any)=>({...f,pathStr:path(f)??''})).filter((f:any)=>f.pathStr));
      }catch(e){console.warn('Map load failed',e);}
    })();
  },[]);

  // Animation loop
  useEffect(()=>{
    const tick=()=>{
      const now=Date.now();
      arcsRef.current=arcsRef.current
        .filter(a=>now-a.born<ARC_DURATION+500)
        .map(a=>({...a,progress:Math.min((now-a.born)/ARC_DURATION,1)}));
      setArcs([...arcsRef.current]);
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  const spawnArc=useCallback((severity?:string)=>{
    const atk=ATTACK_TYPES[Math.floor(Math.random()*ATTACK_TYPES.length)];
    const src=SOURCES[Math.floor(Math.random()*SOURCES.length)];
    const tgt=INFRASTRUCTURE[Math.floor(Math.random()*INFRASTRUCTURE.length)];
    const sev=severity??atk.severity;
    const arc:AttackArc={
      id:`${Date.now()}-${Math.random()}`,
      srcLat:src.lat,srcLon:src.lon,srcLabel:src.label,
      tgtLat:tgt.lat,tgtLon:tgt.lon,tgtLabel:tgt.name,tgtId:tgt.id,
      severity:sev,attackType:atk.type,protocol:atk.protocol,
      progress:0,born:Date.now(),
    };
    arcsRef.current=[...arcsRef.current.slice(-30),arc];
    setHits(h=>[...h,tgt.id]);
    setTimeout(()=>setHits(h=>h.filter(x=>x!==tgt.id)),1100);
    setEventLog(ev=>[{id:arc.id,icon:atk.icon,type:atk.type,src:src.label,tgt:tgt.name,sev,proto:atk.protocol,ts:new Date().toLocaleTimeString()},...ev].slice(0,9));
  },[]);

  // Auto-spawn
  useEffect(()=>{
    const iv=setInterval(()=>spawnArc(),2200);
    return()=>clearInterval(iv);
  },[spawnArc]);

  // Real backend
  useEffect(()=>{
    if(!flows||!flows.length) return;
    const l=flows[0];
    if(l.flow_id===lastFlowId.current) return;
    lastFlowId.current=l.flow_id;
    spawnArc(l.severity);
  },[flows,spawnArc]);

  const pxRaw=useCallback((lat:number,lon:number):[number,number]=>{
    if(!proj) return [0,0];
    const pt=proj([lon,lat]);
    return pt?[pt[0],pt[1]]:[0,0];
  },[proj]);

  const onPtrDown=(e:React.PointerEvent<SVGSVGElement>)=>{
    if(e.button!==0) return;
    dragRef.current={x:e.clientX-transform.x,y:e.clientY-transform.y};
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  };
  const onPtrMove=(e:React.PointerEvent<SVGSVGElement>)=>{
    if(!dragRef.current) return;
    setTransform(t=>({...t,x:e.clientX-dragRef.current!.x,y:e.clientY-dragRef.current!.y}));
  };
  const onPtrUp=()=>{dragRef.current=null;};
  const onWheel=(e:React.WheelEvent<SVGSVGElement>)=>{
    e.preventDefault();
    const f=e.deltaY<0?1.13:0.88;
    setTransform(t=>{
      const ns=Math.max(0.5,Math.min(8,t.scale*f));
      const rect=svgRef.current!.getBoundingClientRect();
      const mx=(e.clientX-rect.left)/rect.width*W;
      const my=(e.clientY-rect.top)/rect.height*H;
      return{scale:ns,x:mx-(mx-t.x)/t.scale*ns,y:my-(my-t.y)/t.scale*ns};
    });
  };

  return (
    <div className="map-container">
      <div className="map-bg-gradient"/>

      {/* Zoom Controls */}
      <div className="map-controls">
        <button className="map-ctrl-btn" onClick={()=>setTransform(t=>({...t,scale:Math.min(8,t.scale*1.3)}))}>＋</button>
        <button className="map-ctrl-btn" onClick={()=>setTransform(t=>({...t,scale:Math.max(0.5,t.scale*0.77)}))}>－</button>
        <button className="map-ctrl-btn" onClick={()=>setTransform({x:0,y:0,scale:1})} title="Reset">⌖</button>
      </div>

      {/* Live Attack Log */}
      <div className="map-event-log">
        <div className="mel-header">⚡ LIVE ATTACK FEED</div>
        {eventLog.map(ev=>(
          <div key={ev.id} className="mel-row">
            <span className="mel-icon">{ev.icon}</span>
            <div className="mel-body">
              <div className="mel-type">{ev.type}</div>
              <div className="mel-sub">{ev.src} → {ev.tgt} <span className="mel-proto">[{ev.proto}]</span></div>
            </div>
            <span className="mel-sev" style={{color:SEV_COLOR[ev.sev]??'#ff4455'}}>{ev.sev.toUpperCase()}</span>
          </div>
        ))}
        {eventLog.length===0&&<div className="mel-empty">Monitoring…</div>}
      </div>

      {/* Main SVG */}
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerLeave={onPtrUp}
        onWheel={onWheel}
        style={{cursor:dragRef.current?'grabbing':'grab'}}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(180,0,0,0.07)" strokeWidth="0.5"/>
          </pattern>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-lg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="9" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="country-glow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="offNode">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="100%" stopColor="#ff2233" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="bgGlow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="#1a0000" stopOpacity="1"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="1"/>
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#bgGlow)"/>
        <rect width={W} height={H} fill="url(#grid)"/>

        {/* Pannable group */}
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>

          {/* Lat lines */}
          {[-60,-30,0,30,60].map(lat=>{
            if(!proj) return null;
            const pts=Array.from({length:361},(_,i)=>i-180)
              .map(lon=>{const p=proj([lon,lat]);return p?`${p[0].toFixed(1)},${p[1].toFixed(1)}`:null;})
              .filter(Boolean).join(' L ');
            return <path key={lat} d={`M ${pts}`} fill="none"
              stroke={lat===0?'rgba(200,0,0,0.15)':'rgba(150,0,0,0.07)'}
              strokeWidth={lat===0?0.9:0.4}
              strokeDasharray={lat===0?undefined:'4 8'}/>;
          })}
          {/* Lon lines */}
          {Array.from({length:13},(_,i)=>i*30-180).map(lon=>{
            if(!proj) return null;
            const pts=Array.from({length:181},(_,i)=>i-90)
              .map(lat=>{const p=proj([lon,lat]);return p?`${p[0].toFixed(1)},${p[1].toFixed(1)}`:null;})
              .filter(Boolean).join(' L ');
            return <path key={lon} d={`M ${pts}`} fill="none"
              stroke="rgba(120,0,0,0.05)" strokeWidth="0.4"/>;
          })}

          {/* Country shapes */}
          {countries.map((c,i)=>{
            const isActive=activeCountry===c.id;
            return (
              <path key={i} d={c.pathStr}
                fill={isActive?'rgba(180,0,0,0.4)':'rgba(20,2,2,0.85)'}
                stroke={isActive?'rgba(255,30,30,0.9)':'rgba(180,20,20,0.3)'}
                strokeWidth={isActive?1:0.55}
                filter="url(#country-glow)"
                style={{cursor:'pointer',transition:'fill 0.2s,stroke 0.2s'}}
                onMouseEnter={e=>setTooltip({x:e.clientX,y:e.clientY,text:`ID: ${c.id}`})}
                onMouseLeave={()=>setTooltip(null)}
                onClick={()=>setActiveCountry(v=>v===c.id?null:c.id)}
              />
            );
          })}

          {/* Attack arcs + packet transfer dots */}
          {arcs.map(arc=>{
            const src=pxRaw(arc.srcLat,arc.srcLon);
            const dst=pxRaw(arc.tgtLat,arc.tgtLon);
            const ctl=ctrlPt(src,dst);
            const t=arc.progress;
            const d=partialPath(src,ctl,dst,t);
            if(!d) return null;
            const col=SEV_COLOR[arc.severity]||'#ff2233';
            const head=bezierPt(t,src,ctl,dst);
            const dying=t>0.78;
            const op=dying?Math.max(0,1-(t-0.78)/0.22):1;
            const sw=1.5/transform.scale;
            const pr=3.5/transform.scale;

            return (
              <g key={arc.id} opacity={op}>
                {/* Glow halo */}
                <path d={d} fill="none" stroke={col}
                  strokeWidth={9/transform.scale} strokeOpacity="0.08"
                  filter="url(#glow-lg)" strokeLinecap="round"/>
                {/* Arc line */}
                <path d={d} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" opacity="0.9"/>

                {/* ── Packet transfer: 4 trailing dots ── */}
                {PACKET_OFFSETS.map((offset,pi)=>{
                  const pt_val=t-offset;
                  if(pt_val<=0||pt_val>1) return null;
                  const [px,py]=bezierPt(pt_val,src,ctl,dst);
                  const pOp=(1-pi*0.22)*op;
                  const pR=(pr*0.9)*(1-pi*0.18);
                  return (
                    <g key={pi} opacity={pOp}>
                      <circle cx={px} cy={py} r={pR*1.8}
                        fill={col} opacity="0.15" filter="url(#glow)"/>
                      <circle cx={px} cy={py} r={pR}
                        fill={col} opacity="0.9"/>
                      <circle cx={px} cy={py} r={pR*0.45}
                        fill="#fff" opacity="0.85"/>
                    </g>
                  );
                })}

                {/* Moving head (lead packet) */}
                {t<0.97&&<>
                  <circle cx={head[0]} cy={head[1]} r={pr*1.5}
                    fill={col} filter="url(#glow)" opacity="0.95"/>
                  <circle cx={head[0]} cy={head[1]} r={pr*0.55} fill="#fff"/>
                </>}

                {/* Source burst */}
                {t<0.15&&<circle cx={src[0]} cy={src[1]} r={pr*1.4}
                  fill={col} filter="url(#glow)" opacity={1-t/0.15}/>}

                {/* Attack type label at midpoint */}
                {t>0.3&&t<0.67&&(()=>{
                  const mp=bezierPt(0.5,src,ctl,dst);
                  return <text x={mp[0]} y={mp[1]-8/transform.scale}
                    fontSize={7/transform.scale} fill={col}
                    textAnchor="middle" fontFamily="Inter,monospace"
                    fontWeight="700" opacity={0.9}
                    style={{pointerEvents:'none'}}>
                    {arc.attackType}
                  </text>;
                })()}
                {/* Source label */}
                {t<0.22&&<text x={src[0]+6/transform.scale} y={src[1]-5/transform.scale}
                  fontSize={6.5/transform.scale} fill={col} opacity={0.8}
                  fontFamily="Inter,monospace" fontWeight="600"
                  style={{pointerEvents:'none'}}>
                  {arc.srcLabel}
                </text>}
                {/* Impact burst */}
                {t>0.88&&<circle cx={dst[0]} cy={dst[1]}
                  r={(t-0.88)*65/transform.scale}
                  fill="none" stroke={col} strokeWidth={1.2/transform.scale}
                  opacity={Math.max(0,1-(t-0.88)*8)}/>}
              </g>
            );
          })}

          {/* Infrastructure nodes */}
          {INFRASTRUCTURE.map(node=>{
            const [x,y]=pxRaw(node.lat,node.lon);
            const isHit=hits.includes(node.id);
            const s=1/transform.scale;
            
            let coreColor = 'rgba(15,0,0,0.95)';
            let ringColor = 'rgba(255,40,40,0.8)';
            let glowColor = 'rgba(200,0,0,0.1)';
            
            if (node.type === 'Data Center') {
              coreColor = 'rgba(0,15,30,0.95)';
              ringColor = 'rgba(40,150,255,0.8)';
              glowColor = 'rgba(0,100,200,0.15)';
            } else if (node.type === 'Cloud Region') {
              coreColor = 'rgba(20,0,25,0.95)';
              ringColor = 'rgba(180,40,255,0.8)';
              glowColor = 'rgba(120,0,200,0.15)';
            } else if (node.type === 'Edge Node') {
              coreColor = 'rgba(0,25,10,0.95)';
              ringColor = 'rgba(40,255,100,0.8)';
              glowColor = 'rgba(0,200,50,0.15)';
            }

            return (
              <g key={node.id} transform={`translate(${x},${y}) scale(${s})`}
                onMouseEnter={e=>{
                  const recentHits = eventLog.filter(ev => ev.tgt === node.name);
                  setTooltip({x:e.clientX,y:e.clientY,node,recentHits});
                }}
                onMouseLeave={()=>setTooltip(null)}
                style={{cursor:'pointer'}}>
                <circle r="18" fill="none" stroke={glowColor} strokeWidth="0.8" className="office-ring-outer"/>
                <circle r="10" fill={coreColor} stroke={ringColor} strokeWidth="0.9" opacity="0.6"/>
                {isHit&&<circle r="7" fill="none" stroke="#ff0a2e" strokeWidth="2.5" className="office-impact-pulse"/>}
                <circle r="5.5" fill={coreColor} stroke={ringColor} strokeWidth="1.3"/>
                {node.type === 'Data Center' ? <rect x="-2" y="-2" width="4" height="4" fill="#ffffff"/> : <circle r="1.5" fill="#ffffff"/>}
                <text y="-16" fontSize="8.5" fill="rgba(255,255,255,0.85)"
                  textAnchor="middle" fontFamily="Inter,monospace" fontWeight="700"
                  letterSpacing="0.5" style={{pointerEvents:'none', textShadow: '0 0 4px #000'}}>
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Loading */}
      {countries.length===0&&(
        <div className="map-loading">
          <div className="map-loading-spinner"/>
          <span>Loading world map…</span>
        </div>
      )}

      {/* Tooltip & Telemetry Card */}
      {tooltip&&(
        <div className={`map-tooltip ${tooltip.node ? 'telemetry-card' : ''}`} style={{left:tooltip.x+14,top:tooltip.y-10}}>
          {tooltip.node ? (
            <div className="telemetry-content">
              <div className="telemetry-header">
                <span className="telemetry-flag">{tooltip.node.flag}</span>
                <span className="telemetry-name">{tooltip.node.name}</span>
                <span className="telemetry-org">{organization}</span>
              </div>
              <div className="telemetry-type-row">
                <span className="telemetry-type">{tooltip.node.type}</span>
                <span className="telemetry-coord">{tooltip.node.lat.toFixed(2)}°, {tooltip.node.lon.toFixed(2)}°</span>
              </div>
              
              <div className="telemetry-divider" />
              
              <div className="telemetry-status">
                <div className="telemetry-status-title">RECENT THREAT ACTIVITY</div>
                {tooltip.recentHits && tooltip.recentHits.length > 0 ? (
                  <div className="telemetry-attacks">
                    {tooltip.recentHits.slice(0, 3).map((atk: any, idx: number) => (
                      <div key={idx} className="telemetry-atk-row">
                        <span className="telemetry-atk-icon">{atk.icon}</span>
                        <div className="telemetry-atk-desc">
                          <span className="telemetry-atk-type" style={{color: SEV_COLOR[atk.sev]||'#ff4455'}}>{atk.type}</span>
                          <span className="telemetry-atk-src">from {atk.src} ({atk.proto})</span>
                        </div>
                        <span className="telemetry-atk-time">{atk.ts}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="telemetry-safe">
                    <span className="telemetry-safe-dot" /> Secure. No active threats detected.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <span className="map-tooltip-dot"/>
              {tooltip.text}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="map-legend">
        {Object.entries(SEV_COLOR).map(([sev,col])=>(
          <div key={sev} className="map-legend-item">
            <span className="map-legend-dot" style={{background:col,boxShadow:`0 0 7px ${col}`}}/>
            <span className="map-legend-label">{sev.toUpperCase()}</span>
          </div>
        ))}
        <div className="map-legend-sep"/>
        <span className="map-legend-hint">🖱 Drag · Scroll zoom · Click country</span>
      </div>

      <div className="organization-watermark">{organization} Infrastructure</div>
    </div>
  );
}
