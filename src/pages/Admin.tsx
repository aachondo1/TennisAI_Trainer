import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';
import { Users, BarChart2, Clock, TrendingUp, ChevronRight } from 'lucide-react';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  select option { background: #ffffff; color: #0f1923; }
`;

type Metric = { label: string; value: string | number; icon: React.ReactNode; color: string };
type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  session_count: number;
  avg_score: number;
};
type SessionRow = {
  id: string;
  session_type: string;
  global_score: number;
  nivel_general: string;
  created_at: string;
  user_email: string;
  user_name: string;
};

const TABS = [
  { id: 'metricas',  label: 'Métricas globales', Icon: BarChart2 },
  { id: 'usuarios',  label: 'Usuarios',           Icon: Users     },
  { id: 'sesiones',  label: 'Sesiones recientes', Icon: Clock     },
];

const ROLES = ['user', 'profesor', 'admin'];

const roleColor: Record<string, string> = {
  admin:    C.red,
  profesor: C.blue,
  user:     C.textMut,
};

const scoreColor = (s: number) => {
  if (s >= 80) return C.accentDark;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export function Admin() {
  const [activeTab, setActiveTab] = useState('metricas');
  const [metrics, setMetrics]     = useState<Metric[]>([]);
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [sessions, setSessions]   = useState<SessionRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadUsers(), loadSessions()]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    const [{ count: totalUsers }, { count: totalSessions }, { count: weekSessions }, { data: avgData }] =
      await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('sessions').select('global_score'),
      ]);

    const scores = (avgData ?? []).map((s: any) => s.global_score).filter((s: any) => s != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    setMetrics([
      { label: 'Total usuarios',       value: totalUsers ?? 0,    icon: <Users size={18} />,     color: C.blue },
      { label: 'Total sesiones',        value: totalSessions ?? 0, icon: <BarChart2 size={18} />, color: C.accentDark },
      { label: 'Sesiones esta semana',  value: weekSessions ?? 0,  icon: <Clock size={18} />,     color: C.amber },
      { label: 'Score promedio global', value: avgScore,           icon: <TrendingUp size={18} />,color: C.green },
    ]);
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at')
      .order('created_at', { ascending: false });

    if (!profiles) return;

    const { data: sessionCounts } = await supabase
      .from('sessions')
      .select('user_id, global_score');

    const countMap: Record<string, number> = {};
    const scoreMap: Record<string, number[]> = {};
    (sessionCounts ?? []).forEach((s: any) => {
      countMap[s.user_id] = (countMap[s.user_id] ?? 0) + 1;
      if (s.global_score != null) {
        if (!scoreMap[s.user_id]) scoreMap[s.user_id] = [];
        scoreMap[s.user_id].push(s.global_score);
      }
    });

    setUsers(profiles.map((p: any) => ({
      id:            p.id,
      email:         p.email ?? '',
      first_name:    p.first_name ?? '',
      last_name:     p.last_name ?? '',
      role:          p.role ?? 'user',
      created_at:    p.created_at,
      session_count: countMap[p.id] ?? 0,
      avg_score: scoreMap[p.id]?.length
        ? Math.round(scoreMap[p.id].reduce((a, b) => a + b, 0) / scoreMap[p.id].length)
        : 0,
    })));
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('id, session_type, global_score, nivel_general, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    const userIds = [...new Set(data.map((s: any) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    setSessions(data.map((s: any) => {
      const p = profileMap[s.user_id] ?? {};
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
      return {
        id:            s.id,
        session_type:  s.session_type ?? '—',
        global_score:  s.global_score ?? 0,
        nivel_general: s.nivel_general ?? '—',
        created_at:    s.created_at,
        user_email:    p.email ?? '—',
        user_name:     name,
      };
    }));
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setUpdatingRole(null);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{fonts}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accentDark}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px', animation: 'fadeIn 0.4s ease' }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.red, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Panel Admin</span>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700 }}>Administración</div>
            <div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>Gestión global de usuarios, sesiones y métricas de la plataforma</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 18px', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${C.accentDark}` : '2px solid transparent',
                  color: active ? C.accentDark : C.textSec,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer', transition: 'all 0.15s',
                  marginBottom: -1,
                }}>
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* TAB 1 — Métricas */}
          {activeTab === 'metricas' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {metrics.map((m, i) => (
                  <div key={i} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '20px 22px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: m.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                        {m.icon}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 700, color: C.textPri, lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
                    <div style={{ fontSize: 12, color: C.textSec }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2 — Usuarios */}
          {activeTab === 'usuarios' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.panel }}>
                      {['Nombre', 'Email', 'Rol', 'Registro', 'Sesiones', 'Score prom.'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
                      return (
                        <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.panel)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPri, fontWeight: 500 }}>{name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSec, fontFamily: "'DM Mono', monospace" }}>{u.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <select
                              value={u.role}
                              disabled={updatingRole === u.id}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                fontFamily: "'DM Mono', monospace", cursor: 'pointer',
                                background: (roleColor[u.role] ?? C.textMut) + '15',
                                color: roleColor[u.role] ?? C.textMut,
                                border: `1px solid ${(roleColor[u.role] ?? C.textMut)}40`,
                                appearance: 'none', textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSec }}>{formatDate(u.created_at)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPri, fontFamily: "'DM Mono', monospace" }}>{u.session_count}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {u.avg_score > 0 ? (
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: scoreColor(u.avg_score) }}>{u.avg_score}</span>
                            ) : (
                              <span style={{ fontSize: 12, color: C.textMut }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3 — Sesiones recientes */}
          {activeTab === 'sesiones' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.panel }}>
                      {['Usuario', 'Tipo', 'Score', 'Nivel', 'Fecha', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.panel)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.textPri }}>{s.user_name}</div>
                          <div style={{ fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>{s.user_email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Mono', monospace", padding: '3px 7px', borderRadius: 4, background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30` }}>
                            {s.session_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: scoreColor(s.global_score) }}>{s.global_score}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSec, textTransform: 'capitalize' }}>{s.nivel_general}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSec }}>{formatDate(s.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link to={`/report/${s.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.blue, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                            Ver <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
