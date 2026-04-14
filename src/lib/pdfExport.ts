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
  descripcion?: string;
  series?: number;
  repeticiones?: number;
  duracion_segundos?: number;
  punto_clave?: string;
  error_comun?: string;
  metrica_exito?: string;
}

interface PlanEjercicios {
  mensaje?: string;
  proximaFoco?: string;
  ejercicios_prioritarios?: ExercisePriority[];
}

interface QualityScore {
  overall_quality_score?: number;
  mediapipe_coverage?: number;
  ball_sync_rate?: number;
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
  duration?: string;
  camera_quality?: string;
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

const getDimensionScore = (scores: Record<string, any>, dimension: string): number => {
  return scores?.[dimension]?.score ?? 0;
};

export const generateSessionPDF = async (
  session: SessionForPDF,
  studentProfile: StudentProfile,
  profesorName: string = 'TennisAI Coach'
): Promise<void> => {
  const scores = session.scores_detalle || {};
  const planEjercicios = Array.isArray(session.plan_ejercicios) ? {} : (session.plan_ejercicios || {});
  const quality = session.quality_score || {};
  const metadata = session.synthesizer_metadata || {};

  const date = new Date(session.actual_session_date || session.created_at);
  const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('es-ES');

  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'DM Sans', Arial, sans-serif;
          color: #0f1923;
          background: white;
          padding: 40px;
          font-size: 11px;
          line-height: 1.5;
        }
        .page-break { page-break-after: always; }
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
        .quality-warning {
          padding: 8px;
          background: #fee;
          border-left: 4px solid #dc2626;
          border-radius: 3px;
          margin-bottom: 12px;
          font-size: 10px;
          color: #991b1b;
        }
        .quality-item {
          display: inline-block;
          margin-right: 16px;
          font-size: 10px;
        }
        .quality-label {
          color: #4a5568;
          font-weight: 600;
        }
        .quality-value {
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
        .root-cause {
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
        .quality-good { color: #16a34a; }
        .quality-warning { color: #d97706; }
        .quality-poor { color: #dc2626; }
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
            <div class="info-value">${studentProfile.first_name || ''} ${studentProfile.last_name || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Profesor</div>
            <div class="info-value">${profesorName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Fecha</div>
            <div class="info-value">${dateStr}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tipo de Sesión</div>
            <div class="info-value">${session.session_type || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Nivel</div>
            <div class="info-value">${session.nivel_general || '—'}</div>
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
            <div class="quality-warning">
              ⚠️ Calidad de sesión baja. Los resultados pueden no ser representativos.
            </div>
          ` : ''}
          <div>
            <div class="quality-item">
              <span class="quality-label">Cobertura de Pose:</span>
              <span class="quality-value">${Math.round((quality.mediapipe_coverage || 0) * 100)}%</span>
            </div>
            <div class="quality-item">
              <span class="quality-label">Sincronización de Pelota:</span>
              <span class="quality-value">${Math.round((quality.ball_sync_rate || 0) * 100)}%</span>
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
          const strokeLabel = stroke.charAt(0).toUpperCase() + stroke.slice(1);

          return `
            <div class="stroke-section">
              <div class="stroke-name">
                ${strokeLabel}:
                <span class="score-badge" style="background-color: ${scoreColor(data.total || 0)};">
                  ${data.total || 0}/100
                </span>
                ${data.nivel ? ` • ${data.nivel}` : ''}
              </div>

              <div class="dimension-grid">
                ${getDimensionData(stroke, data).map(d => `
                  <div class="dimension-item">
                    <div class="dimension-name">${d.name}</div>
                    <div class="dimension-score">${d.score}/20</div>
                  </div>
                `).join('')}
              </div>

              ${data.analisis_tecnico?.fortalezas?.length ? `
                <div class="strengths">
                  <div class="strengths-label">FORTALEZAS</div>
                  <div class="strengths-text">${(data.analisis_tecnico.fortalezas || []).slice(0, 2).join('; ')}</div>
                </div>
              ` : ''}

              ${data.analisis_tecnico?.patron_error_principal ? `
                <div class="error-pattern">
                  <div class="error-label">PATRÓN DE ERROR PRINCIPAL</div>
                  <div class="error-text">${data.analisis_tecnico.patron_error_principal}</div>
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
          <div class="root-cause">
            <strong>Problema Detectado:</strong><br>
            ${metadata.root_cause}
          </div>
          ${metadata.top_3_insights?.length ? `
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 10px; color: #4a5568;">Top 3 Insights</strong>
              ${metadata.top_3_insights.slice(0, 3).map(insight => `
                <div class="insight-item">• ${insight}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- DIAGNOSTICS -->
      ${session.diagnostico_global ? `
        <div class="section">
          <div class="section-title">Diagnóstico de la Sesión</div>
          <div class="diagnostics-text">${session.diagnostico_global}</div>
        </div>
      ` : ''}

      <!-- PAGE BREAK FOR EXERCISES -->
      <div class="page-break"></div>

      <!-- EXERCISE PLAN -->
      ${planEjercicios && typeof planEjercicios === 'object' && !Array.isArray(planEjercicios) ? `
        <div class="section">
          <div class="section-title">Plan de Ejercicios</div>

          ${planEjercicios.mensaje ? `
            <div style="padding: 12px; background: #f7f8fa; border-radius: 4px; margin-bottom: 12px; font-size: 11px; color: #0f1923;">
              <strong>Motivación:</strong> ${planEjercicios.mensaje}
            </div>
          ` : ''}

          ${planEjercicios.proximaFoco ? `
            <div style="padding: 12px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; margin-bottom: 12px; font-size: 11px; color: #0f1923;">
              <strong>Próxima Sesión Focus:</strong> ${planEjercicios.proximaFoco}
            </div>
          ` : ''}

          ${planEjercicios.ejercicios_prioritarios?.length ? `
            <div>
              <strong style="font-size: 11px; color: #4a5568; margin-bottom: 8px; display: block;">Ejercicios Prioritarios</strong>
              ${planEjercicios.ejercicios_prioritarios.slice(0, 5).map((ex: any) => `
                <div class="exercise-item">
                  <div class="exercise-name">${ex.nombre || 'Ejercicio'}</div>
                  ${ex.golpe_objetivo ? `<div class="exercise-detail"><strong>Golpe:</strong> ${ex.golpe_objetivo}</div>` : ''}
                  ${ex.dimension_objetivo ? `<div class="exercise-detail"><strong>Dimensión:</strong> ${ex.dimension_objetivo}</div>` : ''}
                  ${ex.descripcion ? `<div class="exercise-detail"><strong>Descripción:</strong> ${ex.descripcion}</div>` : ''}
                  ${ex.series || ex.repeticiones ? `<div class="exercise-detail"><strong>Duración:</strong> ${ex.series || ''} ${ex.series ? 'series' : ''} ${ex.repeticiones || ''} ${ex.repeticiones ? 'repeticiones' : ''}</div>` : ''}
                  ${ex.metrica_exito ? `<div class="exercise-detail"><strong>Métrica de Éxito:</strong> ${ex.metrica_exito}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        <p>Reporte generado el ${dateStr} a las ${timeStr}</p>
        <p style="margin-top: 4px;">© TennisAI - Powered by AI-Driven Performance Analytics</p>
      </div>
    </body>
    </html>
  `;

  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  document.body.appendChild(container);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add image to PDF, handling multiple pages
    const imgData = canvas.toDataURL('image/png');
    while (heightLeft >= 0) {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm
      if (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
      }
    }

    // Generate filename
    const studentName = `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const sessionDate = new Date(session.actual_session_date || session.created_at).toISOString().split('T')[0];
    const filename = `${studentName}_${sessionDate}_${session.session_type}_report.pdf`;

    // Download
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
};

// Helper function to get dimension scores
function getDimensionData(stroke: string, data: ScoreDetail): Array<{ name: string; score: number }> {
  const scores = data.scores || {};
  const dimensions = [
    'preparacion',
    'punto_impacto',
    'follow_through',
    'posicion_pies',
    'ritmo_cadencia',
    'potencia_pelota',
  ];

  // For saque, use preparacion_toss and carga_trophy instead
  if (stroke === 'saque') {
    const saqueDimensions = ['preparacion_toss', 'carga_trophy', 'punto_impacto', 'follow_through', 'ritmo_cadencia', 'potencia_pelota'];
    return saqueDimensions.map(dim => ({
      name: getDimensionName(dim),
      score: scores?.[dim]?.score || 0,
    }));
  }

  return dimensions.map(dim => ({
    name: getDimensionName(dim),
    score: scores?.[dim]?.score || 0,
  }));
}

function getDimensionName(dimension: string): string {
  const names: Record<string, string> = {
    preparacion: 'Prep',
    preparacion_toss: 'Prep Toss',
    carga_trophy: 'Trophy',
    punto_impacto: 'Impacto',
    follow_through: 'Follow',
    posicion_pies: 'Pies',
    ritmo_cadencia: 'Ritmo',
    potencia_pelota: 'Potencia',
  };
  return names[dimension] || dimension;
}
