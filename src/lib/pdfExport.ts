import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { C } from './theme';

interface ScoreDetail {
  total?: number;
  nivel?: string;
  scores?: Record<string, { score: number }>;
  analisis_tecnico?: {
    fortalezas?: string[];
    debilidades?: string[];
    patron_error_principal?: string;
  };
  metricas_clave?: {
    velocidad_pelota_max?: number;
  };
}

interface ScoresDetalle {
  forehand?: ScoreDetail;
  backhand?: ScoreDetail;
  saque?: ScoreDetail;
  [key: string]: any;
}

interface ExercisePriority {
  nombre?: string;
  golpe_objetivo?: string;
  dimension_objetivo?: string;
  descripcion_detallada?: string;    // Campo real en Supabase
  series?: number;
  repeticiones?: number;
  duracion_minutos?: number;         // Campo real en Supabase
  punto_atencion_clave?: string;     // Campo real en Supabase
  error_comun_evitar?: string;       // Campo real en Supabase
  metrica_exito?: string;
  prioridad?: number;
}

interface PlanEjercicios {
  mensaje_motivacional?: string;     // Campo real en Supabase
  proxima_sesion_foco?: string;      // Campo real en Supabase
  ejercicios_prioritarios?: ExercisePriority[];
}

interface QualityScore {
  overall_quality_score?: number;    // Fracción 0-1
  mediapipe_coverage?: number;       // Porcentaje 0-100
  ball_sync_rate?: number;           // Porcentaje 0-100
}

interface SynthesizerMetadata {
  root_cause?: string;
  top_3_insights?: string[];
  delta_headline?: string;
  comparison_delta?: Record<string, any>;
}

export interface SessionForPDF {
  id: string;
  user_id: string;
  session_type: string;
  global_score: number;
  nivel_general: string;
  diagnostico_global: string;
  reporte_narrativo: string;
  plan_ejercicios: PlanEjercicios | any[];
  scores_detalle: ScoresDetalle;
  quality_score?: QualityScore;
  actual_session_date?: string;
  created_at: string;
  synthesizer_metadata?: SynthesizerMetadata;
  [key: string]: any;
}

interface StudentProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const scoreColor = (score: number): string => {
  if (score >= 80) return C.accentDark;
  if (score >= 65) return C.blue;
  if (score >= 50) return C.amber;
  return C.red;
};

// Escapa texto para insertar de forma segura en HTML
const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export const generateSessionPDF = async (
  session: SessionForPDF,
  studentProfile: StudentProfile,
  profesorName: string = 'TennisAI Coach'
): Promise<void> => {
  const scores = session.scores_detalle || {};
  // BUG FIX: plan_ejercicios puede ser array legacy o el objeto actual
  const planEjercicios: PlanEjercicios = Array.isArray(session.plan_ejercicios)
    ? {}
    : (session.plan_ejercicios || {});
  const quality = session.quality_score || {};
  const metadata = session.synthesizer_metadata || {};

  const date = new Date(session.actual_session_date || session.created_at);
  const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('es-ES');

  const studentName = `${escapeHtml(studentProfile.first_name)} ${escapeHtml(studentProfile.last_name)}`.trim();

  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          color: #0f1923;
          background: white;
          padding: 40px;
          font-size: 11px;
          line-height: 1.5;
        }
        .header {
          border-bottom: 3px solid #4a7a00;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 24px;
          font-weight: 700;
          color: #4a7a00;
          margin-bottom: 8px;
        }
        .header-subtitle {
          font-size: 12px;
          color: #4a5568;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f1923;
          border-bottom: 2px solid #dde1e7;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .info-item {
          padding: 8px;
          background: #f7f8fa;
          border-radius: 4px;
        }
        .info-label {
          font-size: 9px;
          color: #4a5568;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .info-value {
          font-size: 12px;
          color: #0f1923;
          font-weight: 600;
        }
        .score-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          color: white;
          font-weight: 700;
          font-size: 11px;
        }
        .stroke-section {
          padding: 12px;
          background: #f7f8fa;
          border-radius: 6px;
          margin-bottom: 12px;
          border-left: 4px solid #dde1e7;
        }
        .stroke-name {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .dimension-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .dimension-item {
          font-size: 10px;
          padding: 4px;
          background: white;
          border-radius: 3px;
          border-left: 2px solid #dde1e7;
        }
        .dimension-name {
          color: #4a5568;
          font-weight: 600;
        }
        .dimension-score {
          color: #0f1923;
          font-weight: 700;
        }
        .strengths, .error-pattern {
          font-size: 10px;
          margin-top: 6px;
          padding: 6px;
          background: white;
          border-radius: 3px;
        }
        .strengths-label, .error-label {
          color: #4a5568;
          font-weight: 600;
          font-size: 9px;
          margin-bottom: 2px;
        }
        .strengths-text, .error-text {
          color: #0f1923;
          font-size: 10px;
        }
        /* BUG FIX: nombre único para el banner de advertencia de calidad */
        .quality-low-banner {
          padding: 8px;
          background: #fee;
          border-left: 4px solid #dc2626;
          border-radius: 3px;
          margin-bottom: 12px;
          font-size: 10px;
          color: #991b1b;
        }
        .quality-row {
          margin-bottom: 8px;
        }
        .quality-row-item {
          display: inline-block;
          margin-right: 16px;
          font-size: 10px;
        }
        .quality-row-label {
          color: #4a5568;
          font-weight: 600;
        }
        .quality-row-value {
          color: #0f1923;
          font-weight: 700;
        }
        .diagnostics-text {
          padding: 12px;
          background: #f7f8fa;
          border-radius: 4px;
          line-height: 1.6;
          font-size: 11px;
          color: #0f1923;
        }
        .insight-item {
          padding: 8px;
          background: #f7f8fa;
          border-left: 3px solid #2563eb;
          border-radius: 3px;
          margin-bottom: 8px;
          font-size: 10px;
          color: #0f1923;
        }
        .root-cause-box {
          padding: 10px;
          background: #fee;
          border-left: 3px solid #dc2626;
          border-radius: 3px;
          margin-bottom: 12px;
          font-size: 10px;
          color: #991b1b;
        }
        .exercise-item {
          padding: 10px;
          background: #f7f8fa;
          border-radius: 4px;
          margin-bottom: 10px;
          border-left: 3px solid #4a7a00;
        }
        .exercise-name {
          font-weight: 700;
          color: #0f1923;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .exercise-detail {
          font-size: 10px;
          color: #4a5568;
          margin-bottom: 2px;
        }
        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #dde1e7;
          font-size: 9px;
          color: #8896a5;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div class="header-title">Reporte de Sesión</div>
        <div class="header-subtitle">TennisAI - Análisis de Rendimiento</div>
      </div>

      <!-- SESSION INFO -->
      <div class="section">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Estudiante</div>
            <div class="info-value">${studentName || escapeHtml(studentProfile.email)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Profesor</div>
            <div class="info-value">${escapeHtml(profesorName)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Fecha</div>
            <div class="info-value">${escapeHtml(dateStr)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tipo de Sesión</div>
            <div class="info-value">${escapeHtml(session.session_type) || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Nivel</div>
            <div class="info-value">${escapeHtml(session.nivel_general) || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Puntuación Global</div>
            <div class="info-value">
              <span class="score-badge" style="background-color: ${scoreColor(session.global_score)};">
                ${session.global_score}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- QUALITY METRICS -->
      ${quality.overall_quality_score !== undefined ? `
        <div class="section">
          <div class="section-title">Métricas de Calidad</div>
          ${quality.overall_quality_score < 0.55 ? `
            <div class="quality-low-banner">
              ⚠️ Calidad de sesión baja. Los resultados pueden no ser representativos.
            </div>
          ` : ''}
          <div class="quality-row">
            <div class="quality-row-item">
              <span class="quality-row-label">Calidad General: </span>
              <!-- BUG FIX: overall_quality_score es fracción 0-1, sí necesita *100 -->
              <span class="quality-row-value">${Math.round((quality.overall_quality_score || 0) * 100)}%</span>
            </div>
            <div class="quality-row-item">
              <span class="quality-row-label">Cobertura de Pose: </span>
              <!-- BUG FIX: mediapipe_coverage ya es porcentaje 0-100, NO multiplicar -->
              <span class="quality-row-value">${Math.round(quality.mediapipe_coverage || 0)}%</span>
            </div>
            <div class="quality-row-item">
              <span class="quality-row-label">Sincronización de Pelota: </span>
              <!-- BUG FIX: ball_sync_rate ya es porcentaje 0-100, NO multiplicar -->
              <span class="quality-row-value">${Math.round(quality.ball_sync_rate || 0)}%</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- STROKE SCORES -->
      <div class="section">
        <div class="section-title">Análisis de Golpes</div>

        ${Object.entries(scores).map(([stroke, scoreData]: [string, any]) => {
          if (!['forehand', 'backhand', 'saque'].includes(stroke)) return '';
          const data = scoreData as ScoreDetail;
          const strokeLabel = stroke === 'forehand' ? 'Forehand' : stroke === 'backhand' ? 'Backhand' : 'Saque';

          return `
            <div class="stroke-section">
              <div class="stroke-name">
                ${strokeLabel}:
                <span class="score-badge" style="background-color: ${scoreColor(data.total || 0)};">
                  ${data.total || 0}/100
                </span>
                ${data.nivel ? ` • ${escapeHtml(data.nivel)}` : ''}
              </div>

              <div class="dimension-grid">
                ${getDimensionData(stroke, data).map(d => `
                  <div class="dimension-item">
                    <div class="dimension-name">${escapeHtml(d.name)}</div>
                    <div class="dimension-score">${d.score}/20</div>
                  </div>
                `).join('')}
              </div>

              ${data.analisis_tecnico?.fortalezas?.length ? `
                <div class="strengths">
                  <div class="strengths-label">FORTALEZAS</div>
                  <div class="strengths-text">${data.analisis_tecnico.fortalezas.slice(0, 2).map(escapeHtml).join('; ')}</div>
                </div>
              ` : ''}

              ${data.analisis_tecnico?.patron_error_principal ? `
                <div class="error-pattern">
                  <div class="error-label">PATRÓN DE ERROR PRINCIPAL</div>
                  <div class="error-text">${escapeHtml(data.analisis_tecnico.patron_error_principal)}</div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- ROOT CAUSE & INSIGHTS -->
      ${metadata.root_cause ? `
        <div class="section">
          <div class="section-title">Análisis de IA</div>
          <div class="root-cause-box">
            <strong>Problema Detectado:</strong><br>
            ${escapeHtml(metadata.root_cause)}
          </div>
          ${metadata.top_3_insights?.length ? `
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 10px; color: #4a5568;">Top 3 Insights</strong>
              ${metadata.top_3_insights.slice(0, 3).map((insight: any) => `
                <div class="insight-item">
                  <strong>${escapeHtml(insight.area || 'Insight')}${insight.impacto ? ` (${escapeHtml(insight.impacto)})` : ''}:</strong>
                  ${escapeHtml(insight.descripcion || '')}
                  ${insight.accionabilidad ? `<br><em style="color: #16a34a;">Acción: ${escapeHtml(insight.accionabilidad)}</em>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- DIAGNOSTICS -->
      ${session.diagnostico_global ? `
        <div class="section">
          <div class="section-title">Diagnóstico de la Sesión</div>
          <div class="diagnostics-text">${escapeHtml(session.diagnostico_global)}</div>
        </div>
      ` : ''}

      <!-- EXERCISE PLAN -->
      ${planEjercicios && typeof planEjercicios === 'object' && !Array.isArray(planEjercicios) ? `
        <div class="section">
          <div class="section-title">Plan de Ejercicios</div>

          ${planEjercicios.mensaje_motivacional ? `
            <div style="padding: 12px; background: #f7f8fa; border-radius: 4px; margin-bottom: 12px; font-size: 11px; color: #0f1923;">
              <strong>Motivación:</strong> ${escapeHtml(planEjercicios.mensaje_motivacional)}
            </div>
          ` : ''}

          ${planEjercicios.proxima_sesion_foco ? `
            <div style="padding: 12px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; margin-bottom: 12px; font-size: 11px; color: #0f1923;">
              <strong>Próxima Sesión — Foco:</strong> ${escapeHtml(planEjercicios.proxima_sesion_foco)}
            </div>
          ` : ''}

          ${planEjercicios.ejercicios_prioritarios?.length ? `
            <div>
              <strong style="font-size: 11px; color: #4a5568; margin-bottom: 8px; display: block;">Ejercicios Prioritarios</strong>
              ${planEjercicios.ejercicios_prioritarios.slice(0, 5).map((ex: ExercisePriority) => `
                <div class="exercise-item">
                  <div class="exercise-name">${escapeHtml(ex.nombre) || 'Ejercicio'}</div>
                  ${ex.golpe_objetivo ? `<div class="exercise-detail"><strong>Golpe:</strong> ${escapeHtml(ex.golpe_objetivo)}</div>` : ''}
                  ${ex.dimension_objetivo ? `<div class="exercise-detail"><strong>Dimensión:</strong> ${escapeHtml(ex.dimension_objetivo)}</div>` : ''}
                  ${ex.descripcion_detallada ? `<div class="exercise-detail"><strong>Descripción:</strong> ${escapeHtml(ex.descripcion_detallada)}</div>` : ''}
                  ${ex.series || ex.repeticiones || ex.duracion_minutos ? `<div class="exercise-detail"><strong>Duración:</strong> ${ex.series ? `${ex.series} series` : ''} ${ex.repeticiones ? `· ${ex.repeticiones} reps` : ''} ${ex.duracion_minutos ? `· ${ex.duracion_minutos} min` : ''}</div>` : ''}
                  ${ex.punto_atencion_clave ? `<div class="exercise-detail" style="color: #16a34a;"><strong>Atención clave:</strong> ${escapeHtml(ex.punto_atencion_clave)}</div>` : ''}
                  ${ex.error_comun_evitar ? `<div class="exercise-detail" style="color: #dc2626;"><strong>Error a evitar:</strong> ${escapeHtml(ex.error_comun_evitar)}</div>` : ''}
                  ${ex.metrica_exito ? `<div class="exercise-detail"><strong>Métrica de éxito:</strong> ${escapeHtml(ex.metrica_exito)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        <p>Reporte generado el ${escapeHtml(dateStr)} a las ${escapeHtml(timeStr)}</p>
        <p style="margin-top: 4px;">© TennisAI - Powered by AI-Driven Performance Analytics</p>
      </div>
    </body>
    </html>
  `;

  // Create temporary off-screen container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 794px;'; // 794px ≈ A4 @96dpi
  document.body.appendChild(container);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width mm
    const pageHeight = 297; // A4 height mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Encode canvas once — toDataURL is expensive on high-res canvases
    const imgData = canvas.toDataURL('image/png');

    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight - pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Generate filename (safe characters only)
    const safeName = `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s]/g, '')
      .replace(/\s+/g, '_');
    const sessionDate = new Date(session.actual_session_date || session.created_at)
      .toISOString()
      .split('T')[0];
    const filename = `${safeName}_${sessionDate}_${session.session_type}_report.pdf`;

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};

// Helper: get dimension scores for a stroke
function getDimensionData(stroke: string, data: ScoreDetail): Array<{ name: string; score: number }> {
  const scores = data.scores || {};

  const dimensions = stroke === 'saque'
    ? ['preparacion_toss', 'carga_trophy', 'punto_impacto', 'follow_through', 'ritmo_cadencia', 'potencia_pelota']
    : ['preparacion', 'punto_impacto', 'follow_through', 'posicion_pies', 'ritmo_cadencia', 'potencia_pelota'];

  return dimensions.map(dim => ({
    name: getDimensionLabel(dim),
    score: scores?.[dim]?.score || 0,
  }));
}

function getDimensionLabel(dimension: string): string {
  const labels: Record<string, string> = {
    preparacion:       'Preparación',
    preparacion_toss:  'Prep Toss',
    carga_trophy:      'Trophy',
    punto_impacto:     'Impacto',
    follow_through:    'Follow-through',
    posicion_pies:     'Posición Pies',
    ritmo_cadencia:    'Ritmo',
    potencia_pelota:   'Potencia',
  };
  return labels[dimension] || dimension;
}
