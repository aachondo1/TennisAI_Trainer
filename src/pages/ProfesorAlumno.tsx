import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C, ttStyle } from '../lib/theme';
import { ArrowLeft, Trash2, Send, MessageSquare, ExternalLink, AlertTriangle, FileDown } from 'lucide-react';
import { generateSessionPDF } from '../lib/pdfExport';

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
  nivel_general: string;
  equipment_bag: any[];
};

type Session = {
  id: string;
  session_type: string;
  global_score: number;
  nivel_general: string;
  created_at: string;
  comments: Comment[];
  commentDraft: string;
  submitting: boolean;
};

type Comment = {
  id: string;
  contenido: string;
  created_at: string;
  autor_name: string;
};

const scoreColor = (s: number) => {
  if (s >= 80) return C.accentDark;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export function ProfesorAlumno() {
  const { id: alumnoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alumno, setAlumno]   = useState<Alumno | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [exportingSessionId, setExportingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user && alumnoId) loadData();
  }, [user, alumnoId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAlumno(), loadSessions()]);
    setLoading(false);
  };

  const loadAlumno = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, nivel_general, equipment_bag')
      .eq('id', alumnoId)
      .maybeSingle();
    if (data) setAlumno(data);
  };

  const loadSessions = async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, session_type, global_score, nivel_general, created_at')
      .eq('user_id', alumnoId)
      .order('created_at', { ascending: false });

    if (!sessionsData) return;

    const sessionIds = sessionsData.map((s: any) => s.id);

    const { data: commentsData } = await supabase
      .from('session_comments')
      .select('id, session_id, contenido, created_at, autor_id, profiles(first_name, last_name, email)')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    const commentsMap: Record<string, Comment[]> = {};
    (commentsData ?? []).forEach((c: any) => {
      const p = c.profiles ?? {};
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Profesor';
      if (!commentsMap[c.session_id]) commentsMap[c.session_id] = [];
      commentsMap[c.session_id].push({ id: c.id, contenido: c.contenido, created_at: c.created_at, autor_name: name });
    });

    const mapped: Session[] = sessionsData.map((s: any) => ({
      id:            s.id,
      session_type:  s.session_type ?? '—',
      global_score:  s.global_score ?? 0,
      nivel_general: s.nivel_general ?? '—',
      created_at:    s.created_at,
      comments:      commentsMap[s.id] ?? [],
      commentDraft:  '',
      submitting:    false,
    }));

    setSessions(mapped);

    setChartData(
      [...sessionsData]
        .reverse()
        .map((s: any) => ({
          date:  new Date(s.actual_session_date ?? s.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
          score: s.global_score ?? 0,
        }))
    );
  };

  const handleCommentDraftChange = (sessionId: string, value: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, commentDraft: value } : s));
  };

  const handleSubmitComment = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.commentDraft.trim()) return;

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, submitting: true } : s));

    const { data, error } = await supabase
      .from('session_comments')
      .insert({ session_id: sessionId, autor_id: user.id, contenido: session.commentDraft.trim() })
      .select('id, contenido, created_at, autor_id')
      .single();

    if (!error && data) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const p = authorProfile ?? {};
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Profesor';

      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        commentDraft: '',
        submitting:   false,
        comments:     [...s.comments, { id: data.id, contenido: data.contenido, created_at: data.created_at, autor_name: name }],
      } : s));
    } else {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, submitting: false } : s));
    }
  };

  const handleRemoveAlumno = async () => {
    if (!user || !alumnoId) return;
    setRemoving(true);
    await supabase
      .from('profesor_alumnos')
      .delete()
      .eq('profesor_id', user.id)
      .eq('alumno_id', alumnoId);
    navigate('/profesor');
  };

  const handleExportPDF = async (sessionId: string) => {
    if (!user || !alumno) return;
    setExportingSessionId(sessionId);
    try {
      // Cargar datos completos de la sesión
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!sessionData) return;

      // Cargar datos del profesor
      const { data: profesorData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const profesor = profesorData ?? { first_name: '', last_name: '', email: user.email ?? '' };

      // Generar PDF
      await generateSessionPDF(sessionData, alumno, profesor);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setExportingSessionId(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{fonts}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!alumno) return null;

  const alumnoName = [alumno.first_name, alumno.last_name].filter(Boolean).join(' ') || alumno.email;
  const rackets: any[] = Array.isArray(alumno.equipment_bag) ? alumno.equipment_bag : [];
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.global_score, 0) / sessions.length)
    : 0;

  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px', animation: 'fadeIn 0.4s ease' }}>

          {/* Back */}
          <button onClick={() => navigate('/profesor')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.textSec, fontSize: 13, marginBottom: 24,
            fontFamily: "'DM Sans', sans-serif", padding: 0,
          }}>
            <ArrowLeft size={14} /> Volver a Mis Alumnos
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start' }}>

            {/* ── Columna izquierda: perfil ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card perfil */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '22px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: C.blue + '15', border: `1.5px solid ${C.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.blue }}>{initials(alumnoName)}</span>
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, textAlign: 'center' }}>{alumnoName}</div>
                  <div style={{ fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{alumno.email}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.panel, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: C.textSec }}>Nivel actual</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: C.accentDark }}>{alumno.nivel_general || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.panel, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: C.textSec }}>Sesiones totales</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: C.textPri }}>{sessions.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.panel, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: C.textSec }}>Score promedio</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: scoreColor(avgScore) }}>{avgScore || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Card raquetas */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Equipamiento</div>
                {rackets.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.textMut }}>Sin raquetas registradas</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rackets.map((r: any) => (
                      <div key={r.id} style={{ padding: '10px 12px', background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{r.nickname}</div>
                        <div style={{ fontSize: 11, color: C.textSec }}>{r.brand} {r.model}</div>
                        <div style={{ fontSize: 10, color: C.textMut, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{r.head_size}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón remover alumno */}
              {!confirmRemove ? (
                <button onClick={() => setConfirmRemove(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 14px', background: 'none',
                  border: `1px solid ${C.red}40`, borderRadius: 8,
                  color: C.red, fontSize: 12, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                  justifyContent: 'center',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.red + '08'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <Trash2 size={13} /> Remover de mi lista
                </button>
              ) : (
                <div style={{ background: C.red + '08', border: `1px solid ${C.red}30`, borderRadius: 8, padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                    <AlertTriangle size={13} color={C.red} />
                    <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>¿Confirmas esta acción?</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textSec, marginBottom: 12 }}>
                    Se eliminará a {alumnoName} de tu lista de alumnos. No se borra su cuenta ni sus sesiones.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmRemove(false)} style={{ flex: 1, padding: '8px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSec, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      Cancelar
                    </button>
                    <button onClick={handleRemoveAlumno} disabled={removing} style={{ flex: 1, padding: '8px', background: C.red, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: removing ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {removing ? '...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Columna derecha: gráfico + historial + comentarios ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Gráfico evolución */}
              {chartData.length > 1 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Evolución de score global</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMut, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.textMut, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip {...ttStyle} />
                      <Line type="monotone" dataKey="score" stroke={C.accentDark} strokeWidth={2.5} dot={{ fill: C.accentDark, r: 3.5 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Lista de sesiones con comentarios */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>Sesiones ({sessions.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>

                      {/* Header sesión */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace", padding: '2px 7px', borderRadius: 4, background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30` }}>
                              {s.session_type}
                            </span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color: scoreColor(s.global_score) }}>{s.global_score}</span>
                            <span style={{ fontSize: 11, color: C.textMut, textTransform: 'capitalize' }}>{s.nivel_general}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.textMut }}>{formatDate(s.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <a
                            href={`/report/${s.id}`} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 7, color: C.textSec, fontSize: 12, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Ver reporte <ExternalLink size={11} />
                          </a>
                          <button
                            onClick={() => handleExportPDF(s.id)}
                            disabled={exportingSessionId === s.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', background: exportingSessionId === s.id ? C.border : C.panel,
                              border: `1px solid ${C.border}`, borderRadius: 7,
                              color: exportingSessionId === s.id ? C.textMut : C.textSec,
                              fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                              cursor: exportingSessionId === s.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (exportingSessionId !== s.id) (e.currentTarget as HTMLElement).style.background = C.blue + '10'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.panel; }}
                          >
                            <FileDown size={11} /> {exportingSessionId === s.id ? '...' : 'PDF'}
                          </button>
                        </div>
                      </div>

                      {/* Comentarios */}
                      <div style={{ padding: '14px 18px' }}>
                        {s.comments.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                            {s.comments.map(c => (
                              <div key={c.id} style={{ padding: '10px 12px', background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 12, color: C.textPri, lineHeight: 1.5 }}>{c.contenido}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: C.accentDark, fontFamily: "'DM Mono', monospace" }}>{c.autor_name}</span>
                                  <span style={{ fontSize: 10, color: C.textMut }}>· {formatDate(c.created_at)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulario comentario */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MessageSquare size={13} color={C.textMut} style={{ flexShrink: 0 }} />
                            <textarea
                              placeholder="Escribe un comentario para esta sesión..."
                              value={s.commentDraft}
                              onChange={e => handleCommentDraftChange(s.id, e.target.value)}
                              rows={2}
                              style={{
                                flex: 1, padding: '9px 12px', background: C.panel,
                                border: `1.5px solid ${C.border}`, borderRadius: 8,
                                color: C.textPri, fontSize: 12, resize: 'none',
                                fontFamily: "'DM Sans', sans-serif", outline: 'none',
                                lineHeight: 1.5,
                              }}
                              onFocus={e => (e.target.style.borderColor = C.accentDark)}
                              onBlur={e => (e.target.style.borderColor = C.border)}
                            />
                          </div>
                          <button
                            onClick={() => handleSubmitComment(s.id)}
                            disabled={s.submitting || !s.commentDraft.trim()}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '9px 14px', background: s.submitting || !s.commentDraft.trim() ? C.border : C.accent,
                              border: 'none', borderRadius: 8,
                              color: s.submitting || !s.commentDraft.trim() ? C.textMut : '#0f1923',
                              fontSize: 12, fontWeight: 700,
                              fontFamily: "'Syne', sans-serif",
                              cursor: s.submitting || !s.commentDraft.trim() ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s', flexShrink: 0,
                            }}
                          >
                            <Send size={12} /> Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sessions.length === 0 && (
                    <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: C.textMut }}>Este alumno aún no tiene sesiones registradas</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
