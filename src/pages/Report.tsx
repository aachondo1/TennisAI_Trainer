import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from 'recharts';
import {
  ChevronDown, TrendingUp, Eye, EyeOff, Info,
  BarChart2, BookOpen, Dumbbell, Target, ArrowLeft, Loader2,
  Activity, AlertCircle, ArrowUp, ArrowDown, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { C, ttStyle } from '../lib/theme';
import { BoneMappingTab } from '../components/BoneMappingTab';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const scoreColor = (s: number) => {
  if (s >= 80) return C.accentDark;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

/* ─── SHARED COMPONENTS ──────────────────────────────────────── */

const InfoTooltip = ({ title, description }: { title: string; description: string }) => {
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
          width: 240, background: C.surface, border: `1px solid ${C.borderHi}`,
          borderRadius: 8, padding: '10px 12px', zIndex: 100,
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.textSec,
          lineHeight: 1.6, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <div style={{ color: C.accentDark, fontWeight: 600, marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
          {description}
        </div>
      )}
    </div>
  );
};

const ScoreRing = ({ score, size = 96, stroke = 5 }: { score: number; size?: number; stroke?: number }) => {
  const r = (size / 2) - stroke - 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={scoreColor(score)} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
};

const ScoreRingWithLabel = ({ score, size = 96 }: { score: number; size?: number }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <ScoreRing score={score} size={size} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size * 0.22, fontWeight: 500, color: scoreColor(score), lineHeight: 1 }}>{score}</span>
    </div>
  </div>
);

const Tag = ({ children, color = C.accentDark }: { children: React.ReactNode; color?: string }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
    background: color + '15', color, border: `1px solid ${color}30`,
    fontFamily: "'DM Mono', monospace",
  }}>{children}</span>
);

const MiniBar = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
    {children}
  </div>
);

const Divider = () => <div style={{ height: 1, background: C.border, margin: '16px 0' }} />;

const QualityScoreHeader = ({ quality_score }: { quality_score?: any }) => {
  if (!quality_score) return null;

  const overall = quality_score.overall_quality_score ?? 0;
  const mediapipe = quality_score.mediapipe_coverage ?? 0;
  const ballSync = quality_score.ball_sync_rate ?? 0;

  const isLowQuality = overall < 0.55;

  // Color for overall score
  const getQualityColor = (val: number, isPercent = false) => {
    const v = isPercent ? val : val * 100;
    if (v >= 70) return C.green;
    if (v >= 55) return C.amber;
    return C.red;
  };

  const overallColor = getQualityColor(overall);
  const mediapipeColor = getQualityColor(mediapipe / 100);
  const ballSyncColor = getQualityColor(ballSync / 100);

  return (
    <div style={{
      background: isLowQuality ? C.amber + '10' : 'transparent',
      borderBottom: isLowQuality ? `2px solid ${C.amber}` : 'none',
      padding: isLowQuality ? '16px 32px' : '0',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {isLowQuality && (
          <div style={{
            background: C.amber + '20',
            border: `1px solid ${C.amber}40`,
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}>
            <AlertTriangle size={16} color={C.amber} />
            <span style={{ fontSize: 13, color: C.amber, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              Calidad de datos baja. Algunos análisis pueden ser menos precisos.
            </span>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          padding: isLowQuality ? '16px 0' : '0',
        }}>
          {/* Overall Quality Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: overallColor + '08',
            border: `1px solid ${overallColor}20`,
            borderRadius: 8,
          }}>
            <div style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: overallColor + '15',
              borderRadius: 6,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                fontWeight: 600,
                color: overallColor,
              }}>
                {Math.round(overall * 100)}%
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textMut,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Calidad General
                </span>
                <InfoTooltip
                  title="Calidad General"
                  description="Puntuación general de calidad de procesamiento del video. Combina cobertura de pose y sincronización de pelota."
                />
              </div>
              <div style={{
                fontSize: 12,
                color: C.textSec,
                lineHeight: 1.4,
              }}>
                {overall >= 0.75 ? 'Excelente' : overall >= 0.55 ? 'Aceptable' : 'Baja'}
              </div>
            </div>
          </div>

          {/* MediaPipe Coverage */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: mediapipeColor + '08',
            border: `1px solid ${mediapipeColor}20`,
            borderRadius: 8,
          }}>
            <div style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: mediapipeColor + '15',
              borderRadius: 6,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                fontWeight: 600,
                color: mediapipeColor,
              }}>
                {Math.round(mediapipe)}%
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textMut,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Cobertura Pose
                </span>
                <InfoTooltip
                  title="Cobertura de Pose"
                  description="Porcentaje de frames donde se detectó correctamente la pose (17/33 keypoints)."
                />
              </div>
              <div style={{
                fontSize: 12,
                color: C.textSec,
              }}>
                {Math.round(mediapipe) > 80 ? 'Óptima' : 'Parcial'}
              </div>
            </div>
          </div>

          {/* Ball Sync Rate */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: ballSyncColor + '08',
            border: `1px solid ${ballSyncColor}20`,
            borderRadius: 8,
          }}>
            <div style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: ballSyncColor + '15',
              borderRadius: 6,
            }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                fontWeight: 600,
                color: ballSyncColor,
              }}>
                {Math.round(ballSync)}%
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textMut,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Sincronización Pelota
                </span>
                <InfoTooltip
                  title="Sincronización Pelota"
                  description="Porcentaje de frames donde se sincronizó correctamente el tráckeo de la pelota con la pose."
                />
              </div>
              <div style={{
                fontSize: 12,
                color: C.textSec,
              }}>
                {Math.round(ballSync) > 75 ? 'Sólida' : 'Limitada'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const customTooltipStyle = ttStyle;

const TABS = [
  { id: 'overview',    label: 'Resumen',     Icon: BarChart2  },
  { id: 'scores',      label: 'Scores',      Icon: Target     },
  { id: 'biomecanica', label: 'Biomecánica', Icon: Activity   },
  { id: 'evolution',   label: 'Evolución',   Icon: TrendingUp },
  { id: 'report',      label: 'Reporte',     Icon: BookOpen   },
  { id: 'exercises',   label: 'Ejercicios',  Icon: Dumbbell   },
];

const dimensionInfo: Record<string, { title: string; desc: string }> = {
  preparacion:      { title: 'Preparación',      desc: 'Posición inicial, rotación de hombros y posición de la raqueta antes del golpe.' },
  punto_impacto:    { title: 'Punto de Impacto', desc: 'Ángulos y alineación en el momento exacto de contacto con la pelota.' },
  follow_through:   { title: 'Follow-through',   desc: 'Extensión completa y continuidad del movimiento después del impacto.' },
  posicion_pies:    { title: 'Posición de Pies', desc: 'Estabilidad, alineación y movimiento de los pies durante el golpe.' },
  ritmo_cadencia:   { title: 'Ritmo/Cadencia',   desc: 'Fluidez y consistencia temporal del movimiento.' },
  potencia_pelota:  { title: 'Potencia',         desc: 'Velocidad resultante de la pelota después del impacto.' },
  preparacion_toss: { title: 'Prep/Toss',        desc: 'Lanzamiento de la pelota y posición inicial en el saque.' },
  carga_trophy:     { title: 'Carga/Trophy',     desc: 'Trophy position donde el codo alcanza máxima altura.' },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
type ProfesorComment = {
  id: string;
  contenido: string;
  created_at: string;
  autor_name: string;
};

export function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState('overview');
  const [expandedExercise, setExpandedExercise] = useState<number | string | null>(null);
  const [session, setSession]           = useState<any>(null);
  const [historicalSessions, setHistoricalSessions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [visibleLines, setVisibleLines] = useState({ score_global: true, forehand: true, backhand: true, saque: true });
  const [radarStroke, setRadarStroke]   = useState('todos');
  const [profesorComments, setProfesorComments] = useState<ProfesorComment[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) { navigate('/dashboard'); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions').select('*').eq('id', id).single();
        if (sessionError) throw sessionError;
        setSession(sessionData);
        const { data: history } = await supabase
          .from('sessions').select('created_at, global_score, scores_detalle')
          .eq('user_id', user.id).order('created_at', { ascending: true }).limit(10);
        if (history) {
          setHistoricalSessions(history.map((s: any) => ({
            date:     new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            score_global: s.global_score ?? 0,
            forehand: s.scores_detalle?.forehand?.total ?? 0,
            backhand: s.scores_detalle?.backhand?.total ?? 0,
            saque:    s.scores_detalle?.saque?.total    ?? 0,
          })));
        }
        const { data: commentsData } = await supabase
          .from('session_comments')
          .select('id, contenido, created_at, profiles(first_name, last_name, email)')
          .eq('session_id', id)
          .order('created_at', { ascending: true });
        if (commentsData) {
          setProfesorComments(commentsData.map((c: any) => {
            const p = c.profiles ?? {};
            const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Profesor';
            return { id: c.id, contenido: c.contenido, created_at: c.created_at, autor_name: name };
          }));
        }
      } catch (err) {
        console.error('Error cargando sesión:', err);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: C.textSec, fontSize: 14 }}>Cargando sesión...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!session) return null;

  const scores = session.scores_detalle || {};

  const current = {
    date:          new Date(session.actual_session_date ?? session.created_at).toLocaleDateString('es-ES'),
    globalScore:   session.global_score ?? 0,
    nivel:         session.nivel_general ?? '—',
    sessionType:   session.session_type ?? '—',
    duration:      session.duration ?? '—',
    cameraQuality: session.camera_quality ?? '—',
    diagnostico:   session.diagnostico_global ?? '—',
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
  };

  const planEjercicios = session.plan_ejercicios ?? { mensaje: '', proximaFoco: '', ejercicios: [] };

  const radarData = [
    { dimension: 'Prep',     forehand: current.golpes.forehand.scores?.preparacion?.score ?? 0,    backhand: current.golpes.backhand.scores?.preparacion?.score ?? 0,    saque: current.golpes.saque.scores?.preparacion_toss?.score ?? 0 },
    { dimension: 'Impacto',  forehand: current.golpes.forehand.scores?.punto_impacto?.score ?? 0,  backhand: current.golpes.backhand.scores?.punto_impacto?.score ?? 0,  saque: current.golpes.saque.scores?.punto_impacto?.score ?? 0 },
    { dimension: 'Follow',   forehand: current.golpes.forehand.scores?.follow_through?.score ?? 0, backhand: current.golpes.backhand.scores?.follow_through?.score ?? 0, saque: current.golpes.saque.scores?.follow_through?.score ?? 0 },
    { dimension: 'Pies',     forehand: current.golpes.forehand.scores?.posicion_pies?.score ?? 0,  backhand: current.golpes.backhand.scores?.posicion_pies?.score ?? 0,  saque: null },
    { dimension: 'Ritmo',    forehand: current.golpes.forehand.scores?.ritmo_cadencia?.score ?? 0, backhand: current.golpes.backhand.scores?.ritmo_cadencia?.score ?? 0, saque: current.golpes.saque.scores?.ritmo_cadencia?.score ?? 0 },
    { dimension: 'Potencia', forehand: current.golpes.forehand.scores?.potencia_pelota?.score ?? 0,backhand: current.golpes.backhand.scores?.potencia_pelota?.score ?? 0,saque: current.golpes.saque.scores?.potencia_pelota?.score ?? 0 },
  ];

  const lineConfig: Record<string, { label: string; color: string }> = {
    score_global: { label: 'Global',   color: C.accentDark },
    forehand:     { label: 'Forehand', color: C.blue       },
    backhand:     { label: 'Backhand', color: C.red        },
    saque:        { label: 'Saque',    color: C.green      },
  };

  const s: Record<string, React.CSSProperties> = {
    root:        { minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri },
    header:      { borderBottom: `1px solid ${C.border}`, padding: '0 32px', position: 'sticky', top: 0, zIndex: 50, background: C.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    headerInner: { maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
    nav:         { borderBottom: `1px solid ${C.border}`, padding: '0 32px', background: C.surface },
    navInner:    { maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0 },
    main:        { maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' },
    card:        { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    cardLabel:   { fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 4 } as React.CSSProperties,
  };

  const NavTab = ({ tab }: { tab: typeof TABS[0] }) => {
    const active = activeTab === tab.id;
    return (
      <button onClick={() => setActiveTab(tab.id)} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0 20px', height: 48, border: 'none', background: 'none',
        borderBottom: `2px solid ${active ? C.accentDark : 'transparent'}`,
        color: active ? C.accentDark : C.textSec,
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
        <tab.Icon size={14} />{tab.label}
      </button>
    );
  };

  /* ── SYNTHESIZER METADATA COMPONENTS ── */

  const RootCauseCard = ({ metadata }: { metadata?: any }) => {
    const rootCause = metadata?.root_cause;
    if (!rootCause) return null;
    return (
      <div style={{ ...s.card, marginBottom: 16, borderLeft: `4px solid ${C.red}`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <AlertCircle size={24} color={C.red} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={s.cardLabel}>Problema Detectado</div>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6, margin: 0 }}>
            {rootCause}
          </p>
        </div>
      </div>
    );
  };

  const Top3InsightsCard = ({ metadata }: { metadata?: any }) => {
    const insights = metadata?.top_3_insights;
    if (!insights || !Array.isArray(insights) || insights.length === 0) return null;

    const impactoColorMap: Record<string, string> = {
      alto: C.red,
      medio: C.amber,
      bajo: C.green,
    };

    return (
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardLabel}>Top 3 Insights</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {insights.slice(0, 3).map((insight: any, idx: number) => (
            <div key={idx} style={{
              padding: '12px 14px',
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.textPri }}>
                  {insight.area || `Insight ${idx + 1}`}
                </div>
                <Tag color={impactoColorMap[insight.impacto] || C.amber}>
                  {insight.impacto || 'medio'}
                </Tag>
              </div>
              <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5, margin: 0, marginBottom: 6 }}>
                {insight.descripcion}
              </p>
              {insight.accionabilidad && (
                <div style={{
                  fontSize: 11,
                  color: C.green,
                  fontStyle: 'italic',
                  paddingTop: 6,
                  borderTop: `1px solid ${C.border}`,
                }}>
                  💡 Acción: {insight.accionabilidad}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DeltaHeadlineCard = ({ metadata }: { metadata?: any }) => {
    const deltaHeadline = metadata?.delta_headline;
    if (!deltaHeadline) return null;

    // Extract delta from comparison_delta if it exists
    const comparison = metadata?.comparison_delta;
    const globalDelta = comparison?.global?.delta ?? 0;
    const isImprovement = globalDelta > 0;
    const isDeltaSignificant = Math.abs(globalDelta) > 5 || (comparison?.global && Math.abs((globalDelta / (comparison.global.prev || 1)) * 100) > 10);

    if (!isDeltaSignificant) return null;

    return (
      <div style={{
        ...s.card,
        marginBottom: 16,
        background: isImprovement ? C.green + '08' : C.red + '08',
        borderTop: `3px solid ${isImprovement ? C.green : C.red}`,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          background: (isImprovement ? C.green : C.red) + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isImprovement ? (
            <ArrowUp size={20} color={C.green} />
          ) : (
            <ArrowDown size={20} color={C.red} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.cardLabel}>Cambio vs Sesión Anterior</div>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6, margin: 0, marginBottom: 6 }}>
            {deltaHeadline}
          </p>
          {comparison?.global && (
            <div style{{
              fontSize: 11,
              color: C.textMut,
              fontFamily: "'DM Mono', monospace",
            }}>
              {comparison.global.prev} → {comparison.global.current} (Δ {isImprovement ? '+' : ''}{globalDelta.toFixed(1)})
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── TAB OVERVIEW ── */
  const TabOverview = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 20 }}>
          <ScoreRingWithLabel score={current.globalScore} size={80} />
          <div>
            <div style={s.cardLabel}>Score global</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: scoreColor(current.globalScore), lineHeight: 1 }}>
              {current.globalScore}<span style={{ fontSize: 13, color: C.textSec, fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ marginTop: 6 }}><Tag color={scoreColor(current.globalScore)}>{current.nivel}</Tag></div>
          </div>
        </div>
        {([
          { key: 'forehand', label: 'Forehand', color: C.blue  },
          { key: 'backhand', label: 'Backhand', color: C.red   },
          { key: 'saque',    label: 'Saque',    color: C.green },
        ] as const).map(({ key, label, color }) => {
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

      {/* New cards from synthesizer_metadata */}
      <RootCauseCard metadata={session.synthesizer_metadata} />
      <Top3InsightsCard metadata={session.synthesizer_metadata} />
      <DeltaHeadlineCard metadata={session.synthesizer_metadata} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={s.card}>
          <SectionLabel>Diagnóstico de sesión</SectionLabel>
          <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.7, marginBottom: 20 }}>{current.diagnostico}</p>
          <Divider />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {([
              ['Tipo de sesión', current.sessionType],
              ['Fecha',          current.date],
              ['Duración',       current.duration],
              ['Cámara',         current.cameraQuality],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label}>
                <div style={s.cardLabel}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionLabel>Dimensiones técnicas</SectionLabel>
            <div style={{ display: 'flex', gap: 12 }}>
              {([['Forehand', C.blue], ['Backhand', C.red], ['Saque', C.green]] as [string, string][]).map(([l, c]) => (
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
              <Radar name="Forehand" dataKey="forehand" stroke={C.blue}  fill={C.blue}  fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name="Backhand" dataKey="backhand" stroke={C.red}   fill={C.red}   fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name="Saque"    dataKey="saque"    stroke={C.green} fill={C.green} fillOpacity={0.12} strokeWidth={1.5} />
              <Tooltip {...customTooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {([
          { key: 'forehand', label: 'Forehand', color: C.blue,  desc: 'Golpe ofensivo con cara abierta de raqueta.' },
          { key: 'backhand', label: 'Backhand', color: C.red,   desc: 'Golpe con cara cerrada. Ofensivo o defensivo.' },
          { key: 'saque',    label: 'Saque',    color: C.green, desc: 'Inicio del punto. Spin, altura y consistencia.' },
        ] as const).map(({ key, label, color, desc }) => {
          const g = current.golpes[key];
          const scoreEntries = Object.entries(g.scores || {});
          return (
            <div key={key} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color }}>{g.score}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scoreEntries.length > 0 ? scoreEntries.map(([dim, data]: [string, any]) => (
                  <div key={dim}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: C.textSec }}>{dimensionInfo[dim]?.title || dim}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textPri }}>{data.score}/{data.max}</span>
                    </div>
                    <MiniBar pct={(data.score / data.max) * 100} color={color} />
                  </div>
                )) : <div style={{ fontSize: 12, color: C.textMut }}>Sin datos de dimensiones</div>}
              </div>
              {(g.fortalezas?.length > 0 || g.patron_error !== '—') && (
                <>
                  <Divider />
                  <div style={{ fontSize: 11, color: C.green, marginBottom: 6 }}>
                    {g.fortalezas?.map((f: string, i: number) => <div key={i} style={{ marginBottom: 2 }}>+ {f}</div>)}
                  </div>
                  {g.patron_error !== '—' && <div style={{ fontSize: 11, color: C.amber }}>— {g.patron_error}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── TAB SCORES ── */
  const TabScores = () => {
    const strokeOptions = [
      { key: 'todos',    label: 'Todos',    color: C.accentDark },
      { key: 'forehand', label: 'Forehand', color: C.blue       },
      { key: 'backhand', label: 'Backhand', color: C.red        },
      { key: 'saque',    label: 'Saque',    color: C.green      },
    ];

    const buildRadarData = () => {
      const fh = current.golpes.forehand.scores || {};
      const bh = current.golpes.backhand.scores || {};
      const sa = current.golpes.saque.scores || {};
      return [
        { dimension: 'Preparación', forehand: fh.preparacion    ? Math.round((fh.preparacion.score/20)*20)    : 0, backhand: bh.preparacion    ? Math.round((bh.preparacion.score/20)*20)    : 0, saque: sa.preparacion_toss ? Math.round((sa.preparacion_toss.score/20)*20) : 0 },
        { dimension: 'Impacto',     forehand: fh.punto_impacto  ? Math.round((fh.punto_impacto.score/20)*20)  : 0, backhand: bh.punto_impacto  ? Math.round((bh.punto_impacto.score/20)*20)  : 0, saque: sa.punto_impacto   ? Math.round((sa.punto_impacto.score/20)*20)   : 0 },
        { dimension: 'Follow',      forehand: fh.follow_through ? Math.round((fh.follow_through.score/20)*20) : 0, backhand: bh.follow_through ? Math.round((bh.follow_through.score/20)*20) : 0, saque: sa.follow_through  ? Math.round((sa.follow_through.score/20)*20)  : 0 },
        { dimension: 'Pies',        forehand: fh.posicion_pies  ? Math.round((fh.posicion_pies.score/20)*20)  : 0, backhand: bh.posicion_pies  ? Math.round((bh.posicion_pies.score/20)*20)  : 0, saque: null },
        { dimension: 'Ritmo',       forehand: fh.ritmo_cadencia ? Math.round((fh.ritmo_cadencia.score/10)*20) : 0, backhand: bh.ritmo_cadencia ? Math.round((bh.ritmo_cadencia.score/10)*20) : 0, saque: sa.ritmo_cadencia  ? Math.round((sa.ritmo_cadencia.score/10)*20)  : 0 },
        { dimension: 'Potencia',    forehand: fh.potencia_pelota? Math.round((fh.potencia_pelota.score/10)*20): 0, backhand: bh.potencia_pelota? Math.round((bh.potencia_pelota.score/10)*20): 0, saque: sa.potencia_pelota ? Math.round((sa.potencia_pelota.score/10)*20) : 0 },
      ];
    };

    const rd = buildRadarData();
    const showFH = radarStroke === 'todos' || radarStroke === 'forehand';
    const showBH = radarStroke === 'todos' || radarStroke === 'backhand';
    const showSA = radarStroke === 'todos' || radarStroke === 'saque';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel>Radar de dimensiones técnicas</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {strokeOptions.map(o => (
                <button key={o.key} onClick={() => setRadarStroke(o.key)} style={{
                  padding: '5px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                  border: `1px solid ${radarStroke === o.key ? o.color : C.border}`,
                  background: radarStroke === o.key ? o.color + '15' : 'transparent',
                  color: radarStroke === o.key ? o.color : C.textSec,
                }}>{o.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={rd} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: C.textSec }} />
                <PolarRadiusAxis stroke="none" tick={false} domain={[0, 20]} />
                {showFH && <Radar name="Forehand" dataKey="forehand" stroke={C.blue}  fill={C.blue}  fillOpacity={radarStroke==='forehand'?0.2:0.08} strokeWidth={radarStroke==='forehand'?2.5:1.5} />}
                {showBH && <Radar name="Backhand" dataKey="backhand" stroke={C.red}   fill={C.red}   fillOpacity={radarStroke==='backhand'?0.2:0.08} strokeWidth={radarStroke==='backhand'?2.5:1.5} />}
                {showSA && <Radar name="Saque"    dataKey="saque"    stroke={C.green} fill={C.green} fillOpacity={radarStroke==='saque'?0.2:0.08}    strokeWidth={radarStroke==='saque'?2.5:1.5}    />}
                <Tooltip {...customTooltipStyle} formatter={(v: any) => v !== null ? [`${v}/20`, ''] : ['N/A', '']} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 140 }}>
              {([
                { key: 'forehand', label: 'Forehand', color: C.blue,  score: current.golpes.forehand.score },
                { key: 'backhand', label: 'Backhand', color: C.red,   score: current.golpes.backhand.score },
                { key: 'saque',    label: 'Saque',    color: C.green, score: current.golpes.saque.score    },
              ] as const).map(item => {
                const active = radarStroke === 'todos' || radarStroke === item.key;
                return (
                  <button key={item.key} onClick={() => setRadarStroke(radarStroke === item.key ? 'todos' : item.key)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${active && radarStroke !== 'todos' ? item.color + '60' : C.border}`,
                    background: active && radarStroke !== 'todos' ? item.color + '08' : C.panel,
                    opacity: active ? 1 : 0.4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: C.textSec }}>{item.label}</span>
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

        {(['forehand', 'backhand', 'saque'] as const).map(gk => {
          const g = current.golpes[gk];
          const nombre = gk === 'forehand' ? 'Forehand' : gk === 'backhand' ? 'Backhand' : 'Saque';
          const color  = gk === 'forehand' ? C.blue    : gk === 'backhand' ? C.red      : C.green;
          const scoreEntries = Object.entries(g.scores || {});
          return (
            <div key={gk}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <ScoreRingWithLabel score={g.score} size={56} />
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 }}>{nombre}</div>
                  <Tag color={color}>{g.nivel}</Tag>
                </div>
                {/* Delta vs previous session */}
              {session.synthesizer_metadata?.comparison_delta?.[gk] && (() => {
                const delta = session.synthesizer_metadata.comparison_delta[gk];
                const deltaVal = delta.delta ?? 0;
                const isDeltaPos = deltaVal > 0;
                const isDeltaSig = Math.abs(deltaVal) > 5 || (delta.prev && Math.abs((deltaVal / delta.prev) * 100) > 10);
                if (isDeltaSig) {
                  return (
                    <div style={{
                      padding: '8px 12px',
                      marginRight: 'auto',
                      background: (isDeltaPos ? C.green : C.red) + '10',
                      border: `1px solid ${(isDeltaPos ? C.green : C.red)}30`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      <span style={{ color: C.textSec }}>vs anterior:</span>
                      <span style={{ color: C.textPri, fontWeight: 500 }}>{delta.prev ?? '—'} → {delta.current ?? '—'}</span>
                      <span style={{ color: isDeltaPos ? C.green : C.red, fontWeight: 600 }}>
                        {isDeltaPos ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />}
                        {' '}{isDeltaPos ? '+' : ''}{deltaVal.toFixed(1)}
                      </span>
                    </div>
                  );
                }
              })()}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: C.textSec }}>
                  Vel. máx. <span style={{ fontFamily: "'DM Mono', monospace", color, fontWeight: 500 }}>{g.velocidad_pelota_max} px/f</span>
                </div>
              </div>
              {scoreEntries.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {scoreEntries.map(([dim, data]: [string, any]) => {
                    const info = dimensionInfo[dim] || { title: dim, desc: '' };
                    const pct = (data.score / data.max) * 100;
                    const isMeasurementFailed = dim === 'potencia_pelota' && data.score === 0;
                    return (
                      <div
                        key={dim}
                        style={{
                          ...s.card,
                          opacity: isMeasurementFailed ? 0.6 : 1,
                          background: isMeasurementFailed ? C.panel : C.surface,
                          borderColor: isMeasurementFailed ? C.amber + '40' : undefined,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{info.title}</span>
                            <InfoTooltip title={info.title} description={info.desc} />
                          </div>
                          {isMeasurementFailed && (
                            <InfoTooltip
                              title="No Medible"
                              description="La validación de pelota falló en esta sesión. Esta métrica no fue calculada."
                            />
                          )}
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: isMeasurementFailed ? C.textMut : color, marginBottom: 6 }}>
                          {isMeasurementFailed ? '—' : data.score}<span style={{ fontSize: 12, color: C.textMut }}>/{data.max}</span>
                        </div>
                        <MiniBar pct={isMeasurementFailed ? 0 : pct} color={isMeasurementFailed ? C.border : color} />
                        {isMeasurementFailed && (
                          <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>
                            ⚠️ Validación de pelota fallida
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...s.card, color: C.textMut, fontSize: 13, marginBottom: 20 }}>Sin datos de dimensiones para esta sesión</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── TAB EVOLUTION ── */
  const TabEvolution = () => (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionLabel>Evolución de scores — últimas sesiones</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(lineConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setVisibleLines(p => ({ ...p, [key]: !p[key as keyof typeof p] }))} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 5, border: `1px solid ${visibleLines[key as keyof typeof visibleLines] ? cfg.color + '60' : C.border}`,
              background: visibleLines[key as keyof typeof visibleLines] ? cfg.color + '10' : 'transparent',
              color: visibleLines[key as keyof typeof visibleLines] ? cfg.color : C.textMut,
              fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'all 0.15s',
            }}>
              {visibleLines[key as keyof typeof visibleLines] ? <Eye size={12} /> : <EyeOff size={12} />}
              {cfg.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={historicalSessions}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textSec }} />
          <YAxis tick={{ fontSize: 11, fill: C.textSec }} domain={[0, 100]} />
          <Tooltip {...customTooltipStyle} />
          {Object.entries(lineConfig).map(([key, cfg]) =>
            visibleLines[key as keyof typeof visibleLines] ? (
              <Line key={key} type="monotone" dataKey={key}
                stroke={cfg.color} strokeWidth={key === 'score_global' ? 2.5 : 1.5}
                name={cfg.label} dot={{ fill: cfg.color, r: 4 }} activeDot={{ r: 6 }}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const MejorasCard = ({ prioridades }: { prioridades?: any[] }) => {
    if (!prioridades || !Array.isArray(prioridades) || prioridades.length === 0) return null;

    const urgenciaColorMap: Record<string, string> = {
      critica: C.red,
      alta: C.amber,
      media: C.blue,
      baja: C.green,
    };

    const urgenciaLabelMap: Record<string, string> = {
      critica: 'Crítica',
      alta: 'Alta',
      media: 'Media',
      baja: 'Baja',
    };

    return (
      <div style={s.card}>
        <SectionLabel>Prioridades de Mejora</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {prioridades.slice(0, 3).map((p: any, idx: number) => {
            const color = urgenciaColorMap[p.urgencia] || C.amber;
            return (
              <div
                key={idx}
                style={{
                  padding: '14px 14px',
                  background: color + '08',
                  border: `1px solid ${color}30`,
                  borderRadius: 8,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.textPri,
                      marginBottom: 4,
                    }}>
                      #{p.prioridad ?? idx + 1}. {p.golpe ? p.golpe.charAt(0).toUpperCase() + p.golpe.slice(1) : 'General'}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: C.textSec,
                      marginBottom: 4,
                    }}>
                      {p.dimension || 'Sin dimensión especificada'}
                    </div>
                  </div>
                  <Tag color={color}>
                    {urgenciaLabelMap[p.urgencia] || p.urgencia || 'media'}
                  </Tag>
                </div>

                {/* Score progression */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 11,
                  marginBottom: 8,
                  paddingTop: 8,
                  borderTop: `1px solid ${color}15`,
                }}>
                  <div>
                    <div style={{ color: C.textMut, marginBottom: 2 }}>Score actual</div>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textPri,
                    }}>
                      {p.score_actual ?? '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', color: C.textMut }}>→</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.textMut, marginBottom: 2 }}>Score objetivo</div>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 14,
                      fontWeight: 600,
                      color: color,
                    }}>
                      {p.score_objetivo ?? '—'}
                    </div>
                  </div>
                </div>

                {/* Impact estimate */}
                {p.impacto_estimado && (
                  <div style={{
                    fontSize: 11,
                    color: C.green,
                    fontStyle: 'italic',
                  }}>
                    💡 Impacto estimado: {p.impacto_estimado}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── TAB REPORT ── */
  const TabReport = () => {
    const r = scores;
    const reporte = session.reporte_narrativo ?? session.reporte_narrativo_completo ?? null;
    const diagnosticoSeccion = r?.seccion_diagnostico;

    const renderFormattedReport = (text: string) => {
      if (!text) return null;
      const sections = text.split('## ').filter(s => s.trim().length > 0);
      return sections.map((section, idx) => {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        if (!content) {
          return <p key={idx} style={{ fontSize: 14, color: C.textSec, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}>{section.trim()}</p>;
        }
        return (
          <div key={idx} style={{ marginBottom: 32 }}>
            <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: C.textPri, marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {title}
            </h4>
            <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
              {content}
            </p>
          </div>
        );
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={s.card}>
          <SectionLabel>Reporte de Alto Rendimiento</SectionLabel>
          {reporte ? (
            <div style={{ marginTop: 20 }}>{renderFormattedReport(reporte)}</div>
          ) : (
            <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.8 }}>
              {diagnosticoSeccion?.contenido ?? current.diagnostico}
            </p>
          )}
        </div>
        <MejorasCard prioridades={session.prioridades_mejora} />
      </div>
    );
  };

  /* ── TAB EXERCISES ── */
  const TabExercises = () => {
    const p = planEjercicios;
    const ejercicios = Array.isArray(p?.ejercicios_prioritarios) ? p.ejercicios_prioritarios : [];
    const mensaje = p?.mensaje_motivacional;
    const foco = p?.proxima_sesion_foco;

    const days = [
      { day: 'Lunes',     focus: 'Técnica — ejercicios prioritarios 1 y 2', dur: '60 min'  },
      { day: 'Martes',    focus: 'Partido — aplicar correcciones en juego',  dur: '75 min'  },
      { day: 'Miércoles', focus: 'Descanso o ejercicio ligero',               dur: '20 min'  },
      { day: 'Jueves',    focus: 'Técnica — ejercicios 3 y 4',               dur: '60 min'  },
      { day: 'Viernes',   focus: 'Partido competitivo — test de mejoras',    dur: '90 min'  },
      { day: 'Sábado',    focus: 'Volumen — drills extensos',                 dur: '120 min' },
      { day: 'Domingo',   focus: 'Descanso y recuperación',                   dur: 'Ligero'  },
    ];

    return (
      <div>
        {(mensaje || foco) && (
          <div style={{ ...s.card, marginBottom: 24, borderLeft: `3px solid ${C.accentDark}`, borderRadius: 10 }}>
            {mensaje && <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{mensaje}</div>}
            {foco && <div style={{ fontSize: 13, color: C.textSec }}>Foco: <span style={{ color: C.accentDark }}>{foco}</span></div>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ejercicios.length === 0 ? (
              <div style={{ ...s.card, color: C.textMut, fontSize: 13 }}>No hay ejercicios disponibles para esta sesión.</div>
            ) : ejercicios.map((ej: any, idx: number) => {
              const key = ej.prioridad ?? idx;
              return (
                <div key={key} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedExercise(expandedExercise === key ? null : key)}
                    style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: C.accent + '30', color: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {ej.prioridad ?? idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.textPri, marginBottom: 4 }}>{ej.nombre}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ej.golpe_objetivo && <Tag color={C.blue}>{ej.golpe_objetivo}</Tag>}
                        {ej.dimension_objetivo && <Tag color={C.textSec}>{ej.dimension_objetivo}</Tag>}
                      </div>
                    </div>
                    <ChevronDown size={16} style={{ color: C.textSec, transform: expandedExercise === key ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>
                  {expandedExercise === key && (
                    <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                      {ej.descripcion_detallada && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7, marginBottom: 14 }}>{ej.descripcion_detallada}</div>}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {([
                          ['Series',   ej.series      ? `${ej.series}x`                    : '—'],
                          ['Reps',     ej.repeticiones ?? '—'],
                          ['Duración', ej.duracion_minutos ? `${ej.duracion_minutos} min`   : '—'],
                        ] as [string, string][]).map(([label, val]) => (
                          <div key={label} style={{ background: C.panel, borderRadius: 6, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, color: C.textPri }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ej.punto_atencion_clave && <div style={{ padding: '10px 12px', background: C.green    + '12', borderLeft: `2px solid ${C.green}`,      borderRadius: '0 6px 6px 0', fontSize: 12 }}><span style={{ color: C.green,      fontWeight: 600 }}>Atención clave — </span><span style={{ color: C.textSec }}>{ej.punto_atencion_clave}</span></div>}
                        {ej.error_comun_evitar  && <div style={{ padding: '10px 12px', background: C.red      + '10', borderLeft: `2px solid ${C.red}`,        borderRadius: '0 6px 6px 0', fontSize: 12 }}><span style={{ color: C.red,        fontWeight: 600 }}>Error a evitar — </span><span style={{ color: C.textSec }}>{ej.error_comun_evitar}</span></div>}
                        {ej.metrica_exito       && <div style={{ padding: '10px 12px', background: C.accentDark + '10', borderLeft: `2px solid ${C.accentDark}`, borderRadius: '0 6px 6px 0', fontSize: 12 }}><span style={{ color: C.accentDark, fontWeight: 600 }}>Métrica de éxito — </span><span style={{ color: C.textSec }}>{ej.metrica_exito}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={s.card}>
            <SectionLabel>Plan semanal</SectionLabel>
            {days.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < days.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{d.day}</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{d.focus}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accentDark, flexShrink: 0, marginLeft: 12 }}>{d.dur}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── RENDER ── */
  return (
    <>
      <style>{fonts}</style>
      <div style={s.root}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link
                to="/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textSec, textDecoration: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.textPri)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textSec)}
              >
                <ArrowLeft size={15} />
                Volver al dashboard
              </Link>
              <div style={{ width: 1, height: 20, background: C.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f1923" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2C6 8 6 16 12 22" />
                    <path d="M12 2C18 8 18 16 12 22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: C.textPri }}>
                  Tennis<span style={{ color: C.accentDark }}>AI</span>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sesión</div>
                <div style={{ fontSize: 13, color: C.textSec, textTransform: 'capitalize' }}>{current.date} · {current.sessionType}</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: scoreColor(current.globalScore) + '12',
                border: `1px solid ${scoreColor(current.globalScore)}30`,
                borderRadius: 8, padding: '6px 14px',
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, color: scoreColor(current.globalScore) }}>{current.globalScore}</span>
                <span style={{ fontSize: 11, color: C.textSec }}>/100</span>
              </div>
            </div>
          </div>
        </header>

        <QualityScoreHeader quality_score={session.quality_score} />

        <nav style={s.nav}>
          <div style={s.navInner}>
            {TABS.map(t => <NavTab key={t.id} tab={t} />)}
          </div>
        </nav>

        <main style={s.main}>
          {activeTab === 'overview'    && <TabOverview />}
          {activeTab === 'scores'      && <TabScores />}
          {activeTab === 'biomecanica' && <BoneMappingTab session={session} C={C} />}
          {activeTab === 'evolution'   && <TabEvolution />}
          {activeTab === 'report'      && <TabReport />}
          {activeTab === 'exercises'   && <TabExercises />}
        </main>

        {profesorComments.length > 0 && (
          <div style={{ padding: '0 32px 32px', maxWidth: 900 }}>
            <div style={{ background: C.accentDark + '08', border: `1px solid ${C.accentDark}25`, borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accentDark }} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.accentDark }}>Feedback de tu profesor</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profesorComments.map(c => (
                  <div key={c.id} style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.accentDark}20`, borderRadius: 8 }}>
                    <div style={{ fontSize: 13, color: C.textPri, lineHeight: 1.6 }}>{c.contenido}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.accentDark, fontFamily: "'DM Mono', monospace" }}>{c.autor_name}</span>
                      <span style={{ fontSize: 10, color: C.textMut }}>· {new Date(c.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px 32px', textAlign: 'center', fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>
          TennisAI © 2026 — Análisis biomecánico automático potenciado por IA
        </footer>
      </div>
    </>
  );
}
