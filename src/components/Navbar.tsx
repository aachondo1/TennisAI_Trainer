import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { C } from '../lib/theme';

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/history',   label: 'Historial'  },
  { path: '/upload',    label: '+ Analizar'  },
];

export function Navbar() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut, isAdmin, isProfesor } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header style={{
      borderBottom: `1px solid ${C.border}`,
      padding: '0 32px',
      background: C.surface,
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f1923" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2C6 8 6 16 12 22" />
              <path d="M12 2C18 8 18 16 12 22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: C.textPri, letterSpacing: '-0.02em' }}>
            Tennis<span style={{ color: C.accentDark }}>AI</span>
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
                border: isAction ? 'none' : `1px solid ${active ? C.accentDark + '40' : 'transparent'}`,
                background: isAction ? C.accent : active ? C.accentDark + '10' : 'transparent',
                color: isAction ? '#0f1923' : active ? C.accentDark : C.textSec,
                fontSize: 13, fontWeight: isAction ? 700 : active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: isAction ? "'Syne', sans-serif" : "'DM Sans', sans-serif",
              }}
                onMouseEnter={e => { if (!active && !isAction) { e.currentTarget.style.color = C.textPri; e.currentTarget.style.background = C.panel; } }}
                onMouseLeave={e => { if (!active && !isAction) { e.currentTarget.style.color = C.textSec; e.currentTarget.style.background = 'transparent'; } }}
              >
                {link.label}
              </button>
            );
          })}
          {isProfesor && (
            <button onClick={() => navigate('/profesor')} style={{
              padding: '7px 16px', borderRadius: 6,
              border: `1px solid ${location.pathname.startsWith('/profesor') ? C.blue + '40' : 'transparent'}`,
              background: location.pathname.startsWith('/profesor') ? C.blue + '10' : 'transparent',
              color: location.pathname.startsWith('/profesor') ? C.blue : C.textSec,
              fontSize: 13, fontWeight: location.pathname.startsWith('/profesor') ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={e => { if (!location.pathname.startsWith('/profesor')) { e.currentTarget.style.color = C.blue; e.currentTarget.style.background = C.panel; } }}
              onMouseLeave={e => { if (!location.pathname.startsWith('/profesor')) { e.currentTarget.style.color = C.textSec; e.currentTarget.style.background = 'transparent'; } }}
            >
              Mis alumnos
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/admin')} style={{
              padding: '7px 16px', borderRadius: 6,
              border: `1px solid ${location.pathname === '/admin' ? C.red + '40' : 'transparent'}`,
              background: location.pathname === '/admin' ? C.red + '10' : 'transparent',
              color: location.pathname === '/admin' ? C.red : C.textSec,
              fontSize: 13, fontWeight: location.pathname === '/admin' ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={e => { if (location.pathname !== '/admin') { e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.panel; } }}
              onMouseLeave={e => { if (location.pathname !== '/admin') { e.currentTarget.style.color = C.textSec; e.currentTarget.style.background = 'transparent'; } }}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Acciones derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', background: 'none',
              border: `1px solid ${location.pathname === '/profile' ? C.accentDark + '40' : 'transparent'}`,
              borderRadius: 6,
              color: location.pathname === '/profile' ? C.accentDark : C.textSec,
              fontSize: 12, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (location.pathname !== '/profile') { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textPri; } }}
            onMouseLeave={e => { if (location.pathname !== '/profile') { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = C.textSec; } }}
          >
            <User size={13} />
            Perfil
          </button>

          <div style={{ width: 1, height: 16, background: C.border, margin: '0 4px' }} />

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
