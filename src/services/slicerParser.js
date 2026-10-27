/**
 * Analizador y extractor OCR para capturas de Bambu Studio / OrcaSlicer / Bambu Handy
 * Ejecución 100% en el dispositivo del usuario (local, segura y sin costos)
 */
import { createWorker } from 'tesseract.js';

/**
 * Procesa una imagen con Tesseract.js
 * @param {string|File|Blob} imageSource - URL en base64, Blob o File
 * @param {Function} onProgress - Callback de avance (0-100%)
 * @returns {Promise<string>} Texto extraído
 */
export async function extractTextFromImage(imageSource, onProgress = () => {}) {
  try {
    onProgress({ status: 'Iniciando motor OCR local...', progress: 0.1 });
    const worker = await createWorker('spa+eng');
    
    onProgress({ status: 'Analizando texto de la captura...', progress: 0.4 });
    const ret = await worker.recognize(imageSource);
    
    onProgress({ status: 'Finalizando análisis...', progress: 0.9 });
    await worker.terminate();
    onProgress({ status: 'Listo', progress: 1.0 });

    return ret.data.text || '';
  } catch (error) {
    console.warn('Error en Tesseract OCR, reintentando con fallback:', error);
    // Intento con sólo 'eng' si 'spa+eng' falla
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(imageSource);
      await worker.terminate();
      return ret.data.text || '';
    } catch (err2) {
      console.error('Error definitivo en OCR:', err2);
      throw new Error('No se pudo procesar la imagen automáticamente. Puedes ingresar los datos manualmente.');
    }
  }
}

/**
 * Analiza el texto en bruto y extrae campos de Bambu Studio
 * @param {string} rawText 
 * @returns {Object} Datos extraídos estructurados
 */
export function parseBambuStudioText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return createEmptyParseResult();
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const normalizedText = rawText.replace(/,/g, '.'); // Normalizar decimales con punto

  // 1. Detección de Tiempo de Impresión
  const timeResult = parsePrintTime(normalizedText);

  // 2. Detección de Placas
  const platesResult = parsePlates(normalizedText);

  // 3. Detección de Desglose de Desperdicio (Soportes, Purga, Torre)
  const wasteBreakdown = parseWasteBreakdown(normalizedText);

  // 4. Detección de Filamentos y Colores
  const filamentsList = parseFilaments(lines, normalizedText);

  // 5. Total de gramos y verificación de duplicidad
  const totalGramsDetected = parseTotalGrams(normalizedText);

  // Regla importante de Bambu Studio:
  // Si la captura muestra un Total explícito o una lista de slots donde el total ya suma purga/soportes,
  // evitamos contar dos veces el material.
  let isTotalAlreadyIncludingWaste = false;
  let finalGrams = 0;

  if (totalGramsDetected > 0) {
    finalGrams = totalGramsDetected;
    isTotalAlreadyIncludingWaste = true;
  } else if (filamentsList.length > 0) {
    finalGrams = filamentsList.reduce((sum, f) => sum + (parseFloat(f.grams) || 0), 0);
    // Si la suma de filamentos es mayor que solo el modelo y se detectó purga/soportes,
    // significa que los slots ya incluyen la purga
    if (wasteBreakdown.modelGrams > 0 && finalGrams >= wasteBreakdown.modelGrams) {
      isTotalAlreadyIncludingWaste = true;
    }
  } else if (wasteBreakdown.modelGrams > 0) {
    // Si solo leyó modelo y desglose
    finalGrams = wasteBreakdown.modelGrams + wasteBreakdown.supportGrams + wasteBreakdown.flushGrams + wasteBreakdown.towerGrams;
    isTotalAlreadyIncludingWaste = true;
  }

  // Comprobar qué datos faltan para solicitarlos al usuario
  const missingFields = [];
  if (finalGrams <= 0) missingFields.push('Gramos de filamento');
  if (timeResult.hours === 0 && timeResult.minutes === 0) missingFields.push('Tiempo de impresión');

  return {
    rawText,
    time: timeResult,
    plates: platesResult,
    filaments: filamentsList.length > 0 ? filamentsList : (finalGrams > 0 ? [{ name: 'Filamento 1', color: 'Detectado', grams: finalGrams }] : []),
    wasteBreakdown,
    totalGrams: Number(finalGrams.toFixed(1)),
    isTotalAlreadyIncludingWaste,
    missingFields,
    success: missingFields.length === 0,
  };
}

/**
 * Extrae horas y minutos del texto
 */
function parsePrintTime(text) {
  // Patrón 1: "1d 4h 25m" o "2d 5h"
  const dayMatch = text.match(/(\d+)\s*(?:d|día|dias)\s*(?:(\d+)\s*(?:h|hr|hrs|horas?))?\s*(?:(\d+)\s*(?:m|min|mins?))?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10) || 0;
    const hours = (parseInt(dayMatch[2], 10) || 0) + (days * 24);
    const minutes = parseInt(dayMatch[3], 10) || 0;
    return { hours, minutes, raw: dayMatch[0] };
  }

  // Patrón 2: "2h 45m" o "1h45m" o "3 hr 12 min"
  const hmMatch = text.match(/(\d+)\s*(?:h|hr|hrs|horas?|:)\s*(\d+)\s*(?:m|min|mins?)/i);
  if (hmMatch) {
    return {
      hours: parseInt(hmMatch[1], 10) || 0,
      minutes: parseInt(hmMatch[2], 10) || 0,
      raw: hmMatch[0],
    };
  }

  // Patrón 3: Solo minutos "45m" o "52 min"
  const mMatch = text.match(/(?:tiempo|time)?\s*[:\-]?\s*(\d+)\s*(?:m|min|mins?)(?!\s*h)/i);
  if (mMatch) {
    return {
      hours: 0,
      minutes: parseInt(mMatch[1], 10) || 0,
      raw: mMatch[0],
    };
  }

  // Patrón 4: Formato HH:MM:SS o HH:MM
  const clockMatch = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (clockMatch) {
    return {
      hours: parseInt(clockMatch[1], 10) || 0,
      minutes: parseInt(clockMatch[2], 10) || 0,
      raw: clockMatch[0],
    };
  }

  return { hours: 0, minutes: 0, raw: '' };
}

/**
 * Extrae conteo de placas
 */
function parsePlates(text) {
  // Ej: "Placa 1/2" o "Plate 2 of 3" o "Placa 1 de 4"
  const plateMatch = text.match(/(?:placa|plate)\s*(\d+)\s*(?:\/|de|of)\s*(\d+)/i);
  if (plateMatch) {
    return {
      currentPlate: parseInt(plateMatch[1], 10) || 1,
      totalPlates: parseInt(plateMatch[2], 10) || 1,
      raw: plateMatch[0],
    };
  }

  // Ej: "2 placas" o "Total placas: 3"
  const totalMatch = text.match(/(?:total\s*(?:de\s*)?placas?|placas?)\s*[:\-]?\s*(\d+)/i);
  if (totalMatch) {
    return {
      currentPlate: 1,
      totalPlates: parseInt(totalMatch[1], 10) || 1,
      raw: totalMatch[0],
    };
  }

  return { currentPlate: 1, totalPlates: 1, raw: '1 placa (por defecto)' };
}

/**
 * Extrae el desglose de desperdicios si están detallados
 */
function parseWasteBreakdown(text) {
  // Modelo: "Modelo: 35.2g"
  const modelMatch = text.match(/(?:modelo|model)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  // Soportes: "Soportes: 4.8g" o "Support"
  const supportMatch = text.match(/(?:soportes?|support(?:s)?)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  // Purga / Flush: "Purga: 12.0g" o "Flush"
  const flushMatch = text.match(/(?:purga|flush)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  // Torre de purga / Prime tower: "Torre: 3.5g" o "Prime tower"
  const towerMatch = text.match(/(?:torre(?: de purga)?|prime tower|tower)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);

  return {
    modelGrams: modelMatch ? parseFloat(modelMatch[1]) : 0,
    supportGrams: supportMatch ? parseFloat(supportMatch[1]) : 0,
    flushGrams: flushMatch ? parseFloat(flushMatch[1]) : 0,
    towerGrams: towerMatch ? parseFloat(towerMatch[1]) : 0,
    hasBreakdown: Boolean(modelMatch || supportMatch || flushMatch || towerMatch),
  };
}

/**
 * Extrae lista de filamentos individuales o colores por slot
 */
function parseFilaments(lines, fullText) {
  const filaments = [];

  // Buscar líneas tipo: "1. PLA Basic Black 42.15g" o "Slot 1: 30g" o "Negro: 25.4 g"
  lines.forEach((line) => {
    // Si la línea contiene gramos
    const gMatch = line.match(/(\d+[\.]?\d*)\s*g\b/i);
    if (gMatch) {
      const grams = parseFloat(gMatch[1]);
      // Ignorar si es "Total: XXg" o "Model: XXg" para no confundirlo con un color
      if (/total|modelo|model|soportes?|support|purga|flush|torre|tower|cost|precio/i.test(line)) {
        return;
      }

      if (grams > 0 && grams < 5000) {
        // Limpiar el nombre del filamento
        let name = line.replace(/(\d+[\.]?\d*)\s*g.*/i, '')
          .replace(/[#\(\)\[\]\:]/g, ' ')
          .trim();
        if (!name || name.length < 2) {
          name = `Filamento Color ${filaments.length + 1}`;
        }
        filaments.push({
          name: name.slice(0, 30),
          color: name,
          grams: grams,
        });
      }
    }
  });

  return filaments;
}

/**
 * Extrae el total explícito de gramos
 */
function parseTotalGrams(text) {
  // Patrón "Total: 58.2g" o "Total de filamento: 45.0 g" o "Weight: 45g"
  const totalMatch = text.match(/(?:total(?: de filamento)?|peso(?: total)?|weight)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  if (totalMatch) {
    return parseFloat(totalMatch[1]) || 0;
  }
  return 0;
}

/**
 * Combina resultados de varias fotos (por ejemplo múltiples placas)
 * @param {Array<Object>} resultsList 
 * @returns {Object}
 */
export function combineMultipleSlicerResults(resultsList) {
  if (!resultsList || resultsList.length === 0) return createEmptyParseResult();
  if (resultsList.length === 1) return resultsList[0];

  let totalMinutes = 0;
  let totalPlates = 0;
  const mergedFilaments = [];
  let totalGrams = 0;

  resultsList.forEach((res, idx) => {
    const mins = ((res.time?.hours || 0) * 60) + (res.time?.minutes || 0);
    totalMinutes += mins;
    totalPlates += (res.plates?.totalPlates || 1);
    totalGrams += (res.totalGrams || 0);

    if (res.filaments && Array.isArray(res.filaments)) {
      res.filaments.forEach((f) => {
        const existing = mergedFilaments.find((item) => item.name.toLowerCase() === f.name.toLowerCase());
        if (existing) {
          existing.grams = Number((existing.grams + f.grams).toFixed(1));
        } else {
          mergedFilaments.push({ ...f });
        }
      });
    }
  });

  const finalHours = Math.floor(totalMinutes / 60);
  const finalMins = totalMinutes % 60;

  return {
    rawText: `Combinación de ${resultsList.length} capturas / placas`,
    time: { hours: finalHours, minutes: finalMins, raw: `${finalHours}h ${finalMins}m (Suma de placas)` },
    plates: { currentPlate: 1, totalPlates, raw: `${totalPlates} placas combinadas` },
    filaments: mergedFilaments.length > 0 ? mergedFilaments : [{ name: 'Filamento Total', color: 'Múltiple', grams: Number(totalGrams.toFixed(1)) }],
    totalGrams: Number(totalGrams.toFixed(1)),
    isTotalAlreadyIncludingWaste: true,
    missingFields: totalGrams <= 0 ? ['Gramos de filamento'] : [],
    success: totalGrams > 0,
  };
}

function createEmptyParseResult() {
  return {
    rawText: '',
    time: { hours: 0, minutes: 0, raw: '' },
    plates: { currentPlate: 1, totalPlates: 1, raw: '1 placa' },
    filaments: [],
    wasteBreakdown: { modelGrams: 0, supportGrams: 0, flushGrams: 0, towerGrams: 0, hasBreakdown: false },
    totalGrams: 0,
    isTotalAlreadyIncludingWaste: true,
    missingFields: ['Gramos de filamento', 'Tiempo de impresión'],
    success: false,
  };
}
