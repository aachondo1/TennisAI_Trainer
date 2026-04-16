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
    grip_type?:        string;        // eastern | semi_western | western
    bh_variant?:       string;        // topspin | slice (backhand only)
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
const VW = 900; const VH = 700;
const ML = 120;  const MR = 120; const MT = 60; const MB = 60;
const DW = VW - ML - MR; const DH = VH - MT - MB;

function project(pts: number[][]): [number, number][] {
  // Flip X axis to match camera perspective (video is from behind, so we mirror horizontally)
  return pts.map(([nx, ny]) => [ML + (1 - nx) * DW, MT + ny * DH]);
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

// ─── SILHOUETTE SVG (Simplified stick figure) ────────────────
function SilhouetteSVG({ pose, C }: {
  pose: number[][] | null;
  C:    Record<string, string>;
}) {
  if (!pose) return null;

  const userPts = project(pose);

  // Draw simplified stick figure with body segments
  const connections = [
    [0, 11], [0, 12],           // head to shoulders
    [11, 12],                   // shoulders
    [11, 13], [13, 15],         // left arm
    [12, 14], [14, 16],         // right arm
    [11, 23], [12, 24],         // shoulders to hips
    [23, 24],                   // hips
    [23, 25], [25, 27],         // left leg
    [24, 26], [26, 28],         // right leg
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display:'block' }}>
      <defs>
        <pattern id="sil-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#sil-grid)" rx="8"/>

      {/* Body connections - thicker and more visible */}
      <g stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" opacity="0.7" fill="none">
        {connections.map(([a, b], i) => (
          <line key={i}
            x1={userPts[a]?.[0]} y1={userPts[a]?.[1]}
            x2={userPts[b]?.[0]} y2={userPts[b]?.[1]}
          />
        ))}
      </g>

      {/* Body fill - semi-transparent to show silhouette */}
      <ellipse cx={userPts[0]?.[0] ?? 0} cy={userPts[0]?.[1] ?? 0} rx="8" ry="10" fill="#3B82F6" opacity="0.4"/>

      {/* Large joint points for clarity */}
      <g fill="#3B82F6" opacity="0.85">
        {userPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" />
        ))}
      </g>

      {/* Highlight impact point (wrist) */}
      <circle cx={userPts[16]?.[0] ?? 0} cy={userPts[16]?.[1] ?? 0} r="12"
        fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.6">
        <animate attributeName="r" values="10;15;10" dur="1.4s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

// ─── SKELETON SVG ─────────────────────────────────────────────
function SkeletonSVG({ mode, C }: {
  mode: BoneMode;
  C:    Record<string, string>;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);

  if (!mode.pose) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: VH, color: C.textMut, fontSize: 13 }}>
      Sin datos de pose para este modo
    </div>
  );

  const userPts = project(mode.pose);
  const delta   = mode.analysis_delta;

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

        {/* Layer 2: User skeleton */}
        <g>
          {CONNECTIONS.map(([a,b],i) => {
            if (!userPts[a] || !userPts[b]) return null;
            return (
              <line key={i}
                x1={userPts[a][0]} y1={userPts[a][1]}
                x2={userPts[b][0]} y2={userPts[b][1]}
                stroke={boneColor(a, b, delta)}
                strokeWidth="4" strokeLinecap="round" opacity="0.95"
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
                <circle cx={x} cy={y} r="15" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.5">
                  <animate attributeName="r" values="12;20;12" dur="1.4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.4s" repeatCount="indefinite"/>
                </circle>
                <circle cx={x} cy={y} r="8" fill="#F59E0B" stroke="#0f1923" strokeWidth="2"/>
              </g>
            );
            return (
              <circle key={i} cx={x} cy={y} r="7"
                fill={color} stroke="#0f1923" strokeWidth="1.5" opacity="0.9"
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
              <rect x={lx+12} y={ly-20} width={130} height={32} rx="6"
                fill="#1a1d27" stroke="#EF4444" strokeWidth="2" opacity="0.95"/>
              <text x={lx+18} y={ly+6}
                fill="#EF4444" fontSize="15" fontWeight="600"
                fontFamily="'DM Mono', monospace">
                {entry.user_angle}° vs {entry.ideal_angle}°
              </text>
            </g>
          );
        })}

        {/* Hover tooltip */}
        {tooltip && (() => {
          const entry = getTooltipEntry(tooltip.idx);
          const tx = tooltip.x + 20 > VW - 240 ? tooltip.x - 240 : tooltip.x + 20;
          const ty = Math.min(tooltip.y - 20, VH - 140);
          return (
            <g>
              <rect x={tx} y={ty} width={220} height={entry ? 110 : 56} rx="8"
                fill="#12151e" stroke="#2a2d3a" strokeWidth="2" opacity="0.98"/>
              <text x={tx+14} y={ty+26} fill="#e8eaf0" fontSize="14" fontWeight="600"
                fontFamily="'DM Sans', sans-serif">
                {PT_NAMES[tooltip.idx] ?? `punto ${tooltip.idx}`}
              </text>
              {entry && (<>
                <text x={tx+14} y={ty+50} fill="#8a8ea8" fontSize="12"
                  fontFamily="'DM Sans', sans-serif">{entry.label}</text>
                <text x={tx+14} y={ty+72} fill={STATUS_COLOR[entry.status]} fontSize="12"
                  fontFamily="'DM Mono', monospace">
                  {entry.user_angle}° usuario · {entry.ideal_angle}° ATP
                </text>
                <text x={tx+14} y={ty+94} fill="#8a8ea8" fontSize="12"
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
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
      {delta.map(entry => {
        const color = STATUS_COLOR[entry.status];
        const fillPct = Math.max(0, 100 - entry.deviation_pct * 2.5);
        const statusLabel = { normal:'✓ Normal', warning:'⚠ Desviación', critical:'✕ Crítico' }[entry.status];
        const bgColor = entry.status === 'critical' ? '#EF444420' : entry.status === 'warning' ? '#F9731620' : '#3B82F620';
        return (
          <div key={entry.joint} style={{
            background: bgColor,
            border:`1px solid ${color}40`,
            borderRadius:10,
            padding:'14px 16px',
            transition:'all 0.2s ease',
          }}>
            <div style={{ fontSize:9, color:C.textMut, marginBottom:6, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>
              {entry.label}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:700, color }}>{entry.user_angle}°</span>
              <span style={{ fontSize:11, color:C.textSec }}>vs {entry.ideal_angle}°</span>
            </div>
            <div style={{ height:6, background:C.border+'40', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${fillPct}%`, background:color, borderRadius:3, transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color, display:'flex', alignItems:'center', gap:4 }}>
              {statusLabel}
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textMut }}>({entry.deviation_pct}%)</span>
            </div>
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
      <div style={{ fontSize:11, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"'DM Mono',monospace", marginBottom:10, fontWeight:700 }}>
        Timeline de sesión ({timeline.length} golpes)
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', height:48, gap:1.5, background:C.bg, borderRadius:6, padding:'6px 8px 0', overflow:'hidden' }}>
        {timeline.map((t, i) => {
          const h = Math.max(6, (t.score / maxScore) * 42);
          const color = t.score >= 80 ? '#10B981' : t.score >= 60 ? '#3B82F6' : t.score >= 40 ? '#F97316' : '#EF4444';
          return (
            <div key={i} title={`Golpe ${i+1}: t=${t.timestamp?.toFixed(1)}s · score=${t.score}`}
              style={{ flex:1, height:h, background:color, borderRadius:'3px 3px 0 0', opacity:0.85, transition:'all 0.3s ease', cursor:'pointer', hover:{opacity:1} }}
            />
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:9, color:C.textMut, fontFamily:"'DM Mono',monospace", fontWeight:500 }}>
        <span>Inicio de sesión</span>
        <span>Fin de sesión</span>
      </div>
      <div style={{ fontSize:10, color:C.textSec, marginTop:10, lineHeight:1.6, padding:'12px 14px', background:C.border+'15', borderRadius:8, borderLeft:`3px solid #3B82F6` }}>
        📈 <strong>Altura</strong> = Score del golpe  |  <strong>Posición</strong> = Momento en sesión
        <br/>Colores: <span style={{color:'#10B981', fontWeight:600}}>≥80</span> | <span style={{color:'#3B82F6', fontWeight:600}}>≥60</span> | <span style={{color:'#F97316', fontWeight:600}}>≥40</span> | <span style={{color:'#EF4444', fontWeight:600}}>crítico</span>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────
export function BoneMappingTab({ session, C }: { session: any; C: Record<string,string> }) {
  const [activeStroke, setActiveStroke] = useState<string>('');
  const [activeMode,   setActiveMode]   = useState<'representative'|'best'|'worst'>('best');

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

  // ATP reference poses - exact coordinates from backend bone_mapping_builder.py
  // These are anatomically correct impact positions (same system as MediaPipe)

  const modeConfig = [
    { key:'representative', label:'Promedio top-5',    color:'#3B82F6' },
    { key:'best',           label:'Mejor golpe',       color:'#10B981' },
    { key:'worst',          label:'Mayor desviación',  color:'#EF4444' },
  ] as const;

  const strokeLabel = (s: string) =>
    s === 'forehand' ? 'Forehand' : s === 'backhand' ? 'Backhand' : s === 'saque' ? 'Saque' : s;

  const card: React.CSSProperties = {
    background: C.surface,
    border:`1px solid ${C.border}`,
    borderRadius:12,
    padding:'20px',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: C.textMut,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 600,
    marginBottom: 12,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header: Stroke selector + session info */}
      <div style={{ display:'flex', flexDirection:'column', gap:20, marginBottom:24 }}>
        <div>
          <div style={sectionLabel}>Tipo de golpe</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {strokes.map(s => (
              <button key={s} onClick={() => { setActiveStroke(s); setActiveMode('best'); }}
                style={{
                  padding:'12px 24px',
                  borderRadius:8,
                  cursor:'pointer',
                  fontSize:14,
                  fontWeight: stroke === s ? 700 : 600,
                  fontFamily:"'DM Sans',sans-serif",
                  transition:'all 0.25s ease',
                  border:`2px solid ${stroke===s ? '#10B981' : C.border}`,
                  background: stroke===s ? '#10B98118' : 'transparent',
                  color: stroke===s ? '#10B981' : C.textSec,
                  boxShadow: stroke===s ? `0 0 20px rgba(16, 185, 129, 0.25)` : 'none',
                  transform: stroke===s ? 'scale(1.02)' : 'scale(1)',
                }}>
                {strokeLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Session stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ ...card, padding:'16px' }}>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:6 }}>IMPACTOS DETECTADOS</div>
            <div style={{ fontSize:24, fontWeight:700, color:'#10B981' }}>{meta?.total_impacts ?? '—'}</div>
          </div>
          <div style={{ ...card, padding:'16px' }}>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:6 }}>CON POSE 3D</div>
            <div style={{ fontSize:24, fontWeight:700, color:'#3B82F6' }}>{meta?.impacts_with_pose ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Main grid: SVG + analysis */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 380px', gap:16, alignItems:'start' }}>

        {/* SVG Canvas */}
        <div style={{ ...card, padding:0, overflow:'hidden', background:'#0f1117', display:'flex', flexDirection:'column' }}>
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
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#3B82F6', display:'inline-block' }}/>
                Usuario
              </span>
            </div>
          </div>

          {currentMode ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, flex:1 }}>
                {/* Left: Silhouette */}
                <div style={{ ...card, padding:0, overflow:'hidden', background:'#0f1117' }}>
                  <div style={{ padding:'8px 12px', borderBottom:`1px solid #2a2d3a`, fontSize:9, color:'#8a8ea8', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    Silueta del jugador
                  </div>
                  <SilhouetteSVG pose={currentMode.pose} C={C}/>
                </div>

                {/* Right: Skeleton with angles */}
                <div style={{ ...card, padding:0, overflow:'hidden', background:'#0f1117' }}>
                  <div style={{ padding:'8px 12px', borderBottom:`1px solid #2a2d3a`, fontSize:9, color:'#8a8ea8', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    Ángulos vs ATP
                  </div>
                  <SkeletonSVG mode={currentMode} C={C}/>
                </div>
              </div>

              {/* Legend - positioned below skeleton visualization */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'12px 16px', borderTop:`1px solid #2a2d3a` }}>
                <div style={{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace" }}>
                  Leyenda
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { color:'#3B82F6', label:'Normal (< 10%)' },
                    { color:'#F97316', label:'Desviación (> 10%)' },
                    { color:'#EF4444', label:'Crítico (> 20%)' },
                    { color:'#F59E0B', label:'Punto de impacto' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:10, color:C.textSec }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}/>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:VH, color:'#8a8ea8', fontSize:13 }}>
              Sin datos para este modo
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Mode indicator */}
          {currentMode && (
            <div style={{
              ...card,
              background: activeMode === 'best' ? '#10B98112' : activeMode === 'worst' ? '#EF444412' : '#3B82F612',
              borderColor: activeMode === 'best' ? '#10B98160' : activeMode === 'worst' ? '#EF444460' : '#3B82F660',
              borderWidth: 2,
            }}>
              <div style={{ fontSize:10, color:C.textMut, fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontWeight:700 }}>
                Golpe analizado
              </div>
              <div style={{ fontSize:13, fontWeight:700, color: activeMode === 'best' ? '#10B981' : activeMode === 'worst' ? '#EF4444' : '#3B82F6', marginBottom:6 }}>
                {activeMode === 'best' ? '⭐ Mejor golpe' : activeMode === 'worst' ? '⚠️ Mayor desviación' : '📊 Promedio top-5'}
              </div>
              <div style={{ fontSize:11, color:C.textSec, lineHeight:1.6 }}>
                {activeMode === 'best'
                  ? 'Golpe mejor ejecutado en momento exacto del impacto.'
                  : activeMode === 'worst'
                  ? 'Golpe con mayor desviación vs ATP en el impacto.'
                  : 'Promedio de 5 mejores golpes. Selecciona "Mejor golpe" para ver un golpe real individual.'}
              </div>
            </div>
          )}

          {/* Grip & Hand Info */}
          <div style={{ ...card, background: C.bg, borderColor: C.border }}>
            <div style={sectionLabel}>Técnica de golpe</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
              <div style={{ padding:'12px', background:C.surface, borderRadius:8, borderLeft:`3px solid #3B82F6` }}>
                <div style={{ fontSize:9, color:C.textMut, marginBottom:4, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>MANO DOMINANTE</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#3B82F6' }}>
                  {meta?.dominant_hand === 'right' ? '👉 Derecha' : '👈 Izquierda'}
                </div>
              </div>
              {stroke === 'forehand' && meta?.grip_type && (
                <div style={{ padding:'12px', background:C.surface, borderRadius:8, borderLeft:`3px solid #10B981` }}>
                  <div style={{ fontSize:9, color:C.textMut, marginBottom:4, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>GRIP (FOREHAND)</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#10B981' }}>
                    {meta.grip_type === 'eastern' ? '→ Eastern' :
                     meta.grip_type === 'semi_western' ? '↗ Semi-Western' :
                     meta.grip_type === 'western' ? '↖ Western' : meta.grip_type}
                  </div>
                </div>
              )}
              {stroke === 'backhand' && meta?.bh_variant && (
                <div style={{ padding:'12px', background:C.surface, borderRadius:8, borderLeft:`3px solid #F97316` }}>
                  <div style={{ fontSize:9, color:C.textMut, marginBottom:4, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>TIPO DE BACKHAND</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#F97316' }}>
                    {meta.bh_variant === 'topspin' ? '🔄 Topspin' : '➖ Slice'}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                Score de impacto
              </div>
              <div style={{ fontSize:13, color:C.textSec }}>
                {currentMode?.label ?? '—'}
              </div>
              {currentMode?.timestamp && (
                <div style={{ fontSize:10, color:C.textMut, marginTop:2, fontFamily:"'DM Mono',monospace" }}>
                  📍 Impacto en t={currentMode.timestamp.toFixed(1)}s
                  {currentMode.ball_speed && <span> · velocidad: {currentMode.ball_speed.toFixed(0)} px/f</span>}
                </div>
              )}
            </div>
          </div>

          {/* Joint analysis */}
          {currentMode?.analysis_delta?.length > 0 && (
            <div style={card}>
              <div style={sectionLabel}>Análisis de articulaciones</div>
              <div style={{ fontSize:11, color:C.textSec, marginBottom:14, lineHeight:1.6, padding:'12px 14px', background:C.border+'15', borderRadius:8, borderLeft:`3px solid #10B981` }}>
                📊 <strong>Desviación %</strong>: Diferencia vs rango ATP
                <br/>• <span style={{color:'#3B82F6', fontWeight:600}}>0%</span> ideal  • <span style={{color:'#F97316', fontWeight:600}}>10-20%</span> ajustar  • <span style={{color:'#EF4444', fontWeight:600}}>+20%</span> crítico
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
        </div>
      </div>
    </div>
  );
}
