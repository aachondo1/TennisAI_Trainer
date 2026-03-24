import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Session, ExercisePlan } from '../lib/supabase';
import { ArrowLeft, Trophy, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Sesión no encontrada</p>
          <Link to="/dashboard" className="text-cyan-500 hover:text-cyan-400">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      forehand: 'Forehand',
      backhand: 'Backhand',
      saque: 'Saque',
      mezcla: 'Mezcla',
    };
    return labels[type] || type;
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      principiante: 'bg-green-500',
      intermedio: 'bg-blue-500',
      avanzado: 'bg-orange-500',
      experto: 'bg-red-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const scoreEntries = Object.entries(session.scores_detalle || {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Dashboard
          </button>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Reporte de Análisis</h1>
                <div className="flex items-center gap-4 text-gray-400">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(session.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-sm font-medium rounded-full">
                    {getSessionTypeLabel(session.session_type)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <div className="w-48 h-48 mx-auto relative">
                  <svg className="transform -rotate-90 w-48 h-48">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-700"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(session.global_score / 100) * 553} 553`}
                      className={getScoreColor(session.global_score)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${getScoreColor(session.global_score)}`}>
                        {session.global_score}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">Score Global</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Nivel del Jugador</p>
                  <div className={`inline-block px-4 py-2 ${getLevelColor(session.nivel_general)} text-white font-semibold rounded-lg capitalize`}>
                    {session.nivel_general}
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Diagnóstico Global</p>
                  <p className="text-white text-lg leading-relaxed">
                    {session.diagnostico_global}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {scoreEntries.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Scores por Golpe</h2>
              <div className="space-y-4">
                {scoreEntries.map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-white font-medium capitalize">{key}</span>
                      <span className={`font-bold ${getScoreColor(value as number)}`}>
                        {value}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          (value as number) >= 80
                            ? 'bg-green-500'
                            : (value as number) >= 60
                            ? 'bg-blue-500'
                            : (value as number) >= 40
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-2xl font-bold text-white">Reporte Narrativo Completo</h2>
              {showFullReport ? (
                <ChevronUp className="w-6 h-6 text-gray-400" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-400" />
              )}
            </button>
            {showFullReport && (
              <div className="mt-6 text-gray-300 leading-relaxed whitespace-pre-line">
                {session.reporte_narrativo}
              </div>
            )}
          </div>

          {session.plan_ejercicios && Array.isArray(session.plan_ejercicios) && session.plan_ejercicios.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Plan de Ejercicios Semanal</h2>
              <div className="space-y-4">
                {(session.plan_ejercicios as ExercisePlan[]).map((plan, index) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3">{plan.dia}</h3>
                    <ul className="space-y-2">
                      {plan.ejercicios.map((ejercicio, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-300">
                          <Trophy className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                          <span>{ejercicio}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
