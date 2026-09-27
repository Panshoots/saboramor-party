import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const ZONES_INFO = [
  { id: 1, name: 'Z1', label: 'Recuperación / Aeróbico Ligero', coef: 1, color: '#38bdf8' },
  { id: 2, name: 'Z2', label: 'Aeróbico Medio / Extensivo', coef: 2, color: '#4ade80' },
  { id: 3, name: 'Z3', label: 'Aeróbico Intensivo / Tempo', coef: 3, color: '#a3e635' },
  { id: 4, name: 'Z4', label: 'Umbral Anaeróbico / FTP', coef: 4, color: '#facc15' },
  { id: 5, name: 'Z5', label: 'VO2 Máx / Consumo Máx O2', coef: 6, color: '#fb923c' },
  { id: 6, name: 'Z6', label: 'Capacidad Anaeróbica Láctica', coef: 9, color: '#f87171' },
  { id: 7, name: 'Z7', label: 'Potencia Anaeróbica Láctica', coef: 15, color: '#e11d48' },
  { id: 8, name: 'Z8', label: 'Potencia Aláctica / Sprint', coef: 50, color: '#a855f7' },
];

const SPORT_FACTORS = {
  natacion: 0.75,
  ciclismo: 0.50,
  carrera: 1.00
};

const STRENGTH_CATEGORIES = {
  levantamientos: [
    { id: 1, name: '1 · Monoarticular', factor: 0.08, desc: 'Ej: Curl bíceps, Tríceps polea, Extensiones' },
    { id: 2, name: '2 · Multiarticular auxiliar', factor: 0.24, desc: 'Ej: Remo mancuerna, Press militar máq.' },
    { id: 3, name: '3 · Multiarticular', factor: 0.84, desc: 'Ej: Sentadilla, Peso Muerto, Press Banca' },
    { id: 4, name: '4 · Potencia', factor: 1.12, desc: 'Ej: Cargadas, Arrancadas, Push Press' },
    { id: 5, name: '5 · Máxima Potencia', factor: 1.50, desc: 'Ej: Levantamiento olímpico máximo' },
  ],
  saltos: [
    { id: 1, name: '1 · Monoarticular', factor: 0.08, desc: 'Ej: Tobillos reactivos, Gemelos elásticos' },
    { id: 2, name: '2 · Multiarticular auxiliar', factor: 0.40, desc: 'Ej: Saltos suaves, Lanzamiento balón liviano' },
    { id: 3, name: '3 · Multiarticular', factor: 0.84, desc: 'Ej: Salto al cajón, Saltos en largo' },
    { id: 4, name: '4 · Potencia', factor: 1.36, desc: 'Ej: Saltos con caída (Drop jump), Balón pesado' },
    { id: 5, name: '5 · Máxima Potencia', factor: 1.90, desc: 'Ej: Pliometría de alto impacto / rebote máximo' },
  ]
};

const createInitialDaySportState = () => ({
  zones: {
    1: { min: '', seg: '' },
    2: { min: '', seg: '' },
    3: { min: '', seg: '' },
    4: { min: '', seg: '' },
    5: { min: '', seg: '' },
    6: { min: '', seg: '' },
    7: { min: '', seg: '' },
    8: { min: '', seg: '' },
  },
  totalMin: 0,
  ecos: 0
});

const createInitialEcosState = () => {
  const state = {};
  DAYS.forEach(d => {
    state[d] = {
      natacion: createInitialDaySportState(),
      ciclismo: createInitialDaySportState(),
      carrera: createInitialDaySportState(),
      fuerza: {
        ejercicios: [],
        totalReps: 0,
        ecos: 0
      }
    };
  });
  return state;
};

const getMondayDate = (dateString) => {
  let d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateChile = (date) => {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear().toString().substring(2)}`;
};

const getEcosWeekStartDate = (athlete, wIdx) => {
  if (!athlete?.plan?.fechaInicio) {
    const todayDate = new Date();
    const monday = getMondayDate(todayDate.toISOString().split('T')[0]);
    return formatDateChile(monday);
  }
  const d = new Date(athlete.plan.fechaInicio + 'T00:00:00');
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mondayStart = new Date(d.setDate(diff));
  
  const weekDate = new Date(mondayStart.getTime());
  weekDate.setDate(weekDate.getDate() + (wIdx * 7));
  return formatDateChile(weekDate);
};

export default function EcosTab({ atletas, onSaveEcos }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [selectedAtletaId, setSelectedAtletaId] = useState(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [activeDay, setActiveDay] = useState('Lunes');
  const [activeSportTab, setActiveSportTab] = useState('natacion'); // 'natacion' | 'ciclismo' | 'carrera' | 'fuerza'
  const [ecosState, setEcosState] = useState(createInitialEcosState());

  // Converter States for Natacion & Carrera
  const [convDist, setConvDist] = useState('');
  const [convRitmo, setConvRitmo] = useState('');
  const [convTargetZone, setConvTargetZone] = useState('2');
  const [showConverterSport, setShowConverterSport] = useState(null);

  // Strength Exercise Add Modal / Form States
  const [showAddStrengthModal, setShowAddStrengthModal] = useState(false);
  const [strType, setStrType] = useState('levantamientos'); // 'levantamientos' | 'saltos'
  const [strCategory, setStrCategory] = useState(3); // 1..5
  const [strName, setStrName] = useState('');
  const [strSets, setStrSets] = useState('4');
  const [strReps, setStrReps] = useState('8');
  const [strDirectReps, setStrDirectReps] = useState('');

  const selectedAthlete = (atletas || []).find(a => a.id === selectedAtletaId) || (atletas && atletas[0]) || null;

  // Load week ECOs
  const loadAthleteWeekEcos = (athlete, weekIndex) => {
    if (!athlete) return;
    const weekStartDate = getEcosWeekStartDate(athlete, weekIndex);
    
    let loaded = null;
    if (athlete.ecosWeeks && athlete.ecosWeeks[weekStartDate]) {
      loaded = athlete.ecosWeeks[weekStartDate];
    } else {
      const historyItem = (athlete.ecosHistory || []).find(h => h.semanaFecha === weekStartDate);
      if (historyItem && historyItem.details) {
        loaded = historyItem.details;
      }
    }

    if (loaded) {
      // Normalize loaded state to ensure 8 zones and fuerza format
      const normalized = createInitialEcosState();
      DAYS.forEach(d => {
        if (loaded[d]) {
          ['natacion', 'ciclismo', 'carrera'].forEach(s => {
            if (loaded[d][s]) {
              if (loaded[d][s].zones) {
                normalized[d][s] = loaded[d][s];
              } else if (loaded[d][s].minutos !== undefined) {
                // Legacy migration
                const z = parseInt(loaded[d][s].zona) || 2;
                const m = String(loaded[d][s].minutos || '');
                const seg = String(loaded[d][s].segundos || '');
                normalized[d][s].zones[z] = { min: m, seg: seg };
                const calc = calculateSportEcos(s, normalized[d][s].zones);
                normalized[d][s].totalMin = calc.totalMin;
                normalized[d][s].ecos = calc.ecos;
              }
            }
          });

          if (loaded[d].fuerza) {
            normalized[d].fuerza = loaded[d].fuerza;
          }
        }
      });
      setEcosState(normalized);
    } else {
      setEcosState(createInitialEcosState());
    }
  };

  useEffect(() => {
    if (atletas && atletas.length > 0) {
      const activeId = selectedAtletaId || atletas[0].id;
      if (!selectedAtletaId) {
        setSelectedAtletaId(activeId);
      }
      const active = atletas.find(a => a.id === activeId);
      if (active) {
        loadAthleteWeekEcos(active, activeWeekIndex);
      }
    }
  }, [atletas, selectedAtletaId, activeWeekIndex]);

  // Calculation Functions
  const calculateSportEcos = (sportKey, zonesMap) => {
    const factor = SPORT_FACTORS[sportKey] || 1.0;
    let totalMin = 0;
    let totalEcos = 0;
    
    if (!zonesMap) return { totalMin: 0, ecos: 0 };

    ZONES_INFO.forEach(z => {
      const zEntry = zonesMap[z.id] || { min: '', seg: '' };
      const m = parseFloat(zEntry.min) || 0;
      const s = parseFloat(zEntry.seg) || 0;
      const timeMin = m + (s / 60);
      totalMin += timeMin;
      totalEcos += timeMin * z.coef * factor;
    });

    return {
      totalMin,
      ecos: totalEcos
    };
  };

  const calculateStrengthDayEcos = (fuerzaObj) => {
    if (!fuerzaObj || !fuerzaObj.ejercicios) return { totalReps: 0, ecos: 0 };
    let totalReps = 0;
    let totalEcos = 0;
    fuerzaObj.ejercicios.forEach(ej => {
      totalReps += parseFloat(ej.totalReps) || 0;
      totalEcos += parseFloat(ej.ecos) || 0;
    });
    return {
      totalReps,
      ecos: totalEcos
    };
  };

  const handleZoneTimeChange = (sport, zoneId, field, value) => {
    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const sportData = { ...dayData[sport] };
      const currentZones = { ...sportData.zones };
      const zoneEntry = { ...(currentZones[zoneId] || { min: '', seg: '' }) };

      zoneEntry[field] = value;
      currentZones[zoneId] = zoneEntry;

      const calc = calculateSportEcos(sport, currentZones);
      sportData.zones = currentZones;
      sportData.totalMin = calc.totalMin;
      sportData.ecos = calc.ecos;

      dayData[sport] = sportData;

      return {
        ...prev,
        [activeDay]: dayData
      };
    });
  };

  const handleConvertAndApply = (sport) => {
    const dist = parseFloat(convDist);
    const ritmo = parseFloat(convRitmo);

    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Ingresa una distancia válida en metros.');
      return;
    }
    if (isNaN(ritmo) || ritmo <= 0) {
      Alert.alert('Error', 'Ingresa un ritmo por 100m válido (ej: 1.75).');
      return;
    }

    const totalMinutos = (dist / 100) * ritmo;
    const minutos = Math.floor(totalMinutos);
    const segundos = Math.round((totalMinutos % 1) * 60);
    const targetZ = parseInt(convTargetZone) || 2;

    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const sportData = { ...dayData[sport] };
      const currentZones = { ...sportData.zones };

      currentZones[targetZ] = {
        min: minutos.toString(),
        seg: segundos > 0 ? segundos.toString() : ''
      };

      const calc = calculateSportEcos(sport, currentZones);
      sportData.zones = currentZones;
      sportData.totalMin = calc.totalMin;
      sportData.ecos = calc.ecos;

      dayData[sport] = sportData;

      return {
        ...prev,
        [activeDay]: dayData
      };
    });

    setConvDist('');
    setConvRitmo('');
    setShowConverterSport(null);
    Keyboard.dismiss();
    Alert.alert('Calculado', `Se añadieron ${minutos}m ${segundos}s a la Zona Z${targetZ} en ${sport.toUpperCase()}.`);
  };

  // Add Strength Exercise Handler
  const handleAddStrengthExercise = () => {
    const categoriesList = STRENGTH_CATEGORIES[strType] || STRENGTH_CATEGORIES.levantamientos;
    const selectedCat = categoriesList.find(c => c.id === parseInt(strCategory)) || categoriesList[0];
    const factor = selectedCat.factor;

    let totalReps = 0;
    if (strDirectReps.trim() !== '') {
      totalReps = parseFloat(strDirectReps) || 0;
    } else {
      const sets = parseFloat(strSets) || 1;
      const reps = parseFloat(strReps) || 0;
      totalReps = sets * reps;
    }

    if (totalReps <= 0) {
      Alert.alert('Error', 'Por favor ingresa las series y repeticiones.');
      return;
    }

    const calculatedEcos = totalReps * factor;

    const newExercise = {
      id: Date.now(),
      tipo: strType,
      categoriaId: selectedCat.id,
      categoriaNombre: selectedCat.name,
      nombre: strName.trim() || (strType === 'levantamientos' ? 'Levantamiento' : 'Salto/Lanzamiento'),
      series: strSets,
      reps: strReps,
      totalReps: totalReps,
      factor: factor,
      ecos: calculatedEcos
    };

    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const currentFuerza = dayData.fuerza || { ejercicios: [], totalReps: 0, ecos: 0 };
      const updatedList = [...(currentFuerza.ejercicios || []), newExercise];

      const calc = calculateStrengthDayEcos({ ejercicios: updatedList });

      dayData.fuerza = {
        ejercicios: updatedList,
        totalReps: calc.totalReps,
        ecos: calc.ecos
      };

      return {
        ...prev,
        [activeDay]: dayData
      };
    });

    setStrName('');
    setStrDirectReps('');
    setShowAddStrengthModal(false);
  };

  const handleDeleteStrengthExercise = (exerciseId) => {
    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const currentFuerza = dayData.fuerza || { ejercicios: [], totalReps: 0, ecos: 0 };
      const updatedList = (currentFuerza.ejercicios || []).filter(e => e.id !== exerciseId);

      const calc = calculateStrengthDayEcos({ ejercicios: updatedList });

      dayData.fuerza = {
        ejercicios: updatedList,
        totalReps: calc.totalReps,
        ecos: calc.ecos
      };

      return {
        ...prev,
        [activeDay]: dayData
      };
    });
  };

  // Day Totals & Weekly Aggregation
  const getDaySummary = (dayName) => {
    const d = ecosState[dayName] || {};
    const nat = calculateSportEcos('natacion', d.natacion?.zones);
    const cic = calculateSportEcos('ciclismo', d.ciclismo?.zones);
    const car = calculateSportEcos('carrera', d.carrera?.zones);
    const fue = calculateStrengthDayEcos(d.fuerza);

    const totalEcos = nat.ecos + cic.ecos + car.ecos + fue.ecos;
    return {
      natEcos: nat.ecos,
      cicEcos: cic.ecos,
      carEcos: car.ecos,
      fueEcos: fue.ecos,
      totalEcos,
      natMin: nat.totalMin,
      cicMin: cic.totalMin,
      carMin: car.totalMin,
      fueReps: fue.totalReps
    };
  };

  const totalsByDay = {};
  let weeklyTotalNatEcos = 0;
  let weeklyTotalCicEcos = 0;
  let weeklyTotalCarEcos = 0;
  let weeklyTotalFueEcos = 0;
  let weeklyTotalEcos = 0;

  DAYS.forEach(d => {
    const summary = getDaySummary(d);
    totalsByDay[d] = summary;
    weeklyTotalNatEcos += summary.natEcos;
    weeklyTotalCicEcos += summary.cicEcos;
    weeklyTotalCarEcos += summary.carEcos;
    weeklyTotalFueEcos += summary.fueEcos;
    weeklyTotalEcos += summary.totalEcos;
  });

  const handleSaveEcosWeekly = () => {
    if (!selectedAtletaId) {
      Alert.alert('Error', 'Selecciona un deportista primero.');
      return;
    }

    const weekStartDateStr = getEcosWeekStartDate(selectedAthlete, activeWeekIndex);

    if (onSaveEcos) {
      onSaveEcos(selectedAtletaId, ecosState, weeklyTotalEcos, weekStartDateStr);
      Alert.alert('Guardado', `Carga semanal guardada (${weekStartDateStr}): ${weeklyTotalEcos.toFixed(1)} ECOs acumulados (Nat: ${weeklyTotalNatEcos.toFixed(1)}, Cic: ${weeklyTotalCicEcos.toFixed(1)}, Car: ${weeklyTotalCarEcos.toFixed(1)}, Fue: ${weeklyTotalFueEcos.toFixed(1)}).`);
    }
  };

  const handleShareCurrentWeekPDF = async () => {
    if (!selectedAthlete) {
      Alert.alert('Error', 'Selecciona un deportista primero.');
      return;
    }
    
    const weekStartDateStr = getEcosWeekStartDate(selectedAthlete, activeWeekIndex);
    
    let dailyRowsHtml = '';
    DAYS.forEach(d => {
      const info = totalsByDay[d];
      dailyRowsHtml += `
        <tr>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${d}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #0284c7;">
            ${info.natEcos > 0 ? `<strong>${info.natEcos.toFixed(1)}</strong> <span style="font-size:10px; color:#64748b;">(${Math.round(info.natMin)}m)</span>` : '-'}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #16a34a;">
            ${info.cicEcos > 0 ? `<strong>${info.cicEcos.toFixed(1)}</strong> <span style="font-size:10px; color:#64748b;">(${Math.round(info.cicMin)}m)</span>` : '-'}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #ea580c;">
            ${info.carEcos > 0 ? `<strong>${info.carEcos.toFixed(1)}</strong> <span style="font-size:10px; color:#64748b;">(${Math.round(info.carMin)}m)</span>` : '-'}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #8b5cf6;">
            ${info.fueEcos > 0 ? `<strong>${info.fueEcos.toFixed(1)}</strong> <span style="font-size:10px; color:#64748b;">(${info.fueReps} reps)</span>` : '-'}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 900; text-align: right; color: #2563eb; font-size: 13px;">
            ${info.totalEcos.toFixed(1)}
          </td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Informe de Carga ECOs - ${selectedAthlete.nombre}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; }
            .title-area h1 { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; }
            .title-area p { margin: 2px 0 0 0; color: #64748b; font-weight: 600; font-size: 11px; }
            .brand-name { font-size: 18px; font-weight: 900; color: #2563eb; text-align: right; }
            .brand-sub { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; text-align: right; }
            
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; }
            .info-col { flex: 1; }
            .info-row { margin-bottom: 4px; font-size: 11.5px; }
            .info-lbl { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9.5px; }
            .info-val { color: #0f172a; font-weight: 800; }

            .kpi-row { display: flex; gap: 8px; margin-bottom: 16px; }
            .kpi-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; }
            .kpi-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
            .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; }

            .data-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
            .data-table th { background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 8px 12px; text-align: left; border-bottom: 1.5px solid #cbd5e1; }
            .total-row td { background: #eff6ff; font-weight: 900; font-size: 13px; border-top: 2px solid #93c5fd; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="title-area">
              <h1>Informe de Carga ECOs</h1>
              <p>EPL Triatlón Chile — Cuantificación del Entrenamiento</p>
            </div>
            <div>
              <div class="brand-name">EPL TRIATLÓN</div>
              <div class="brand-sub">Calculadora Científica ECOs</div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-col">
              <div class="info-row"><span class="info-lbl">Deportista:</span> <span class="info-val">${selectedAthlete.nombre}</span></div>
              <div class="info-row"><span class="info-lbl">Distancia Objetivo:</span> <span class="info-val">${selectedAthlete.distanciaObjetivo || 'Olímpica'}</span></div>
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="info-row"><span class="info-lbl">Semana Fecha:</span> <span class="info-val">${weekStartDateStr}</span></div>
              <div class="info-row"><span class="info-lbl">Microciclo:</span> <span class="info-val">Semana ${activeWeekIndex + 1}</span></div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box" style="border-left: 3px solid #0284c7;">
              <div class="kpi-title" style="color: #0284c7;">🏊 Natación</div>
              <div class="kpi-val">${weeklyTotalNatEcos.toFixed(1)}</div>
            </div>
            <div class="kpi-box" style="border-left: 3px solid #16a34a;">
              <div class="kpi-title" style="color: #16a34a;">🚴 Ciclismo</div>
              <div class="kpi-val">${weeklyTotalCicEcos.toFixed(1)}</div>
            </div>
            <div class="kpi-box" style="border-left: 3px solid #ea580c;">
              <div class="kpi-title" style="color: #ea580c;">🏃 Carrera</div>
              <div class="kpi-val">${weeklyTotalCarEcos.toFixed(1)}</div>
            </div>
            <div class="kpi-box" style="border-left: 3px solid #8b5cf6;">
              <div class="kpi-title" style="color: #8b5cf6;">🏋️ Fuerza</div>
              <div class="kpi-val">${weeklyTotalFueEcos.toFixed(1)}</div>
            </div>
            <div class="kpi-box" style="background: #eff6ff; border-color: #93c5fd;">
              <div class="kpi-title" style="color: #1e40af;">Total Semana</div>
              <div class="kpi-val" style="color: #1d4ed8; font-size: 18px;">${weeklyTotalEcos.toFixed(1)}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>🏊 Natación (0.75)</th>
                <th>🚴 Ciclismo (0.50)</th>
                <th>🏃 Carrera (1.00)</th>
                <th>🏋️ Fuerza</th>
                <th style="text-align: right;">Total ECOs</th>
              </tr>
            </thead>
            <tbody>
              ${dailyRowsHtml}
              <tr class="total-row">
                <td style="padding: 10px 12px; color: #1e40af;">TOTAL SEMANAL</td>
                <td style="padding: 10px 12px; color: #0284c7;">${weeklyTotalNatEcos.toFixed(1)}</td>
                <td style="padding: 10px 12px; color: #16a34a;">${weeklyTotalCicEcos.toFixed(1)}</td>
                <td style="padding: 10px 12px; color: #ea580c;">${weeklyTotalCarEcos.toFixed(1)}</td>
                <td style="padding: 10px 12px; color: #8b5cf6;">${weeklyTotalFueEcos.toFixed(1)}</td>
                <td style="padding: 10px 12px; text-align: right; color: #1d4ed8; font-size: 16px;">${weeklyTotalEcos.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
      return;
    }

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `ECOs - ${selectedAthlete.nombre}` });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + e.message);
    }
  };

  if (!atletas || atletas.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="flash-outline" size={56} color={theme.textMuted} />
        <Text style={styles.emptyText}>No hay atletas registrados</Text>
      </View>
    );
  }

  const currentDayData = ecosState[activeDay] || {
    natacion: createInitialDaySportState(),
    ciclismo: createInitialDaySportState(),
    carrera: createInitialDaySportState(),
    fuerza: { ejercicios: [], totalReps: 0, ecos: 0 }
  };

  const activeStrengthList = currentDayData.fuerza?.ejercicios || [];
  const activeDaySummary = getDaySummary(activeDay);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* 1. ATHLETES SELECTOR */}
      <View style={styles.selectorCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={styles.label}>SELECCIONAR ATLETA</Text>
          {selectedAthlete?.distanciaObjetivo ? (
            <View style={[styles.targetBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
              <Text style={[styles.targetBadgeText, { color: theme.primary }]}>🎯 {selectedAthlete.distanciaObjetivo}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller}>
          {atletas.map(a => {
            const isSel = a.id === selectedAthlete?.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.bubble, isSel ? { backgroundColor: theme.primary, borderColor: theme.primary } : null]}
                onPress={() => {
                  setSelectedAtletaId(a.id);
                  setActiveWeekIndex(0);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="person" size={12} color={isSel ? '#fff' : theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.bubbleText, { color: isSel ? '#fff' : theme.textSecondary }]} numberOfLines={1}>
                  {a.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. DAY OF WEEK SELECTOR */}
      <View style={styles.card}>
        <Text style={styles.label}>DÍA DEL ENTRENAMIENTO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {DAYS.map(day => {
            const isSel = activeDay === day;
            const dayEcos = totalsByDay[day]?.totalEcos || 0;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayPill, isSel && styles.dayPillActive]}
                onPress={() => setActiveDay(day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayPillText, isSel && styles.dayPillTextActive]}>{day.substring(0, 3)}</Text>
                <Text style={[styles.dayPillEcos, isSel ? { color: 'rgba(255,255,255,0.9)' } : { color: theme.primary }]}>
                  {dayEcos > 0 ? `${dayEcos.toFixed(0)}` : '0'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. SPORT & STRENGTH SELECTOR TABS */}
      <View style={styles.sportTabsRow}>
        {[
          { id: 'natacion', label: 'Natación', icon: 'water', factor: '0.75', color: theme.swim || '#38bdf8' },
          { id: 'ciclismo', label: 'Ciclismo', icon: 'bicycle', factor: '0.50', color: theme.bike || '#4ade80' },
          { id: 'carrera', label: 'Carrera', icon: 'walk', factor: '1.00', color: theme.run || '#fb923c' },
          { id: 'fuerza', label: 'Fuerza', icon: 'barbell', factor: 'Exacto', color: '#a855f7' },
        ].map(s => {
          const isSel = activeSportTab === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.sportTab, isSel ? { backgroundColor: s.color, borderColor: s.color } : null]}
              onPress={() => setActiveSportTab(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={14} color={isSel ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.sportTabText, isSel ? { color: '#fff' } : null]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. MAIN SPORT CALCULATOR (8 ZONES MATRIX) */}
      {activeSportTab !== 'fuerza' && (
        <View style={styles.card}>
          <View style={styles.sportCardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {activeSportTab === 'natacion' ? '🏊 NATACIÓN (Factor 0.75)' : activeSportTab === 'ciclismo' ? '🚴 CICLISMO (Factor 0.50)' : '🏃 CARRERA (Factor 1.00)'}
              </Text>
              <Text style={styles.cardSubtitle}>Ingresa los minutos realizados en cada zona para el {activeDay}:</Text>
            </View>

            {(activeSportTab === 'natacion' || activeSportTab === 'carrera') && (
              <TouchableOpacity
                style={styles.converterQuickBtn}
                onPress={() => setShowConverterSport(activeSportTab)}
                activeOpacity={0.7}
              >
                <Ionicons name="calculator-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={styles.converterQuickBtnText}>Calc. Ritmo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 8 ZONES GRID */}
          <View style={styles.zonesTable}>
            <View style={styles.zonesTableHeader}>
              <Text style={[styles.zonesTh, { flex: 1.2 }]}>ZONA</Text>
              <Text style={[styles.zonesTh, { flex: 1.8 }]}>DESCRIPCIÓN</Text>
              <Text style={[styles.zonesTh, { flex: 0.8, textAlign: 'center' }]}>COEF</Text>
              <Text style={[styles.zonesTh, { flex: 1.4, textAlign: 'center' }]}>MINUTOS</Text>
              <Text style={[styles.zonesTh, { flex: 1.1, textAlign: 'right' }]}>ECOS</Text>
            </View>

            {ZONES_INFO.map(z => {
              const zoneData = currentDayData[activeSportTab]?.zones?.[z.id] || { min: '', seg: '' };
              const m = parseFloat(zoneData.min) || 0;
              const s = parseFloat(zoneData.seg) || 0;
              const factor = SPORT_FACTORS[activeSportTab] || 1.0;
              const zEcos = (m + s/60) * z.coef * factor;

              return (
                <View key={z.id} style={styles.zoneRowItem}>
                  <View style={[styles.zoneBadge, { backgroundColor: z.color + '22', borderColor: z.color }]}>
                    <Text style={[styles.zoneBadgeText, { color: z.color }]}>{z.name}</Text>
                  </View>

                  <Text style={styles.zoneDescText} numberOfLines={1}>{z.label}</Text>
                  
                  <Text style={styles.zoneCoefText}>x{z.coef}</Text>

                  <View style={styles.zoneInputWrap}>
                    <TextInput
                      style={styles.zoneMinInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textMuted}
                      value={zoneData.min}
                      onChangeText={val => handleZoneTimeChange(activeSportTab, z.id, 'min', val)}
                    />
                    <Text style={styles.minUnitText}>m</Text>
                  </View>

                  <Text style={[styles.zoneEcosVal, zEcos > 0 ? { color: theme.primary, fontWeight: '900' } : { color: theme.textMuted }]}>
                    {zEcos > 0 ? zEcos.toFixed(1) : '0.0'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Subtotal of the Sport */}
          <View style={styles.sportSubtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal {activeSportTab.toUpperCase()}:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.subtotalMinText}>{Math.round(currentDayData[activeSportTab]?.totalMin || 0)} min</Text>
              <View style={[styles.subtotalBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
                <Text style={[styles.subtotalBadgeText, { color: theme.primary }]}>
                  {(currentDayData[activeSportTab]?.ecos || 0).toFixed(1)} ECOs
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 5. STRENGTH CALCULATOR (FUERZA: LEVANTAMIENTOS & SALTOS) */}
      {activeSportTab === 'fuerza' && (
        <View style={styles.card}>
          <View style={styles.sportCardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: '#8b5cf6' }]}>🏋️ FUERZA Y POTENCIA</Text>
              <Text style={styles.cardSubtitle}>Levantamientos, Saltos y Lanzamientos con factores exactos:</Text>
            </View>
            <TouchableOpacity
              style={[styles.btnActionSmall, { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
              onPress={() => setShowAddStrengthModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={[styles.btnActionSmallText, { color: '#fff' }]}>+ Ejercicio</Text>
            </TouchableOpacity>
          </View>

          {/* Exercises list for today */}
          {activeStrengthList.length > 0 ? (
            <View style={styles.strengthList}>
              {activeStrengthList.map((ej) => (
                <View key={ej.id} style={styles.strengthItemCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.strengthItemName}>{ej.nombre}</Text>
                      <View style={[styles.strengthCatBadge, { backgroundColor: '#8b5cf6' + '18', borderColor: '#8b5cf6' + '40' }]}>
                        <Text style={[styles.strengthCatBadgeText, { color: '#8b5cf6' }]}>{ej.categoriaNombre}</Text>
                      </View>
                    </View>
                    <Text style={styles.strengthItemDetails}>
                      {ej.series ? `${ej.series} series × ${ej.reps} reps = ` : ''}{ej.totalReps} reps totales • Factor: {ej.factor}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <Text style={[styles.strengthItemEcos, { color: '#8b5cf6' }]}>
                      {ej.ecos.toFixed(1)} ECOs
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteStrengthExercise(ej.id)}
                      style={styles.deleteMiniBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="barbell-outline" size={32} color={theme.textMuted} />
              <Text style={styles.emptyBoxText}>No hay ejercicios de fuerza añadidos para el {activeDay}.</Text>
              <TouchableOpacity
                style={[styles.btnAddQuickStrength, { backgroundColor: '#8b5cf6' }]}
                onPress={() => setShowAddStrengthModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnAddQuickStrengthText}>+ Añadir Ejercicio de Fuerza</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Strength Subtotal */}
          <View style={styles.sportSubtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal Fuerza ({activeDay}):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.subtotalMinText}>{currentDayData.fuerza?.totalReps || 0} reps</Text>
              <View style={[styles.subtotalBadge, { backgroundColor: '#8b5cf6' + '18', borderColor: '#8b5cf6' }]}>
                <Text style={[styles.subtotalBadgeText, { color: '#8b5cf6' }]}>
                  {(currentDayData.fuerza?.ecos || 0).toFixed(1)} ECOs
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 6. DAY TOTAL CARDS */}
      <View style={[styles.card, { borderColor: theme.primary + '40', backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.cardTitle}>CARGA TOTAL DEL {activeDay.toUpperCase()}</Text>
            <Text style={styles.cardSubtitle}>Nat: {activeDaySummary.natEcos.toFixed(1)} • Cic: {activeDaySummary.cicEcos.toFixed(1)} • Car: {activeDaySummary.carEcos.toFixed(1)} • Fue: {activeDaySummary.fueEcos.toFixed(1)}</Text>
          </View>
          <View style={[styles.totalDayBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.totalDayBadgeVal}>{activeDaySummary.totalEcos.toFixed(1)}</Text>
            <Text style={styles.totalDayBadgeLbl}>ECOs</Text>
          </View>
        </View>
      </View>

      {/* 7. WEEKLY RECAP TABLE & ACTIONS */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.cardTitle}>RESUMEN DE LA SEMANA</Text>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>{weeklyTotalEcos.toFixed(1)} ECOs</Text>
        </View>

        <View style={styles.weeklyTableWrap}>
          {DAYS.map(day => {
            const s = totalsByDay[day] || { totalEcos: 0 };
            return (
              <TouchableOpacity
                key={day}
                style={[styles.weeklyRow, activeDay === day && { backgroundColor: theme.primary + '12' }]}
                onPress={() => setActiveDay(day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.weeklyRowDay, activeDay === day && { color: theme.primary, fontWeight: '900' }]}>{day}</Text>
                <Text style={[styles.weeklyRowSport, { color: theme.swim }]}>{s.natEcos > 0 ? `${s.natEcos.toFixed(1)}` : '-'}</Text>
                <Text style={[styles.weeklyRowSport, { color: theme.bike }]}>{s.cicEcos > 0 ? `${s.cicEcos.toFixed(1)}` : '-'}</Text>
                <Text style={[styles.weeklyRowSport, { color: theme.run }]}>{s.carEcos > 0 ? `${s.carEcos.toFixed(1)}` : '-'}</Text>
                <Text style={[styles.weeklyRowSport, { color: '#8b5cf6' }]}>{s.fueEcos > 0 ? `${s.fueEcos.toFixed(1)}` : '-'}</Text>
                <Text style={[styles.weeklyRowTotal, { color: s.totalEcos > 0 ? theme.text : theme.textMuted }]}>
                  {s.totalEcos.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.btnSaveWeekly} onPress={handleSaveEcosWeekly} activeOpacity={0.8}>
            <Ionicons name="save" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnSaveWeeklyText}>Guardar Carga Semanal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnExportPdf} onPress={handleShareCurrentWeekPDF} activeOpacity={0.8}>
            <Ionicons name="document-text-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnExportPdfText}>Informe PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 60 }} />

      {/* MODAL: ADD STRENGTH EXERCISE */}
      <Modal visible={showAddStrengthModal} transparent animationType="slide" onRequestClose={() => setShowAddStrengthModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir Ejercicio de Fuerza ({activeDay})</Text>
              <TouchableOpacity onPress={() => setShowAddStrengthModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              
              {/* Type Switcher: Levantamientos vs Saltos */}
              <Text style={styles.label}>1. MODALIDAD / TIPO</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, strType === 'levantamientos' && styles.typeBtnActive]}
                  onPress={() => setStrType('levantamientos')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, strType === 'levantamientos' && styles.typeBtnTextActive]}>
                    🏋️ Levantamientos (Pesas)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, strType === 'saltos' && styles.typeBtnActive]}
                  onPress={() => setStrType('saltos')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, strType === 'saltos' && styles.typeBtnTextActive]}>
                    🦘 Saltos y Lanzamientos
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker with Exact Multipliers */}
              <Text style={[styles.label, { marginTop: 12 }]}>2. CATEGORÍA Y FACTOR</Text>
              <View style={styles.categoriesList}>
                {(STRENGTH_CATEGORIES[strType] || STRENGTH_CATEGORIES.levantamientos).map(cat => {
                  const isSel = strCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catCard, isSel && styles.catCardActive]}
                      onPress={() => setStrCategory(cat.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catName, isSel && { color: theme.primary, fontWeight: '900' }]}>{cat.name}</Text>
                        <Text style={styles.catDesc}>{cat.desc}</Text>
                      </View>
                      <View style={[styles.catFactorBadge, isSel ? { backgroundColor: theme.primary } : null]}>
                        <Text style={[styles.catFactorText, isSel ? { color: '#fff' } : null]}>x{cat.factor}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Exercise Name */}
              <Text style={[styles.label, { marginTop: 12 }]}>3. NOMBRE DEL EJERCICIO (OPCIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Sentadilla, Press Banca, Salto al cajón..."
                placeholderTextColor={theme.textMuted}
                value={strName}
                onChangeText={setStrName}
              />

              {/* Sets and Reps */}
              <Text style={[styles.label, { marginTop: 12 }]}>4. SERIES Y REPETICIONES</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputMiniLabel}>Series:</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor={theme.textMuted}
                    value={strSets}
                    onChangeText={setStrSets}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputMiniLabel}>Reps por serie:</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor={theme.textMuted}
                    value={strReps}
                    onChangeText={setStrReps}
                  />
                </View>
              </View>

              {/* Live Preview */}
              {(() => {
                const cats = STRENGTH_CATEGORIES[strType] || STRENGTH_CATEGORIES.levantamientos;
                const activeCat = cats.find(c => c.id === parseInt(strCategory)) || cats[0];
                const sets = parseFloat(strSets) || 0;
                const reps = parseFloat(strReps) || 0;
                const totR = strDirectReps ? parseFloat(strDirectReps) || 0 : sets * reps;
                const previewEcos = totR * activeCat.factor;

                return (
                  <View style={styles.strengthPreviewBox}>
                    <Text style={styles.strengthPreviewLabel}>CÁLCULO RESULTANTE:</Text>
                    <Text style={styles.strengthPreviewVal}>
                      {totR} reps × {activeCat.factor} = <Text style={{ color: '#8b5cf6', fontWeight: '900' }}>{previewEcos.toFixed(2)} ECOs</Text>
                    </Text>
                  </View>
                );
              })()}

            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowAddStrengthModal(false)} activeOpacity={0.7}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: '#8b5cf6' }]} onPress={handleAddStrengthExercise} activeOpacity={0.8}>
                <Ionicons name="checkmark-sharp" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSaveText}>Añadir Ejercicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: PACE CONVERTER */}
      <Modal visible={!!showConverterSport} transparent animationType="fade" onRequestClose={() => setShowConverterSport(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculadora de Ritmo a Minutos</Text>
              <TouchableOpacity onPress={() => setShowConverterSport(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.label}>DISTANCIA TOTAL (METROS):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Ej: 2000"
                  placeholderTextColor={theme.textMuted}
                  value={convDist}
                  onChangeText={setConvDist}
                />
              </View>

              <View>
                <Text style={styles.label}>RITMO POR 100M (MINUTOS DECIMALES):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Ej: 1.75 (1m 45s)"
                  placeholderTextColor={theme.textMuted}
                  value={convRitmo}
                  onChangeText={setConvRitmo}
                />
              </View>

              <View>
                <Text style={styles.label}>ASIGNAR A ZONA:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {ZONES_INFO.map(z => (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.zonePillSmall, convTargetZone === String(z.id) ? { backgroundColor: z.color, borderColor: z.color } : null]}
                      onPress={() => setConvTargetZone(String(z.id))}
                    >
                      <Text style={[styles.zonePillSmallText, convTargetZone === String(z.id) ? { color: '#fff' } : null]}>{z.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowConverterSport(null)}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={() => handleConvertAndApply(showConverterSport)}>
                  <Text style={styles.btnSaveText}>Aplicar Minutos</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 40,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 15,
      color: theme.textSecondary,
      fontWeight: '700',
    },
    selectorCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 8,
      elevation: 2,
    },
    label: {
      fontSize: 9.5,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    targetBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    targetBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    scroller: {
      gap: 8,
      paddingVertical: 4,
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    bubbleText: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 8,
      elevation: 2,
    },
    daysScroll: {
      flexDirection: 'row',
      gap: 6,
    },
    dayPill: {
      flex: 1,
      minWidth: 44,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: 'center',
    },
    dayPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
    },
    dayPillTextActive: {
      color: '#fff',
    },
    dayPillEcos: {
      fontSize: 9.5,
      fontWeight: '900',
      marginTop: 2,
    },
    sportTabsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    sportTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      borderRadius: 14,
    },
    sportTabText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
    },
    sportCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: 0.4,
    },
    cardSubtitle: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    converterQuickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    },
    converterQuickBtnText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: theme.primary,
    },
    zonesTable: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
    },
    zonesTableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    zonesTh: {
      fontSize: 9.5,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    zoneRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    zoneBadge: {
      flex: 1.2,
      borderWidth: 1,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    zoneBadgeText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
    zoneDescText: {
      flex: 1.8,
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    zoneCoefText: {
      flex: 0.8,
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      textAlign: 'center',
    },
    zoneInputWrap: {
      flex: 1.4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoneMinInput: {
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      width: 44,
      height: 30,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
      paddingVertical: 2,
    },
    minUnitText: {
      fontSize: 10,
      color: theme.textMuted,
      marginLeft: 3,
      fontWeight: '700',
    },
    zoneEcosVal: {
      flex: 1.1,
      fontSize: 12,
      textAlign: 'right',
      fontWeight: '700',
    },
    sportSubtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    subtotalLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    subtotalMinText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    subtotalBadge: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    subtotalBadgeText: {
      fontSize: 12,
      fontWeight: '900',
    },
    btnActionSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    btnActionSmallText: {
      fontSize: 11,
      fontWeight: '800',
    },
    strengthList: {
      gap: 8,
      marginBottom: 12,
    },
    strengthItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    strengthItemName: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    strengthCatBadge: {
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    strengthCatBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
    },
    strengthItemDetails: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    strengthItemEcos: {
      fontSize: 13,
      fontWeight: '900',
    },
    deleteMiniBtn: {
      padding: 4,
      marginTop: 4,
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 6,
    },
    emptyBoxText: {
      fontSize: 11.5,
      color: theme.textMuted,
    },
    btnAddQuickStrength: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      marginTop: 6,
    },
    btnAddQuickStrengthText: {
      color: '#fff',
      fontSize: 11.5,
      fontWeight: '800',
    },
    totalDayBadge: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalDayBadgeVal: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 18,
    },
    totalDayBadgeLbl: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 8.5,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    weeklyTableWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 14,
    },
    weeklyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    weeklyRowDay: {
      flex: 1.5,
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    weeklyRowSport: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },
    weeklyRowTotal: {
      flex: 1.2,
      fontSize: 12.5,
      fontWeight: '900',
      textAlign: 'right',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    btnSaveWeekly: {
      flex: 1.3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.success,
      paddingVertical: 12,
      borderRadius: 14,
      elevation: 2,
    },
    btnSaveWeeklyText: {
      color: '#fff',
      fontSize: 12.5,
      fontWeight: '900',
    },
    btnExportPdf: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 14,
      elevation: 2,
    },
    btnExportPdfText: {
      color: '#fff',
      fontSize: 12.5,
      fontWeight: '900',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      padding: 18,
      width: '100%',
      maxWidth: 440,
      borderWidth: 1,
      borderColor: theme.border,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.text,
    },
    typeSelectorRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    typeBtn: {
      flex: 1,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
    },
    typeBtnActive: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    typeBtnText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    typeBtnTextActive: {
      color: '#fff',
      fontWeight: '900',
    },
    categoriesList: {
      gap: 6,
      marginBottom: 6,
    },
    catCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 8,
    },
    catCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '12',
    },
    catName: {
      fontSize: 11.5,
      fontWeight: '800',
      color: theme.text,
    },
    catDesc: {
      fontSize: 9.5,
      color: theme.textSecondary,
      marginTop: 1,
    },
    catFactorBadge: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginLeft: 8,
    },
    catFactorText: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.text,
    },
    textInput: {
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: theme.text,
      fontWeight: '600',
    },
    inputMiniLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 3,
    },
    strengthPreviewBox: {
      backgroundColor: '#8b5cf6' + '12',
      borderWidth: 1,
      borderColor: '#8b5cf6' + '40',
      borderRadius: 10,
      padding: 10,
      marginTop: 14,
      alignItems: 'center',
    },
    strengthPreviewLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: '#8b5cf6',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    strengthPreviewVal: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    modalActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    btnCancel: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnCancelText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: theme.textSecondary,
    },
    btnSave: {
      flex: 1.3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 11,
      borderRadius: 12,
    },
    btnSaveText: {
      fontSize: 12.5,
      fontWeight: '900',
      color: '#fff',
    },
    zonePillSmall: {
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.surfaceSecondary,
    },
    zonePillSmallText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
    },
  });
