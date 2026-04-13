import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { C } from '../lib/theme';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

export function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqItems = [
    {
      q: '¿Qué dispositivos soportan?',
      a: 'Cualquier dispositivo con cámara: smartphone, tablet, cámara de seguridad o GoPro. Necesitas grabar en video MP4 en resolución 720p o superior.',
    },
    {
      q: '¿Cuánto tiempo tarda el análisis?',
      a: 'Típicamente 2-5 minutos dependiendo de la duración del video. Videos más largos toman más tiempo. Recibirás notificaciones en tiempo real del progreso.',
    },
    {
      q: '¿Puedo mejorar con estos análisis?',
      a: 'Sí, absolutamente. Los análisis incluyen planes de ejercicios personalizados. La clave es practicar consistentemente basándose en el feedback detallado.',
    },
    {
      q: '¿Mis videos están seguros?',
      a: 'Sí, todos los videos se almacenan de forma segura en servidores encriptados. Solo tú puedes acceder a tus análisis y reportes.',
    },
  ];

  const steps = [
    { num: '1', title: 'Sube tu video', desc: 'Graba tu sesión desde una posición fija 2m+ de distancia. Puede ser clase, paleteo o partido.' },
    { num: '2', title: 'IA analiza', desc: 'Nuestros agentes procesan +50 parámetros biomecánicos: velocidad, ángulos, posiciones y patrones.' },
    { num: '3', title: 'Recibe reporte', desc: 'Obtén análisis detallado con scores, diagnósticos y comparación con sesiones anteriores.' },
    { num: '4', title: 'Mejora tu juego', desc: 'Practica según los planes personalizados y sube más videos para ver tu progresión.' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: C.textPri }}>
      <style>{fonts}</style>

      {/* Navbar */}
      <nav style={{ padding: '20px 32px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textPri} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: C.textPri }}>
              Tennis<span style={{ color: C.accentDark }}>AI</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link to="/login" style={{ textDecoration: 'none', color: C.textSec, fontSize: 14, fontWeight: 500, transition: 'color 0.2s', cursor: 'pointer' }}>
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              style={{
                textDecoration: 'none',
                color: C.textPri,
                background: C.accent,
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '80px 32px', textAlign: 'center', animation: 'fadeIn 0.6s ease' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ width: 80, height: 80, background: C.accent + '18', borderRadius: 16, margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 2C6 8 6 16 12 22" /><path d="M12 2C18 8 18 16 12 22" /><line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, color: C.textPri }}>
            Analiza tu Tenis con IA
          </h1>

          <p style={{ fontSize: 16, color: C.textSec, marginBottom: 32, lineHeight: 1.6 }}>
            Mejora tu técnica con retroalimentación biomecánica en tiempo real. Nuestros agentes analizan tu golpe en detalle y te dan un plan personalizado.
          </p>

          <Link
            to="/register"
            style={{
              display: 'inline-block',
              color: C.textPri,
              background: C.accent,
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(181,245,66,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Comenzar ahora
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '80px 32px', background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, textAlign: 'center', marginBottom: 60, color: C.textPri }}>
            Cómo funciona
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ animation: `fadeIn 0.6s ease ${i * 0.1}s both` }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: C.accent + '20',
                    border: `2px solid ${C.accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.accentDark,
                    marginBottom: 16,
                  }}
                >
                  {step.num}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.textPri, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report Preview Section */}
      <section style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, textAlign: 'center', marginBottom: 48, color: C.textPri }}>
            Tu análisis completo
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div
                style={{
                  background: C.panel,
                  border: `2px dashed ${C.border}`,
                  borderRadius: 12,
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.textMut,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                }}
              >
                [Screenshot de Reportes aquí]
              </div>
            </div>

            <div>
              <p style={{ fontSize: 16, color: C.textSec, marginBottom: 20, lineHeight: 1.7 }}>
                Recibe un reporte detallado con métricas de tu técnica. Incluye scores específicos para forehand, backhand, saque y mezcla.
              </p>
              <p style={{ fontSize: 16, color: C.textSec, marginBottom: 24, lineHeight: 1.7 }}>
                Visualiza tu progresión en gráficos, compara con sesiones anteriores y obtén un plan de ejercicios personalizado para mejorar.
              </p>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Score global 0-100', 'Análisis por golpe', 'Métricas biomecánicas', 'Plan personalizado'].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.textSec }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: C.accent + '20', border: `1px solid ${C.accentDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.accentDark, fontWeight: 700 }}>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '80px 32px', background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, textAlign: 'center', marginBottom: 48, color: C.textPri }}>
            Preguntas frecuentes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqItems.map((item, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: openFaq === i ? C.accent + '10' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 600,
                    color: C.textPri,
                    transition: 'all 0.2s',
                  }}
                >
                  {item.q}
                  <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>

                {openFaq === i && (
                  <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}`, background: C.accent + '04', fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, marginBottom: 16, color: C.textPri }}>
            Comienza hoy
          </h2>
          <p style={{ fontSize: 16, color: C.textSec, marginBottom: 32 }}>
            Únete a jugadores que ya están mejorando su técnica con TennisAI.
          </p>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              color: C.textPri,
              background: C.accent,
              padding: '14px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(181,245,66,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 32px', borderTop: `1px solid ${C.border}`, background: C.surface, textAlign: 'center', color: C.textMut, fontSize: 12 }}>
        <p>&copy; 2024 TennisAI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
