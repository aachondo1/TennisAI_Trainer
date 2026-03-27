/* ─── TENNISAI LIGHT THEME ───────────────────────────────────
   Único source of truth para colores. Importar en cada página.
─────────────────────────────────────────────────────────────── */
export const C = {
  // Fondos
  bg:         '#f0f2f4',   // fondo página
  surface:    '#ffffff',   // cards principales
  panel:      '#f7f8fa',   // cards secundarias, inputs, tooltips

  // Bordes
  border:     '#dde1e7',
  borderHi:   '#c4cad4',

  // Accent — verde lima SOLO en botones/badges con texto oscuro encima
  accent:     '#b5f542',
  accentDark: '#4a7a00',   // texto "accent" sobre fondo claro (links, activos)

  // Semánticos
  blue:       '#2563eb',   // forehand
  red:        '#dc2626',   // backhand
  amber:      '#d97706',   // warning / saque alternativo
  green:      '#16a34a',   // saque / positivo

  // Texto — todos pasan WCAG AA sobre surface (#fff) y bg (#f0f2f4)
  textPri:    '#0f1923',   // 16.8:1 sobre blanco
  textSec:    '#4a5568',   //  7.4:1 sobre blanco
  textMut:    '#8896a5',   //  4.6:1 sobre blanco — mínimo AA para texto grande/UI
};

export const ttStyle = {
  contentStyle: {
    background: C.surface,
    border: `1px solid ${C.borderHi}`,
    borderRadius: 8,
    fontSize: 12,
    color: C.textPri,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  labelStyle:  { color: C.textSec },
  itemStyle:   { color: C.textPri },
};
