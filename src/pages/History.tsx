import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, Session } from '../lib/supabase';
import { ArrowLeft, Filter, TrendingUp, Loader2 } from 'lucide-react';

export function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredSessions(sessions);
    } else {
      setFilteredSessions(sessions.filter((s) => s.session_type === filterType));
    }
  }, [filterType, sessions]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      setFilteredSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const calculateAverageScore = () => {
    if (filteredSessions.length === 0) return 0;
    const total = filteredSessions.reduce((sum, s) => sum + s.global_score, 0);
    return Math.round(total / filteredSessions.length);
  };

  const getScoreTrend = () => {
    if (filteredSessions.length < 2) return 0;
    const recent = filteredSessions.slice(0, 3);
    const older = filteredSessions.slice(3, 6);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, s) => sum + s.global_score, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.global_score, 0) / older.length;

    return Math.round(recentAvg - olderAvg);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Dashboard
          </button>

          <h1 className="text-4xl font-bold text-white mb-8">Historial de Sesiones</h1>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Total de Sesiones</p>
              <p className="text-3xl font-bold text-white">{filteredSessions.length}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Score Promedio</p>
              <p className={`text-3xl font-bold ${getScoreColor(calculateAverageScore())}`}>
                {calculateAverageScore()}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Tendencia</p>
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={`w-6 h-6 ${
                    getScoreTrend() >= 0 ? 'text-green-500' : 'text-red-500'
                  } ${getScoreTrend() < 0 ? 'rotate-180' : ''}`}
                />
                <span
                  className={`text-3xl font-bold ${
                    getScoreTrend() >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {Math.abs(getScoreTrend())}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">Filtrar por tipo:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'forehand', label: 'Forehand' },
                { value: 'backhand', label: 'Backhand' },
                { value: 'saque', label: 'Saque' },
                { value: 'mezcla', label: 'Mezcla' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterType === filter.value
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
              <p className="text-gray-400 text-lg">
                {filterType === 'all'
                  ? 'Aún no tienes sesiones. ¡Sube tu primer video!'
                  : 'No hay sesiones de este tipo.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/report/${session.id}`}
                  className="block bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-cyan-500 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-sm font-medium rounded-full">
                          {getSessionTypeLabel(session.session_type)}
                        </span>
                        <span className={`px-3 py-1 ${getLevelColor(session.nivel_general)} text-white text-sm font-medium rounded-full capitalize`}>
                          {session.nivel_general}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        {new Date(session.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-gray-300 line-clamp-2">{session.diagnostico_global}</p>
                    </div>
                    <div className="text-center md:text-right">
                      <p className={`text-4xl font-bold ${getScoreColor(session.global_score)}`}>
                        {session.global_score}
                      </p>
                      <p className="text-gray-400 text-sm">Score Global</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
