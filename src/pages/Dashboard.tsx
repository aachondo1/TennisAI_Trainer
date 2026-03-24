import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PolarAngleAxis, PolarGrid, PolarRadiusAxis
} from 'recharts';
import {
  ChevronDown, TrendingUp, AlertCircle, CheckCircle,
  Target, Calendar, Zap, Eye, EyeOff, Info, Upload,
  Activity, Award, BarChart2, BookOpen, Dumbbell
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const C = {
  bg:       '#0a0c0e',
  surface:  '#111316',
  panel:    '#161a1e',
  border:   '#1e2328',
  borderHi: '#2a3038',
  accent:   '#b5f542',   // lima
  accentDim:'#7ab81a',
  blue:     '#4a9eff',
  red:      '#ff5a5a',
  amber:    '#f5a623',
  green:    '#3dd68c',
  textPri:  '#f0f2f4',
  textSec:  '#7a8694',
  textMut:  '#404850',
};

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
`;

/* ─── SCORE COLOR ────────────────────────────────────────────── */
const scoreColor = (s) => {
  if (s >= 80) return C.accent;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

/* ─── COMPONENTS ─────────────────────────────────────────────── */

const InfoTooltip = ({ title, description }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.textMut, display: 'flex', alignItems: 'center' }}
      >
        <Info size={13} />
      </button>
      {show && (
        <div style={{
          position: 'absolute', left: 0, top: '100%', marginTop: 8,
          width: 240, background: C.panel, border: `1px solid ${C.borderHi}`,
          borderRadius: 8, padding: '10px 12px', zIndex: 100,
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.textSec,
          lineHeight: 1.6, pointerEvents: 'none',
        }}>
          <div style={{ color: C.accent, fontWeight: 500, marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
          {description}
        </div>
      )}
    </div>
  );
};

const ScoreRing = ({ score, size = 96, stroke = 5 }) => {
  const r = (size / 2) - stroke - 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
};

const ScoreRingWithLabel = ({ score, label, size = 96 }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <ScoreRing score={score} size={size} />
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size * 0.22, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>
        {score}
      </span>
      {label && <span style={{ fontSize: 9, color: C.textMut, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>}
    </div>
  </div>
);

const Tag = ({ children, color = C.accent }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
    background: color + '18', color: color, border: `1px solid ${color}30`,
    fontFamily: "'DM Mono', monospace",
  }}>{children}</span>
);

const Pill = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '6px 16px', borderRadius: 6, border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accent + '15' : 'transparent',
    color: active ? C.accent : C.textSec,
    fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }}>{children}</button>
);

const MiniBar = ({ pct, color }) => (
  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
    {children}
  </div>
);

const Divider = () => <div style={{ height: 1, background: C.border, margin: '16px 0' }} />;

const customTooltipStyle = {
  contentStyle: { background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: 8, fontSize: 12, color: C.textPri },
  labelStyle: { color: C.textSec },
  itemStyle: { color: C.textPri },
};

/* ─── TABS CONFIG ────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',   label: 'Resumen',      Icon: BarChart2   },
  { id: 'scores',     label: 'Scores',       Icon: Target      },
  { id: 'evolution',  label: 'Evolución',    Icon: TrendingUp  },
  { id: 'report',     label: 'Reporte',      Icon: BookOpen    },
  { id: 'exercises',  label: 'Ejercicios',   Icon: Dumbbell    },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function TennisReportDashboard() {
  const [activeTab, setActiveTab]           = useState('overview');
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [mockData, setMockData]             = useState(null);
  const [visibleLines, setVisibleLines]     = useState({
    score_global: true, forehand: true, backhand: true, saque: true,
  });
  const [radarStroke, setRadarStroke]       = useState('todos');

  /* ── DATA ── */
useEffect(() => {
  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!sessions || sessions.length === 0) return;

      const latest = sessions[0];
      const scores = latest.scores_detalle || {};

      const historicalSessions = sessions.slice(0, 5).reverse().map(s => ({
        date: new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        score_global: s.global_score,
        forehand: s.scores_detalle?.forehand?.total ?? 0,
        backhand: s.scores_detalle?.backhand?.total ?? 0,
        saque:    s.scores_detalle?.saque?.total    ?? 0,
      }));

      setMockData({
        currentSession: {
          date:          new Date(latest.created_at).toLocaleDateString('es-ES'),
          globalScore:   latest.global_score,
          nivel:         latest.nivel_general,
          sessionType:   latest.session_type,
          duration:      '—',
          cameraQuality: '—',
          diagnostico:   latest.diagnostico_global,
          golpes: {
            forehand: {
              score:               scores.forehand?.total ?? 0,
              nivel:               scores.forehand?.nivel ?? '—',
              scores:              scores.forehand?.scores ?? {},
              fortalezas:          scores.forehand?.analisis_tecnico?.fortalezas ?? [],
              debilidades:         scores.forehand?.analisis_tecnico?.debilidades ?? [],
              patron_error:        scores.forehand?.analisis_tecnico?.patron_error_principal ?? '—',
              velocidad_pelota_max:scores.forehand?.metricas_clave?.velocidad_pelota_max ?? 0,
            },
            backhand: {
              score:               scores.backhand?.total ?? 0,
              nivel:               scores.backhand?.nivel ?? '—',
              scores:              scores.backhand?.scores ?? {},
              fortalezas:          scores.backhand?.analisis_tecnico?.fortalezas ?? [],
              debilidades:         scores.backhand?.analisis_tecnico?.debilidades ?? [],
              patron_error:        scores.backhand?.analisis_tecnico?.patron_error_principal ?? '—',
              velocidad_pelota_max:scores.backhand?.metricas_clave?.velocidad_pelota_max ?? 0,
            },
            saque: {
              score:               scores.saque?.total ?? 0,
              nivel:               scores.saque?.nivel ?? '—',
              scores:              scores.saque?.scores ?? {},
              fortalezas:          scores.saque?.analisis_tecnico?.fortalezas ?? [],
              debilidades:         scores.saque?.analisis_tecnico?.debilidades ?? [],
              patron_error:        scores.saque?.analisis_tecnico?.patron_error_principal ?? '—',
              velocidad_pelota_max:scores.saque?.metricas_clave?.velocidad_pelota_max ?? 0,
            },
          },
        },
        historicalSessions,
        historicalDimensions: { forehand: [], backhand: [], saque: [] },
        reporteGeneral:  latest.scores_detalle ?? {},
        planEjercicios:  latest.plan_ejercicios ?? { mensaje: '', proximaFoco: '', ejercicios: [] },
      });
    } catch (err) {
      console.error('Error cargando sesiones:', err);
    }
  };

  loadData();
}, []);

if (!mockData) return (
  <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec, fontFamily: "'DM Sans', sans-serif" }}>
    Cargando sesión...
  </div>
);
  

  const current = mockData.currentSession;

  const radarData = [
    { dimension: 'Prep',    forehand: current.golpes.forehand.scores.preparacion.score,    backhand: current.golpes.backhand.scores.preparacion.score,    saque: current.golpes.saque.scores.preparacion_toss.score },
    { dimension: 'Impacto', forehand: current.golpes.forehand.scores.punto_impacto.score,  backhand: current.golpes.backhand.scores.punto_impacto.score,  saque: current.golpes.saque.scores.punto_impacto.score },
    { dimension: 'Follow',  forehand: current.golpes.forehand.scores.follow_through.score, backhand: current.golpes.backhand.scores.follow_through.score, saque: current.golpes.saque.scores.follow_through.score },
    { dimension: 'Pies',    forehand: current.golpes.forehand.scores.posicion_pies.score,  backhand: current.golpes.backhand.scores.posicion_pies.score,  saque: null },
    { dimension: 'Ritmo',   forehand: current.golpes.forehand.scores.ritmo_cadencia.score, backhand: current.golpes.backhand.scores.ritmo_cadencia.score, saque: current.golpes.saque.scores.ritmo_cadencia.score },
    { dimension: 'Potencia',forehand: current.golpes.forehand.scores.potencia_pelota.score,backhand: current.golpes.backhand.scores.potencia_pelota.score,saque: current.golpes.saque.scores.potencia_pelota.score },
  ];

  const lineConfig = {
    score_global: { label: 'Global',   color: C.accent },
    forehand:     { label: 'Forehand', color: C.blue   },
    backhand:     { label: 'Backhand', color: C.red    },
    saque:        { label: 'Saque',    color: C.green  },
  };

  const dimensionInfo = {
    preparacion:     { title: 'Preparación',      desc: 'Posición inicial, rotación de hombros y posición de la raqueta antes del golpe.' },
    punto_impacto:   { title: 'Punto de Impacto', desc: 'Ángulos y alineación en el momento exacto de contacto con la pelota.' },
    follow_through:  { title: 'Follow-through',   desc: 'Extensión completa y continuidad del movimiento después del impacto.' },
    posicion_pies:   { title: 'Posición de Pies', desc: 'Estabilidad, alineación y movimiento de los pies durante el golpe.' },
    ritmo_cadencia:  { title: 'Ritmo/Cadencia',   desc: 'Fluidez y consistencia temporal del movimiento.' },
    potencia_pelota: { title: 'Potencia',         desc: 'Velocidad resultante de la pelota después del impacto.' },
    preparacion_toss:{ title: 'Prep/Toss',        desc: 'Lanzamiento de la pelota y posición inicial en el saque.' },
    carga_trophy:    { title: 'Carga/Trophy',     desc: 'Trophy position donde el codo alcanza máxima altura.' },
  };

  /* ── STYLES ── */
  const s = {
    root: {
      minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans', sans-serif",
      color: C.textPri,
    },
    header: {
      borderBottom: `1px solid ${C.border}`,
      padding: '0 32px',
      position: 'sticky', top: 0, zIndex: 50,
      background: C.bg,
    },
    headerInner: {
      maxWidth: 1200, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60,
    },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10 },
    logoMark: {
      width: 30, height: 30, borderRadius: 6, background: C.accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    logoText: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri, letterSpacing: '-0.02em' },
    logoDot: { color: C.accent },
    headerMeta: { display: 'flex', alignItems: 'center', gap: 16 },
    metaItem: { fontSize: 12, color: C.textSec },
    btnUpload: {
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      background: C.accent, color: '#0a0c0e', border: 'none', borderRadius: 6,
      fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
      fontFamily: "'Syne', sans-serif",
    },
    nav: { borderBottom: `1px solid ${C.border}`, padding: '0 32px' },
    navInner: {
      maxWidth: 1200, margin: '0 auto',
      display: 'flex', gap: 0,
    },
    main: { maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' },
    card: {
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '20px 24px',
    },
    cardLabel: {
      fontSize: 10, fontWeight: 600, color: C.textMut,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      fontFamily: "'DM Mono', monospace", marginBottom: 4,
    },
  };

  /* ── NAV TAB ── */
  const NavTab = ({ tab }) => {
    const active = activeTab === tab.id;
    return (
      <button onClick={() => setActiveTab(tab.id)} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0 20px', height: 48, border: 'none', background: 'none',
        borderBottom: `2px solid ${active ? C.accent : 'transparent'}`,
        color: active ? C.accent : C.textSec,
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}>
        <tab.Icon size={14} />
        {tab.label}
      </button>
    );
  };

  /* ════════════════════════════════════
     TAB: OVERVIEW
  ════════════════════════════════════ */
  const TabOverview = () => (
    <div>
      {/* Hero score row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* Global score - wide */}
        <div style={{ ...s.card, gridColumn: 'span 1', display: 'flex', alignItems: 'center', gap: 20, background: C.surface }}>
          <ScoreRingWithLabel score={current.globalScore} size={80} />
          <div>
            <div style={s.cardLabel}>Score global</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: scoreColor(current.globalScore), lineHeight: 1 }}>{current.globalScore}<span style={{ fontSize: 13, color: C.textSec, fontWeight: 400 }}>/100</span></div>
            <div style={{ marginTop: 6 }}><Tag color={scoreColor(current.globalScore)}>{current.nivel}</Tag></div>
          </div>
        </div>

        {/* 3 stroke scores */}
        {[
          { key: 'forehand', label: 'Forehand', color: C.blue },
          { key: 'backhand', label: 'Backhand', color: C.red  },
          { key: 'saque',    label: 'Saque',    color: C.green},
        ].map(({ key, label, color }) => {
          const g = current.golpes[key];
          return (
            <div key={key} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <ScoreRingWithLabel score={g.score} size={64} />
              <div>
                <div style={s.cardLabel}>{label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color }}>{g.score}</div>
                <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{g.nivel}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostico + radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Diagnostico */}
        <div style={s.card}>
          <SectionLabel>Diagnóstico de sesión</SectionLabel>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginBottom: 20 }}>{current.diagnostico}</p>
          <Divider />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <div style={s.cardLabel}>Duración</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500 }}>{current.duration}</div>
            </div>
            <div>
              <div style={s.cardLabel}>Tipo de sesión</div>
              <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{current.sessionType}</div>
            </div>
            <div>
              <div style={s.cardLabel}>Cámara</div>
              <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{current.cameraQuality}</div>
            </div>
            <div>
              <div style={s.cardLabel}>Fecha</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{current.date}</div>
            </div>
          </div>
        </div>

        {/* Radar */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionLabel>Dimensiones técnicas</SectionLabel>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['Forehand', C.blue], ['Backhand', C.red], ['Saque', C.green]].map(([l, c]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textSec }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: C.textSec }} />
              <PolarRadiusAxis stroke="none" tick={false} domain={[0, 20]} />
              <Radar name="Forehand" dataKey="forehand" stroke={C.blue}  fill={C.blue}  fillOpacity={0.15} strokeWidth={1.5} />
              <Radar name="Backhand" dataKey="backhand" stroke={C.red}   fill={C.red}   fillOpacity={0.15} strokeWidth={1.5} />
              <Radar name="Saque"    dataKey="saque"    stroke={C.green} fill={C.green} fillOpacity={0.15} strokeWidth={1.5} />
              <Tooltip {...customTooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Golpe cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {[
          { key: 'forehand', label: 'Forehand', color: C.blue,  desc: 'Golpe ofensivo con cara abierta de raqueta. Tu arma principal.' },
          { key: 'backhand', label: 'Backhand', color: C.red,   desc: 'Golpe con cara cerrada. Puede ser ofensivo o defensivo.' },
          { key: 'saque',    label: 'Saque',    color: C.green, desc: 'Inicio del punto. Dominar spin, altura y consistencia.' },
        ].map(({ key, label, color, desc }) => {
          const g = current.golpes[key];
          return (
            <div key={key} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color }}>{g.score}</div>
              </div>

              {/* dim bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(g.scores).map(([dim, data]) => (
                  <div key={dim}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: C.textSec }}>{dimensionInfo[dim]?.title || dim}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textPri }}>{data.score}/{data.max}</span>
                    </div>
                    <MiniBar pct={(data.score / data.max) * 100} color={color} />
                  </div>
                ))}
              </div>

              <Divider />
              <div style={{ fontSize: 11, color: C.green, marginBottom: 6 }}>
                {g.fortalezas.map((f, i) => <div key={i} style={{ marginBottom: 2 }}>+ {f}</div>)}
              </div>
              <div style={{ fontSize: 11, color: C.amber }}>— {g.patron_error}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ════════════════════════════════════
     TAB: SCORES DETALLADOS
  ════════════════════════════════════ */
  const TabScores = () => {
    const strokeOptions = [
      { key: 'todos',    label: 'Todos',    color: C.accent },
      { key: 'forehand', label: 'Forehand', color: C.blue   },
      { key: 'backhand', label: 'Backhand', color: C.red    },
      { key: 'saque',    label: 'Saque',    color: C.green  },
    ];

    // Normaliza scores a escala 0-20 para comparar entre golpes
    const buildRadarData = () => {
      const fh = current.golpes.forehand.scores;
      const bh = current.golpes.backhand.scores;
      const sa = current.golpes.saque.scores;
      const dims = [
        { label: 'Preparación', fh: fh.preparacion,    bh: bh.preparacion,    sa: sa.preparacion_toss, max: 20 },
        { label: 'Impacto',     fh: fh.punto_impacto,  bh: bh.punto_impacto,  sa: sa.punto_impacto,    max: 20 },
        { label: 'Follow',      fh: fh.follow_through, bh: bh.follow_through, sa: sa.follow_through,   max: 20 },
        { label: 'Pies',        fh: fh.posicion_pies,  bh: bh.posicion_pies,  sa: null,                max: 20 },
        { label: 'Ritmo',       fh: fh.ritmo_cadencia, bh: bh.ritmo_cadencia, sa: sa.ritmo_cadencia,   max: 10 },
        { label: 'Potencia',    fh: fh.potencia_pelota,bh: bh.potencia_pelota,sa: sa.potencia_pelota,  max: 10 },
      ];
      return dims.map(d => ({
        dimension: d.label,
        forehand: d.fh ? Math.round((d.fh.score / d.max) * 20) : null,
        backhand: d.bh ? Math.round((d.bh.score / d.max) * 20) : null,
        saque:    d.sa ? Math.round((d.sa.score / d.max) * 20) : null,
      }));
    };

    const radarData = buildRadarData();
    const showFH = radarStroke === 'todos' || radarStroke === 'forehand';
    const showBH = radarStroke === 'todos' || radarStroke === 'backhand';
    const showSA = radarStroke === 'todos' || radarStroke === 'saque';
    const activeColor = strokeOptions.find(o => o.key === radarStroke)?.color || C.accent;

    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── RADAR INTERACTIVO ── */}
      <div style={{ ...s.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel>Radar de dimensiones técnicas</SectionLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {strokeOptions.map(o => (
              <button key={o.key} onClick={() => setRadarStroke(o.key)} style={{
                padding: '5px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                border: `1px solid ${radarStroke === o.key ? o.color : C.border}`,
                background: radarStroke === o.key ? o.color + '18' : 'transparent',
                color: radarStroke === o.key ? o.color : C.textSec,
              }}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 12, fill: C.textSec, fontFamily: "'DM Mono', sans-serif" }}
              />
              <PolarRadiusAxis stroke="none" tick={false} domain={[0, 20]} />
              {showFH && (
                <Radar name="Forehand" dataKey="forehand"
                  stroke={C.blue} fill={C.blue}
                  fillOpacity={radarStroke === 'forehand' ? 0.25 : 0.12}
                  strokeWidth={radarStroke === 'forehand' ? 2.5 : 1.5}
                />
              )}
              {showBH && (
                <Radar name="Backhand" dataKey="backhand"
                  stroke={C.red} fill={C.red}
                  fillOpacity={radarStroke === 'backhand' ? 0.25 : 0.12}
                  strokeWidth={radarStroke === 'backhand' ? 2.5 : 1.5}
                />
              )}
              {showSA && (
                <Radar name="Saque" dataKey="saque"
                  stroke={C.green} fill={C.green}
                  fillOpacity={radarStroke === 'saque' ? 0.25 : 0.12}
                  strokeWidth={radarStroke === 'saque' ? 2.5 : 1.5}
                />
              )}
              <Tooltip {...customTooltipStyle} formatter={v => v !== null ? [`${v}/20`, ''] : ['N/A', '']} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Leyenda lateral con scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 140 }}>
            {[
              { key: 'forehand', label: 'Forehand', color: C.blue,  score: current.golpes.forehand.score },
              { key: 'backhand', label: 'Backhand', color: C.red,   score: current.golpes.backhand.score },
              { key: 'saque',    label: 'Saque',    color: C.green, score: current.golpes.saque.score    },
            ].map(item => {
              const active = radarStroke === 'todos' || radarStroke === item.key;
              return (
                <button key={item.key} onClick={() => setRadarStroke(radarStroke === item.key ? 'todos' : item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${active && radarStroke !== 'todos' ? item.color + '60' : C.border}`,
                    background: active && radarStroke !== 'todos' ? item.color + '12' : C.panel,
                    opacity: active ? 1 : 0.35,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.textSec, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, color: item.color }}>{item.score}</span>
                </button>
              );
            })}
            <div style={{ marginTop: 4, padding: '8px 14px', borderRadius: 8, background: C.panel, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textMut, marginBottom: 2, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em' }}>Escala</div>
              <div style={{ fontSize: 11, color: C.textSec }}>Normalizado a 0–20<br/>para comparación</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── POR GOLPE ── */}
      {['forehand', 'backhand', 'saque'].map(gk => {
        const g = current.golpes[gk];
        const nombre = gk === 'forehand' ? 'Forehand' : gk === 'backhand' ? 'Backhand' : 'Saque';
        const color = gk === 'forehand' ? C.blue : gk === 'backhand' ? C.red : C.green;
        const hist = mockData.historicalDimensions[gk];

        return (
          <div key={gk}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
              <ScoreRingWithLabel score={g.score} size={56} />
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 }}>{nombre}</div>
                <Tag color={color}>{g.nivel}</Tag>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: C.textSec }}>
                Velocidad máx. <span style={{ fontFamily: "'DM Mono', monospace", color: color, fontWeight: 500 }}>{g.velocidad_pelota_max} px/f</span>
              </div>
            </div>

            {/* Dimension grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {Object.entries(g.scores).map(([dim, data]) => {
                const prevVal = hist[hist.length - 2]?.[dim] ?? data.score;
                const change = data.score - prevVal;
                const info = dimensionInfo[dim] || { title: dim };
                const pct = (data.score / data.max) * 100;
                return (
                  <div key={dim} style={s.card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{info.title}</span>
                        <InfoTooltip title={info.title} description={info.desc} />
                      </div>
                      <span style={{
                        fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 500,
                        padding: '1px 6px', borderRadius: 3,
                        background: change >= 0 ? C.green + '20' : C.red + '20',
                        color: change >= 0 ? C.green : C.red,
                      }}>{change >= 0 ? '+' : ''}{change}</span>
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color, marginBottom: 6 }}>
                      {data.score}<span style={{ fontSize: 12, color: C.textMut }}>/{data.max}</span>
                    </div>
                    <MiniBar pct={pct} color={color} />
                    <div style={{ marginTop: 12, height: 80 }}>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={hist.map(h => ({ date: h.date, v: h[dim] }))} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 3" stroke={C.border} vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: C.textMut }}
                            tickLine={false}
                            axisLine={{ stroke: C.border }}
                            interval={0}
                            tickFormatter={d => d.split(' ')[0]}
                          />
                          <YAxis
                            domain={[0, data.max]}
                            tick={{ fontSize: 9, fill: C.textMut }}
                            tickLine={false}
                            axisLine={false}
                            tickCount={3}
                            width={18}
                          />
                          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={{ fill: color, r: 2 }} isAnimationActive={false} />
                          <Tooltip {...customTooltipStyle} formatter={v => [`${v}/${data.max}`, 'Score']} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Big evolution chart */}
            <div style={s.card}>
              <SectionLabel>Evolución de dimensiones — {nombre}</SectionLabel>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hist}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textSec }} />
                  <YAxis tick={{ fontSize: 11, fill: C.textSec }} domain={[0, 20]} />
                  <Tooltip {...customTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {gk === 'saque' ? <>
                    <Line type="monotone" dataKey="preparacion_toss" stroke="#4a9eff" strokeWidth={2} name="Prep/Toss"    dot={{ fill: '#4a9eff', r: 3 }} />
                    <Line type="monotone" dataKey="carga_trophy"     stroke="#3dd68c" strokeWidth={2} name="Trofeo"       dot={{ fill: '#3dd68c', r: 3 }} />
                    <Line type="monotone" dataKey="punto_impacto"    stroke="#f5a623" strokeWidth={2} name="Impacto"      dot={{ fill: '#f5a623', r: 3 }} />
                    <Line type="monotone" dataKey="follow_through"   stroke="#ff5a5a" strokeWidth={2} name="Follow"       dot={{ fill: '#ff5a5a', r: 3 }} />
                    <Line type="monotone" dataKey="ritmo_cadencia"   stroke="#b5f542" strokeWidth={2} name="Ritmo"        dot={{ fill: '#b5f542', r: 3 }} />
                    <Line type="monotone" dataKey="potencia_pelota"  stroke="#a78bfa" strokeWidth={2} name="Potencia"     dot={{ fill: '#a78bfa', r: 3 }} />
                  </> : <>
                    <Line type="monotone" dataKey="preparacion"     stroke="#4a9eff" strokeWidth={2} name="Preparación"  dot={{ fill: '#4a9eff', r: 3 }} />
                    <Line type="monotone" dataKey="punto_impacto"   stroke="#3dd68c" strokeWidth={2} name="Impacto"      dot={{ fill: '#3dd68c', r: 3 }} />
                    <Line type="monotone" dataKey="follow_through"  stroke="#f5a623" strokeWidth={2} name="Follow"       dot={{ fill: '#f5a623', r: 3 }} />
                    <Line type="monotone" dataKey="posicion_pies"   stroke="#ff5a5a" strokeWidth={2} name="Pies"         dot={{ fill: '#ff5a5a', r: 3 }} />
                    <Line type="monotone" dataKey="ritmo_cadencia"  stroke="#b5f542" strokeWidth={2} name="Ritmo"        dot={{ fill: '#b5f542', r: 3 }} />
                    <Line type="monotone" dataKey="potencia_pelota" stroke="#a78bfa" strokeWidth={2} name="Potencia"     dot={{ fill: '#a78bfa', r: 3 }} />
                  </>}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
    );
  };

  /* ════════════════════════════════════
     TAB: EVOLUCIÓN
  ════════════════════════════════════ */
  const TabEvolution = () => (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionLabel>Evolución de scores — últimas 5 sesiones</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(lineConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setVisibleLines(p => ({ ...p, [key]: !p[key] }))} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 5, border: `1px solid ${visibleLines[key] ? cfg.color + '60' : C.border}`,
              background: visibleLines[key] ? cfg.color + '12' : 'transparent',
              color: visibleLines[key] ? cfg.color : C.textMut,
              fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace",
              transition: 'all 0.15s',
            }}>
              {visibleLines[key] ? <Eye size={12} /> : <EyeOff size={12} />}
              {cfg.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={mockData.historicalSessions}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textSec }} />
          <YAxis tick={{ fontSize: 11, fill: C.textSec }} domain={[50, 100]} />
          <Tooltip {...customTooltipStyle} />
          {Object.entries(lineConfig).map(([key, cfg]) =>
            visibleLines[key] ? (
              <Line
                key={key} type="monotone" dataKey={key}
                stroke={cfg.color} strokeWidth={key === 'score_global' ? 2.5 : 1.5}
                name={cfg.label} dot={{ fill: cfg.color, r: 4 }} activeDot={{ r: 6 }}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  /* ════════════════════════════════════
     TAB: REPORTE
  ════════════════════════════════════ */
  const TabReport = () => {
    const r = mockData.reporteGeneral;
    const riskColor = { 'MODERADO': C.red, 'BAJO-MODERADO': C.amber, 'BAJO': C.green };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Diagnostico */}
        <div style={s.card}>
          <SectionLabel>Diagnóstico general</SectionLabel>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.8 }}>{r.seccion_diagnostico.contenido}</p>
        </div>

        {/* 3 golpes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[r.seccion_forehand, r.seccion_backhand, r.seccion_saque].map((sec, i) => {
            const color = [C.blue, C.red, C.green][i];
            return (
              <div key={i} style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>{sec.titulo}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color }}>{sec.score}</div>
                </div>
                <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.7, marginBottom: 12 }}>{sec.contenido}</p>
                <div style={{ fontSize: 11, color: C.green, marginBottom: 4 }}>+ {sec.fortalezas_texto}</div>
                <div style={{ fontSize: 11, color: C.amber }}>— {sec.debilidades_texto}</div>
              </div>
            );
          })}
        </div>

        {/* Patrones + riesgo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={s.card}>
            <SectionLabel>Patrones biomecánicos detectados</SectionLabel>
            {r.seccion_patrones.patrones.map((p, i) => (
              <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < r.seccion_patrones.patrones.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{p.patron}</div>
                <div style={{ fontSize: 12, color: C.textSec }}>{p.impacto}</div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionLabel>Riesgo de lesión</SectionLabel>
              <Tag color={riskColor[r.seccion_riesgo.riesgo_general] || C.amber}>{r.seccion_riesgo.riesgo_general}</Tag>
            </div>
            {r.seccion_riesgo.riesgos.map((rr, i) => (
              <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < r.seccion_riesgo.riesgos.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{rr.zona}</span>
                  <Tag color={riskColor[rr.riesgo] || C.amber}>{rr.riesgo}</Tag>
                </div>
                <div style={{ fontSize: 12, color: C.textSec, marginBottom: 2 }}>{rr.razon}</div>
                <div style={{ fontSize: 11, color: C.accent }}>→ {rr.prevencion}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparacion ATP */}
        <div style={s.card}>
          <SectionLabel>Comparación vs técnica ATP</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {r.seccion_comparacion.comparaciones.map((c, i) => {
              const pct = parseInt(c.tuyo);
              return (
                <div key={i} style={{ background: C.panel, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: C.textMut, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Mono', monospace" }}>{c.elemento}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: scoreColor(pct), marginBottom: 6 }}>{c.tuyo}</div>
                  <MiniBar pct={pct} color={scoreColor(pct)} />
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 8, lineHeight: 1.5 }}>{c.analisis}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════
     TAB: EJERCICIOS
  ════════════════════════════════════ */
  const TabExercises = () => {
    const p = mockData.planEjercicios;
    const days = [
      { day: 'Lunes',    focus: 'Técnica — ejercicios prioritarios 1 y 2',     dur: '60 min' },
      { day: 'Martes',   focus: 'Partido — aplicar correcciones en juego',       dur: '75 min' },
      { day: 'Miércoles',focus: 'Descanso o ejercicio ligero',                    dur: '20 min' },
      { day: 'Jueves',   focus: 'Técnica — ejercicios 3 y 4',                    dur: '60 min' },
      { day: 'Viernes',  focus: 'Partido competitivo — test de mejoras',          dur: '90 min' },
      { day: 'Sábado',   focus: 'Volumen — drills extensos',                      dur: '120 min'},
      { day: 'Domingo',  focus: 'Descanso y recuperación',                        dur: 'Ligero' },
    ];
    return (
      <div>
        {/* Banner */}
        <div style={{
          ...s.card, marginBottom: 24,
          borderLeft: `3px solid ${C.accent}`,
          borderRadius: 10,
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.mensaje}</div>
          <div style={{ fontSize: 13, color: C.textSec }}>Foco de esta semana: <span style={{ color: C.accent }}>{p.proximaFoco}</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* Ejercicios accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.ejercicios.map(ej => (
              <div key={ej.prioridad} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setExpandedExercise(expandedExercise === ej.prioridad ? null : ej.prioridad)}
                  style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: C.accent + '20', color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {ej.prioridad}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.textPri, marginBottom: 4 }}>{ej.nombre}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Tag color={C.blue}>{ej.golpe}</Tag>
                      <Tag color={C.textSec}>{ej.dimension}</Tag>
                    </div>
                  </div>
                  <ChevronDown size={16} style={{ color: C.textSec, transform: expandedExercise === ej.prioridad ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>

                {expandedExercise === ej.prioridad && (
                  <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                    <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7, marginBottom: 14 }}>{ej.descripcion}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                      {[['Series', `${ej.series}x`], ['Repeticiones', ej.repeticiones], ['Duración', `${ej.duracion} min`]].map(([label, val]) => (
                        <div key={label} style={{ background: C.panel, borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ padding: '10px 12px', background: C.green + '12', borderLeft: `2px solid ${C.green}`, borderRadius: '0 6px 6px 0', fontSize: 12 }}>
                        <span style={{ color: C.green, fontWeight: 600 }}>Atención clave — </span>
                        <span style={{ color: C.textSec }}>{ej.atencion}</span>
                      </div>
                      <div style={{ padding: '10px 12px', background: C.red + '12', borderLeft: `2px solid ${C.red}`, borderRadius: '0 6px 6px 0', fontSize: 12 }}>
                        <span style={{ color: C.red, fontWeight: 600 }}>Error a evitar — </span>
                        <span style={{ color: C.textSec }}>{ej.error_evitar}</span>
                      </div>
                      <div style={{ padding: '10px 12px', background: C.accent + '12', borderLeft: `2px solid ${C.accent}`, borderRadius: '0 6px 6px 0', fontSize: 12 }}>
                        <span style={{ color: C.accent, fontWeight: 600 }}>Métrica de éxito — </span>
                        <span style={{ color: C.textSec }}>{ej.metrica}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Plan semanal */}
          <div>
            <div style={s.card}>
              <SectionLabel>Plan semanal</SectionLabel>
              {days.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < days.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{d.day}</div>
                    <div style={{ fontSize: 11, color: C.textSec }}>{d.focus}</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accent, flexShrink: 0, marginLeft: 12 }}>{d.dur}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <>
      <style>{fonts}</style>
      <div style={s.root}>
        {/* HEADER */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={s.logoWrap}>
              <div style={s.logoMark}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0c0e" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2C6 8 6 16 12 22" />
                  <path d="M12 2C18 8 18 16 12 22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div>
                <div style={s.logoText}>Tennis<span style={s.logoDot}>AI</span></div>
              </div>
            </div>
            <div style={s.headerMeta}>
              <span style={s.metaItem}>Sesión: {current.date}</span>
              <span style={{ width: 1, height: 16, background: C.border, display: 'inline-block' }} />
              <span style={s.metaItem}>{current.duration}</span>
              <button style={s.btnUpload}>
                <Upload size={12} />
                Nuevo análisis
              </button>
            </div>
          </div>
        </header>

        {/* NAV */}
        <nav style={s.nav}>
          <div style={s.navInner}>
            {TABS.map(t => <NavTab key={t.id} tab={t} />)}
          </div>
        </nav>

        {/* MAIN */}
        <main style={s.main}>
          {activeTab === 'overview'  && <TabOverview />}
          {activeTab === 'scores'    && <TabScores />}
          {activeTab === 'evolution' && <TabEvolution />}
          {activeTab === 'report'    && <TabReport />}
          {activeTab === 'exercises' && <TabExercises />}
        </main>

        {/* FOOTER */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px 32px', textAlign: 'center', fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>
          TennisAI © 2026 — Análisis biomecánico automático potenciado por IA
        </footer>
      </div>
    </>
  );
}