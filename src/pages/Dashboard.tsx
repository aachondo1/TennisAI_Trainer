import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Session } from '../lib/supabase';
import { Trophy, Upload, LogOut, History, Loader2 } from 'lucide-react';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <nav className="border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-cyan-500" />
              <span className="text-2xl font-bold text-white">TennisAI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/history"
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <History className="w-5 h-5" />
                <span>Historial</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">
              Bienvenido, {user?.email?.split('@')[0]}
            </h1>
            <p className="text-gray-400 text-lg">
              Sube un video para analizar tu técnica de tenis
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Link
              to="/upload"
              className="group bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl p-8 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-white/10 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Nuevo Análisis</h2>
              <p className="text-cyan-50">
                Sube un video de tu juego y recibe un análisis detallado con IA
              </p>
            </Link>

            <Link
              to="/history"
              className="group bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-cyan-500 transition-all"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <History className="w-8 h-8 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Ver Historial</h2>
              <p className="text-gray-400">
                Revisa todos tus análisis anteriores y sigue tu progreso
              </p>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Análisis Recientes</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-400 text-lg">
                  Aún no tienes análisis. ¡Sube tu primer video para comenzar!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/report/${session.id}`}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400">
                        {new Date(session.created_at).toLocaleDateString('es-ES')}
                      </span>
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-medium rounded-full">
                        {getSessionTypeLabel(session.session_type)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-white mb-1">
                          {session.global_score}
                        </p>
                        <p className="text-sm text-gray-400">Score Global</p>
                      </div>
                      <div className={`px-3 py-1 ${getLevelColor(session.nivel_general)} text-white text-xs font-medium rounded-full`}>
                        {session.nivel_general}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
