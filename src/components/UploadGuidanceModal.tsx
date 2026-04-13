import { useEffect } from 'react';
import { X } from 'lucide-react';
import { C } from '../lib/theme';

export function UploadGuidanceModal({
  onContinue,
  onDismiss,
}: {
  onContinue: () => void;
  onDismiss: () => void;
}) {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 12,
          maxWidth: 520,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.textMut,
            zIndex: 201,
          }}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div style={{ padding: '32px 32px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPri, marginBottom: 24, fontFamily: "'Syne',sans-serif" }}>
            Guía de Grabación
          </h2>

          {/* Section 1: Camera Position */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, marginBottom: 12, fontFamily: "'Syne',sans-serif" }}>
              Posición de Cámara
            </h3>
            <p style={{ fontSize: 13, color: C.textSec, marginBottom: 14, lineHeight: '1.6' }}>
              Coloca la cámara 2m+ de distancia, a la altura aproximada de la red. Esto permite capturar todo tu cuerpo y el movimiento de la pelota.
            </p>

            {/* Court diagram placeholder */}
            <div
              style={{
                background: C.panel,
                border: `2px dashed ${C.border}`,
                borderRadius: 8,
                padding: 24,
                textAlign: 'center',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="120" height="80" viewBox="0 0 120 80">
                {/* Court lines */}
                <rect x="10" y="10" width="100" height="60" fill="none" stroke={C.accentDark} strokeWidth="2" />
                {/* Net */}
                <line x1="10" y1="40" x2="110" y2="40" stroke={C.amber} strokeWidth="2" strokeDasharray="4,4" />
                {/* Camera position marker */}
                <circle cx="60" cy="68" r="5" fill={C.blue} />
                <text x="60" y="78" fontSize="8" textAnchor="middle" fill={C.blue} fontWeight="600">
                  CAM
                </text>
              </svg>
            </div>
          </div>

          {/* Section 2: Checklist */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, marginBottom: 12, fontFamily: "'Syne',sans-serif" }}>
              Requisitos de Calidad
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                '✓ Cámara fija (sin movimiento durante el video)',
                '✓ Iluminación clara de los impactos',
                '✓ Seguimiento completo de la pelota',
                '✓ Audio claro de los impactos',
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: C.textSec,
                  }}
                >
                  <span style={{ color: C.accentDark, fontWeight: 700 }}>✓</span>
                  {item.replace('✓ ', '')}
                </div>
              ))}
            </div>
          </div>

          {/* No mostrar de nuevo checkbox */}
          <div style={{ marginTop: 24, paddingTop: 16, marginBottom: 20, borderTop: `1px solid ${C.border}` }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 12,
                color: C.textSec,
              }}
            >
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    localStorage.setItem('uploadGuideShown', 'true');
                  } else {
                    localStorage.removeItem('uploadGuideShown');
                  }
                }}
                style={{
                  cursor: 'pointer',
                  width: 16,
                  height: 16,
                  accentColor: C.accentDark,
                }}
              />
              No mostrar de nuevo
            </label>
          </div>

          {/* CTA Button */}
          <button
            onClick={onContinue}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: C.accent,
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: C.textPri,
              cursor: 'pointer',
              fontFamily: "'Syne',sans-serif",
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(181,245,66,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
}
