import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { C } from '../lib/theme';

export function IncompleteProfileBanner({
  isDominantHandMissing,
  isEquipmentMissing,
}: {
  isDominantHandMissing?: boolean;
  isEquipmentMissing?: boolean;
}) {
  const navigate = useNavigate();

  // Don't show if nothing is missing
  if (!isDominantHandMissing && !isEquipmentMissing) {
    return null;
  }

  const missingItems: string[] = [];
  if (isDominantHandMissing) missingItems.push('mano dominante');
  if (isEquipmentMissing) missingItems.push('equipo');

  const handleClick = () => navigate('/profile');

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.amber}08 0%, ${C.amber}04 100%)`,
        border: `1px solid ${C.amber}30`,
        borderRadius: 10,
        padding: '12px 20px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <AlertCircle size={20} style={{ color: C.amber, flexShrink: 0 }} />

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPri }}>
          Completa tu perfil para análisis más precisos
        </div>
        <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
          Falta: {missingItems.join(' • ')}
        </div>
      </div>

      <button
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: C.amber,
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: C.textPri,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = C.amber;
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = C.amber;
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        Ir al perfil
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
