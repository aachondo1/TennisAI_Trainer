import React, { useState } from 'react';

// ─── TIPOS ────────────────────────────────────────────────────
interface AnalysisDelta {
  joint:         string;
  label:         string;
  user_angle:    number;
  ideal_angle:   number;
  deviation_pct: number;
  status:        'normal' | 'warning' | 'critical';
  critical:      boolean;
}

interface BoneMode {
  pose:                number[][] | null;  // 33 x [x,y] or [x,y,z,v]
  ideal_pose_overlay?: number[][];         // ATP reference pose scaled to user (33 x [x,y,z,v])
  angles:              Record<string, number>;
  analysis_delta:      AnalysisDelta[];
  score:               number;
  averaged_from?:      number;
  timestamp?:          number;
  ball_speed?:         number;
  label:               string;
}

interface BoneMappingData {
  session_meta: {
    total_impacts:     number;
    impacts_with_pose: number;
    dominant_hand:     string;
    stroke_type:       string;
    stroke_counts:     Record<string, number>;
  };
  modes: {
    representative: BoneMode;
    best:           BoneMode;
    worst:          BoneMode;
  };
  timeline: Array<{
    timestamp:   number;
    score:       number;
    stroke_type: string | null;
  }>;
}

// ─── MEDIAPIPE CONNECTIONS ────────────────────────────────────
const CONNECTIONS: [number, number][] = [
  [11,12],[12,24],[24,23],[23,11],       // trunk core
  [12,14],[14,16],                        // dominant arm (right)
  [11,13],[13,15],                        // non-dominant arm
  [16,18],[16,20],[18,20],               // right hand
  [15,17],[15,19],[17,19],               // left hand
  [24,26],[26,28],[28,30],[28,32],       // right leg
  [23,25],[25,27],[27,29],[27,31],       // left leg
  [0,11],[0,12],                          // head to shoulders
];
const IMPACT_POINT = 16; // dominant wrist

const STATUS_COLOR: Record<string, string> = {
  normal:   '#3B82F6',
  warning:  '#F97316',
  critical: '#EF4444',
};

// ─── HELPERS ──────────────────────────────────────────────────
const VW = 560; const VH = 420;
const ML = 80;  const MR = 80; const MT = 30; const MB = 30;
const DW = VW - ML - MR; const DH = VH - MT - MB;

function project(pts: number[][]): [number, number][] {
  return pts.map(([nx, ny]) => [ML + nx * DW, MT + ny * DH]);
}

function alignIdeal(userPts: [number,number][], idealPts: [number,number][]): [number,number][] {
  const uH = Math.abs(userPts[29][1] - userPts[0][1]);
  const iH = Math.abs(idealPts[29][1] - idealPts[0][1]);
  const scale = iH > 1e-4 ? uH / iH : 1;
  const uHipX = (userPts[23][0] + userPts[24][0]) / 2;
  const uHipY = (userPts[23][1] + userPts[24][1]) / 2;
  const iHipX = (idealPts[23][0] + idealPts[24][0]) / 2;
  const iHipY = (idealPts[23][1] + idealPts[24][1]) / 2;
  return idealPts.map(([x, y]) => [uHipX + (x - iHipX) * scale, uHipY + (y - iHipY) * scale]);
}

function boneColor(a: number, b: number, delta: AnalysisDelta[]): string {
  const map: Record<number, string> = {
    14:'right_elbow', 16:'right_elbow',
    13:'left_elbow',  15:'left_elbow',
    26:'right_knee',  28:'right_knee',
    25:'left_knee',   27:'left_knee',
    24:'right_hip',   26:'right_hip',
    23:'left_hip',    25:'left_hip',
  };
  const key = map[a] || map[b];
  if (!key) return STATUS_COLOR.normal;
  const entry = delta.find(d => d.joint === key);
  return entry ? (STATUS_COLOR[entry.status] || STATUS_COLOR.normal) : STATUS_COLOR.normal;
}

// ─── SKELETON SVG ─────────────────────────────────────────────
function SkeletonSVG({ mode, idealPose, C }: {
  mode:      BoneMode;
  idealPose: number[][];
  C:         Record<string, string>;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);

  if (!mode.pose) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: VH, color: C.textMut, fontSize: 13 }}>
      Sin datos de pose para este modo
    </div>
  );

  const userPts  = project(mode.pose);
  const idealRaw = project(idealPose) as [number,number][];
  const idealPts = alignIdeal(userPts as [number,number][], idealRaw);
  const delta    = mode.analysis_delta;

  const JOINT_LABELS: Record<string, { pts: number[]; label: string }> = {
    right_elbow: { pts:[12,14,16], label:'codo der.' },
    left_elbow:  { pts:[11,13,15], label:'codo izq.' },
    right_knee:  { pts:[24,26,28], label:'rodilla der.' },
    left_knee:   { pts:[23,25,27], label:'rodilla izq.' },
  };

  const PT_NAMES = [
    'nariz','ojo izq int','ojo izq','ojo izq ext','ojo der int',
    'ojo der','ojo der ext','oreja izq','oreja der','boca izq','boca der',
    'hombro izq','hombro der','codo izq','codo der','muñeca izq',
    'muñeca der ★','meñique izq','meñique der','índice izq','índice der',
    'pulgar izq','pulgar der','cadera izq','cadera der','rodilla izq',
    'rodilla der','tobillo izq','tobillo der','talón izq','talón der',
    'pie izq','pie der',
  ];

  const getTooltipEntry = (idx: number) =>
    delta.find(d => JOINT_LABELS[d.joint]?.pts.includes(idx));

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display:'block' }}>
        {/* Grid */}
        <defs>
          <pattern id="bm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#bm-grid)" rx="8"/>

        {/* Layer 1: Benchmark (dashed, emerald) */}
        <g opacity="0.4">
          {CONNECTIONS.map(([a,b],i) => {
            if (!idealPts[a] || !idealPts[b]) return null;
            return (
              <line key={i}
                x1={idealPts[a][0]} y1={idealPts[a][1]}
                x2={idealPts[b][0]} y2={idealPts[b][1]}
                stroke="#10B981" strokeWidth="1.5" strokeDasharray="5 4"
              />
            );
          })}
          {idealPts.map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.5"/>
          ))}
        </g>

        {/* Layer 2: User skeleton */}
        <g>
          {CONNECTIONS.map(([a,b],i) => {
            if (!userPts[a] || !userPts[b]) return null;
            return (
              <line key={i}
                x1={userPts[a][0]} y1={userPts[a][1]}
                x2={userPts[b][0]} y2={userPts[b][1]}
                stroke={boneColor(a, b, delta)}
                strokeWidth="2.5" strokeLinecap="round" opacity="0.95"
              />
            );
          })}
        </g>

        {/* Layer 3: Nodes */}
        <g>
          {userPts.map(([x,y],i) => {
            const isImpact = i === IMPACT_POINT;
            const entry = getTooltipEntry(i);
            const color = entry ? STATUS_COLOR[entry.status] : '#3B82F6';
            if (isImpact) return (
              <g key={i}>
                <circle cx={x} cy={y} r="9" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="r" values="7;12;7" dur="1.4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.4s" repeatCount="indefinite"/>
                </circle>
                <circle cx={x} cy={y} r="5" fill="#F59E0B" stroke="#0f1923" strokeWidth="1.5"/>
              </g>
            );
            return (
              <circle key={i} cx={x} cy={y} r="4"
                fill={color} stroke="#0f1923" strokeWidth="1" opacity="0.9"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x, y, idx: i })}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </g>

        {/* Layer 4: Angle labels on critical joints only */}
        {delta.filter(d => d.critical).map(entry => {
          const jDef = JOINT_LABELS[entry.joint];
          if (!jDef) return null;
          const midIdx = jDef.pts[1];
          const [lx, ly] = userPts[midIdx];
          return (
            <g key={entry.joint}>
              <rect x={lx+8} y={ly-14} width={94} height={22} rx="5"
                fill="#1a1d27" stroke="#EF4444" strokeWidth="1" opacity="0.92"/>
              <text x={lx+14} y={ly+2}
                fill="#EF4444" fontSize="10" fontWeight="600"
                fontFamily="'DM Mono', monospace">
                {entry.user_angle}° vs {entry.ideal_angle}°
              </text>
            </g>
          );
        })}

        {/* Hover tooltip */}
        {tooltip && (() => {
          const entry = getTooltipEntry(tooltip.idx);
          const tx = tooltip.x + 14 > VW - 160 ? tooltip.x - 160 : tooltip.x + 14;
          const ty = Math.min(tooltip.y - 10, VH - 90);
          return (
            <g>
              <rect x={tx} y={ty} width={150} height={entry ? 72 : 36} rx="6"
                fill="#12151e" stroke="#2a2d3a" strokeWidth="1" opacity="0.96"/>
              <text x={tx+10} y={ty+16} fill="#e8eaf0" fontSize="11" fontWeight="600"
                fontFamily="'DM Sans', sans-serif">
                {PT_NAMES[tooltip.idx] ?? `punto ${tooltip.idx}`}
              </text>
              {entry && (<>
                <text x={tx+10} y={ty+32} fill="#8a8ea8" fontSize="10"
                  fontFamily="'DM Sans', sans-serif">{entry.label}</text>
                <text x={tx+10} y={ty+47} fill={STATUS_COLOR[entry.status]} fontSize="10"
                  fontFamily="'DM Mono', monospace">
                  {entry.user_angle}° usuario · {entry.ideal_angle}° ATP
                </text>
                <text x={tx+10} y={ty+62} fill="#8a8ea8" fontSize="10"
                  fontFamily="'DM Mono', monospace">
                  desviación {entry.deviation_pct}%
                </text>
              </>)}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── JOINT CARDS ──────────────────────────────────────────────
function JointCards({ delta, C }: { delta: AnalysisDelta[]; C: Record<string,string> }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
      {delta.map(entry => {
        const color = STATUS_COLOR[entry.status];
        const fillPct = Math.max(0, 100 - entry.deviation_pct * 2.5);
        const statusLabel = { normal:'Normal', warning:'Desviación', critical:'Crítico' }[entry.status];
        return (
          <div key={entry.joint} style={{
            background: C.surface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:'10px 12px',
          }}>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:4, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {entry.label}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:6 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500, color }}>{entry.user_angle}°</span>
              <span style={{ fontSize:11, color:C.textMut }}>/ {entry.ideal_angle}° ATP</span>
            </div>
            <div style={{ height:4, background:C.border, borderRadius:2, overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', width:`${fillPct}%`, background:color, borderRadius:2, transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ fontSize:10, fontWeight:600, color }}>{statusLabel} · {entry.deviation_pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TIMELINE MINI ────────────────────────────────────────────
function TimelineMini({ timeline, C }: { timeline: BoneMappingData['timeline']; C: Record<string,string> }) {
  if (!timeline?.length) return null;
  const maxScore = 100;
  return (
    <div>
      <div style={{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace", marginBottom:6 }}>
        Timeline de impactos ({timeline.length} golpes)
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', height:36, gap:1, background:C.bg, borderRadius:4, padding:'4px 4px 0', overflow:'hidden' }}>
        {timeline.map((t, i) => {
          const h = Math.max(4, (t.score / maxScore) * 32);
          const color = t.score >= 80 ? '#10B981' : t.score >= 60 ? '#3B82F6' : t.score >= 40 ? '#F97316' : '#EF4444';
          return (
            <div key={i} title={`t=${t.timestamp?.toFixed(1)}s · score=${t.score}`}
              style={{ flex:1, height:h, background:color, borderRadius:'1px 1px 0 0', opacity:0.8, transition:'height 0.3s', cursor:'default' }}
            />
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:9, color:C.textMut, fontFamily:"'DM Mono',monospace" }}>
        <span>inicio</span>
        <span>fin</span>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────
export function BoneMappingTab({ session, C }: { session: any; C: Record<string,string> }) {
  const [activeStroke, setActiveStroke] = useState<string>('');
  const [activeMode,   setActiveMode]   = useState<'representative'|'best'|'worst'>('representative');

  const rawBoneMapping = session?.raw_data?.bone_mapping;

  // Sin datos
  if (!rawBoneMapping || Object.keys(rawBoneMapping).length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'64px 32px', gap:12 }}>
        <div style={{ fontSize:32, opacity:0.3 }}>🦴</div>
        <div style={{ fontSize:14, color:C.textSec, textAlign:'center' }}>
          Sin datos de bone mapping para esta sesión.
        </div>
        <div style={{ fontSize:12, color:C.textMut, textAlign:'center', maxWidth:380 }}>
          Requiere pipeline v2 con <code style={{ fontFamily:"'DM Mono',monospace", background:C.border, padding:'1px 5px', borderRadius:3 }}>store_landmarks=True</code>
        </div>
      </div>
    );
  }

  const strokes = Object.keys(rawBoneMapping);
  const stroke  = activeStroke || strokes[0];
  const bmData: BoneMappingData = {
    session_meta: rawBoneMapping[stroke]?.session_meta ?? {},
    modes: rawBoneMapping[stroke]?.modes ?? {},
    timeline: rawBoneMapping[stroke]?.timeline ?? [],
  } as BoneMappingData;

  const currentMode = bmData.modes?.[activeMode];
  const meta        = bmData.session_meta;

  // Use the ATP reference pose embedded in the current mode by the backend.
  // Falls back to a 33-point forehand stance if the overlay is missing.
  const IDEAL_POSE_FALLBACK: number[][] = [
    [0.50,0.06],[0.52,0.05],[0.52,0.05],[0.52,0.05],[0.48,0.05],[0.48,0.05],[0.48,0.05],[0.54,0.05],[0.46,0.05],
    [0.62,0.20],[0.38,0.20],
    [0.70,0.31],[0.30,0.31],[0.78,0.40],[0.22,0.40],
    [0.80,0.42],[0.20,0.42],[0.81,0.41],[0.19,0.41],[0.80,0.43],[0.20,0.43],
    [0.55,0.50],[0.45,0.50],
    [0.56,0.64],[0.44,0.64],[0.56,0.79],[0.44,0.79],
    [0.56,0.82],[0.44,0.82],[0.58,0.84],[0.42,0.84],
    [0.58,0.87],[0.42,0.87],
  ];

  const idealPose = currentMode?.ideal_pose_overlay?.length === 33
    ? currentMode.ideal_pose_overlay
    : IDEAL_POSE_FALLBACK;

  const modeConfig = [
    { key:'representative', label:'Promedio top-5',    color:'#3B82F6' },
    { key:'best',           label:'Mejor golpe',       color:'#10B981' },
    { key:'worst',          label:'Mayor desviación',  color:'#EF4444' },
  ] as const;

  const strokeLabel = (s: string) =>
    s === 'forehand' ? 'Forehand' : s === 'backhand' ? 'Backhand' : s === 'saque' ? 'Saque' : s;

  const card: React.CSSProperties = {
    background: C.surface, border:`1px solid ${C.border}`,
    borderRadius:10, padding:'16px 20px',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header row: stroke selector + meta */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:6 }}>
          {strokes.map(s => (
            <button key={s} onClick={() => { setActiveStroke(s); setActiveMode('representative'); }}
              style={{
                padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:500,
                fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s',
                border:`1px solid ${stroke===s ? '#10B981' : C.border}`,
                background: stroke===s ? '#10B98115' : 'transparent',
                color: stroke===s ? '#10B981' : C.textSec,
              }}>
              {strokeLabel(s)}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, fontSize:11, color:C.textMut, fontFamily:"'DM Mono',monospace" }}>
          <span>{meta?.total_impacts ?? '—'} impactos detectados</span>
          <span>{meta?.impacts_with_pose ?? '—'} con pose 3D</span>
        </div>
      </div>

      {/* Main grid: SVG + analysis */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>

        {/* SVG Canvas */}
        <div style={{ ...card, padding:0, overflow:'hidden', background:'#0f1117' }}>
          {/* Mode selector */}
          <div style={{ display:'flex', borderBottom:`1px solid #2a2d3a`, padding:'10px 16px', gap:6 }}>
            {modeConfig.map(m => (
              <button key={m.key} onClick={() => setActiveMode(m.key)}
                style={{
                  padding:'5px 12px', borderRadius:5, cursor:'pointer', fontSize:11,
                  fontFamily:"'DM Mono',monospace", transition:'all 0.15s',
                  border:`1px solid ${activeMode===m.key ? m.color+'60' : '#2a2d3a'}`,
                  background: activeMode===m.key ? m.color+'15' : 'transparent',
                  color: activeMode===m.key ? m.color : '#8a8ea8',
                }}>
                {m.label}
                {m.key==='representative' && currentMode?.averaged_from &&
                  <span style={{ marginLeft:4, opacity:0.6 }}>({currentMode.averaged_from})</span>}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10, fontSize:10, color:'#8a8ea8' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3"/></svg>
                Benchmark ATP
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#3B82F6', display:'inline-block' }}/>
                Usuario
              </span>
            </div>
          </div>

          {currentMode ? (
            <SkeletonSVG mode={currentMode} idealPose={idealPose} C={C}/>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:VH, color:'#8a8ea8', fontSize:13 }}>
              Sin datos para este modo
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Score */}
          <div style={{ ...card, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
              <svg width={64} height={64} style={{ transform:'rotate(-90deg)' }}>
                <circle cx={32} cy={32} r={26} fill="none" stroke={C.border} strokeWidth={4}/>
                <circle cx={32} cy={32} r={26} fill="none"
                  stroke={currentMode?.score >= 80 ? '#10B981' : currentMode?.score >= 60 ? '#3B82F6' : currentMode?.score >= 40 ? '#F97316' : '#EF4444'}
                  strokeWidth={4}
                  strokeDasharray={`${(currentMode?.score/100)*163} 163`}
                  strokeLinecap="round"
                  style={{ transition:'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:500,
                  color: currentMode?.score >= 80 ? '#10B981' : currentMode?.score >= 60 ? '#3B82F6' : currentMode?.score >= 40 ? '#F97316' : '#EF4444' }}>
                  {currentMode?.score ?? '—'}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.textMut, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>
                Score biomecánico
              </div>
              <div style={{ fontSize:13, color:C.textSec }}>
                {currentMode?.label ?? '—'}
              </div>
              {currentMode?.timestamp && (
                <div style={{ fontSize:10, color:C.textMut, marginTop:2, fontFamily:"'DM Mono',monospace" }}>
                  t={currentMode.timestamp.toFixed(1)}s
                  {currentMode.ball_speed && <span> · {currentMode.ball_speed.toFixed(0)} px/f</span>}
                </div>
              )}
            </div>
          </div>

          {/* Joint analysis */}
          {currentMode?.analysis_delta?.length > 0 && (
            <div style={card}>
              <div style={{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace", marginBottom:10 }}>
                Análisis por articulación
              </div>
              <JointCards delta={currentMode.analysis_delta} C={C}/>
            </div>
          )}

          {/* Timeline */}
          {bmData.timeline?.length > 0 && (
            <div style={card}>
              <TimelineMini timeline={bmData.timeline} C={C}/>
            </div>
          )}

          {/* Legend */}
          <div style={{ ...card, display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace", marginBottom:4 }}>
              Leyenda
            </div>
            {[
              { color:'#3B82F6', label:'Normal (< 10% desviación)' },
              { color:'#F97316', label:'Desviación (> 10%)' },
              { color:'#EF4444', label:'Crítico (> 20%)' },
              { color:'#F59E0B', label:'Punto de impacto (muñeca)' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:C.textSec }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}/>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
