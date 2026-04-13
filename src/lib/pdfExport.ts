import jsPDF from 'jspdf';

interface ScoreDetail {
  total?: number;
  nivel?: string;
  analisis_tecnico?: {
    fortalezas?: string[];
    debilidades?: string[];
    patron_error_principal?: string;
  };
  metricas_clave?: {
    velocidad_pelota_max?: number;
  };
}

interface Session {
  id: string;
  global_score?: number;
  session_type?: string;
  nivel_general?: string;
  created_at: string;
  actual_session_date?: string;
  duration?: string;
  camera_quality?: string;
  diagnostico_global?: string;
  scores_detalle?: {
    forehand?: ScoreDetail;
    backhand?: ScoreDetail;
    saque?: ScoreDetail;
  };
  plan_ejercicios?: {
    mensaje?: string;
    proximaFoco?: string;
    ejercicios?: Array<{
      nombre?: string;
      descripcion?: string;
      duracion?: string;
      series?: number;
    }>;
  };
}

const scoreColor = (score: number): [number, number, number] => {
  if (score >= 80) return [52, 211, 153];    // green
  if (score >= 65) return [96, 165, 250];    // blue
  if (score >= 50) return [251, 191, 36];    // amber
  return [239, 68, 68];                      // red
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export async function generateSessionPDF(
  session: Session,
  alumno: { first_name?: string; last_name?: string; email: string },
  profesor: { first_name?: string; last_name?: string; email: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as any;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  // ─────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('', 'bold');
  doc.text('REPORTE DE SESIÓN DE TENIS', 15, yPos);
  yPos += 10;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Info alumno y profesor
  doc.setFontSize(10);
  doc.setFont('', 'normal');
  const alumnoName = [alumno.first_name || '', alumno.last_name || ''].filter(Boolean).join(' ') || alumno.email;
  const profesorName = [profesor.first_name || '', profesor.last_name || ''].filter(Boolean).join(' ') || profesor.email;

  doc.text(`Alumno: ${alumnoName}`, 15, yPos);
  yPos += 6;
  doc.text(`Profesor: ${profesorName}`, 15, yPos);
  yPos += 6;
  doc.text(`Fecha: ${formatDate(session.actual_session_date ?? session.created_at)}`, 15, yPos);
  yPos += 10;

  // ─────────────────────────────────────────────────────────────
  // SCORE GLOBAL
  // ─────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('', 'bold');
  doc.text('SCORE GLOBAL', 15, yPos);
  yPos += 8;

  const globalScore = session.global_score ?? 0;
  const [r, g, b] = scoreColor(globalScore);
  doc.setTextColor(r, g, b);
  doc.setFontSize(28);
  doc.text(String(globalScore), 20, yPos);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('', 'normal');
  doc.text(`Nivel: ${session.nivel_general ?? '—'}`, 15, yPos);
  yPos += 5;
  doc.text(`Tipo de sesión: ${session.session_type ?? '—'}`, 15, yPos);
  yPos += 5;
  doc.text(`Duración: ${session.duration ?? '—'}`, 15, yPos);
  yPos += 8;

  // ─────────────────────────────────────────────────────────────
  // DIAGNÓSTICO
  // ─────────────────────────────────────────────────────────────
  if (session.diagnostico_global) {
    doc.setFontSize(12);
    doc.setFont('', 'bold');
    doc.text('DIAGNÓSTICO', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('', 'normal');
    const diagLines = doc.splitTextToSize(session.diagnostico_global, pageWidth - 30);
    doc.text(diagLines, 15, yPos);
    yPos += diagLines.length * 5 + 5;
  }

  // ─────────────────────────────────────────────────────────────
  // DETALLES DE SCORES
  // ─────────────────────────────────────────────────────────────
  const scores = session.scores_detalle ?? {};
  const golpes = [
    { name: 'FOREHAND', key: 'forehand' },
    { name: 'BACKHAND', key: 'backhand' },
    { name: 'SAQUE', key: 'saque' },
  ];

  doc.setFontSize(12);
  doc.setFont('', 'bold');
  doc.text('ANÁLISIS POR GOLPE', 15, yPos);
  yPos += 8;

  for (const golpe of golpes) {
    const detail = scores[golpe.key as keyof typeof scores];
    const score = detail?.total ?? 0;

    doc.setFontSize(11);
    doc.setFont('', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(golpe.name, 15, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('', 'normal');
    const [r2, g2, b2] = scoreColor(score);
    doc.setTextColor(r2, g2, b2);
    doc.text(`Score: ${score} | Nivel: ${detail?.nivel ?? '—'}`, 20, yPos);
    yPos += 5;

    doc.setTextColor(0, 0, 0);
    if (detail?.analisis_tecnico?.fortalezas && detail.analisis_tecnico.fortalezas.length > 0) {
      doc.setFont('', 'bold');
      doc.text('Fortalezas:', 20, yPos);
      yPos += 4;
      doc.setFont('', 'normal');
      for (const f of detail.analisis_tecnico.fortalezas) {
        doc.text(`• ${f}`, 25, yPos);
        yPos += 4;
      }
    }

    if (detail?.analisis_tecnico?.debilidades && detail.analisis_tecnico.debilidades.length > 0) {
      doc.setFont('', 'bold');
      doc.text('Áreas de mejora:', 20, yPos);
      yPos += 4;
      doc.setFont('', 'normal');
      for (const d of detail.analisis_tecnico.debilidades) {
        doc.text(`• ${d}`, 25, yPos);
        yPos += 4;
      }
    }

    yPos += 4;

    // Nueva página si es necesario
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 15;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PLAN DE EJERCICIOS
  // ─────────────────────────────────────────────────────────────
  const plan = session.plan_ejercicios ?? {};
  if ((plan.ejercicios && plan.ejercicios.length > 0) || plan.mensaje || plan.proximaFoco) {
    doc.setFontSize(12);
    doc.setFont('', 'bold');
    doc.text('PLAN DE EJERCICIOS', 15, yPos);
    yPos += 8;

    if (plan.proximaFoco) {
      doc.setFontSize(10);
      doc.setFont('', 'bold');
      doc.text('Próximo foco:', 15, yPos);
      yPos += 5;
      doc.setFont('', 'normal');
      const focusLines = doc.splitTextToSize(plan.proximaFoco, pageWidth - 30);
      doc.text(focusLines, 20, yPos);
      yPos += focusLines.length * 4 + 3;
    }

    if (plan.ejercicios && plan.ejercicios.length > 0) {
      doc.setFont('', 'bold');
      doc.setFontSize(10);
      doc.text('Ejercicios recomendados:', 15, yPos);
      yPos += 5;

      for (const ejercicio of plan.ejercicios) {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFont('', 'bold');
        doc.setFontSize(10);
        doc.text(`• ${ejercicio.nombre ?? 'Ejercicio'}`, 20, yPos);
        yPos += 4;

        if (ejercicio.descripcion) {
          doc.setFont('', 'normal');
          doc.setFontSize(9);
          const descLines = doc.splitTextToSize(ejercicio.descripcion, pageWidth - 35);
          doc.text(descLines, 25, yPos);
          yPos += descLines.length * 3 + 2;
        }

        if (ejercicio.series && ejercicio.duracion) {
          doc.setFont('', 'normal');
          doc.setFontSize(9);
          doc.text(`${ejercicio.series} series de ${ejercicio.duracion}`, 25, yPos);
          yPos += 4;
        }

        yPos += 2;
      }
    }

    if (plan.mensaje) {
      yPos += 3;
      doc.setFont('', 'normal');
      doc.setFontSize(9);
      const msgLines = doc.splitTextToSize(plan.mensaje, pageWidth - 30);
      doc.text(msgLines, 15, yPos);
      yPos += msgLines.length * 3;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 15, pageHeight - 8);

  // Descargar
  const fileName = `Reporte_${alumnoName.replace(/\s+/g, '_')}_${formatDate(session.actual_session_date ?? session.created_at).replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
