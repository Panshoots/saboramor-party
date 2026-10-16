import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export async function generateCompliancePDF(data) {
  if (!data) {
    Alert.alert('Error', 'No hay datos de cumplimiento para exportar.');
    return;
  }

  const {
    athleteName = 'Atleta',
    periodLabel = '1 Semana',
    semanaNum = 1,
    startDate = '',
    currentPct = 0,
    sportsAvgPct = null,
    tssPct = null,
    ecosPct = null,
    statusLabel = 'Óptimo',
    statusColor = '#10b981',
    plannedKm = '0.0',
    completedKm = '0.0',
    plannedDuration = '0h',
    completedDuration = '0h',
    plannedTss = 0,
    completedTss = 0,
    plannedEcos = 0,
    completedEcos = 0,
    natPlanned = '0.0 km',
    natCompleted = '0.0 km',
    natPct = 0,
    cicPlanned = '0.0 h',
    cicCompleted = '0.0 h',
    cicPct = 0,
    carPlanned = '0.0 h',
    carCompleted = '0.0 h',
    carPct = 0,
    breakdown = { green: 0, yellow: 0, orange: 0, red: 0, extra: 0 },
    coachNotes = '',
    calculatedWeeks = [],
    complianceWeeks = {},
    activeWeekIndex = 0,
    selectedPeriod = 1,
    reportOptions = {
      distance: true,
      duration: true,
      tss: false,
      ecos: false,
      breakdown: true,
      notes: true
    }
  } = data;

  const todayStr = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Calculate status color badge
  let badgeBg = '#ecfdf5';
  let badgeBorder = '#a7f3d0';
  let badgeText = '#059669';

  if (currentPct < 55) {
    badgeBg = '#fef2f2';
    badgeBorder = '#fecaca';
    badgeText = '#dc2626';
  } else if (currentPct < 80) {
    badgeBg = '#fefce8';
    badgeBorder = '#fef08a';
    badgeText = '#ca8a04';
  } else if (currentPct > 120) {
    badgeBg = '#fff7ed';
    badgeBorder = '#fed7aa';
    badgeText = '#ea580c';
  }

  // Dynamic KPI cards
  let kpiCardsHtml = '';
  if (reportOptions.distance) {
    kpiCardsHtml += `
      <div class="kpi-card">
        <div class="kpi-label">Distancia Total</div>
        <div class="kpi-main-val">${completedKm} km</div>
        <div class="kpi-sub-val">Plan: ${plannedKm} km</div>
      </div>
    `;
  }
  if (reportOptions.duration) {
    kpiCardsHtml += `
      <div class="kpi-card">
        <div class="kpi-label">Tiempo Total</div>
        <div class="kpi-main-val">${completedDuration}</div>
        <div class="kpi-sub-val">Plan: ${plannedDuration}</div>
      </div>
    `;
  }
  if (reportOptions.tss) {
    kpiCardsHtml += `
      <div class="kpi-card">
        <div class="kpi-label">TSS (Stress)</div>
        <div class="kpi-main-val">${completedTss} TSS</div>
        <div class="kpi-sub-val">Plan: ${plannedTss} TSS</div>
      </div>
    `;
  }
  if (reportOptions.ecos) {
    kpiCardsHtml += `
      <div class="kpi-card">
        <div class="kpi-label">Carga ECOs</div>
        <div class="kpi-main-val">${completedEcos} ECOs</div>
        <div class="kpi-sub-val">Plan: ${plannedEcos} ECOs</div>
      </div>
    `;
  }

  // Generate multi-week breakdown rows if period > 1
  let multiWeekHtml = '';
  if (selectedPeriod > 1 && calculatedWeeks && calculatedWeeks.length > 0) {
    const startIdx = Math.max(0, activeWeekIndex - selectedPeriod + 1);
    const endIdx = activeWeekIndex;

    let headersHtml = '<th>Microciclo</th>';
    if (reportOptions.distance) {
      headersHtml += '<th>Dist. Plan</th><th>Dist. Real</th>';
    }
    if (reportOptions.duration) {
      headersHtml += '<th>Tiempo Plan</th><th>Tiempo Real</th>';
    }
    if (reportOptions.tss) {
      headersHtml += '<th>TSS Plan</th><th>TSS Real</th>';
    }
    if (reportOptions.ecos) {
      headersHtml += '<th>ECOs Plan</th><th>ECOs Real</th>';
    }
    headersHtml += '<th style="text-align:right;">Cumplimiento</th>';

    let rowsHtml = '';
    for (let w = startIdx; w <= endIdx; w++) {
      const wPlan = calculatedWeeks[w]?.planned || { totalKm: 0, totalMin: 0, totalEcos: 0, totalTss: 350 };
      const wComp = complianceWeeks[w] || null;

      let cKm = (wPlan.totalKm * 0.84);
      let cMin = (wPlan.totalMin * 0.84);
      let pEcos = wPlan.totalEcos || 0;
      let cEcos = (wPlan.totalEcos * 0.84);
      let pTss = 350;
      let cTss = 300;

      if (wComp) {
        const cNatM = parseFloat(wComp.natM) || 0;
        const cCicMin = (parseFloat(wComp.cicHours) || 0) * 60;
        const cCarMin = (parseFloat(wComp.carHours) || 0) * 60;
        cKm = (cNatM / 1000) + (cCicMin / 60 * 28) + (cCarMin / 60 * 12);
        cMin = (cNatM / 100 * 2) + cCicMin + cCarMin;
        
        pEcos = wComp.planEcos !== undefined && wComp.planEcos !== '' ? parseFloat(wComp.planEcos) : wPlan.totalEcos;
        cEcos = wComp.realEcos !== undefined && wComp.realEcos !== '' ? parseFloat(wComp.realEcos) : ((cNatM / 100 * 2 * 0.75 * 2) + (cCicMin * 0.5 * 2) + (cCarMin * 1.0 * 2));

        pTss = wComp.planTss !== undefined && wComp.planTss !== '' ? parseFloat(wComp.planTss) : 350;
        cTss = wComp.realTss !== undefined && wComp.realTss !== '' ? parseFloat(wComp.realTss) : Math.round(cMin * 0.6);
      }

      let comparisonPlan = wPlan.totalKm;
      let comparisonReal = cKm;
      if (!reportOptions.distance && reportOptions.duration) {
        comparisonPlan = wPlan.totalMin;
        comparisonReal = cMin;
      }

      const weekPct = comparisonPlan > 0 ? Math.round((comparisonReal / comparisonPlan) * 100) : 0;
      let wBadgeColor = '#059669';
      if (weekPct < 55) wBadgeColor = '#dc2626';
      else if (weekPct < 80) wBadgeColor = '#ca8a04';
      else if (weekPct > 120) wBadgeColor = '#ea580c';

      let rowCols = `<td style="font-weight:700;">Semana ${w + 1} (${calculatedWeeks[w]?.fechaInicio || ''})</td>`;
      if (reportOptions.distance) {
        rowCols += `<td>${wPlan.totalKm.toFixed(1)} km</td><td style="font-weight:700;">${cKm.toFixed(1)} km</td>`;
      }
      if (reportOptions.duration) {
        const pHours = Math.floor(wPlan.totalMin / 60) + 'h ' + Math.round(wPlan.totalMin % 60) + 'm';
        const cHours = Math.floor(cMin / 60) + 'h ' + Math.round(cMin % 60) + 'm';
        rowCols += `<td>${pHours}</td><td style="font-weight:700;">${cHours}</td>`;
      }
      if (reportOptions.tss) {
        rowCols += `<td>${Math.round(pTss)}</td><td style="font-weight:700;">${Math.round(cTss)}</td>`;
      }
      if (reportOptions.ecos) {
        rowCols += `<td>${Math.round(pEcos)}</td><td style="font-weight:700;">${Math.round(cEcos)}</td>`;
      }
      rowCols += `<td style="font-weight:800; color:${wBadgeColor}; text-align:right;">${weekPct}%</td>`;

      rowsHtml += `<tr>${rowCols}</tr>`;
    }

    multiWeekHtml = `
      <div class="section-title">Evolución Microciclo a Microciclo</div>
      <table class="data-table">
        <thead>
          <tr>
            ${headersHtml}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // Session Adherence HTML
  let breakdownHtml = '';
  if (reportOptions.breakdown) {
    breakdownHtml = `
      <div class="section-title">Calidad y Adherencia de las Sesiones</div>
      <div class="breakdown-row">
        <div class="breakdown-pill" style="border-color: #a7f3d0; background: #ecfdf5;">
          <div class="breakdown-pill-count" style="color: #059669;">${breakdown.green || 0}</div>
          <div class="breakdown-pill-label" style="color: #059669;">En Objetivo</div>
        </div>
        <div class="breakdown-pill" style="border-color: #fef08a; background: #fefce8;">
          <div class="breakdown-pill-count" style="color: #ca8a04;">${breakdown.yellow || 0}</div>
          <div class="breakdown-pill-label" style="color: #ca8a04;">Desviación &gt;20%</div>
        </div>
        <div class="breakdown-pill" style="border-color: #fed7aa; background: #fff7ed;">
          <div class="breakdown-pill-count" style="color: #ea580c;">${breakdown.orange || 0}</div>
          <div class="breakdown-pill-label" style="color: #ea580c;">Incompletos</div>
        </div>
        <div class="breakdown-pill" style="border-color: #fecaca; background: #fef2f2;">
          <div class="breakdown-pill-count" style="color: #dc2626;">${breakdown.red || 0}</div>
          <div class="breakdown-pill-label" style="color: #dc2626;">Sin Registro</div>
        </div>
        <div class="breakdown-pill" style="border-color: #e2e8f0; background: #f8fafc;">
          <div class="breakdown-pill-count" style="color: #64748b;">${breakdown.extra || 0}</div>
          <div class="breakdown-pill-label" style="color: #64748b;">Ejercicios Extra</div>
        </div>
      </div>
    `;
  }

  // Coach Notes HTML
  let coachNotesHtml = '';
  if (reportOptions.notes && coachNotes) {
    coachNotesHtml = `
      <div class="section-title">Observaciones Técnicas del Entrenador</div>
      <div class="notes-box">
        <div class="notes-header">📝 Feedback de Rendimiento y Ajustes</div>
        <div class="notes-body">${coachNotes.replace(/\n/g, '<br/>')}</div>
      </div>
    `;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe de Cumplimiento Deportivo - ${athleteName}</title>
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
      color: #0f172a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-title h1 {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-title p {
      margin: 3px 0 0 0;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .brand-logo {
      text-align: right;
    }
    .brand-logo-text {
      font-size: 20px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: 1px;
    }
    .brand-logo-sub {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .athlete-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
    }
    .athlete-col {
      flex: 1;
    }
    .info-row {
      margin-bottom: 4px;
      font-size: 12px;
    }
    .info-label {
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.4px;
    }
    .info-value {
      color: #0f172a;
      font-weight: 800;
    }

    .kpi-container {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px;
      text-align: center;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-main-val {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
    }
    .kpi-sub-val {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }
    .kpi-score-card {
      flex: 1.2;
      background: ${badgeBg};
      border: 1.5px solid ${badgeBorder};
      border-radius: 14px;
      padding: 14px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .kpi-score-pct {
      font-size: 28px;
      font-weight: 900;
      color: ${badgeText};
      line-height: 1;
    }
    .kpi-score-label {
      font-size: 11px;
      font-weight: 800;
      color: ${badgeText};
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 10px 0;
      border-left: 3.5px solid #2563eb;
      padding-left: 8px;
    }

    .sports-table, .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .sports-table th, .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 9px 12px;
      text-align: left;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .sports-table td, .data-table td {
      padding: 10px 12px;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .sports-table tr:last-child td, .data-table tr:last-child td {
      border-bottom: none;
    }
    .prog-track {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      width: 100%;
    }
    .prog-fill {
      height: 100%;
      border-radius: 4px;
    }

    .breakdown-row {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .breakdown-pill {
      flex: 1;
      padding: 10px 8px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .breakdown-pill-count {
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 2px;
    }
    .breakdown-pill-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .notes-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 18px;
    }
    .notes-header {
      font-size: 11px;
      font-weight: 900;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .notes-body {
      font-size: 12px;
      color: #1e293b;
      line-height: 1.5;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #0f172a;
      height: 35px;
      margin-bottom: 6px;
    }
    .signature-name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .signature-role {
      font-size: 10px;
      color: #64748b;
    }

    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-bar">
    <div class="header-title">
      <h1>Informe de Cumplimiento</h1>
      <p>EPL Triatlón Chile — Control y Evaluación del Rendimiento</p>
    </div>
    <div class="brand-logo">
      <div class="brand-logo-text">EPL TRIATLÓN</div>
      <div class="brand-logo-sub">High Performance Coaching</div>
    </div>
  </div>

  <!-- ATHLETE INFO -->
  <div class="athlete-card">
    <div class="athlete-col">
      <div class="info-row"><span class="info-label">Deportista:</span> <span class="info-value">${athleteName}</span></div>
      <div class="info-row"><span class="info-label">Periodo Evaluado:</span> <span class="info-value">${periodLabel} (Microciclo ${semanaNum})</span></div>
    </div>
    <div class="athlete-col" style="text-align: right;">
      <div class="info-row"><span class="info-label">Fecha de Inicio:</span> <span class="info-value">${startDate}</span></div>
      <div class="info-row"><span class="info-label">Fecha Emisión:</span> <span class="info-value">${todayStr}</span></div>
    </div>
  </div>

  <!-- SUMMARY KPIS -->
  <div class="kpi-container">
    ${kpiCardsHtml}
    <div class="kpi-score-card">
      <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Cumplimiento Deportivo</div>
      <div class="kpi-score-pct">${sportsAvgPct !== null ? sportsAvgPct : currentPct}%</div>
      <div class="kpi-score-label">${statusLabel}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 4px; font-weight: 700;">Promedio 3 Disciplinas</div>
    </div>
  </div>

  <!-- DISCIPLINE BREAKDOWN TABLE -->
  <div class="section-title">Desglose por Disciplina Deportiva</div>
  <table class="sports-table">
    <thead>
      <tr>
        <th style="width: 25%;">Disciplina</th>
        <th style="width: 20%;">Planificado</th>
        <th style="width: 20%;">Realizado</th>
        <th style="width: 15%;">Cumplimiento</th>
        <th style="width: 20%;">Progreso</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>🏊 Natación</strong></td>
        <td>${natPlanned}</td>
        <td><strong>${natCompleted}</strong></td>
        <td style="font-weight: 800; color: #0284c7;">${natPct}%</td>
        <td>
          <div class="prog-track">
            <div class="prog-fill" style="width: ${Math.min(100, natPct)}%; background: #0284c7;"></div>
          </div>
        </td>
      </tr>
      <tr>
        <td><strong>🚴 Ciclismo</strong></td>
        <td>${cicPlanned}</td>
        <td><strong>${cicCompleted}</strong></td>
        <td style="font-weight: 800; color: #16a34a;">${cicPct}%</td>
        <td>
          <div class="prog-track">
            <div class="prog-fill" style="width: ${Math.min(100, cicPct)}%; background: #16a34a;"></div>
          </div>
        </td>
      </tr>
      <tr>
        <td><strong>🏃 Carrera</strong></td>
        <td>${carPlanned}</td>
        <td><strong>${carCompleted}</strong></td>
        <td style="font-weight: 800; color: #ea580c;">${carPct}%</td>
        <td>
          <div class="prog-track">
            <div class="prog-fill" style="width: ${Math.min(100, carPct)}%; background: #ea580c;"></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- SESSION ADHERENCE / BREAKDOWN (TrainingPeaks) -->
  ${breakdownHtml}

  ${multiWeekHtml}

  <!-- COACH OBSERVATIONS -->
  ${coachNotesHtml}

  <!-- SIGNATURES -->
  <div class="signatures-row">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-name">Head Coach EPL Triatlón</div>
      <div class="signature-role">Dirección Técnica y Rendimiento</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-name">${athleteName}</div>
      <div class="signature-role">Firma del Atleta</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
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
        Alert.alert('Ventana emergente bloqueada', 'Por favor habilita las ventanas emergentes para generar el informe PDF.');
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
        dialogTitle: `Informe Cumplimiento - ${athleteName}`,
        UTI: 'com.adobe.pdf'
      });
    } else {
      Alert.alert('Compartir no disponible', 'No se puede compartir el PDF en este dispositivo.');
    }
  } catch (error) {
    console.error('PDF compliance generation error:', error);
    Alert.alert('Error', 'Hubo un error al generar el reporte PDF: ' + error.message);
  }
}
