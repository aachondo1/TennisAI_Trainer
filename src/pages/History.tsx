import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Session } from '../lib/supabase';
import { TrendingUp, TrendingDown, Filter, ArrowRight, Minus, Trash2 } from 'lucide-react';
import { C } from '../lib/theme';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeOut { from { opacity: 1; transform: translateY(0) scaleY(1); } to { opacity: 0; transform: translateY(-4px) scaleY(0.97); } }
  @keyframes spin    { to { transform: rotate(360deg); } }
`;

const scoreColor = (s: number) => {
  if (s >= 80) return C.accentDark;
  if (s >= 65) return C.blue;
  if (s >= 50) return C.amber;
  return C.red;
};

const SESSION_LABELS: Record<string, string> = {
  clase:    'Clase',
  paleteo:  'Paleteo',
  partido:  'Partido',
};

const FILTER_OPTIONS = [
  { value: 'all',     label: 'Todas'   },
  { value: 'clase',   label: 'Clase'   },
  { value: 'paleteo', label: 'Paleteo' },
  { value: 'partido', label: 'Partido' },
];

const s = {
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardLabel: {
    fontSize: 10, fontWeight: 600, color: C.textMut,
    textTransform: 'uppercase' as const, letterSpacing: '0.1em',
    fontFamily: "'DM Mono', monospace", marginBottom: 4,
  },
};

/* ─── SESSION ROW ────────────────────────────────────────────── */
function SessionRow({
  session,
  index,
  delta,
  onNavigate,
  onDelete,
}: {
  session: Session;
  index: number;
  delta: number | null;
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const score = session.global_score;
  const color = scoreColor(score);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(session.id);
  };

  return (
    <div
      onClick={() => !confirmDelete && onNavigate(session.id)}
      style={{
        ...s.card,
        display: 'flex', alignItems: 'center', gap: 20,
        cursor: confirmDelete ? 'default' : 'pointer',
        transition: 'border-color 0.15s, opacity 0.2s',
        animation: `fadeIn 0.3s ease ${index * 0.04}s both`,
        opacity: deleting ? 0.4 : 1,
        position: 'relative',
      }}
      onMouseEnter={e => { if (!confirmDelete) e.currentTarget.style.borderColor = C.borderHi; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
    >
      {/* Score ring */}
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke={C.border} strokeWidth="3" />
          <circle cx="26" cy="26" r="22" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 138} 138`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color }}>{score}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600 }}>
            {SESSION_LABELS[session.session_type] || session.session_type}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
            background: color + '18', color, border: `1px solid ${color}30`,
          }}>
            {session.nivel_general}
          </span>
          {delta !== null && (
            <span style={{
              fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 500,
              padding: '2px 6px', borderRadius: 3,
              background: delta >= 0 ? C.green + '20' : C.red + '20',
              color: delta >= 0 ? C.green : C.red,
            }}>
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.diagnostico_global || '—'}
        </div>
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: C.textSec }}>
          {new Date(session.actual_session_date ?? session.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>
          {new Date(session.actual_session_date ?? session.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Delete / Confirm / Arrow */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
      >
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: C.amber }}>¿Eliminar?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '5px 12px', borderRadius: 6,
                border: `1px solid ${C.red}`,
                background: C.red + '18', color: C.red,
                fontSize: 12, cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Mono', monospace",
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red + '35'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.red + '18'; }}
            >
              {deleting ? '...' : 'Sí'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '5px 12px', borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSec,
                fontSize: 12, cursor: 'pointer',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textMut,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              title="Eliminar sesión"
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.red + '12'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMut; e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={13} />
            </button>
            <ArrowRight size={14} color={C.textMut} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export function History() {
  const navigate = useNavigate();
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [filtered,    setFiltered]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterType,  setFilterType]  = useState('all');
  const [filterRacket, setFilterRacket] = useState<string | null>(null);
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    let result = sessions;

    // Filter by session type
    if (filterType !== 'all') {
      result = result.filter(s => s.session_type === filterType);
    }

    // Filter by racket
    if (filterRacket) {
      result = result.filter(s => s.equipment_used?.id === filterRacket);
    }

    // Filter by score range
    result = result.filter(s => s.global_score >= scoreRange[0] && s.global_score <= scoreRange[1]);

    // Filter by date range
    if (dateRange[0]) {
      const fromDate = new Date(dateRange[0]);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(s => new Date(s.created_at) >= fromDate);
    }
    if (dateRange[1]) {
      const toDate = new Date(dateRange[1]);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(s => new Date(s.created_at) <= toDate);
    }

    setFiltered(result);
  }, [filterType, filterRacket, scoreRange, dateRange, sessions]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
      setFiltered(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      // Optimistic update — remove from local state immediately
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Error eliminando sesión:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const avgScore = filtered.length
    ? Math.round(filtered.reduce((sum, s) => sum + s.global_score, 0) / filtered.length)
    : 0;

  const trend = () => {
    if (filtered.length < 2) return 0;
    const recent   = filtered.slice(0, 3).reduce((s, x) => s + x.global_score, 0) / Math.min(3, filtered.length);
    const older    = filtered.slice(3, 6);
    if (!older.length) return 0;
    const olderAvg = older.reduce((s, x) => s + x.global_score, 0) / older.length;
    return Math.round(recent - olderAvg);
  };

  const t = trend();

  // Get unique rackets from sessions
  const rackets = Array.from(
    new Map(
      sessions
        .filter(s => s.equipment_used?.id)
        .map(s => [s.equipment_used!.id, s.equipment_used!])
    ).values()
  );

  const hasActiveFilters = filterType !== 'all' || filterRacket !== null || scoreRange[0] > 0 || scoreRange[1] < 100 || dateRange[0] || dateRange[1];

  const clearFilters = () => {
    setFilterType('all');
    setFilterRacket(null);
    setScoreRange([0, 100]);
    setDateRange([null, null]);
  };

  if (loading) return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: C.textSec, fontSize: 13 }}>Cargando historial...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{fonts}</style>
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

          {/* TITLE */}
          <div style={{ marginBottom: 32, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Historial de sesiones</div>
            <div style={{ fontSize: 13, color: C.textSec }}>{sessions.length} sesiones registradas</div>
          </div>

          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
            <div style={s.card}>
              <div style={s.cardLabel}>Sesiones totales</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: C.textPri }}>{filtered.length}</div>
            </div>
            <div style={s.card}>
              <div style={s.cardLabel}>Score promedio</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: scoreColor(avgScore) }}>{avgScore}</div>
            </div>
            <div style={s.card}>
              <div style={s.cardLabel}>Tendencia</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: t > 0 ? C.green : t < 0 ? C.red : C.textSec }}>
                  {t > 0 ? '+' : ''}{t}
                </div>
                {t > 0 ? <TrendingUp size={20} color={C.green} /> : t < 0 ? <TrendingDown size={20} color={C.red} /> : <Minus size={20} color={C.textSec} />}
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Filter size={13} color={C.textMut} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textMut, textTransform: 'uppercase' }}>Filtros</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: 11,
                    color: C.amber,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {/* Filter UI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Session Type */}
              <div style={{ ...s.card, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, marginBottom: 8, textTransform: 'uppercase' }}>Tipo sesión</div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: C.surface,
                    color: C.textPri,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  {FILTER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Racket */}
              {rackets.length > 0 && (
                <div style={{ ...s.card, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, marginBottom: 8, textTransform: 'uppercase' }}>Raqueta</div>
                  <select
                    value={filterRacket ?? ''}
                    onChange={e => setFilterRacket(e.target.value || null)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      background: C.surface,
                      color: C.textPri,
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Todas</option>
                    {rackets.map(r => (
                      <option key={r.id} value={r.id}>{r.nickname || `${r.brand} ${r.model}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Score Range */}
              <div style={{ ...s.card, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, marginBottom: 8, textTransform: 'uppercase' }}>Score: {scoreRange[0]}-{scoreRange[1]}</div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoreRange[0]}
                  onChange={e => setScoreRange([Math.min(Number(e.target.value), scoreRange[1]), scoreRange[1]])}
                  style={{ width: '100%', marginBottom: 6 }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoreRange[1]}
                  onChange={e => setScoreRange([scoreRange[0], Math.max(Number(e.target.value), scoreRange[0])])}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Date Range */}
              <div style={{ ...s.card, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, marginBottom: 8, textTransform: 'uppercase' }}>Desde</div>
                <input
                  type="date"
                  value={dateRange[0] || ''}
                  onChange={e => setDateRange([e.target.value || null, dateRange[1]])}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: C.surface,
                    color: C.textPri,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>

              {/* Date To */}
              <div style={{ ...s.card, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMut, marginBottom: 8, textTransform: 'uppercase' }}>Hasta</div>
                <input
                  type="date"
                  value={dateRange[1] || ''}
                  onChange={e => setDateRange([dateRange[0], e.target.value || null])}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: C.surface,
                    color: C.textPri,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>
            </div>
          </div>

          {/* SESSION LIST */}
          {filtered.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎾</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                {filterType === 'all' ? 'Aún no tienes sesiones' : `No hay sesiones de tipo ${SESSION_LABELS[filterType]}`}
              </div>
              <div style={{ fontSize: 13, color: C.textSec, marginBottom: 20 }}>Sube un video para comenzar</div>
              <button onClick={() => navigate('/upload')} style={{
                padding: '10px 24px', background: C.accent, border: 'none', borderRadius: 8,
                color: '#0f1923', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Syne', sans-serif",
              }}>
                Subir video
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((session, i) => {
                const prevScore = filtered[i + 1]?.global_score;
                const delta     = prevScore !== undefined ? session.global_score - prevScore : null;
                return (
                  <SessionRow
                    key={session.id}
                    session={session}
                    index={i}
                    delta={delta}
                    onNavigate={id => navigate(`/report/${id}`)}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          )}
        </main>

        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px 32px', textAlign: 'center', fontSize: 11, color: C.textMut, fontFamily: "'DM Mono', monospace" }}>
          TennisAI © 2026 — Análisis biomecánico automático potenciado por IA
        </footer>
      </div>
    </>
  );
}
