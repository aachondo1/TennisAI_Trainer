import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/theme';
import { Users, Plus, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { RankingsTable, type RankingRow } from '../components/RankingsTable';
import { RegressionAlerts, type RegressionAlert } from '../components/RegressionAlerts';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

type Alumno = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  session_count: number;
  avg_score: number;
  last_session: string | null;
};

type ActivityItem = {
  session_id: string;
  alumno_id: string;
  alumno_name: string;
  session_type: string;
  global_score: number;
  nivel_general: string;
  created_at: string;
};

type SortConfig = {
  key: keyof RankingRow;
  direction: 'asc' | 'desc';
};

const scoreColor = (s: number) => {
  if (s >= 80) return C.accentDark;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

const nivelColor = (n: string) => {
  if (n === 'experto')      return C.accentDark;
  if (n === 'avanzado')     return C.blue;
  if (n === 'intermedio')   return C.amber;
  return C.textMut;
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return 'hace un momento';
  if (diff < 3600)      return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400)     return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800)    return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// Helper functions for rankings and alerts
const calculateDaysSince = (dateStr: string | null): number => {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

const getSessionsInLast30Days = (sessions: any[]): number => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return sessions.filter(s => new Date(s.created_at) > thirtyDaysAgo).length;
};

const calculateRankingData = (alumno: Alumno, sessions: any[]): RankingRow => {
  const sorted = [...sessions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.global_score, 0) / sessions.length * 10) / 10
    : 0;

  const lastScore = sorted[0]?.global_score ?? null;
  const secondLastScore = sorted[1]?.global_score ?? null;
  const delta = lastScore !== null && secondLastScore !== null
    ? Math.round((lastScore - secondLastScore) * 10) / 10
    : null;

  return {
    id: alumno.id,
    first_name: alumno.first_name,
    last_name: alumno.last_name,
    avgScore,
    lastSessionScore: lastScore,
    secondLastScore,
    delta,
    sessionsLast30Days: getSessionsInLast30Days(sessions),
    lastSessionDate: sorted[0]?.created_at ?? null,
    daysSinceLastSession: calculateDaysSince(sorted[0]?.created_at ?? null),
  };
};

const calculateRegressionAlerts = (alumno: Alumno, sessions: any[]): RegressionAlert | null => {
  const sorted = [...sessions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const lastScore = sorted[0]?.global_score ?? null;
  const secondLastScore = sorted[1]?.global_score ?? null;
  const lastSessionDate = sorted[0]?.created_at ?? null;
  const daysSinceLastSession = calculateDaysSince(lastSessionDate);

  // Alert: drop >5 puntos
  if (lastScore !== null && secondLastScore !== null && secondLastScore - lastScore > 5) {
    return {
      alumnoId: alumno.id,
      firstName: alumno.first_name,
      lastName: alumno.last_name,
      type: 'drop',
      severity: 'high',
      lastScore,
      previousScore: secondLastScore,
    };
  }

  // Alert: inactivo >14 días
  if (daysSinceLastSession > 14 && sessions.length > 0) {
    return {
      alumnoId: alumno.id,
      firstName: alumno.first_name,
      lastName: alumno.last_name,
      type: 'inactive',
      severity: 'medium',
      daysSinceLastSession,
    };
  }

  return null;
};

export function Profesor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alumnos, setAlumnos]       = useState<Alumno[]>([]);
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [rankingData, setRankingData] = useState<RankingRow[]>([]);
  const [regressionAlerts, setRegressionAlerts] = useState<RegressionAlert[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [addError, setAddError]     = useState('');
  const [adding, setAdding]         = useState(false);
  const [activeTab, setActiveTab]   = useState<'general' | 'rankings'>('general');

  useEffect(() => {
    if (user) {
      loadAlumnos();
      loadActivity();
    }
  }, [user]);

  const loadAlumnos = async () => {
    if (!user) return;
    setLoadingAlumnos(true);
    const { data: links } = await supabase
      .from('profesor_alumnos')
      .select('alumno_id')
      .eq('profesor_id', user.id);

    if (!links || links.length === 0) {
      setAlumnos([]);
      setRankingData([]);
      setRegressionAlerts([]);
      setLoadingAlumnos(false);
      return;
    }

    const ids = links.map((l: any) => l.alumno_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', ids);

    // Get ALL sessions (no limit) for comprehensive ranking calculations
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('user_id, global_score, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false });

    const countMap: Record<string, number>    = {};
    const scoreMap: Record<string, number[]>  = {};
    const lastMap:  Record<string, string>    = {};
    const sessionMap: Record<string, any[]>   = {};

    (sessionData ?? []).forEach((s: any) => {
      countMap[s.user_id] = (countMap[s.user_id] ?? 0) + 1;
      if (s.global_score != null) {
        if (!scoreMap[s.user_id]) scoreMap[s.user_id] = [];
        scoreMap[s.user_id].push(s.global_score);
      }
      if (!lastMap[s.user_id]) lastMap[s.user_id] = s.created_at;

      // Store all sessions for ranking calculations
      if (!sessionMap[s.user_id]) sessionMap[s.user_id] = [];
      sessionMap[s.user_id].push(s);
    });

    const alumnosData = (profiles ?? []).map((p: any) => ({
      id:            p.id,
      email:         p.email ?? '',
      first_name:    p.first_name ?? '',
      last_name:     p.last_name ?? '',
      session_count: countMap[p.id] ?? 0,
      avg_score: scoreMap[p.id]?.length
        ? Math.round(scoreMap[p.id].reduce((a, b) => a + b, 0) / scoreMap[p.id].length)
        : 0,
      last_session: lastMap[p.id] ?? null,
    }));

    setAlumnos(alumnosData);

    // Calculate rankings and alerts
    const rankingRows: RankingRow[] = [];
    const alerts: RegressionAlert[] = [];

    alumnosData.forEach((alumno) => {
      const alumnoSessions = sessionMap[alumno.id] ?? [];

      if (alumnoSessions.length > 0) {
        const ranking = calculateRankingData(alumno, alumnoSessions);
        rankingRows.push(ranking);

        const alert = calculateRegressionAlerts(alumno, alumnoSessions);
        if (alert) alerts.push(alert);
      }
    });

    setRankingData(rankingRows);
    setRegressionAlerts(alerts);
    setLoadingAlumnos(false);
  };

  const loadActivity = async () => {
    if (!user) return;
    setLoadingActivity(true);
    const { data: links } = await supabase
      .from('profesor_alumnos')
      .select('alumno_id')
      .eq('profesor_id', user.id);

    if (!links || links.length === 0) { setActivity([]); setLoadingActivity(false); return; }

    const ids = links.map((l: any) => l.alumno_id);
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, user_id, session_type, global_score, nivel_general, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!sessions) { setActivity([]); setLoadingActivity(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', ids);

    const pMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { pMap[p.id] = p; });

    setActivity(sessions.map((s: any) => {
      const p = pMap[s.user_id] ?? {};
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
      return {
        session_id:    s.id,
        alumno_id:     s.user_id,
        alumno_name:   name,
        session_type:  s.session_type ?? '—',
        global_score:  s.global_score ?? 0,
        nivel_general: s.nivel_general ?? '—',
        created_at:    s.created_at,
      };
    }));
    setLoadingActivity(false);
  };

  const handleAddAlumno = async () => {
    if (!user || !emailInput.trim()) return;
    setAdding(true);
    setAddError('');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailInput.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      setAddError('Usuario no encontrado. Verifica el email ingresado.');
      setAdding(false);
      return;
    }

    const { data: existing } = await supabase
      .from('profesor_alumnos')
      .select('id')
      .eq('profesor_id', user.id)
      .eq('alumno_id', profile.id)
      .maybeSingle();

    if (existing) {
      setAddError('Este alumno ya está en tu lista.');
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from('profesor_alumnos')
      .insert({ profesor_id: user.id, alumno_id: profile.id });

    if (error) {
      setAddError('Error al agregar alumno. Intenta de nuevo.');
      setAdding(false);
      return;
    }

    setEmailInput('');
    await loadAlumnos();
    await loadActivity();
    setAdding(false);
  };

  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px', animation: 'fadeIn 0.4s ease' }}>

          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Panel Profesor</span>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700 }}>Mis Alumnos</div>
            <div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>Gestiona tu lista de alumnos y sigue su progreso técnico</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={() => setActiveTab('general')}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'general' ? C.accent : C.textMut,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 4px',
                paddingBottom: 8,
                borderBottom: activeTab === 'general' ? `2px solid ${C.accent}` : 'none',
                transition: 'all 0.15s',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Vista General
            </button>
            <button
              onClick={() => setActiveTab('rankings')}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'rankings' ? C.accent : C.textMut,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 4px',
                paddingBottom: 8,
                borderBottom: activeTab === 'rankings' ? `2px solid ${C.accent}` : 'none',
                transition: 'all 0.15s',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Rankings
            </button>
          </div>

          {/* Vista General */}
          {activeTab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

            {/* Columna izquierda — Lista de alumnos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Users size={15} color={C.blue} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15 }}>Alumnos activos</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '2px 7px', borderRadius: 4, background: C.blue + '15', color: C.blue }}>{alumnos.length}</span>
              </div>

              {loadingAlumnos ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ height: 80, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, opacity: 0.6 }} />
                  ))}
                </div>
              ) : alumnos.length === 0 ? (
                <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
                  <Users size={28} color={C.textMut} style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>Aún no tienes alumnos</div>
                  <div style={{ fontSize: 12, color: C.textMut }}>Agrega tu primer alumno con el formulario a la derecha</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alumnos.map(a => {
                    const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
                    return (
                      <div key={a.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.blue + '60'; (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${C.blue}10`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.blue + '15', border: `1px solid ${C.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.blue }}>{initials(name)}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.textPri, marginBottom: 2 }}>{name}</div>
                          <div style={{ fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>{a.email}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: C.textSec }}><b style={{ color: C.textPri }}>{a.session_count}</b> sesiones</span>
                            {a.avg_score > 0 && (
                              <span style={{ fontSize: 11, color: scoreColor(a.avg_score), fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>~{a.avg_score} prom.</span>
                            )}
                            {a.last_session && (
                              <span style={{ fontSize: 11, color: C.textMut }}>última: {timeAgo(a.last_session)}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => navigate(`/profesor/alumno/${a.id}`)} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '7px 14px', background: C.blue + '10',
                          border: `1px solid ${C.blue}40`, borderRadius: 7,
                          color: C.blue, fontSize: 12, fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                          transition: 'all 0.15s', flexShrink: 0,
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.blue + '20'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.blue + '10'; }}
                        >
                          Ver historial <ChevronRight size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Formulario agregar alumno */}
              <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Plus size={14} color={C.accentDark} />
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, color: C.textPri }}>Agregar alumno</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="email@alumno.com"
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setAddError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddAlumno()}
                    style={{
                      flex: 1, padding: '10px 13px', background: C.panel,
                      border: `1.5px solid ${addError ? C.red : C.border}`,
                      borderRadius: 8, color: C.textPri, fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif", outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddAlumno}
                    disabled={adding || !emailInput.trim()}
                    style={{
                      padding: '10px 18px', background: adding || !emailInput.trim() ? C.border : C.accent,
                      border: 'none', borderRadius: 8,
                      color: adding || !emailInput.trim() ? C.textMut : '#0f1923',
                      fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700,
                      cursor: adding || !emailInput.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {adding ? '...' : 'Agregar'}
                  </button>
                </div>
                {addError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '8px 12px', background: C.red + '10', border: `1px solid ${C.red}30`, borderRadius: 7 }}>
                    <AlertCircle size={13} color={C.red} />
                    <span style={{ fontSize: 12, color: C.red }}>{addError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha — Actividad reciente */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={15} color={C.amber} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15 }}>Actividad reciente</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {loadingActivity ? (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ height: 50, borderRadius: 8, background: C.panel }} />)}
                  </div>
                ) : activity.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: C.textMut }}>Sin actividad reciente</div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {activity.map((item, i) => (
                      <button
                        key={item.session_id}
                        onClick={() => navigate(`/report/${item.session_id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '12px 16px', background: 'none',
                          border: 'none', borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : 'none',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.panel)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: C.blue + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: C.blue }}>{initials(item.alumno_name)}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.alumno_name}</div>
                          <div style={{ fontSize: 11, color: C.textMut }}>
                            <span style={{ textTransform: 'capitalize' }}>{item.session_type}</span>
                            {' · '}{timeAgo(item.created_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: scoreColor(item.global_score) }}>{item.global_score}</div>
                          <div style={{ fontSize: 10, color: nivelColor(item.nivel_general), textTransform: 'capitalize' }}>{item.nivel_general}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
          )}

          {/* Vista Rankings */}
          {activeTab === 'rankings' && (
          <div>
            <RegressionAlerts
              alerts={regressionAlerts}
              onAlumnoClick={(alumnoId) => navigate(`/profesor/alumno/${alumnoId}`)}
            />

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>
                Tabla de Rankings
              </h3>
              {loadingAlumnos ? (
                <div style={{ padding: '32px', textAlign: 'center', color: C.textMut }}>
                  Cargando datos...
                </div>
              ) : (
                <RankingsTable
                  data={rankingData}
                  onRowClick={(alumnoId) => navigate(`/profesor/alumno/${alumnoId}`)}
                />
              )}
            </div>
          </div>
          )}

        </main>
      </div>
    </>
  );
}
