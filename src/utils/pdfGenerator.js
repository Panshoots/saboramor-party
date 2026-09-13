import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * Formats weekly duration in minutes to an hh:mm:ss string.
 */
function formatHours(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";
  let hours = Math.floor(totalMinutes / 60);
  let minutes = Math.floor(totalMinutes % 60);
  let seconds = Math.round((totalMinutes % 1) * 60);
  if (seconds === 60) { minutes += 1; seconds = 0; }
  if (minutes === 60) { hours += 1; minutes = 0; }
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

/**
 * Generates and shares a PDF report for the athlete's macrocycle planning.
 * Outputs a beautiful vertical weekly timeline optimized for A4 paper.
 */
export async function generatePDFReport(calcCache) {
  if (!calcCache) {
    Alert.alert("Error", "No hay datos calculados para exportar.");
    return;
  }

  // Generate vertical cards for the weekly timeline
  let weeksCardsHtml = '';
  calcCache.fechasColumnas.forEach((fecha, idx) => {
    let weekCompHtml = '';
    // Find if there is a competition in this week
    if (calcCache.showCompetenciasInReport !== false && calcCache.competencias && calcCache.competencias.length > 0) {
      const [day, month, yearShort] = fecha.split('/').map(Number);
      const year = 2000 + yearShort; // Assuming 20xx
      const startOfWeek = new Date(year, month - 1, day);
      const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

      calcCache.competencias.forEach(comp => {
        const compDate = new Date(comp.fecha + 'T00:00:00');
        if (compDate >= startOfWeek && compDate <= endOfWeek) {
          weekCompHtml += `<span class="pdf-comp-badge">🏆 COMPETENCIA: ${comp.nombre}</span>`;
        }
      });
    }

    const swimVol = Math.round(calcCache.nat[idx]).toLocaleString('es-CL');
    const bikeVol = formatHours(calcCache.cic[idx]);
    const runVol = formatHours(calcCache.car[idx]);
    
    const zN = calcCache.zNat[idx] || 'Z2';
    const zC = calcCache.zCic[idx] || 'Z2';
    const zR = calcCache.zCar[idx] || 'Z2';
    
    const mesoNum = Math.ceil((idx + 1) / 4);

    weeksCardsHtml += `
      <div class="week-card">
        <div class="week-card-header">
          <div class="week-title-row">
            <span class="week-title-text">Semana ${idx + 1}</span>
            <span class="meso-badge">Meso ${mesoNum}</span>
          </div>
          <span class="week-date">${fecha}</span>
        </div>
        ${weekCompHtml ? `<div class="week-comps-box">${weekCompHtml}</div>` : ''}
        <div class="week-grid">
          <div class="sport-col col-swim">
            <span class="sport-label">🏊 Natación</span>
            <span class="sport-val">${swimVol} m</span>
            <span class="sport-zone">Zona: ${zN}</span>
          </div>
          <div class="sport-col col-bike">
            <span class="sport-label">🚴 Ciclismo</span>
            <span class="sport-val">${bikeVol}</span>
            <span class="sport-zone">Zona: ${zC}</span>
          </div>
          <div class="sport-col col-run">
            <span class="sport-label">🏃 Carrera</span>
            <span class="sport-val">${runVol}</span>
            <span class="sport-zone">Zona: ${zR}</span>
          </div>
        </div>
      </div>
    `;
  });

  // Format list of competitions for header (only if visible)
  let compsSectionHtml = '';
  if (calcCache.showCompetenciasInReport !== false) {
    let compsListHtml = '<p style="margin: 0; color: #4b5563; font-style: italic;">Ninguna competencia registrada</p>';
    if (calcCache.competencias && calcCache.competencias.length > 0) {
      compsListHtml = '<ul class="pdf-comps-list" style="margin: 0; padding-left: 20px;">';
      calcCache.competencias.forEach(c => {
        const parts = c.fecha.split('-');
        const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : c.fecha;
        compsListHtml += `<li><strong>🏆 ${c.nombre}</strong> - ${formattedDate}</li>`;
      });
      compsListHtml += '</ul>';
    }
    compsSectionHtml = `
      <div class="section-title">Calendario de Competencias</div>
      ${compsListHtml}
    `;
  }

  // Format feedback section (only if visible and present)
  let feedbackSectionHtml = '';
  if (calcCache.showFeedbackInReport !== false && calcCache.feedback && calcCache.feedback.trim() !== '') {
    feedbackSectionHtml = `
      <div class="feedback-card">
        <div class="feedback-title">Observaciones / Feedback del Entrenador</div>
        <div class="feedback-content">${calcCache.feedback.trim().replace(/\n/g, '<br/>')}</div>
      </div>
    `;
  }

  // The full HTML template designed from scratch vertically
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte Macrociclo - ${calcCache.atleta}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 30px;
            font-size: 11px;
            background-color: #fff;
            line-height: 1.5;
          }
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h1 span {
            color: #2563eb;
          }
          .header p {
            margin: 4px 0 0 0;
            color: #6b7280;
            font-size: 11px;
            font-weight: 500;
          }
          .logo-side {
            text-align: right;
            font-size: 14px;
            font-weight: 900;
            color: #2563eb;
            letter-spacing: 1px;
          }
          .logo-sub {
            font-size: 8px;
            color: #9ca3af;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .info-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .info-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #2563eb;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
          }
          .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
          }
          .info-col {
            flex: 1;
            min-width: 200px;
          }
          .info-item {
            margin-bottom: 8px;
            font-size: 12px;
          }
          .info-label {
            color: #4b5563;
            font-weight: 700;
            margin-right: 6px;
          }
          .feedback-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #2563eb;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .feedback-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #2563eb;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .feedback-content {
            font-size: 11.5px;
            color: #334155;
            font-weight: 550;
            line-height: 1.5;
          }
          .section-title {
            font-size: 12px;
            text-transform: uppercase;
            color: #2563eb;
            border-left: 3px solid #2563eb;
            padding-left: 8px;
            margin: 24px 0 12px 0;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          
          /* Weeks Cards styles */
          .weeks-container {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .week-card {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
            page-break-inside: avoid;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          .week-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .week-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .week-title-text {
            font-size: 13px;
            font-weight: 800;
            color: #111827;
          }
          .meso-badge {
            background-color: #eff6ff;
            color: #2563eb;
            border: 1px solid #bfdbfe;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .week-date {
            color: #4b5563;
            font-size: 11px;
            font-weight: 600;
          }
          .week-comps-box {
            margin-bottom: 10px;
          }
          .pdf-comp-badge {
            background-color: #ef4444;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            display: inline-block;
          }
          .week-grid {
            display: flex;
            gap: 10px;
          }
          .sport-col {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid transparent;
          }
          .col-swim {
            background-color: #f0f9ff;
            border-color: #e0f2fe;
          }
          .col-bike {
            background-color: #ecfdf5;
            border-color: #d1fae5;
          }
          .col-run {
            background-color: #fff7ed;
            border-color: #ffedd5;
          }
          .sport-label {
            display: block;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .col-swim .sport-label { color: #0369a1; }
          .col-bike .sport-label { color: #047857; }
          .col-run .sport-label { color: #c2410c; }
          
          .sport-val {
            display: block;
            font-size: 13px;
            font-weight: 900;
            color: #111827;
            margin-bottom: 2px;
          }
          .sport-zone {
            display: inline-block;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            background-color: #ffffff;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            color: #4b5563;
          }
          .pdf-comps-list {
            padding-left: 20px;
            margin: 5px 0;
            font-size: 12px;
          }
          .pdf-comps-list li {
            margin-bottom: 4px;
          }
          
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            text-align: center;
            color: #9ca3af;
            font-size: 9px;
            font-weight: 550;
          }

          @media print {
            body {
              padding: 0;
            }
            .week-card {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .meso-badge {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pdf-comp-badge {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sport-col {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Planificación de Macrociclo</h1>
            <p>EPL Triatlón Chile — Control Deportivo Personalizado</p>
          </div>
          <div class="logo-side">
            EPL <span style="color:#111827">TRIATLÓN</span>
            <div class="logo-sub">Planificación y Rendimiento</div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-title">Ficha Informativa</div>
          <div class="info-grid">
            <div class="info-col">
              <div class="info-item"><span class="info-label">Deportista:</span> <strong>${calcCache.atleta}</strong></div>
              <div class="info-item"><span class="info-label">Fecha Inicio:</span> ${calcCache.fechaInicio}</div>
              <div class="info-item"><span class="info-label">Fecha Fin:</span> ${calcCache.fechaFin}</div>
            </div>
            <div class="info-col">
              <div class="info-item"><span class="info-label">Duración:</span> ${calcCache.semanas} Semanas (${calcCache.mesos} Mesociclos)</div>
              <div class="info-item"><span class="info-label">Volúmenes Semanales Base:</span></div>
              <div style="font-size: 11px; color:#4b5563; padding-left:10px;">
                🏊 Natación: ${calcCache.baseNat || 0} m / semana<br/>
                🚴 Ciclismo: ${calcCache.baseCic || 0} hrs / semana<br/>
                🏃 Carrera: ${calcCache.baseCar || 0} hrs / semana
              </div>
            </div>
          </div>
        </div>

        ${compsSectionHtml}

        ${feedbackSectionHtml}

        <div class="section-title">Cronograma Semanal de Microciclos</div>
        <div class="weeks-container">
          ${weeksCardsHtml}
        </div>

        <div class="footer">
          Reporte generado electrónicamente por la plataforma de EPL Triatlón. Todos los derechos reservados.
        </div>
      </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      } else {
        Alert.alert("Ventana emergente bloqueada", "Permite las ventanas emergentes en tu navegador para ver la impresión limpia del PDF.");
      }
    } catch (e) {
      console.error("Web print error:", e);
      Alert.alert("Error", "Fallo al abrir ventana de impresión web: " + e.message);
    }
    return;
  }

  try {
    // Generate PDF file on mobile
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Share on mobile
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planificación Macrociclo de ${calcCache.atleta}`,
        UTI: 'com.adobe.pdf'
      });
    } else {
      Alert.alert("Compartir no disponible", "No se puede compartir el PDF en este dispositivo.");
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    Alert.alert("Error", "Hubo un error al generar el reporte PDF: " + error.message);
  }
}
