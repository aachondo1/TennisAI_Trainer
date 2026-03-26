import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, ChevronDown, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useJobPoller, loadJob, clearJob, type StoredJob } from '../hooks/useJobPoller';

const C = {
  bg:      '#0a0c0e', surface: '#111316', panel: '#161a1e',
  border:  '#1e2328', borderHi: '#2a3038',
  accent:  '#b5f542', blue: '#4a9eff', red: '#ff5a5a',
  amber:   '#f5a623', green: '#3dd68c',
  textPri: '#f0f2f4', textSec: '#7a8694', textMut: '#404850',
};

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

const scoreColor = (s: number) => {
  if (s >= 80) return C.accent;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

type PresetKey = 'today'|'this_week'|'this_month'|'last_week'|'last_month'|'this_year'|'last_year'|'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today',      label: 'Hoy'           },
  { key: 'this_week',  label: 'Esta semana'   },
  { key: 'this_month', label: 'Este mes'      },
  { key: 'last_week',  label: 'Semana pasada' },
  { key: 'last_month', label: 'Mes pasado'    },
  { key: 'this_year',  label: 'Este año'      },
  { key: 'last_year',  label: 'Año pasado'    },
];

function getRange(preset: PresetKey, cf?: string, ct?: string) {
  const now = new Date();
  const sd = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const ed = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  switch (preset) {
    case 'today':      return { from: sd(now), to: ed(now) };
    case 'this_week': { const d=new Date(now); const day=d.getDay(); d.setDate(d.getDate()-day+(day===0?-6:1)); return { from: sd(d), to: ed(now) }; }
    case 'this_month': return { from: sd(new Date(now.getFullYear(),now.getMonth(),1)), to: ed(now) };
    case 'last_week': { const d=new Date(now); const day=d.getDay(); d.setDate(d.getDate()-day+(day===0?-6:1)-7); const e=new Date(d); e.setDate(d.getDate()+6); return { from: sd(d), to: ed(e) }; }
    case 'last_month': return { from: sd(new Date(now.getFullYear(),now.getMonth()-1,1)), to: ed(new Date(now.getFullYear(),now.getMonth(),0)) };
    case 'this_year':  return { from: sd(new Date(now.getFullYear(),0,1)), to: ed(now) };
    case 'last_year':  return { from: sd(new Date(now.getFullYear()-1,0,1)), to: ed(new Date(now.getFullYear()-1,11,31)) };
    case 'custom':     return { from: cf ? sd(new Date(cf)) : sd(new Date(now.getFullYear(),now.getMonth(),1)), to: ct ? ed(new Date(ct)) : ed(now) };
  }
}

const Card = ({ children, style={} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 24px', ...style }}>{children}</div>
);
const Lbl = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>{children}</div>
);
const Bar2 = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
    <div style={{ height: '100%', width: `${Math.min(pct,100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
  </div>
);
const ttStyle = {
  contentStyle: { background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: 8, fontSize: 12, color: C.textPri },
  labelStyle: { color: C.textSec },
};

/* ════════════════════════════════════════════════════════════════
   ACTIVE JOB BANNER
════════════════════════════════════════════════════════════════ */

const STATUS_COPY: Record<string, { label: string; sub: string }> = {
  vision_processing: { label: 'Procesando video',      sub: 'Extrayendo frames y detectando pose...' },
  vision_done:       { label: 'Visión completada',     sub: 'Iniciando agentes de análisis...' },
  agents_processing: { label: 'Agentes IA trabajando', sub: 'Analizando técnica y generando reporte...' },
  uploading:         { label: 'Subiendo video',         sub: 'Transfiriendo archivo al servidor...' },
};

function ActiveJobBanner({
  job,
  onDismiss,
  onCompleted,
}: {
  job: StoredJob;
  onDismiss: () => void;
  onCompleted: (sessionId: string) => void;
}) {
  const navigate = useNavigate();

  const poller = useJobPoller({
    onCompleted: (sid) => {
      onCompleted(sid);
    },
    onError: () => {
      onDismiss();
    },
  });

  // Start polling immediately on mount
  useEffect(() => {
    poller.startPolling(job.vision_job_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.vision_job_id]);

  // Session type label
  const typeLabels: Record<string, string> = {
    forehand: 'Forehand', backhand: 'Backhand', saque: 'Saque', mezcla: 'Mezcla',
  };
  const typeLabel = typeLabels[job.session_type] || job.session_type;

  // Elapsed time
  const elapsed = Math.round((Date.now() - new Date(job.started_at).getTime()) / 60000);

  const copy = STATUS_COPY[poller.status] || STATUS_COPY.vision_processing;

  const handleGoToUpload = () => navigate('/upload');

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accent}0f 0%, ${C.blue}0a 100%)`,
      border: `1px solid ${C.accent}35`,
      borderRadius: 10,
      padding: '14px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      animation: 'slideDown 0.35s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Shimmer line at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${C.accent} 50%, transparent 100%)`,
        backgroundSize: '400px 2px',
        animation: 'shimmer 2s linear infinite',
      }} />

      {/* Spinner */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36,
          border: `2.5px solid ${C.accent}25`,
          borderTop: `2.5px solid ${C.accent}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2C6 8 6 16 12 22" />
            <path d="M12 2C18 8 18 16 12 22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>
            {copy.label}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 7px', borderRadius: 4,
            background: C.accent + '18', color: C.accent,
            border: `1px solid ${C.accent}30`,
            fontFamily: "'DM Mono', monospace", fontWeight: 600,
          }}>
            {typeLabel}
          </span>
          <span style={{
            fontSize: 10, color: C.textMut,
            fontFamily: "'DM Mono', monospace",
          }}>
            {elapsed}m transcurridos
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.textSec }}>
          {copy.sub}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {(['uploading', 'vision_processing', 'vision_done', 'agents_processing'] as const).map((s, i) => {
          const order = ['uploading', 'vision_processing', 'vision_done', 'agents_processing'];
          const curIdx = order.indexOf(poller.status);
          const isDone = curIdx > i;
          const isActive = curIdx === i;
          return (
            <div key={s} style={{
              width: isDone ? 8 : isActive ? 10 : 6,
              height: isDone ? 8 : isActive ? 10 : 6,
              borderRadius: '50%',
              background: isDone ? C.green : isActive ? C.accent : C.border,
              transition: 'all 0.3s',
              animation: isActive ? 'pulse 1.2s ease infinite' : 'none',
            }} />
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={handleGoToUpload}
        style={{
          padding: '7px 14px', borderRadius: 6,
          background: 'none',
          border: `1px solid ${C.accent}50`,
          color: C.accent, fontSize: 12,
          cursor: 'pointer', fontFamily: "'DM Mono', monospace",
          flexShrink: 0, whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.accent + '15'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        Ver progreso →
      </button>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        style={{
          padding: 4, background: 'none', border: 'none',
          cursor: 'pointer', color: C.textMut,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, borderRadius: 4, transition: 'color 0.15s',
        }}
        title="Ocultar (el análisis continuará)"
        onMouseEnter={e => { e.currentTarget.style.color = C.textSec; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.textMut; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPLETED BANNER — flash when a job just finished
════════════════════════════════════════════════════════════════ */
function CompletedBanner({ sessionId, onDismiss }: { sessionId: string; onDismiss: () => void }) {
  const navigate = useNavigate();

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.green}12 0%, ${C.accent}08 100%)`,
      border: `1px solid ${C.green}40`,
      borderRadius: 10, padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 16,
      animation: 'slideDown 0.35s ease',
    }}>
      {/* Check icon */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: C.green + '20',
        border: `2px solid ${C.green}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>
          ¡Análisis completado! 🎾
        </div>
        <div style={{ fontSize: 12, color: C.textSec }}>
          Tu reporte de sesión está listo para revisar
        </div>
      </div>

      <button
        onClick={() => navigate(`/report/${sessionId}`)}
        style={{
          padding: '8px 16px', borderRadius: 6,
          background: C.green, border: 'none',
          color: '#0a0c0e', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Syne', sans-serif",
          flexShrink: 0,
        }}
      >
        Ver reporte →
      </button>

      <button
        onClick={onDismiss}
        style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, flexShrink: 0, borderRadius: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const [all, setAll]             = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [preset, setPreset]       = useState<PresetKey>('this_month');
  const [customFrom, setCF]       = useState('');
  const [customTo, setCT]         = useState('');
  const [showDD, setShowDD]       = useState(false);

  // Banner state
  const [activeJob, setActiveJob]           = useState<StoredJob | null>(null);
  const [completedSessionId, setCompletedId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Load sessions
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        const { data, error } = await supabase.from('sessions').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: true });
        if (error) throw error;
        setAll(data || []);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Check for active job on mount
  useEffect(() => {
    const job = loadJob();
    if (job && !bannerDismissed) {
      setActiveJob(job);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJobCompleted = useCallback((sessionId: string) => {
    setActiveJob(null);
    setCompletedId(sessionId);
    // Refresh sessions list
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('sessions').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: true })
        .then(({ data }) => { if (data) setAll(data); });
    });
  }, []);

  const handleDismissBanner = useCallback(() => {
    setActiveJob(null);
    setBannerDismissed(true);
    clearJob();
  }, []);

  /* ── Filter/stats logic (unchanged) ── */
  const { from, to } = useMemo(() => getRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const sessions = useMemo(() =>
    all.filter(s => { const d = new Date(s.created_at); return d >= from && d <= to; }),
  [all, from, to]);

  const last30 = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate()-30);
    return all.filter(s => new Date(s.created_at) >= cut);
  }, [all]);

  const stats = useMemo(() => {
    if (!sessions.length) return null;
    const avg = (arr: number[]) => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    const avgGlobal   = avg(sessions.map(s => s.global_score));
    const avgForehand = avg(sessions.map(s => s.scores_detalle?.forehand?.total ?? 0));
    const avgBackhand = avg(sessions.map(s => s.scores_detalle?.backhand?.total ?? 0));
    const avgSaque    = avg(sessions.map(s => s.scores_detalle?.saque?.total    ?? 0));
    const best        = sessions.reduce((a,b) => a.global_score>b.global_score?a:b);
    const improvement = sessions[sessions.length-1].global_score - sessions[0].global_score;

    // Fixed radar normalization — respect each dimension's actual max
    const dimAvg = (key: string, max: number) => {
      const vals = sessions.map(s => s.scores_detalle?.forehand?.scores?.[key]?.score ?? 0);
      return Math.round((avg(vals) / max) * 20);
    };
    const radarData = [
      { dim:'Prep',     v: dimAvg('preparacion',20)    },
      { dim:'Impacto',  v: dimAvg('punto_impacto',20)  },
      { dim:'Follow',   v: dimAvg('follow_through',20) },
      { dim:'Pies',     v: dimAvg('posicion_pies',20)  },
      { dim:'Ritmo',    v: dimAvg('ritmo_cadencia',10) },
      { dim:'Potencia', v: dimAvg('potencia_pelota',10)},
    ];

    const evolution = sessions.map(s => ({
      date:     new Date(s.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}),
      global:   s.global_score,
      forehand: s.scores_detalle?.forehand?.total ?? 0,
      backhand: s.scores_detalle?.backhand?.total ?? 0,
      saque:    s.scores_detalle?.saque?.total    ?? 0,
    }));

    const typeDist: Record<string,number> = {};
    sessions.forEach(s => { typeDist[s.session_type] = (typeDist[s.session_type]||0)+1; });

    const actMap: Record<string,number> = {};
    sessions.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
      actMap[key] = (actMap[key]||0)+1;
    });
    const activity = Object.entries(actMap).map(([date,count]) => ({ date, count }));

    return { avgGlobal, avgForehand, avgBackhand, avgSaque, best, improvement, radarData, evolution, typeDist, activity };
  }, [sessions]);

  /* ── Loading ── */
  if (loading) return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    </>
  );

  if (!all.length) return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ width:64, height:64, background:C.accent+'18', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2C6 8 6 16 12 22"/><path d="M12 2C18 8 18 16 12 22"/><line x1="2" y1="12" x2="22" y2="12"/>
          </svg>
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:C.textPri }}>Aún no tienes sesiones</div>
        <div style={{ fontSize:14, color:C.textSec }}>Sube tu primer video para ver tus estadísticas aquí</div>
        <button onClick={() => navigate('/upload')} style={{ padding:'12px 28px', background:C.accent, border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:"'Syne',sans-serif", color:'#0a0c0e' }}>
          Subir video
        </button>
      </div>
    </>
  );

  const activeLabel = PRESETS.find(p => p.key === preset)?.label || 'Personalizado';

  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.textPri }}>
        <main style={{ maxWidth:1200, margin:'0 auto', padding:'36px 32px 64px' }}>

          {/* ── ACTIVE JOB BANNER ── */}
          {activeJob && !bannerDismissed && (
            <ActiveJobBanner
              job={activeJob}
              onDismiss={handleDismissBanner}
              onCompleted={handleJobCompleted}
            />
          )}

          {/* ── COMPLETED BANNER ── */}
          {completedSessionId && (
            <CompletedBanner
              sessionId={completedSessionId}
              onDismiss={() => setCompletedId(null)}
            />
          )}

          {/* TITLE + FILTER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Dashboard</div>
              <div style={{ fontSize:13, color:C.textSec }}>{sessions.length} sesión{sessions.length!==1?'es':''} en el período · {activeLabel}</div>
            </div>

            {/* DROPDOWN */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowDD(p=>!p)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
                background:C.surface, border:`1px solid ${C.borderHi}`, borderRadius:8,
                color:C.textPri, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
              }}>
                <Calendar size={14} color={C.accent}/>
                {activeLabel}
                <ChevronDown size={13} color={C.textSec} style={{ transform:showDD?'rotate(180deg)':'none', transition:'transform 0.15s' }}/>
              </button>

              {showDD && (
                <div style={{ position:'absolute', right:0, top:'100%', marginTop:6, background:C.panel, border:`1px solid ${C.borderHi}`, borderRadius:10, padding:6, zIndex:100, minWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                  {PRESETS.map(p => (
                    <button key={p.key} onClick={() => { setPreset(p.key); setShowDD(false); }} style={{
                      display:'block', width:'100%', padding:'9px 14px', textAlign:'left',
                      background:preset===p.key ? C.accent+'15' : 'none',
                      border:'none', borderRadius:6, cursor:'pointer',
                      fontSize:13, color:preset===p.key ? C.accent : C.textSec,
                      fontFamily:"'DM Sans',sans-serif",
                    }}>{p.label}</button>
                  ))}
                  <div style={{ borderTop:`1px solid ${C.border}`, margin:'4px 0', padding:'8px 6px 2px' }}>
                    <div style={{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace", marginBottom:6 }}>Personalizado</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <input type="date" value={customFrom} onChange={e => { setCF(e.target.value); setPreset('custom'); }}
                        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, color:C.textPri, fontSize:12, padding:'6px 10px', fontFamily:"'DM Mono',monospace", outline:'none', width:'100%' }}/>
                      <input type="date" value={customTo} onChange={e => { setCT(e.target.value); setPreset('custom'); }}
                        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, color:C.textPri, fontSize:12, padding:'6px 10px', fontFamily:"'DM Mono',monospace", outline:'none', width:'100%' }}/>
                      <button onClick={() => setShowDD(false)} style={{ padding:'7px', background:C.accent, border:'none', borderRadius:6, color:'#0a0c0e', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Syne',sans-serif" }}>
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GLOBAL STATS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            <Card>
              <Lbl>Sesiones totales</Lbl>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:32, fontWeight:500, color:C.textPri, lineHeight:1 }}>{all.length}</div>
              <div style={{ fontSize:12, color:C.textSec, marginTop:6 }}>todas las sesiones registradas</div>
            </Card>
            <Card>
              <Lbl>Últimos 30 días</Lbl>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:32, fontWeight:500, color:C.accent, lineHeight:1 }}>{last30.length}</div>
              <div style={{ fontSize:12, color:C.textSec, marginTop:6 }}>sesiones recientes</div>
              <Bar2 pct={(last30.length/Math.max(all.length,1))*100} color={C.accent}/>
            </Card>
            <Card>
              <Lbl>Tiempo analizado</Lbl>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:32, fontWeight:500, color:C.blue, lineHeight:1 }}>
                ~{Math.round(all.length*12)}<span style={{ fontSize:16, color:C.textSec }}> min</span>
              </div>
              <div style={{ fontSize:12, color:C.textSec, marginTop:6 }}>estimado (~12 min por sesión)</div>
            </Card>
          </div>

          {/* NO DATA IN PERIOD */}
          {!sessions.length ? (
            <Card style={{ textAlign:'center', padding:'48px 24px', animation:'fadeIn 0.3s ease' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:600, marginBottom:6 }}>Sin sesiones en este período</div>
              <div style={{ fontSize:13, color:C.textSec, marginBottom:20 }}>Prueba seleccionando otro rango de fechas</div>
              <button onClick={() => navigate('/upload')} style={{ padding:'10px 24px', background:C.accent, border:'none', borderRadius:8, color:'#0a0c0e', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Syne',sans-serif" }}>
                Subir video
              </button>
            </Card>
          ) : (
            <div style={{ animation:'fadeIn 0.3s ease' }}>

              {/* PERIOD SCORE CARDS */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {([
                  { label:'Score promedio', value:stats!.avgGlobal,   color:scoreColor(stats!.avgGlobal), sub:'global del período' },
                  { label:'Forehand',       value:stats!.avgForehand, color:C.blue,                       sub:'promedio forehand'  },
                  { label:'Backhand',       value:stats!.avgBackhand, color:C.red,                        sub:'promedio backhand'  },
                  { label:'Saque',          value:stats!.avgSaque,    color:C.green,                      sub:'promedio saque'     },
                ] as const).map(({ label, value, color, sub }) => (
                  <Card key={label}>
                    <Lbl>{label}</Lbl>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:28, fontWeight:500, color, lineHeight:1 }}>{value}</div>
                    <div style={{ fontSize:11, color:C.textSec, marginTop:4 }}>{sub}</div>
                    <Bar2 pct={value} color={color}/>
                  </Card>
                ))}
              </div>

              {/* EVOLUTION + RADAR */}
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:16 }}>
                <Card>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <Lbl>Evolución de scores</Lbl>
                    {stats!.improvement !== 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:500, color:stats!.improvement>0?C.green:C.red }}>
                        {stats!.improvement>0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                        {stats!.improvement>0?'+':''}{stats!.improvement} vs inicio
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                    {([['Global',C.accent],['Forehand',C.blue],['Backhand',C.red],['Saque',C.green]] as const).map(([l,c]) => (
                      <span key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.textSec }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:c, display:'inline-block' }}/>{l}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={stats!.evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="date" tick={{ fontSize:10, fill:C.textSec }}/>
                      <YAxis tick={{ fontSize:10, fill:C.textSec }} domain={[0,100]}/>
                      <Tooltip {...ttStyle}/>
                      <Line type="monotone" dataKey="global"   stroke={C.accent} strokeWidth={2.5} dot={{ fill:C.accent, r:3 }} name="Global"/>
                      <Line type="monotone" dataKey="forehand" stroke={C.blue}   strokeWidth={1.5} dot={{ fill:C.blue,   r:2 }} name="Forehand"/>
                      <Line type="monotone" dataKey="backhand" stroke={C.red}    strokeWidth={1.5} dot={{ fill:C.red,    r:2 }} name="Backhand"/>
                      <Line type="monotone" dataKey="saque"    stroke={C.green}  strokeWidth={1.5} dot={{ fill:C.green,  r:2 }} name="Saque"/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <Lbl>Dimensiones técnicas promedio</Lbl>
                  <div style={{ fontSize:11, color:C.textMut, marginBottom:12 }}>Basado en forehand del período</div>
                  <ResponsiveContainer width="100%" height={230}>
                    <RadarChart data={stats!.radarData}>
                      <PolarGrid stroke={C.border}/>
                      <PolarAngleAxis dataKey="dim" tick={{ fontSize:11, fill:C.textSec }}/>
                      <PolarRadiusAxis stroke="none" tick={false} domain={[0,20]}/>
                      <Radar dataKey="v" stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2}/>
                      <Tooltip {...ttStyle} formatter={(v: any) => [`${v}/20`,'']}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* BOTTOM ROW */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

                {/* Distribución por tipo */}
                <Card>
                  <Lbl>Sesiones por tipo</Lbl>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:4 }}>
                    {Object.entries(stats!.typeDist).map(([type, count]) => {
                      const pct = Math.round((count/sessions.length)*100);
                      const colors: Record<string,string> = { forehand:C.blue, backhand:C.red, saque:C.green, mezcla:C.accent };
                      const labels: Record<string,string> = { forehand:'Forehand', backhand:'Backhand', saque:'Saque', mezcla:'Mezcla' };
                      const color = colors[type] || C.textSec;
                      return (
                        <div key={type}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                            <span style={{ fontSize:12, color:C.textSec }}>{labels[type]||type}</span>
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color }}>{count} <span style={{ color:C.textMut }}>({pct}%)</span></span>
                          </div>
                          <Bar2 pct={pct} color={color}/>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Mejor sesión */}
                <Card>
                  <Lbl>Mejor sesión del período</Lbl>
                  <div style={{ display:'flex', alignItems:'center', gap:12, margin:'8px 0 14px' }}>
                    <div style={{ position:'relative', width:56, height:56, flexShrink:0 }}>
                      <svg width="56" height="56" style={{ transform:'rotate(-90deg)' }}>
                        <circle cx="28" cy="28" r="23" fill="none" stroke={C.border} strokeWidth="3"/>
                        <circle cx="28" cy="28" r="23" fill="none" stroke={scoreColor(stats!.best.global_score)} strokeWidth="3"
                          strokeDasharray={`${(stats!.best.global_score/100)*144} 144`} strokeLinecap="round"/>
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:scoreColor(stats!.best.global_score) }}>{stats!.best.global_score}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:3, textTransform:'capitalize' }}>{stats!.best.session_type}</div>
                      <div style={{ fontSize:11, color:C.textSec }}>{new Date(stats!.best.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</div>
                      <div style={{ fontSize:11, color:C.textSec, marginTop:2, textTransform:'capitalize' }}>{stats!.best.nivel_general}</div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/report/${stats!.best.id}`)} style={{
                    width:'100%', padding:'8px', background:'none', border:`1px solid ${C.border}`, borderRadius:6,
                    color:C.textSec, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textSec; }}
                  >
                    Ver reporte completo →
                  </button>
                </Card>

                {/* Actividad */}
                <Card>
                  <Lbl>Actividad del período</Lbl>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats!.activity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                      <XAxis dataKey="date" tick={{ fontSize:9, fill:C.textMut }} tickLine={false}/>
                      <YAxis tick={{ fontSize:9, fill:C.textMut }} tickLine={false} axisLine={false} allowDecimals={false}/>
                      <Tooltip {...ttStyle} formatter={(v: any) => [v,'sesiones']}/>
                      <Bar dataKey="count" fill={C.accent} radius={[3,3,0,0]} opacity={0.8}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                    <div style={{ fontSize:11, color:C.textSec }}>Total período</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.accent }}>{sessions.length} sesiones</div>
                  </div>
                </Card>

              </div>
            </div>
          )}
        </main>

        <footer style={{ borderTop:`1px solid ${C.border}`, padding:'20px 32px', textAlign:'center', fontSize:11, color:C.textMut, fontFamily:"'DM Mono',monospace" }}>
          TennisAI © 2026 — Análisis biomecánico automático potenciado por IA
        </footer>
      </div>
    </>
  );
}
