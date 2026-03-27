import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const C = {
  bg:      '#0a0c0e',
  border:  '#1e2328',
  accent:  '#b5f542',
  textPri: '#f0f2f4',
  textSec: '#7a8694',
};

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/history',   label: 'Historial'  },
  { path: '/upload',    label: '+ Analizar'  },
];

export function Navbar() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header style={{
      borderBottom: `1px solid ${C.border}`,
      padding: '0 32px',
      background: C.bg,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0c0e" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2C6 8 6 16 12 22" />
              <path d="M12 2C18 8 18 16 12 22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri, letterSpacing: '-0.02em' }}>
            Tennis<span style={{ color: C.accent }}>AI</span>
          </span>
        </button>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV_LINKS.map(link => {
            const active   = location.pathname === link.path;
            const isAction = link.label.startsWith('+');
            return (
              <button key={link.path} onClick={() => navigate(link.path)} style={{
                padding: isAction ? '7px 14px' : '7px 16px',
                borderRadius: 6,
                border: isAction ? 'none' : `1px solid ${active ? C.accent + '40' : 'transparent'}`,
                background: isAction ? C.accent : active ? C.accent + '10' : 'transparent',
                color: isAction ? '#0a0c0e' : active ? C.accent : C.textSec,
                fontSize: 13, fontWeight: isAction ? 700 : active ? 500 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: isAction ? "'Syne', sans-serif" : "'DM Sans', sans-serif",
              }}>
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Acciones derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

          {/* Perfil */}
          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', background: 'none',
              border: `1px solid ${location.pathname === '/profile' ? C.accent + '40' : 'transparent'}`,
              borderRadius: 6,
              color: location.pathname === '/profile' ? C.accent : C.textSec,
              fontSize: 12, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (location.pathname !== '/profile') {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.textPri;
              }
            }}
            onMouseLeave={e => {
              if (location.pathname !== '/profile') {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = C.textSec;
              }
            }}
          >
            <User size={13} />
            Perfil
          </button>

          {/* Separador */}
          <div style={{ width: 1, height: 16, background: C.border, margin: '0 4px' }} />

          {/* Salir */}
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', background: 'none',
              border: '1px solid transparent', borderRadius: 6,
              color: C.textSec, fontSize: 12, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textPri; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = C.textSec; }}
          >
            <LogOut size={13} />
            Salir
          </button>

        </div>
      </div>
    </header>
  );
}