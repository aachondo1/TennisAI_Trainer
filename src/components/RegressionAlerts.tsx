import React from 'react';
import { TrendingDown, Calendar } from 'lucide-react';
import { C } from '../lib/theme';

export type RegressionAlert = {
  alumnoId: string;
  firstName: string;
  lastName: string;
  type: 'drop' | 'inactive';
  severity: 'high' | 'medium';
  lastScore?: number;
  previousScore?: number;
  daysSinceLastSession?: number;
};

interface RegressionAlertsProps {
  alerts: RegressionAlert[];
  onAlumnoClick?: (alumnoId: string) => void;
}

export const RegressionAlerts: React.FC<RegressionAlertsProps> = ({ alerts, onAlumnoClick }) => {
  if (alerts.length === 0) return null;

  const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
  const mediumSeverityAlerts = alerts.filter(a => a.severity === 'medium');

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Syne', sans-serif" }}>
        ⚠️ Alertas de Regresión
      </div>

      {/* High severity alerts - Regresiones de score */}
      {highSeverityAlerts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {highSeverityAlerts.map((alert) => (
            <div
              key={`${alert.alumnoId}-drop`}
              onClick={() => onAlumnoClick?.(alert.alumnoId)}
              style={{
                background: C.red + '15',
                border: `1.5px solid ${C.red}`,
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 8,
                cursor: onAlumnoClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onAlumnoClick) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = C.red + '25';
                  el.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = C.red + '15';
                el.style.transform = 'translateX(0)';
              }}
            >
              <TrendingDown size={16} color={C.red} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>
                  {alert.firstName} {alert.lastName}
                </div>
                <div style={{ fontSize: 11, color: C.red, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                  Bajó {Math.abs(alert.previousScore! - alert.lastScore!)} pts ({alert.lastScore} vs {alert.previousScore})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medium severity alerts - Inactividad */}
      {mediumSeverityAlerts.length > 0 && (
        <div>
          {mediumSeverityAlerts.map((alert) => (
            <div
              key={`${alert.alumnoId}-inactive`}
              onClick={() => onAlumnoClick?.(alert.alumnoId)}
              style={{
                background: C.amber + '15',
                border: `1.5px solid ${C.amber}`,
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 8,
                cursor: onAlumnoClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onAlumnoClick) {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = C.amber + '25';
                  el.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = C.amber + '15';
                el.style.transform = 'translateX(0)';
              }}
            >
              <Calendar size={16} color={C.amber} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, fontFamily: "'Syne', sans-serif" }}>
                  {alert.firstName} {alert.lastName}
                </div>
                <div style={{ fontSize: 11, color: C.amber, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                  Sin sesiones hace {alert.daysSinceLastSession} días
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textMut, marginTop: 12, fontStyle: 'italic', fontFamily: "'DM Mono', monospace" }}>
        Total: {highSeverityAlerts.length} crítica(s), {mediumSeverityAlerts.length} inactiv(a/o/os/as)
      </div>
    </div>
  );
};
