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

  const mesosPeriodos = calcCache.mesosPeriodos || ['General', 'Específico', 'Competitivo'];

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
    const periodoName = mesosPeriodos[mesoNum - 1] || 'General';
    const periodoLabel = `Período ${periodoName}`;

    weeksCardsHtml += `
      <div class="week-card">
        <div class="week-card-header">
          <div class="week-title-row">
            <span class="week-title-text">Semana ${idx + 1}</span>
            <span class="meso-badge">Meso ${mesoNum} • ${periodoLabel}</span>
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
      <div class="header-box info-comps">
        <h3 class="box-title">🏆 Competencias en el Periodo</h3>
        ${compsListHtml}
      </div>
    `;
  }

  // Format feedback for header (only if visible and present)
  let feedbackSectionHtml = '';
  if (calcCache.showFeedbackInReport !== false && calcCache.feedback && calcCache.feedback.trim().length > 0) {
    feedbackSectionHtml = `
      <div class="header-box info-feedback">
        <h3 class="box-title">📝 Feedback y Recomendaciones del Entrenador</h3>
        <p style="margin: 0; color: #1e3a8a; line-height: 1.4;">${calcCache.feedback.replace(/\n/g, '<br/>')}</p>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Planificación Macrociclo - ${calcCache.nombreDeportista}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #111827;
            background-color: #ffffff;
            font-size: 11px;
            line-height: 1.35;
          }
          
          /* Header */
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .title-area h1 {
            margin: 0;
            font-size: 18px;
            color: #111827;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #4b5563;
            font-weight: 500;
          }
          .brand-logo {
            text-align: right;
          }
          .brand-name {
            font-size: 16px;
            font-weight: 900;
            color: #2563eb;
            letter-spacing: 1px;
          }
          .brand-sub {
            font-size: 8px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
          }

          /* Info Grid (Top) */
          .info-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
          }
          .header-box {
            flex: 1;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
          }
          .box-title {
            margin: 0 0 6px 0;
            font-size: 10px;
            font-weight: 800;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 2px 0;
            font-size: 10.5px;
          }
          .info-table td.label {
            color: #6b7280;
            font-weight: 600;
            width: 50%;
          }
          .info-table td.val {
            color: #111827;
            font-weight: 700;
            text-align: right;
          }

          .info-feedback {
            background-color: #eff6ff;
            border-color: #bfdbfe;
          }
          .info-feedback .box-title {
            color: #1d4ed8;
            border-bottom-color: #dbeafe;
          }
          .info-comps {
            background-color: #fdf2f8;
            border-color: #fbcfe8;
          }
          .info-comps .box-title {
            color: #be185d;
            border-bottom-color: #fce7f3;
          }

          /* Section Title */
          .section-heading {
            font-size: 11px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 10px 0 6px 0;
            border-left: 3px solid #2563eb;
            padding-left: 6px;
          }

          /* Weeks Container (Two Columns or clean vertical list) */
          .weeks-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 10px;
          }
          
          /* Week Card */
          .week-card {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            page-break-inside: avoid;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          }
          .week-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .week-title-row {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .week-title-text {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
          }
          .meso-badge {
            background-color: #e0e7ff;
            color: #3730a3;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .week-date {
            font-size: 9.5px;
            color: #64748b;
            font-weight: 600;
          }
          
          .week-comps-box {
            margin-bottom: 6px;
          }
          .pdf-comp-badge {
            display: inline-block;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            color: #b91c1c;
            font-size: 8.5px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .week-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }
          .sport-col {
            padding: 4px 6px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
          }
          .col-swim {
            background-color: #f0f9ff;
            border: 1px solid #e0f2fe;
          }
          .col-bike {
            background-color: #f0fdf4;
            border: 1px solid #dcfce7;
          }
          .col-run {
            background-color: #fff7ed;
            border: 1px solid #ffedd5;
          }

          .sport-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .col-swim .sport-label { color: #0369a1; }
          .col-bike .sport-label { color: #15803d; }
          .col-run .sport-label { color: #c2410c; }

          .sport-val {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
          }
          .sport-zone {
            font-size: 7.5px;
            font-weight: 700;
            margin-top: 1px;
          }
          .col-swim .sport-zone { color: #0284c7; }
          .col-bike .sport-zone { color: #16a34a; }
          .col-run .sport-zone { color: #ea580c; }

          /* Footer */
          .doc-footer {
            margin-top: 10px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>

        <!-- Header -->
        <div class="doc-header">
          <div class="title-area">
            <h1>Planificación del Macrociclo</h1>
            <p>EPL Triatlón Chile — Control y Periodización Deportiva</p>
          </div>
          <div class="brand-logo">
            <div class="brand-name">EPL TRIATLÓN</div>
            <div class="brand-sub">High Performance Coaching</div>
          </div>
        </div>

        <!-- Top Information Blocks -->
        <div class="info-grid">
          <!-- Athlete & Dates -->
          <div class="header-box">
            <h3 class="box-title">👤 Datos del Deportista</h3>
            <table class="info-table">
              <tr>
                <td class="label">Deportista:</td>
                <td class="val">${calcCache.nombreDeportista}</td>
              </tr>
              <tr>
                <td class="label">Distancia Objetivo:</td>
                <td class="val" style="color: #2563eb;">${calcCache.distanciaObjetivo || 'Olímpica'}</td>
              </tr>
              <tr>
                <td class="label">Fecha de Inicio:</td>
                <td class="val">${calcCache.fechaInicio}</td>
              </tr>
              <tr>
                <td class="label">Fecha de Término:</td>
                <td class="val">${calcCache.fechaFin}</td>
              </tr>
            </table>
          </div>

          <!-- Macrocycle Structure -->
          <div class="header-box">
            <h3 class="box-title">📊 Estructura del Macrociclo</h3>
            <table class="info-table">
              <tr>
                <td class="label">Mesociclos:</td>
                <td class="val">${calcCache.numMesos} Mesos (${calcCache.totalWeeks} Semanas)</td>
              </tr>
              <tr>
                <td class="label">Vol. Total Nat:</td>
                <td class="val">${(calcCache.totalMacroSwim / 1000).toFixed(1)} km</td>
              </tr>
              <tr>
                <td class="label">Vol. Total Cic:</td>
                <td class="val">${(calcCache.totalMacroBikeMin / 60).toFixed(1)} hrs</td>
              </tr>
              <tr>
                <td class="label">Vol. Total Car:</td>
                <td class="val">${(calcCache.totalMacroRunMin / 60).toFixed(1)} hrs</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Optional Top Sections: Competitions and Coach Feedback -->
        ${compsSectionHtml}
        ${feedbackSectionHtml}

        <!-- Section Title for Timeline -->
        <div class="section-heading">Cronograma y Cargas Semanales (Microciclos)</div>

        <!-- Weekly Timeline Cards Grid -->
        <div class="weeks-container">
          ${weeksCardsHtml}
        </div>

        <!-- Footer -->
        <div class="doc-footer">
          Documento oficial generado por la plataforma de entrenamiento de EPL Triatlón Chile. Documento confidencial para uso deportivo.
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
        }, 300);
      } else {
        Alert.alert('Ventana emergente bloqueada', 'Por favor habilita las ventanas emergentes en tu navegador para imprimir.');
      }
    } catch (e) {
      console.error('Web print error:', e);
      Alert.alert('Error', 'Fallo al abrir ventana de impresión web: ' + e.message);
    }
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planificacion - ${calcCache.nombreDeportista}`,
        UTI: 'com.adobe.pdf'
      });
    } else {
      Alert.alert("Compartir no disponible", "No se puede compartir el archivo en este dispositivo.");
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    Alert.alert("Error", "Hubo un error al generar el PDF: " + error.message);
  }
}
