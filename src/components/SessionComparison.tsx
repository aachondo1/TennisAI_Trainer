import React, { useState, useEffect } from 'react';
import { Session, supabase } from '../lib/supabase';
import { C } from '../lib/theme';
import {
  buildRadarDataForComparison,
  calculateGolpeDeltas,
  calculateDimensionDeltas,
  getComparisonSummary,
  type RadarDataPoint,
} from '../lib/comparison';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';
import { X, ArrowLeft } from 'lucide-react';

interface SessionComparisonProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  sessionList?: Session[];
}

type ComparisonMode = 'selector' | 'viewing';

// Utility to format session type
const formatSessionType = (type: string): string => {
  const types: Record<string, string> = {
    clase: 'Clase',
    paleteo: 'Paleteo',
    partido: 'Partido',
  };
  return types[type] || type;
};

// Utility to format date
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
};

// Score Ring Component - reused from Report.tsx pattern
const ScoreRing = ({ score, size = 80 }: { score: number; size?: number }) => {
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 8}
        fill="none"
        stroke={C.border}
        strokeWidth={2}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 8}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.35,
          fontWeight: 700,
          fill: C.textPri,
          fontFamily: "'DM Mono', monospace",
          transform: 'rotate(90deg)',
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
};

// SessionSelector Component
const SessionSelector = ({
  sessions,
  loading,
  onSelect,
  onCancel,
}: {
  sessions: Session[];
  loading: boolean;
  onSelect: (session1: Session, session2: Session) => void;
  onCancel: () => void;
}) => {
  const [selected1, setSelected1] = useState<Session | null>(null);
  const [selected2, setSelected2] = useState<Session | null>(null);

  const availableSessions1 = sessions.filter(s => s.id !== selected2?.id);
  const availableSessions2 = sessions.filter(s => s.id !== selected1?.id);

  const canCompare = selected1 && selected2 && selected1.id !== selected2.id;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      background: C.surface,
      borderRadius: 12,
      padding: 32,
      maxWidth: 500,
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: C.textPri,
      marginBottom: 24,
      fontFamily: "'Syne', sans-serif",
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: C.textSec,
      marginBottom: 8,
      display: 'block',
      fontFamily: "'DM Mono', monospace",
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      marginBottom: 24,
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      background: C.bg,
      color: C.textPri,
      fontSize: 13,
      fontFamily: "'DM Sans', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    buttonGroup: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-end',
    },
    button: {
      padding: '10px 20px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: 'none',
    },
    buttonCancel: {
      background: C.border,
      color: C.textPri,
    },
    buttonCompare: {
      background: C.accentDark,
      color: 'white',
      opacity: canCompare ? 1 : 0.5,
      cursor: canCompare ? 'pointer' : 'not-allowed',
    },
  };

  return (
    <div style={styles.overlay as React.CSSProperties}>
      <div style={styles.modal as React.CSSProperties}>
        <h2 style={styles.title}>Selecciona 2 sesiones para comparar</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textSec }}>
            Cargando sesiones...
          </div>
        ) : (
          <>
            <label style={styles.label}>
              Sesión 1 {selected1 && `• ${formatSessionType(selected1.session_type)} - ${selected1.global_score}`}
            </label>
            <select
              value={selected1?.id || ''}
              onChange={e => {
                const session = sessions.find(s => s.id === e.target.value);
                setSelected1(session || null);
              }}
              style={styles.select as React.CSSProperties}
            >
              <option value="">-- Selecciona una sesión --</option>
              {availableSessions1.map(session => (
                <option key={session.id} value={session.id}>
                  {formatSessionType(session.session_type)} • Score {session.global_score} • {formatDate(session.actual_session_date || session.created_at)}
                </option>
              ))}
            </select>

            <label style={styles.label}>
              Sesión 2 {selected2 && `• ${formatSessionType(selected2.session_type)} - ${selected2.global_score}`}
            </label>
            <select
              value={selected2?.id || ''}
              onChange={e => {
                const session = sessions.find(s => s.id === e.target.value);
                setSelected2(session || null);
              }}
              style={styles.select as React.CSSProperties}
            >
              <option value="">-- Selecciona una sesión --</option>
              {availableSessions2.map(session => (
                <option key={session.id} value={session.id}>
                  {formatSessionType(session.session_type)} • Score {session.global_score} • {formatDate(session.actual_session_date || session.created_at)}
                </option>
              ))}
            </select>

            <div style={styles.buttonGroup as React.CSSProperties}>
              <button style={{ ...styles.button, ...styles.buttonCancel } as React.CSSProperties} onClick={onCancel}>
                Cancelar
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonCompare } as React.CSSProperties}
                onClick={() => canCompare && onSelect(selected1!, selected2!)}
                disabled={!canCompare}
              >
                Comparar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ComparisonView Component
const ComparisonView = ({
  session1,
  session2,
  onBack,
  onClose,
}: {
  session1: Session;
  session2: Session;
  onBack: () => void;
  onClose: () => void;
}) => {
  const radarData = buildRadarDataForComparison(session1, session2);
  const golpeDeltas = calculateGolpeDeltas(session1, session2);
  const dimensionDeltas = calculateDimensionDeltas(session1, session2);
  const summary = getComparisonSummary(session1, session2);

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      background: C.surface,
      borderRadius: 12,
      maxWidth: 1200,
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    },
    header: {
      padding: '24px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerInfo: {
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      flex: 1,
    },
    sessionInfo: {
      fontSize: 13,
      color: C.textSec,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 4,
    },
    delta: {
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
    },
    deltaPositive: {
      color: C.green,
    },
    deltaNegative: {
      color: C.red,
    },
    content: {
      padding: '32px 24px',
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: C.textPri,
      marginBottom: 16,
      fontFamily: "'Syne', sans-serif",
    },
    radarContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 24,
      alignItems: 'center',
      marginBottom: 32,
    },
    scoreRingBox: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: 12,
    },
    scoreLabel: {
      fontSize: 12,
      color: C.textSec,
      textAlign: 'center' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: 24,
      fontSize: 13,
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left' as const,
      borderBottom: `1px solid ${C.border}`,
      color: C.textSec,
      fontWeight: 600,
      fontSize: 12,
      fontFamily: "'DM Mono', monospace",
    },
    td: {
      padding: '12px 8px',
      borderBottom: `1px solid ${C.border}`,
      color: C.textPri,
    },
    buttonGroup: {
      padding: '24px',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    button: {
      padding: '10px 16px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: 'none',
      background: 'transparent',
      color: C.textPri,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
  };

  const renderDelta = (delta: number, percentDelta: number) => {
    const sign = delta > 0 ? '+' : '';
    const isPositive = delta > 0;

    return (
      <div>
        <div style={{ ...styles.delta, ...(isPositive ? styles.deltaPositive : styles.deltaNegative) } as React.CSSProperties}>
          {sign}{Math.round(delta * 100) / 100}
        </div>
        <div style={{ fontSize: 11, color: C.textMut }}>
          {sign}{percentDelta.toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div style={styles.overlay as React.CSSProperties}>
      <div style={styles.modal as React.CSSProperties}>
        {/* Header */}
        <div style={styles.header as React.CSSProperties}>
          <div style={styles.headerInfo as React.CSSProperties}>
            <div>
              <div style={styles.sessionInfo as React.CSSProperties}>
                <span style={{ fontWeight: 600 }}>
                  {formatSessionType(session1.session_type)} • {session1.global_score}
                </span>
                <span>{formatDate(session1.actual_session_date || session1.created_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: C.textMut }}>DELTA</span>
              {renderDelta(summary.globalDelta, summary.globalPercentDelta)}
            </div>
            <div>
              <div style={styles.sessionInfo as React.CSSProperties}>
                <span style={{ fontWeight: 600 }}>
                  {formatSessionType(session2.session_type)} • {session2.global_score}
                </span>
                <span>{formatDate(session2.actual_session_date || session2.created_at)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSec,
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content as React.CSSProperties}>
          {/* Radar Section */}
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle}>Radar de dimensiones técnicas</h3>
            <div style={styles.radarContainer as React.CSSProperties}>
              <div style={styles.scoreRingBox as React.CSSProperties}>
                <ScoreRing score={session1.global_score} size={100} />
                <div style={styles.scoreLabel}>
                  {formatSessionType(session1.session_type)}
                </div>
              </div>

              <ResponsiveContainer width={300} height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: C.textSec }} />
                  <PolarRadiusAxis stroke="none" tick={false} domain={[0, 20]} />
                  <Radar
                    name="Sesión 1"
                    dataKey="session1_forehand"
                    stroke={C.blue}
                    fill={C.blue}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Sesión 2"
                    dataKey="session2_forehand"
                    stroke={C.red}
                    fill={C.red}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                    }}
                    formatter={(value: any) => (value !== null ? `${value}/20` : 'N/A')}
                  />
                </RadarChart>
              </ResponsiveContainer>

              <div style={styles.scoreRingBox as React.CSSProperties}>
                <ScoreRing score={session2.global_score} size={100} />
                <div style={styles.scoreLabel}>
                  {formatSessionType(session2.session_type)}
                </div>
              </div>
            </div>
          </div>

          {/* Golpes Table */}
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle}>Comparación por golpe</h3>
            <table style={styles.table as React.CSSProperties}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={styles.th}>Golpe</th>
                  <th style={styles.th}>S1</th>
                  <th style={styles.th}>S2</th>
                  <th style={styles.th}>Delta</th>
                  <th style={styles.th}>%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(golpeDeltas).map(([golpe, data]) => (
                  <tr key={golpe}>
                    <td style={{ ...styles.td as React.CSSProperties, fontWeight: 600 }}>
                      {golpe.charAt(0).toUpperCase() + golpe.slice(1)}
                    </td>
                    <td style={styles.td}>{data.score1}</td>
                    <td style={styles.td}>{data.score2}</td>
                    <td style={styles.td}>
                      <span style={data.delta > 0 ? { color: C.green } : { color: C.red }}>
                        {data.delta > 0 ? '+' : ''}{Math.round(data.delta * 100) / 100}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={data.percentDelta > 0 ? { color: C.green } : { color: C.red }}>
                        {data.percentDelta > 0 ? '+' : ''}{data.percentDelta.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dimensions Table */}
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle}>Análisis por dimensión técnica</h3>
            {Object.entries(dimensionDeltas).map(([golpe, dimensions]) => (
              <div key={golpe} style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 12, color: C.textSec, marginBottom: 8, textTransform: 'capitalize' }}>
                  {golpe}
                </h4>
                <table style={styles.table as React.CSSProperties}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={styles.th}>Dimensión</th>
                      <th style={styles.th}>S1</th>
                      <th style={styles.th}>S2</th>
                      <th style={styles.th}>Δ</th>
                      <th style={styles.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dimensions).map(([dimension, data]) => (
                      <tr key={`${golpe}-${dimension}`}>
                        <td style={styles.td}>{dimension}</td>
                        <td style={styles.td}>{Math.round(data.score1)}</td>
                        <td style={styles.td}>{Math.round(data.score2)}</td>
                        <td style={styles.td}>
                          <span style={data.delta > 0 ? { color: C.green, fontSize: 12 } : { color: C.red, fontSize: 12 }}>
                            {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={data.percentDelta > 0 ? { color: C.green, fontSize: 12 } : { color: C.red, fontSize: 12 }}>
                            {data.percentDelta > 0 ? '+' : ''}{data.percentDelta.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.buttonGroup as React.CSSProperties}>
          <button style={styles.button as React.CSSProperties} onClick={onBack}>
            <ArrowLeft size={16} />
            Atrás al selector
          </button>
          <button style={styles.button as React.CSSProperties} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export const SessionComparison = ({
  userId,
  isOpen,
  onClose,
  sessionList: initialSessionList,
}: SessionComparisonProps) => {
  const [mode, setMode] = useState<ComparisonMode>('selector');
  const [sessions, setSessions] = useState<Session[]>(initialSessionList || []);
  const [selectedSessions, setSelectedSessions] = useState<[Session | null, Session | null]>([null, null]);
  const [loading, setLoading] = useState(!initialSessionList);

  useEffect(() => {
    if (!isOpen) {
      setMode('selector');
      setSelectedSessions([null, null]);
      return;
    }

    if (!initialSessionList) {
      loadSessions();
    }
  }, [isOpen, initialSessionList]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('actual_session_date', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (session1: Session, session2: Session) => {
    setSelectedSessions([session1, session2]);
    setMode('viewing');
  };

  const handleBack = () => {
    setMode('selector');
    setSelectedSessions([null, null]);
  };

  if (!isOpen) return null;

  return (
    <>
      {mode === 'selector' ? (
        <SessionSelector
          sessions={sessions}
          loading={loading}
          onSelect={handleSelect}
          onCancel={onClose}
        />
      ) : selectedSessions[0] && selectedSessions[1] ? (
        <ComparisonView
          session1={selectedSessions[0]}
          session2={selectedSessions[1]}
          onBack={handleBack}
          onClose={onClose}
        />
      ) : null}
    </>
  );
};
