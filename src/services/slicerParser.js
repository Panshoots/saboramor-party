/**
 * Analizador y extractor OCR para capturas de Bambu Studio / OrcaSlicer / Bambu Handy
 * Con soporte robusto para múltiples placas, tablas de placas y resumen global.
 */
import { createWorker } from 'tesseract.js';

/**
 * Preprocesamiento de imagen en navegador:
 * Si es tema oscuro (fondo oscuro con texto claro como Bambu Studio),
 * invierte colores a texto negro sobre fondo blanco y aumenta contraste para OCR óptimo.
 */
async function preprocessImageForOCR(imageSource) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return imageSource;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = 1.5;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(imageSource);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          let totalBrightness = 0;
          const step = 4 * 16;
          let samples = 0;
          for (let i = 0; i < d.length; i += step) {
            totalBrightness += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            samples++;
          }
          const avgBrightness = samples > 0 ? totalBrightness / samples : 255;
          const isDarkTheme = avgBrightness < 125;

          if (isDarkTheme) {
            for (let i = 0; i < d.length; i += 4) {
              let gray = 255 - (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
              gray = gray < 120 ? Math.max(0, gray - 50) : Math.min(255, gray + 50);
              d[i] = gray;
              d[i + 1] = gray;
              d[i + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(imageSource);
          }
        } catch (e) {
          resolve(imageSource);
        }
      };
      img.onerror = () => resolve(imageSource);

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
        img.src = URL.createObjectURL(imageSource);
      } else {
        resolve(imageSource);
      }
    } catch (e) {
      resolve(imageSource);
    }
  });
}

export async function extractTextFromImage(imageSource, onProgress = () => {}) {
  try {
    onProgress({ status: 'Preparando imagen y contraste...', progress: 0.1 });
    const processedSource = await preprocessImageForOCR(imageSource);

    onProgress({ status: 'Iniciando motor OCR local...', progress: 0.2 });
    const worker = await createWorker('spa+eng');
    
    onProgress({ status: 'Analizando texto de la captura...', progress: 0.5 });
    const ret = await worker.recognize(processedSource);
    
    onProgress({ status: 'Finalizando análisis...', progress: 0.9 });
    await worker.terminate();
    onProgress({ status: 'Listo', progress: 1.0 });

    return ret.data.text || '';
  } catch (error) {
    console.warn('Error en Tesseract OCR con spa+eng, reintentando con eng:', error);
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(imageSource);
      await worker.terminate();
      return ret.data.text || '';
    } catch (err2) {
      console.error('Error definitivo en OCR:', err2);
      throw new Error('No se pudo procesar la imagen automáticamente.');
    }
  }
}

/**
 * Analiza el texto en bruto de Bambu Studio con detección avanzada de múltiples placas
 */
export function parseBambuStudioText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return createEmptyParseResult();
  }

  // Normalizar comas a puntos decimales
  const normalizedText = rawText.replace(/(\d+),(\d+)/g, '$1.$2');
  const lines = normalizedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Detección de tablas por Placas individuales (multi-línea, tablas o bloques)
  const platesDetected = parseIndividualPlates(lines, normalizedText);

  // 2. Detección de Tiempo Total Global explícito
  const explicitTotalTime = parseExplicitTotalTime(normalizedText);

  // 3. Detección de Gramos Totales Globales explícitos
  const explicitTotalGrams = parseExplicitTotalGrams(normalizedText);

  // 4. Detección de Desglose de Desperdicio (Modelo, Soportes, Purga, Torre)
  const wasteBreakdown = parseWasteBreakdown(normalizedText);

  // 5. Detección de Filamentos individuales / colores
  const filamentsList = parseFilaments(lines, normalizedText);

  // 6. Tiempo y gramos de fallback si no hay explícito
  const fallbackTime = parsePrintTime(normalizedText);

  let finalHours = 0;
  let finalMinutes = 0;
  let finalGrams = 0;
  let platesList = [];
  let calculatedPlatesCount = 1;
  const isTotalAlreadyIncludingWaste = true;

  if (platesDetected.length > 0) {
    calculatedPlatesCount = platesDetected.length;
    platesList = platesDetected;

    const sumPlatesMins = platesDetected.reduce((acc, p) => acc + ((p.hours || 0) * 60 + (p.minutes || 0)), 0);
    const sumPlatesGrams = platesDetected.reduce((acc, p) => acc + (parseFloat(p.grams) || 0), 0);

    // Si hay un tiempo total explícito que sea mayor o igual a la suma
    const explicitTotalMins = explicitTotalTime ? (explicitTotalTime.hours * 60 + explicitTotalTime.minutes) : 0;
    const bestMins = Math.max(sumPlatesMins, explicitTotalMins);

    finalHours = Math.floor(bestMins / 60);
    finalMinutes = bestMins % 60;

    finalGrams = Math.max(sumPlatesGrams, explicitTotalGrams);

    // Si las placas individuales no traían gramos pero sí se detectó el total del trabajo,
    // distribuir los gramos totales entre las placas para no dejarlas en 0
    if (sumPlatesGrams === 0 && finalGrams > 0) {
      const perPlateG = Number((finalGrams / platesList.length).toFixed(1));
      platesList = platesList.map((p) => ({ ...p, grams: perPlateG }));
    }
  } else {
    // Si no vino desglose por filas de placa, buscar "3 placas" o "Placa 1 de 3"
    const generalPlates = parseGeneralPlatesCount(normalizedText);
    calculatedPlatesCount = generalPlates.totalPlates || 1;

    if (explicitTotalTime) {
      finalHours = explicitTotalTime.hours;
      finalMinutes = explicitTotalTime.minutes;
    } else {
      finalHours = fallbackTime.hours;
      finalMinutes = fallbackTime.minutes;
    }

    if (explicitTotalGrams > 0) {
      finalGrams = explicitTotalGrams;
    } else if (filamentsList.length > 0) {
      finalGrams = filamentsList.reduce((sum, f) => sum + (parseFloat(f.grams) || 0), 0);
    } else if (wasteBreakdown.modelGrams > 0) {
      finalGrams = wasteBreakdown.modelGrams + wasteBreakdown.supportGrams + wasteBreakdown.flushGrams + wasteBreakdown.towerGrams;
    }

    // Distribuir entre las placas detectadas
    platesList = generateDefaultPlatesList(calculatedPlatesCount, finalGrams, { hours: finalHours, minutes: finalMinutes });
  }

  // Si los filamentos detectados tienen gramos
  let finalFilaments = filamentsList;
  if (finalFilaments.length === 0 && finalGrams > 0) {
    finalFilaments = [
      {
        name: 'Filamento 1',
        color: 'Color Principal',
        grams: Number(finalGrams.toFixed(1)),
      },
    ];
  }

  const missingFields = [];
  if (finalGrams <= 0) missingFields.push('Gramos de filamento');
  if (finalHours === 0 && finalMinutes === 0) missingFields.push('Tiempo de impresión');

  return {
    rawText,
    time: { hours: finalHours, minutes: finalMinutes, raw: `${finalHours}h ${finalMinutes}m` },
    platesCount: calculatedPlatesCount,
    platesList,
    filaments: finalFilaments,
    wasteBreakdown,
    totalGrams: Number(finalGrams.toFixed(1)),
    isTotalAlreadyIncludingWaste,
    missingFields,
    success: missingFields.length === 0,
  };
}

/**
 * Detecta filas de placas específicas tipo:
 * Bloques multi-línea ("Placa 1\n1h 45m\n45.2g") o en línea ("Placa 1: 1h 45m, 45.2g")
 */
export function parseIndividualPlates(lines, fullText) {
  const plates = [];
  
  // Estrategia 1: Detección por bloques de líneas
  const plateIndices = [];
  lines.forEach((line, idx) => {
    const match = line.match(/(?:placa|plate|cama)\s*#?\s*(\d+)/i) || 
                  line.match(/^#?\s*(\d+)\s*(?:placa|plate|cama)\b/i) ||
                  line.match(/^(?:placa|plate)\s*(\d+)/i);
    if (match) {
      plateIndices.push({ index: idx, plateNum: parseInt(match[1], 10), line });
    }
  });

  if (plateIndices.length > 0) {
    for (let i = 0; i < plateIndices.length; i++) {
      const current = plateIndices[i];
      const nextIndex = (i + 1 < plateIndices.length) ? plateIndices[i + 1].index : lines.length;
      
      // Tomar las líneas del bloque actual, cortando si encuentra resumen total
      const rawBlockLines = lines.slice(current.index, Math.min(nextIndex, current.index + 6));
      const cleanBlockLines = [];
      for (const bLine of rawBlockLines) {
        if (/^(?:tiempo\s*total|total\s*(?:print\s*)?time|filamento\s*total|total\s*:)/i.test(bLine) && cleanBlockLines.length > 0) {
          break;
        }
        cleanBlockLines.push(bLine);
      }
      const blockText = cleanBlockLines.join(' ');

      // Gramos de la placa
      const gMatch = blockText.match(/(\d+[\.]?\d*)\s*(?:g|gr|gramos|grams)\b/i);
      const grams = gMatch ? parseFloat(gMatch[1]) : 0;

      // Tiempo de la placa
      const time = parsePrintTime(blockText);

      plates.push({
        id: `plate-${current.plateNum}-${Date.now()}-${i}`,
        plateNumber: current.plateNum,
        name: `Placa ${current.plateNum}`,
        hours: time.hours,
        minutes: time.minutes,
        grams: grams,
        notes: blockText.slice(0, 80),
      });
    }

    return plates.sort((a, b) => a.plateNumber - b.plateNumber);
  }

  // Estrategia 2: Formato tabla tipo "1   1h 30m   45.2g"
  const tableRowRegex = /^(\d+)\s+.*?(\d+\s*(?:h|hr|hrs)\s*\d*\s*(?:m|min)?|\d+\s*(?:m|min))\s+.*?(\d+[\.]?\d*)\s*(?:g|gr)\b/i;
  lines.forEach((line) => {
    const m = line.match(tableRowRegex);
    if (m) {
      const plateNum = parseInt(m[1], 10);
      const time = parsePrintTime(m[2]);
      const grams = parseFloat(m[3]) || 0;
      plates.push({
        id: `plate-${plateNum}-${Date.now()}`,
        plateNumber: plateNum,
        name: `Placa ${plateNum}`,
        hours: time.hours,
        minutes: time.minutes,
        grams: grams,
        notes: line,
      });
    }
  });

  return plates.sort((a, b) => a.plateNumber - b.plateNumber);
}

/**
 * Detecta horas y minutos en múltiples formatos de Bambu Studio / Slicers
 */
export function parsePrintTime(text) {
  if (!text) return { hours: 0, minutes: 0, raw: '' };

  // Formato: "1d 4h 25m"
  const dayMatch = text.match(/(\d+)\s*(?:d|día|dias|day|days)\s*(?:(\d+)\s*(?:h|hr|hrs|horas?))?\s*(?:(\d+)\s*(?:m|min|mins?))?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10) || 0;
    const hours = (parseInt(dayMatch[2], 10) || 0) + (days * 24);
    const minutes = parseInt(dayMatch[3], 10) || 0;
    return { hours, minutes, raw: dayMatch[0] };
  }

  // Formato: "2h 45m" o "2h45m" o "3 hr 12 min"
  const hmMatch = text.match(/(\d+)\s*(?:h|hr|hrs|horas?)\s*(\d+)\s*(?:m|min|mins?)/i);
  if (hmMatch) {
    return {
      hours: parseInt(hmMatch[1], 10) || 0,
      minutes: parseInt(hmMatch[2], 10) || 0,
      raw: hmMatch[0],
    };
  }

  // Formato: Solo horas "2h" o "3 hrs"
  const onlyHoursMatch = text.match(/(\d+)\s*(?:h|hr|hrs|horas?)(?!\s*\d+\s*(?:m|min))/i);
  if (onlyHoursMatch) {
    return {
      hours: parseInt(onlyHoursMatch[1], 10) || 0,
      minutes: 0,
      raw: onlyHoursMatch[0],
    };
  }

  // Formato: Solo minutos "45m" o "52 min"
  const mMatch = text.match(/(?:tiempo|time)?\s*[:\-]?\s*(\d+)\s*(?:m|min|mins?)(?!\s*h)/i);
  if (mMatch) {
    return {
      hours: 0,
      minutes: parseInt(mMatch[1], 10) || 0,
      raw: mMatch[0],
    };
  }

  // Formato digital HH:MM:SS o HH:MM (ej: "03:45:12" o "02:30")
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
 * Busca específicamente "Tiempo total" en el texto
 */
export function parseExplicitTotalTime(text) {
  if (!text) return null;
  const totalMatch = text.match(/(?:tiempo\s*total|total\s*(?:print\s*)?time|total\s*de\s*impresi[oó]n|tiempo\s*estimado\s*total)\s*[:\-]?\s*([^\r\n]+)/i);
  if (totalMatch) {
    const parsed = parsePrintTime(totalMatch[1]);
    if (parsed.hours > 0 || parsed.minutes > 0) return parsed;
  }
  return null;
}

/**
 * Busca específicamente gramos totales en el texto
 */
export function parseExplicitTotalGrams(text) {
  if (!text) return 0;
  const totalMatch = text.match(/(?:filamento\s*total|total\s*filament|peso\s*total|total\s*weight|peso\s*del\s*modelo\s*total)\s*[:\-]?\s*(\d+[\.]?\d*)\s*(?:g|gr|gramos|grams)\b/i);
  if (totalMatch) {
    return parseFloat(totalMatch[1]) || 0;
  }
  const generalTotal = text.match(/\btotal\s*[:\-]?\s*(\d+[\.]?\d*)\s*(?:g|gr|gramos|grams)\b/i);
  if (generalTotal) {
    return parseFloat(generalTotal[1]) || 0;
  }
  return 0;
}

/**
 * Conteo global de placas (ej: "Total placas: 3", "3 placas", "Plate 1 of 3")
 */
function parseGeneralPlatesCount(text) {
  const plateOfMatch = text.match(/(?:placa|plate)\s*(\d+)\s*(?:\/|de|of)\s*(\d+)/i);
  if (plateOfMatch) {
    return {
      currentPlate: parseInt(plateOfMatch[1], 10) || 1,
      totalPlates: parseInt(plateOfMatch[2], 10) || 1,
    };
  }

  const countMatch = text.match(/(\d+)\s*(?:placas?|plates?)\b/i);
  if (countMatch) {
    return {
      currentPlate: 1,
      totalPlates: parseInt(countMatch[1], 10) || 1,
    };
  }

  return { currentPlate: 1, totalPlates: 1 };
}

/**
 * Desglose de desperdicios (modelo, soportes, purga, torre)
 */
function parseWasteBreakdown(text) {
  const modelMatch = text.match(/(?:modelo|model)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  const supportMatch = text.match(/(?:soportes?|support(?:s)?)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
  const flushMatch = text.match(/(?:purga|flush)\s*[:\-]?\s*(\d+[\.]?\d*)\s*g/i);
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
 * Extrae lista de filamentos / colores
 */
function parseFilaments(lines, fullText) {
  const filaments = [];

  lines.forEach((line) => {
    const gMatch = line.match(/(\d+[\.]?\d*)\s*g\b/i);
    if (gMatch) {
      const grams = parseFloat(gMatch[1]);
      // Ignorar líneas de resumen
      if (/total|modelo|model|soportes?|support|purga|flush|torre|tower|cost|precio|placa|plate/i.test(line)) {
        return;
      }

      if (grams > 0 && grams < 5000) {
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
 * Genera lista de placas por defecto cuando solo se detecta el número total
 */
function generateDefaultPlatesList(count, totalGrams, timeResult) {
  const plates = [];
  const validCount = Math.max(1, count);
  const gramsPerPlate = validCount > 0 ? Number((totalGrams / validCount).toFixed(1)) : totalGrams;
  
  const totalMinutes = ((timeResult?.hours || 0) * 60) + (timeResult?.minutes || 0);
  const minsPerPlate = validCount > 0 ? Math.floor(totalMinutes / validCount) : totalMinutes;

  for (let i = 1; i <= validCount; i++) {
    plates.push({
      id: `plate-${i}-${Date.now()}`,
      plateNumber: i,
      name: `Placa ${i}`,
      hours: Math.floor(minsPerPlate / 60),
      minutes: minsPerPlate % 60,
      grams: gramsPerPlate,
      notes: '',
    });
  }
  return plates;
}

/**
 * Combina resultados de varias fotos (múltiples capturas de placas)
 */
export function combineMultipleSlicerResults(resultsList) {
  if (!resultsList || resultsList.length === 0) return createEmptyParseResult();
  if (resultsList.length === 1) return resultsList[0];

  let totalMinutes = 0;
  const combinedPlates = [];
  const mergedFilaments = [];
  let totalGrams = 0;

  resultsList.forEach((res, idx) => {
    const mins = ((res.time?.hours || 0) * 60) + (res.time?.minutes || 0);
    totalMinutes += mins;
    totalGrams += (res.totalGrams || 0);

    if (res.platesList && res.platesList.length > 0) {
      res.platesList.forEach((p) => {
        combinedPlates.push({
          ...p,
          id: `comb-plate-${combinedPlates.length + 1}`,
          plateNumber: combinedPlates.length + 1,
          name: `Placa ${combinedPlates.length + 1}`,
        });
      });
    } else {
      combinedPlates.push({
        id: `comb-plate-${combinedPlates.length + 1}`,
        plateNumber: combinedPlates.length + 1,
        name: `Placa ${combinedPlates.length + 1} (Foto ${idx + 1})`,
        hours: res.time?.hours || 0,
        minutes: res.time?.minutes || 0,
        grams: res.totalGrams || 0,
        notes: '',
      });
    }

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
    time: { hours: finalHours, minutes: finalMins, raw: `${finalHours}h ${finalMins}m` },
    platesCount: combinedPlates.length,
    platesList: combinedPlates,
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
    platesCount: 1,
    platesList: [{ id: 'plate-1', plateNumber: 1, name: 'Placa 1', hours: 0, minutes: 0, grams: 0, notes: '' }],
    filaments: [],
    wasteBreakdown: { modelGrams: 0, supportGrams: 0, flushGrams: 0, towerGrams: 0, hasBreakdown: false },
    totalGrams: 0,
    isTotalAlreadyIncludingWaste: true,
    missingFields: ['Gramos de filamento', 'Tiempo de impresión'],
    success: false,
  };
}
