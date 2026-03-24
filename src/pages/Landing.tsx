import { Link } from 'react-router-dom';
import { Brain, BarChart3, Target, Trophy } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <nav className="container mx-auto px-6 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-8 h-8 text-cyan-500" />
            <span className="text-2xl font-bold text-white">TennisAI</span>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 text-white hover:text-cyan-400 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Mejora tu Tenis con
            <span className="text-cyan-500"> Inteligencia Artificial</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Analiza tu técnica, recibe diagnósticos profesionales y planes de entrenamiento
            personalizados impulsados por IA avanzada
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105"
          >
            Comenzar Ahora
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          Características Principales
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-cyan-500 transition-all">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
              <Brain className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Análisis con IA</h3>
            <p className="text-gray-400 leading-relaxed">
              Nuestra inteligencia artificial analiza cada aspecto de tu técnica con precisión profesional
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-cyan-500 transition-all">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
              <BarChart3 className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Reportes Detallados</h3>
            <p className="text-gray-400 leading-relaxed">
              Recibe scores específicos, diagnósticos y análisis completos de cada golpe
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-cyan-500 transition-all">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
              <Target className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Planes Personalizados</h3>
            <p className="text-gray-400 leading-relaxed">
              Obtén planes de ejercicios semanales diseñados específicamente para mejorar tus debilidades
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          Tipos de Análisis
        </h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-2">Forehand</h3>
            <p className="text-cyan-100">Analiza tu derecha en detalle</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-2">Backhand</h3>
            <p className="text-blue-100">Perfecciona tu revés</p>
          </div>
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-2">Saque</h3>
            <p className="text-teal-100">Potencia tu servicio</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-2">Mezcla</h3>
            <p className="text-emerald-100">Análisis completo de juego</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Comienza a Mejorar Hoy
          </h2>
          <p className="text-xl text-cyan-50 mb-8">
            Únete a cientos de jugadores que ya están mejorando su técnica con TennisAI
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white hover:bg-gray-100 text-cyan-600 text-lg font-semibold rounded-lg transition-all transform hover:scale-105"
          >
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 TennisAI. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
