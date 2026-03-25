import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Session } from '../lib/supabase';
import { ArrowLeft, Loader2, Info, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { LineChart, Line, RadarChart, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PolarAngleAxis, PolarGrid, PolarRadiusAxis } from 'recharts';

// Componente de Tooltip informatativo
const InfoTooltip = ({ title, description }: { title: string; description: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center justify-center w-5 h-5 text-slate-400 hover:text-cyan-400 focus:outline-none transition"
        title={title}
      >
        <Info className="w-4 h-4" />
      </button>
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 shadow-lg z-50 pointer-events-none">
          <p className="font-semibold text-cyan-400 mb-1">{title}</p>
          <p className="leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
};

export function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    score_global: true,
    forehand: true,
    backhand: true,
    saque: true,
  });

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      if (!id) {
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Sesión no encontrada</p>
      </div>
    );
  }

  const getLevelColor = (score: number) => {
    if (score <= 40) return 'from-red-500 to-red-600';
    if (score <= 60) return 'from-yellow-500 to-yellow-600';
    if (score <= 80) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-green-600';
  };

  const getLevelName = (score: number) => {
    if (score <= 40) return 'Principiante';
    if (score <= 60) return 'Intermedio';
    if (score <= 80) return 'Avanzado';
    return 'Experto';
  };

  const toggleLine = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  // Datos para gráficos (simulados para demo, en producción vendrían de la API)
  const historicalSessions = [
    { date: '27 Mar', score_global: 72, forehand: 75, backhand: 68, saque: 73 },
    { date: '25 Mar', score_global: 68, forehand: 70, backhand: 65, saque: 69 },
    { date: '20 Mar', score_global: 65, forehand: 67, backhand: 62, saque: 66 },
  ];

  const radarData = [
    { dimension: 'Prep', forehand: 16, backhand: 14, saque: 15 },
    { dimension: 'Impacto', forehand: 15, backhand: 13, saque: 15 },
    { dimension: 'Follow', forehand: 16, backhand: 14, saque: 14 },
    { dimension: 'Pies', forehand: 14, backhand: 12, saque: null },
    { dimension: 'Ritmo', forehand: 9, backhand: 8, saque: 8 },
    { dimension: 'Potencia', forehand: 5, backhand: 7, saque: 5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* HEADER */}


      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* SCORE GLOBAL HEADER */}
          <div className={`bg-gradient-to-br ${getLevelColor(session.global_score)} rounded-2xl p-8 shadow-2xl mb-8`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-gray-100 text-lg">Score Global</p>
                  <InfoTooltip
                    title="Score Global"
                    description="Promedio ponderado de tu técnica. 0-40 (Principiante), 41-60 (Intermedio), 61-80 (Avanzado), 81-100 (Experto)"
                  />
                </div>
                <div className="text-6xl font-bold">{session.global_score}/100</div>
                <p className="text-gray-100 text-xl mt-2 font-semibold">{getLevelName(session.global_score)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-100 text-sm mb-2">{new Date(session.created_at).toLocaleDateString('es-ES')}</p>
                <p className="text-gray-100 text-sm">{session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}</p>
              </div>
            </div>
          </div>

          {/* DIAGNÓSTICO */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Diagnóstico General</h3>
                <p className="text-gray-300 leading-relaxed">{session.diagnostico_global}</p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="mb-6">
            <div className="flex gap-2 bg-gray-800 p-1 rounded-xl border border-gray-700 overflow-x-auto">
              {[
                { id: 'overview', label: '📊 Resumen' },
                { id: 'scores', label: '🎯 Scores' },
                { id: 'evolution', label: '📈 Evolución' },
                { id: 'report', label: '📋 Reporte' },
                { id: 'exercises', label: '💪 Ejercicios' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                    activeTab === tab.id ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="space-y-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* SCORES CARDS */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {[
                    { name: 'Forehand', score: session.scores_detalle.forehand || 0, icon: '⬇️' },
                    { name: 'Backhand', score: session.scores_detalle.backhand || 0, icon: '⬆️' },
                    { name: 'Saque', score: session.scores_detalle.saque || 0, icon: '📤' },
                  ].map((golpe) => (
                    <div key={golpe.name} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{golpe.name}</h3>
                        <div className="text-3xl">{golpe.icon}</div>
                      </div>
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="44" fill="none" stroke="#374151" strokeWidth="4" />
                          <circle
                            cx="48"
                            cy="48"
                            r="44"
                            fill="none"
                            stroke={
                              golpe.score <= 40
                                ? '#ef4444'
                                : golpe.score <= 60
                                  ? '#eab308'
                                  : golpe.score <= 80
                                    ? '#06b6d4'
                                    : '#22c55e'
                            }
                            strokeWidth="4"
                            strokeDasharray={`${(golpe.score / 100) * 276} 276`}
                            className="transition-all duration-300"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{golpe.score}</div>
                            <div className="text-xs text-gray-400">/100</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RADAR CHART */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">Comparativa de Dimensiones</h3>
                    <InfoTooltip
                      title="Gráfico Radar"
                      description="Comparación visual de dimensiones técnicas en los 3 golpes. Áreas más grandes = mejor técnica."
                    />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid strokeDasharray="3 3" stroke="#4b5563" />
                      <PolarAngleAxis dataKey="dimension" stroke="#9ca3af" />
                      <PolarRadiusAxis stroke="#4b5563" domain={[0, 20]} />
                      <Radar name="Forehand" dataKey="forehand" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                      <Radar name="Backhand" dataKey="backhand" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
                      <Radar name="Saque" dataKey="saque" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* EVOLUTION TAB */}
            {activeTab === 'evolution' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Evolución de Scores</h3>
                  <InfoTooltip
                    title="Evolución"
                    description="Últimas sesiones. Usa los filtros para mostrar/ocultar líneas específicas."
                  />
                </div>

                {/* FILTROS */}
                <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <p className="text-sm font-semibold text-gray-300 mb-3">Mostrar/Ocultar:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'score_global', label: 'Score Global', color: '#06b6d4' },
                      { key: 'forehand', label: 'Forehand', color: '#60a5fa' },
                      { key: 'backhand', label: 'Backhand', color: '#ef4444' },
                      { key: 'saque', label: 'Saque', color: '#22c55e' },
                    ].map((line) => (
                      <button
                        key={line.key}
                        onClick={() => toggleLine(line.key as keyof typeof visibleLines)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                          visibleLines[line.key as keyof typeof visibleLines]
                            ? 'bg-gray-800 border-gray-600'
                            : 'bg-gray-900 border-gray-700 opacity-50'
                        }`}
                      >
                        {visibleLines[line.key as keyof typeof visibleLines] ? (
                          <Eye className="w-4 h-4" style={{ color: line.color }} />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium">{line.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO */}
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={historicalSessions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    <Legend />
                    {visibleLines.score_global && (
                      <Line
                        type="monotone"
                        dataKey="score_global"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        name="Score Global"
                        dot={{ fill: '#06b6d4', r: 5 }}
                      />
                    )}
                    {visibleLines.forehand && (
                      <Line
                        type="monotone"
                        dataKey="forehand"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        name="Forehand"
                        dot={{ fill: '#60a5fa', r: 4 }}
                      />
                    )}
                    {visibleLines.backhand && (
                      <Line
                        type="monotone"
                        dataKey="backhand"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Backhand"
                        dot={{ fill: '#ef4444', r: 4 }}
                      />
                    )}
                    {visibleLines.saque && (
                      <Line
                        type="monotone"
                        dataKey="saque"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Saque"
                        dot={{ fill: '#22c55e', r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* REPORT TAB */}
            {activeTab === 'report' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Reporte Narrativo</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{session.reporte_narrativo}</p>
                </div>
              </div>
            )}

            {/* EXERCISES TAB */}
            {activeTab === 'exercises' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6">
                  <p className="text-lg font-semibold mb-2">Plan de Entrenamiento</p>
                  <p className="text-purple-100">Enfócate en los ejercicios recomendados para mejorar tu técnica</p>
                </div>

                {session.plan_ejercicios && session.plan_ejercicios.length > 0 ? (
                  <div className="space-y-3">
                    {session.plan_ejercicios.map((plan, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedExercise(expandedExercise === idx ? null : idx)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition text-left"
                        >
                          <div>
                            <h4 className="font-bold">{plan.dia}</h4>
                          </div>
                          <ChevronDown className={`w-5 h-5 transition ${expandedExercise === idx ? 'rotate-180' : ''}`} />
                        </button>

                        {expandedExercise === idx && (
                          <div className="px-6 py-4 border-t border-gray-700 space-y-2">
                            {plan.ejercicios.map((ejercicio, eIdx) => (
                              <div key={eIdx} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="text-cyan-400 mt-1">•</span>
                                <span>{ejercicio}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                    <p className="text-gray-400">Plan de ejercicios no disponible</p>
                  </div>
                )}
              </div>
            )}

            {/* SCORES TAB */}
            {activeTab === 'scores' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6">Scores Detallados</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'Forehand', score: session.scores_detalle.forehand || 0 },
                    { name: 'Backhand', score: session.scores_detalle.backhand || 0 },
                    { name: 'Saque', score: session.scores_detalle.saque || 0 },
                  ].map((golpe) => (
                    <div key={golpe.name} className="bg-gray-900 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-2">{golpe.name}</p>
                      <p className="text-3xl font-bold text-cyan-400">{golpe.score}/100</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}