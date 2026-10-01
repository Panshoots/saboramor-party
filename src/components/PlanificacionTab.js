import { parseFlexibleDate, normalizeDateToISO, formatDateChile, getDaysRemaining } from '../utils/dateUtils';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generatePDFReport } from '../utils/pdfGenerator';
import CumplimientoTab from './CumplimientoTab';
import { useTheme } from '../theme/ThemeContext';

const DEFAULT_MESO_PCT = {
  nat: [100, 95, 80, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  cic: [95, 85, 75, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  car: [95, 85, 75, 100, 100, 100, 100, 100, 100, 100, 100, 100]
};

const DEFAULT_PERIODOS = ['General', 'Específico', 'Competitivo', 'Competitivo', 'General', 'Específico', 'Competitivo', 'Competitivo', 'General', 'Específico', 'Competitivo', 'Competitivo'];

function formatHours(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";
  let hours = Math.floor(totalMinutes / 60);
  let minutes = Math.floor(totalMinutes % 60);
  let seconds = Math.round((totalMinutes % 1) * 60);
  if (seconds === 60) { minutes += 1; seconds = 0; }
  if (minutes === 60) { hours += 1; minutes = 0; }
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

function getMonday(dateString) {
  let d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}



export default function PlanificacionTab({ atletas, onSavePlan, onDeletePlan, onSaveCumplimiento, onSaveCompetencias }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const getWeekStartDateStr = (wIdx) => {
    if (!fechaInicio) return '';
    const mondayStart = getMonday(fechaInicio);
    const weekDate = new Date(mondayStart.getTime());
    weekDate.setDate(weekDate.getDate() + (wIdx * 7));
    return formatDateChile(weekDate);
  };

  const [activeSubTab, setActiveSubTab] = useState('macrociclo');
  const [selectedAtletaId, setSelectedAtletaId] = useState(null);
  const [nombreDeportista, setNombreDeportista] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [mesociclos, setMesociclos] = useState('3');
  const [baseNatacion, setBaseNatacion] = useState('6000');
  const [baseCiclismo, setBaseCiclismo] = useState('5');
  const [baseCarrera, setBaseCarrera] = useState('4');
  
  // Feedback and PDF toggles
  const [feedback, setFeedback] = useState('');
  const [showCompetenciasInReport, setShowCompetenciasInReport] = useState(true);
  const [showFeedbackInReport, setShowFeedbackInReport] = useState(true);

  const [distSem1, setDistSem1] = useState('23');
  const [distSem2, setDistSem2] = useState('27');
  const [distSem3, setDistSem3] = useState('32');
  const [distSem4, setDistSem4] = useState('18');

  const [competencias, setCompetencias] = useState([]);
  const [newCompNombre, setNewCompNombre] = useState('');
  const [newCompFecha, setNewCompFecha] = useState('');
  const [showCompForm, setShowCompForm] = useState(false);

  const [mesosPct, setMesosPct] = useState(DEFAULT_MESO_PCT);
  const [mesosPeriodos, setMesosPeriodos] = useState(['General', 'Específico', 'Competitivo']);
  const [zonasSemanales, setZonasSemanales] = useState({ nat: [], cic: [], car: [] });
  const [calcCache, setCalcCache] = useState(null);
  const [showWeeksList, setShowWeeksList] = useState(false);
  const [activeZoneWeekIndex, setActiveZoneWeekIndex] = useState(0);

  // Focus states
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [isMesoFocused, setIsMesoFocused] = useState(false);
  const [isNatFocused, setIsNatFocused] = useState(false);
  const [isCicFocused, setIsCicFocused] = useState(false);
  const [isCarFocused, setIsCarFocused] = useState(false);

  // Expandable weeks state
  const [expandedWeeks, setExpandedWeeks] = useState({});

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setFechaInicio(`${yyyy}-${mm}-${dd}`);

    if (atletas && atletas.length > 0) {
      loadAthletePlan(atletas[0]);
    }
  }, []);

  const handleSelectAthlete = (id) => {
    const athlete = atletas.find(a => a.id === id);
    if (athlete) {
      loadAthletePlan(athlete);
    }
  };

  const selectedAthlete = (atletas || []).find(a => a.id === selectedAtletaId) || null;

  const loadAthletePlan = (athlete) => {
    setSelectedAtletaId(athlete.id);
    setNombreDeportista(athlete.nombre);

    const plan = athlete.plan || {};
    
    if (plan.fechaInicio) {
      setFechaInicio(plan.fechaInicio);
    } else {
      const today = new Date();
      setFechaInicio(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    }

    const numMeso = plan.mesos || 3;
    setMesociclos(numMeso.toString());
    setBaseNatacion(plan.baseNat ? plan.baseNat.toString() : '6000');
    setBaseCiclismo(plan.baseCic ? plan.baseCic.toString() : '5');
    setBaseCarrera(plan.baseCar ? plan.baseCar.toString() : '4');

    setDistSem1(plan.distSem1 ? plan.distSem1.toString() : '23');
    setDistSem2(plan.distSem2 ? plan.distSem2.toString() : '27');
    setDistSem3(plan.distSem3 ? plan.distSem3.toString() : '32');
    setDistSem4(plan.distSem4 ? plan.distSem4.toString() : '18');

    setCompetencias(plan.competencias || athlete.competencias || []);
    setMesosPct(plan.mesosPct || DEFAULT_MESO_PCT);
    setMesosPeriodos(plan.mesosPeriodos || DEFAULT_PERIODOS.slice(0, numMeso));
    setFeedback(plan.feedback || '');
    setShowCompetenciasInReport(plan.showCompetenciasInReport !== false);
    setShowFeedbackInReport(plan.showFeedbackInReport !== false);

    const totalWeeks = numMeso * 4;
    
    let loadedZonas = plan.zonasSemanales || { nat: [], cic: [], car: [] };
    
    const nZ = [...(loadedZonas.nat || [])];
    const cZ = [...(loadedZonas.cic || [])];
    const rZ = [...(loadedZonas.car || [])];
    
    for (let i = 0; i < totalWeeks; i++) {
      if (!nZ[i]) nZ[i] = 'Z2';
      if (!cZ[i]) cZ[i] = 'Z2';
      if (!rZ[i]) rZ[i] = 'Z2';
    }

    setZonasSemanales({ nat: nZ, cic: cZ, car: rZ });
    setCalcCache(null);
    setShowWeeksList(false);
    setActiveZoneWeekIndex(0);
    setExpandedWeeks({});
  };

  useEffect(() => {
    const numMesos = parseInt(mesociclos) || 3;
    const totalWeeks = numMesos * 4;
    
    setZonasSemanales(prev => {
      const nat = [...prev.nat];
      const cic = [...prev.cic];
      const car = [...prev.car];

      for (let i = 0; i < totalWeeks; i++) {
        if (!nat[i]) nat[i] = 'Z2';
        if (!cic[i]) cic[i] = 'Z2';
        if (!car[i]) car[i] = 'Z2';
      }

      return {
        nat: nat.slice(0, totalWeeks),
        cic: cic.slice(0, totalWeeks),
        car: car.slice(0, totalWeeks)
      };
    });

    setMesosPeriodos(prev => {
      const updated = [...prev];
      for (let i = 0; i < numMesos; i++) {
        if (!updated[i]) {
          updated[i] = i === 0 ? 'General' : i === numMesos - 1 ? 'Competitivo' : 'Específico';
        }
      }
      return updated.slice(0, numMesos);
    });

    if (activeZoneWeekIndex >= totalWeeks) {
      setActiveZoneWeekIndex(totalWeeks - 1 >= 0 ? totalWeeks - 1 : 0);
    }
  }, [mesociclos]);

  const toggleWeekExpanded = (idx) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const updateZone = (sport, weekIndex, clickedZone) => {
    setZonasSemanales(prev => {
      const updatedSportArray = [...prev[sport]];
      const currentVal = updatedSportArray[weekIndex] || 'Z2';
      
      let activeZones = currentVal.split(/[\s,/\-+]+/g).map(z => z.trim()).filter(z => z.startsWith('Z'));
      
      if (activeZones.includes(clickedZone)) {
        if (activeZones.length > 1) {
          activeZones = activeZones.filter(z => z !== clickedZone);
        }
      } else {
        activeZones.push(clickedZone);
      }
      
      activeZones.sort((a, b) => {
        const numA = parseInt(a.substring(1)) || 1;
        const numB = parseInt(b.substring(1)) || 1;
        return numA - numB;
      });
      
      const newValue = activeZones.join(', ');
      updatedSportArray[weekIndex] = newValue;
      
      return {
        ...prev,
        [sport]: updatedSportArray
      };
    });

    setCalcCache(prev => {
      if (!prev) return null;
      const updatedZ = {
        zNat: [...prev.zNat],
        zCic: [...prev.zCic],
        zCar: [...prev.zCar]
      };
      
      const currentArr = sport === 'nat' ? prev.zNat : (sport === 'cic' ? prev.zCic : prev.zCar);
      const currentVal = currentArr[weekIndex] || 'Z2';
      let activeZones = currentVal.split(/[\s,/\-+]+/g).map(z => z.trim()).filter(z => z.startsWith('Z'));
      
      if (activeZones.includes(clickedZone)) {
        if (activeZones.length > 1) {
          activeZones = activeZones.filter(z => z !== clickedZone);
        }
      } else {
        activeZones.push(clickedZone);
      }
      
      activeZones.sort((a, b) => {
        const numA = parseInt(a.substring(1)) || 1;
        const numB = parseInt(b.substring(1)) || 1;
        return numA - numB;
      });
      
      const newValue = activeZones.join(', ');
      if (sport === 'nat') updatedZ.zNat[weekIndex] = newValue;
      if (sport === 'cic') updatedZ.zCic[weekIndex] = newValue;
      if (sport === 'car') updatedZ.zCar[weekIndex] = newValue;

      return {
        ...prev,
        ...updatedZ
      };
    });
  };

  const updateMesoPct = (sport, mesoIndex, value) => {
    const val = parseFloat(value) || 0;
    setMesosPct(prev => {
      const updatedSportArray = [...prev[sport]];
      updatedSportArray[mesoIndex] = val;
      return {
        ...prev,
        [sport]: updatedSportArray
      };
    });
  };

  const setMesoPeriodValue = (mesoIndex, period) => {
    setMesosPeriodos(prev => {
      const updated = [...prev];
      updated[mesoIndex] = period;
      return updated;
    });
  };

  const handleAddComp = () => {
    if (!newCompNombre.trim()) {
      Alert.alert('Error', 'Ingresa el nombre de la competencia.');
      return;
    }
    if (!newCompFecha.trim()) {
      Alert.alert('Error', 'Ingresa la fecha de la competencia.');
      return;
    }

    const normDate = normalizeDateToISO(newCompFecha.trim());
    const newComp = { nombre: newCompNombre.trim(), fecha: normDate };
    const updated = [...competencias, newComp];

    setCompetencias(updated);
    setNewCompNombre('');
    setNewCompFecha('');
    setShowCompForm(false);

    if (selectedAtletaId && onSaveCompetencias) {
      onSaveCompetencias(selectedAtletaId, updated, {
        text: `🏆 Nueva competencia registrada: ${newComp.nombre} (${formatDateChile(normDate)})`,
        nombre: newComp.nombre
      });
      Alert.alert('Éxito', `Competencia "${newComp.nombre}" agregada y guardada para ${selectedAthlete?.nombre || 'el atleta'}.`);
    }
  };

  const handleDeleteComp = (idx) => {
    const deletedComp = competencias[idx];
    const updated = competencias.filter((_, i) => i !== idx);
    setCompetencias(updated);

    if (selectedAtletaId && onSaveCompetencias && deletedComp) {
      onSaveCompetencias(selectedAtletaId, updated, {
        text: `Competencia eliminada: ${deletedComp.nombre}`,
        nombre: deletedComp.nombre
      });
    }
  };

  const calculatePlan = (overrideData = null) => {
    try {
      const planSource = overrideData || {
        fechaInicio,
        mesos: parseInt(mesociclos),
        baseNat: parseFloat(baseNatacion),
        baseCic: parseFloat(baseCiclismo),
        baseCar: parseFloat(baseCarrera),
        distSem1: parseFloat(distSem1),
        distSem2: parseFloat(distSem2),
        distSem3: parseFloat(distSem3),
        distSem4: parseFloat(distSem4),
        competencias,
        mesosPct,
        mesosPeriodos,
        zonasSemanales
      };

      const numMesos = parseInt(planSource.mesos) || 3;
      const totalWeeks = numMesos * 4;
      if (!planSource.fechaInicio) {
        Alert.alert('Error', 'Ingresa la fecha de inicio.');
        return;
      }

      const mondayStart = getMonday(planSource.fechaInicio);
      const endDate = new Date(mondayStart.getTime());
      endDate.setDate(endDate.getDate() + (totalWeeks * 7) - 1);

      const baseSwim = parseFloat(planSource.baseNat) || 0;
      const baseBike = parseFloat(planSource.baseCic) || 0;
      const baseRun = parseFloat(planSource.baseCar) || 0;

      const pS1 = (parseFloat(planSource.distSem1) || 23) / 100;
      const pS2 = (parseFloat(planSource.distSem2) || 27) / 100;
      const pS3 = (parseFloat(planSource.distSem3) || 32) / 100;
      const pS4 = (parseFloat(planSource.distSem4) || 18) / 100;
      const weeklyDistributionArr = [pS1, pS2, pS3, pS4];

      const totalMacroSwim = baseSwim * totalWeeks;
      const totalMacroBikeMin = (baseBike * totalWeeks) * 60;
      const totalMacroRunMin = (baseRun * totalWeeks) * 60;

      let pools = { nat: 0, cic: 0, car: 0 };
      for (let m = 0; m < numMesos; m++) {
        pools.nat += (planSource.mesosPct && planSource.mesosPct.nat && planSource.mesosPct.nat[m] !== undefined) ? planSource.mesosPct.nat[m] : 100;
        pools.cic += (planSource.mesosPct && planSource.mesosPct.cic && planSource.mesosPct.cic[m] !== undefined) ? planSource.mesosPct.cic[m] : 100;
        pools.car += (planSource.mesosPct && planSource.mesosPct.car && planSource.mesosPct.car[m] !== undefined) ? planSource.mesosPct.car[m] : 100;
      }
      if (pools.nat === 0) pools.nat = 1;
      if (pools.cic === 0) pools.cic = 1;
      if (pools.car === 0) pools.car = 1;

      const calculatedNat = [];
      const calculatedCic = [];
      const calculatedCar = [];
      const fechasColumnas = [];

      for (let s = 1; s <= totalWeeks; s++) {
        const mIdx = Math.ceil(s / 4) - 1;
        const weekFactor = weeklyDistributionArr[(s - 1) % 4];

        const mesoNat = (planSource.mesosPct && planSource.mesosPct.nat && planSource.mesosPct.nat[mIdx] !== undefined) ? planSource.mesosPct.nat[mIdx] : 100;
        const mesoCic = (planSource.mesosPct && planSource.mesosPct.cic && planSource.mesosPct.cic[mIdx] !== undefined) ? planSource.mesosPct.cic[mIdx] : 100;
        const mesoRun = (planSource.mesosPct && planSource.mesosPct.car && planSource.mesosPct.car[mIdx] !== undefined) ? planSource.mesosPct.car[mIdx] : 100;

        const weekSwim = (totalMacroSwim * (mesoNat / pools.nat)) * weekFactor;
        const weekBikeMin = (totalMacroBikeMin * (mesoCic / pools.cic)) * weekFactor;
        const weekRunMin = (totalMacroRunMin * (mesoRun / pools.car)) * weekFactor;

        calculatedNat.push(weekSwim);
        calculatedCic.push(weekBikeMin);
        calculatedCar.push(weekRunMin);

        const currentMon = new Date(mondayStart.getTime());
        currentMon.setDate(currentMon.getDate() + (s - 1) * 7);
        fechasColumnas.push(formatDateChile(currentMon));
      }

      const zN = [...(planSource.zonasSemanales?.nat || [])];
      const zC = [...(planSource.zonasSemanales?.cic || [])];
      const zR = [...(planSource.zonasSemanales?.car || [])];
      for (let i = 0; i < totalWeeks; i++) {
        if (!zN[i]) zN[i] = 'Z2';
        if (!zC[i]) zC[i] = 'Z2';
        if (!zR[i]) zR[i] = 'Z2';
      }

      const result = {
        nombreDeportista: selectedAthlete?.nombre || nombreDeportista || 'Atleta EPL',
        distanciaObjetivo: selectedAthlete?.distanciaObjetivo || 'Olímpica',
        fechaInicio: formatDateChile(mondayStart),
        fechaFin: formatDateChile(endDate),
        semanas: totalWeeks,
        mesos: numMesos,
        numMesos: numMesos,
        totalWeeks: totalWeeks,
        totalMacroSwim,
        totalMacroBikeMin,
        totalMacroRunMin,
        totNat: calculatedNat.reduce((a, b) => a + b, 0),
        totCic: calculatedCic.reduce((a, b) => a + b, 0),
        totCar: calculatedCar.reduce((a, b) => a + b, 0),
        fechasColumnas,
        nat: calculatedNat,
        cic: calculatedCic,
        car: calculatedCar,
        zNat: zN,
        zCic: zC,
        zCar: zR,
        competencias: planSource.competencias || [],
        mesosPeriodos: planSource.mesosPeriodos || mesosPeriodos,
        feedback: feedback || '',
        showCompetenciasInReport,
        showFeedbackInReport,
        rawPlan: planSource
      };

      setCalcCache(result);
      setShowWeeksList(true);
      return result;
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Hubo un problema al calcular la planificación: ' + e.message);
      return null;
    }
  };

  const handleSavePlan = () => {
    if (!selectedAtletaId) {
      Alert.alert('Error', 'Por favor selecciona un atleta primero.');
      return;
    }

    const calculated = calculatePlan();
    if (!calculated) return;

    const planData = {
      fechaInicio,
      mesos: parseInt(mesociclos) || 3,
      baseNat: parseFloat(baseNatacion) || 6000,
      baseCic: parseFloat(baseCiclismo) || 5,
      baseCar: parseFloat(baseCarrera) || 4,
      distSem1: parseFloat(distSem1) || 23,
      distSem2: parseFloat(distSem2) || 27,
      distSem3: parseFloat(distSem3) || 32,
      distSem4: parseFloat(distSem4) || 18,
      competencias,
      mesosPct,
      mesosPeriodos,
      zonasSemanales,
      feedback,
      showCompetenciasInReport,
      showFeedbackInReport,
      savedAt: new Date().toISOString()
    };

    if (onSavePlan) {
      onSavePlan(selectedAtletaId, planData);
      Alert.alert('Éxito', `Plan del macrociclo guardado para ${selectedAthlete?.nombre || 'el deportista'}.`);
    }
  };

  const handleDownloadPDF = async () => {
    let currentCalc = calcCache;
    if (!currentCalc) {
      currentCalc = calculatePlan();
    }
    if (!currentCalc) return;

    currentCalc.feedback = feedback;
    currentCalc.showCompetenciasInReport = showCompetenciasInReport;
    currentCalc.showFeedbackInReport = showFeedbackInReport;
    currentCalc.mesosPeriodos = mesosPeriodos;
    currentCalc.distanciaObjetivo = selectedAthlete?.distanciaObjetivo || 'Olímpica';

    await generatePDFReport(currentCalc);
  };

  const loadPlanData = (plan) => {
    if (!plan) return;
    setFechaInicio(plan.fechaInicio || '');
    const numMeso = plan.mesos || 3;
    setMesociclos(numMeso.toString());
    setBaseNatacion(plan.baseNat ? plan.baseNat.toString() : '6000');
    setBaseCiclismo(plan.baseCic ? plan.baseCic.toString() : '5');
    setBaseCarrera(plan.baseCar ? plan.baseCar.toString() : '4');
    setDistSem1(plan.distSem1 ? plan.distSem1.toString() : '23');
    setDistSem2(plan.distSem2 ? plan.distSem2.toString() : '27');
    setDistSem3(plan.distSem3 ? plan.distSem3.toString() : '32');
    setDistSem4(plan.distSem4 ? plan.distSem4.toString() : '18');
    setCompetencias(plan.competencias || athlete.competencias || []);
    setMesosPct(plan.mesosPct || DEFAULT_MESO_PCT);
    setMesosPeriodos(plan.mesosPeriodos || DEFAULT_PERIODOS.slice(0, numMeso));
    setFeedback(plan.feedback || '');
    setShowCompetenciasInReport(plan.showCompetenciasInReport !== false);
    setShowFeedbackInReport(plan.showFeedbackInReport !== false);
    setZonasSemanales(plan.zonasSemanales || { nat: [], cic: [], car: [] });
    
    setTimeout(() => {
      calculatePlan(plan);
    }, 100);
  };

  const confirmDeletePlan = (fechaPlan) => {
    Alert.alert(
      'Eliminar Plan',
      `¿Deseas eliminar el plan con fecha de inicio ${fechaPlan}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            if (onDeletePlan && selectedAtletaId) {
              onDeletePlan(selectedAtletaId, fechaPlan);
            }
          }
        }
      ]
    );
  };

  if (!atletas || atletas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No tienes deportistas registrados.{'\n'}Agrega un atleta en el Inicio para planificar su macrociclo.
        </Text>
      </View>
    );
  }

  const numMesosNum = parseInt(mesociclos) || 3;
  const totalWeeksNum = numMesosNum * 4;
  const planHistory = selectedAthlete?.planHistory || [];

  if (activeSubTab === 'cumplimiento') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.subTabNavContainer}>
          <TouchableOpacity
            style={[styles.subTabNavBtn, activeSubTab === 'macrociclo' && styles.subTabNavBtnActive]}
            onPress={() => setActiveSubTab('macrociclo')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeSubTab === 'macrociclo' ? '#ffffff' : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.subTabNavText, activeSubTab === 'macrociclo' && styles.subTabNavTextActive]}>
              Plan Macrociclo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabNavBtn, activeSubTab === 'cumplimiento' && styles.subTabNavBtnActive]}
            onPress={() => setActiveSubTab('cumplimiento')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics-outline"
              size={15}
              color={activeSubTab === 'cumplimiento' ? '#ffffff' : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.subTabNavText, activeSubTab === 'cumplimiento' && styles.subTabNavTextActive]}>
              Cumplimiento Real
            </Text>
          </TouchableOpacity>
        </View>
        <CumplimientoTab atletas={atletas} onSaveCumplimiento={onSaveCumplimiento} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

      {/* SubTab Switcher */}
      <View style={styles.subTabNavContainer}>
        <TouchableOpacity
          style={[styles.subTabNavBtn, activeSubTab === 'macrociclo' && styles.subTabNavBtnActive]}
          onPress={() => setActiveSubTab('macrociclo')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={activeSubTab === 'macrociclo' ? '#ffffff' : theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.subTabNavText, activeSubTab === 'macrociclo' && styles.subTabNavTextActive]}>
            Plan Macrociclo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabNavBtn, activeSubTab === 'cumplimiento' && styles.subTabNavBtnActive]}
          onPress={() => setActiveSubTab('cumplimiento')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="analytics-outline"
            size={15}
            color={activeSubTab === 'cumplimiento' ? '#ffffff' : theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.subTabNavText, activeSubTab === 'cumplimiento' && styles.subTabNavTextActive]}>
            Cumplimiento Real
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Selección de Deportista</Text>
      
      {/* Athlete selector capsules */}
      <View style={styles.selectorCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={styles.label}>Seleccionar Atleta de Biblioteca</Text>
          {selectedAthlete?.distanciaObjetivo ? (
            <View style={[styles.targetDistanceBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
              <Text style={[styles.targetDistanceBadgeText, { color: theme.primary }]}>
                🎯 {selectedAthlete.distanciaObjetivo}
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.athleteScroller}>
          {atletas.map(a => (
            <TouchableOpacity
              activeOpacity={0.8}
              key={a.id}
              style={[
                styles.athleteBubble, 
                selectedAtletaId === a.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
              ]}
              onPress={() => handleSelectAthlete(a.id)}
            >
              <Ionicons
                name="person"
                size={12}
                color={selectedAtletaId === a.id ? '#fff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.athleteBubbleText, 
                { color: selectedAtletaId === a.id ? '#fff' : theme.textSecondary }
              ]}>
                {a.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Plan History Selector */}
        {planHistory.length > 0 && (
          <View style={styles.historyPlansSection}>
            <Text style={styles.label}>Historial de Planes de este Atleta:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planHistoryScroller}>
              {planHistory.map(p => {
                const isSelected = calcCache && calcCache.rawPlan && calcCache.rawPlan.fechaInicio === p.fechaInicio;
                return (
                  <View key={p.fechaInicio} style={[styles.historyPlanWrapper, isSelected ? { borderColor: theme.primary } : null]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.historyPlanBubble,
                        isSelected ? { backgroundColor: theme.glowColor } : null
                      ]}
                      onPress={() => loadPlanData(p)}
                    >
                      <Ionicons 
                        name="calendar-sharp" 
                        size={12} 
                        color={isSelected ? theme.primary : theme.textSecondary} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={[
                        styles.historyPlanText,
                        { color: isSelected ? theme.primary : theme.textSecondary }
                      ]}>
                        {p.fechaInicio} ({p.mesos}M)
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.historyPlanDeleteBtn, { backgroundColor: theme.surfaceSecondary }]}
                      onPress={() => confirmDeletePlan(p.fechaInicio)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={11} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Configuración General</Text>
      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Fecha de Inicio del Plan</Text>
          <View style={[styles.inputWrapper, isDateFocused ? styles.inputFocused : null]}>
            <Ionicons name="calendar-outline" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inputStyle}
              value={fechaInicio}
              onChangeText={setFechaInicio}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textMuted}
              onFocus={() => setIsDateFocused(true)}
              onBlur={() => setIsDateFocused(false)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cantidad de Mesociclos (1 - 12)</Text>
          <View style={[styles.inputWrapper, isMesoFocused ? styles.inputFocused : null]}>
            <Ionicons name="layers-outline" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inputStyle}
              value={mesociclos}
              onChangeText={val => {
                const num = parseInt(val);
                if (!isNaN(num) && num >= 1 && num <= 12) {
                  setMesociclos(val);
                } else if (val === '') {
                  setMesociclos('');
                }
              }}
              keyboardType="numeric"
              maxLength={2}
              onFocus={() => setIsMesoFocused(true)}
              onBlur={() => setIsMesoFocused(false)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Feedback / Recomendaciones del Entrenador</Text>
          <View style={[styles.inputWrapper, { height: 72, alignItems: 'flex-start', paddingTop: 6 }]}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.textMuted} style={{ marginRight: 8, marginTop: 2 }} />
            <TextInput
              style={[styles.inputStyle, { height: 60, textAlignVertical: 'top' }]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Ej: Enfocarse en Z2 en ciclismo..."
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Configuración del Informe PDF</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: theme.border
                },
                showCompetenciasInReport ? { backgroundColor: theme.glowColor, borderColor: theme.primary } : { backgroundColor: theme.surfaceSecondary }
              ]}
              onPress={() => setShowCompetenciasInReport(!showCompetenciasInReport)}
            >
              <Ionicons 
                name={showCompetenciasInReport ? "checkbox" : "square-outline"} 
                size={14} 
                color={showCompetenciasInReport ? theme.primary : theme.textSecondary} 
                style={{ marginRight: 6 }} 
              />
              <Text style={{ fontSize: 9, fontWeight: '750', color: showCompetenciasInReport ? theme.primary : theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Competencias
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: theme.border
                },
                showFeedbackInReport ? { backgroundColor: theme.glowColor, borderColor: theme.primary } : { backgroundColor: theme.surfaceSecondary }
              ]}
              onPress={() => setShowFeedbackInReport(!showFeedbackInReport)}
            >
              <Ionicons 
                name={showFeedbackInReport ? "checkbox" : "square-outline"} 
                size={14} 
                color={showFeedbackInReport ? theme.primary : theme.textSecondary} 
                style={{ marginRight: 6 }} 
              />
              <Text style={{ fontSize: 9, fontWeight: '750', color: showFeedbackInReport ? theme.primary : theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Feedback
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Competitions Card */}
      <Text style={styles.sectionTitle}>Competencias en el Periodo</Text>
      <View style={styles.card}>
        {competencias.length > 0 ? (
          <View style={styles.compsListContainer}>
            {competencias.map((comp, idx) => (
              <View key={idx} style={styles.compRow}>
                <View style={styles.compIconCircle}>
                  <Ionicons name="trophy" size={14} color={theme.run} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.compName}>{comp.nombre}</Text>
                  <Text style={styles.compDate}>{formatDateChile(comp.fecha)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteComp(idx)} style={styles.compDeleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyTextSub, { color: theme.textMuted }]}>
            Ninguna competencia registrada en este período.
          </Text>
        )}

        {showCompForm ? (
          <View style={styles.addCompContainer}>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.surface }]}
              placeholder="Nombre Carrera (ej: 70.3 Valdivia)"
              placeholderTextColor={theme.textMuted}
              value={newCompNombre}
              onChangeText={setNewCompNombre}
            />
            <TextInput
              style={[styles.formInput, { marginTop: 8, backgroundColor: theme.surface }]}
              placeholder="Fecha (AAAA-MM-DD)"
              placeholderTextColor={theme.textMuted}
              value={newCompFecha}
              onChangeText={setNewCompFecha}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={[styles.btnActionSmall, { backgroundColor: theme.surfaceSecondary, flex: 1 }]} 
                onPress={() => setShowCompForm(false)}
              >
                <Text style={[styles.btnActionSmallText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={[styles.btnActionSmall, { backgroundColor: theme.run, flex: 1 }]} 
                onPress={handleAddComp}
              >
                <Text style={styles.btnActionSmallText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.8} style={styles.btnAddComp} onPress={() => setShowCompForm(true)}>
            <Ionicons name="add" size={16} color={theme.primary} />
            <Text style={[styles.btnAddCompText, { color: theme.primary }]}>Añadir Competencia</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Volume Base (Weekly) */}
      <Text style={styles.sectionTitle}>Volumen Base (Semanal)</Text>
      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.swim }]}>🏊 Natación (Metros)</Text>
          <View style={[styles.inputWrapper, isNatFocused ? styles.inputFocused : null]}>
            <TextInput
              style={[styles.inputStyle, { color: theme.swim, fontWeight: '700' }]}
              value={baseNatacion}
              onChangeText={setBaseNatacion}
              keyboardType="numeric"
              onFocus={() => setIsNatFocused(true)}
              onBlur={() => setIsNatFocused(false)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.bike }]}>🚴 Ciclismo (Horas)</Text>
          <View style={[styles.inputWrapper, isCicFocused ? styles.inputFocused : null]}>
            <TextInput
              style={[styles.inputStyle, { color: theme.bike, fontWeight: '700' }]}
              value={baseCiclismo}
              onChangeText={setBaseCiclismo}
              keyboardType="numeric"
              onFocus={() => setIsCicFocused(true)}
              onBlur={() => setIsCicFocused(false)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.run }]}>🏃 Carrera (Horas)</Text>
          <View style={[styles.inputWrapper, isCarFocused ? styles.inputFocused : null]}>
            <TextInput
              style={[styles.inputStyle, { color: theme.run, fontWeight: '700' }]}
              value={baseCarrera}
              onChangeText={setBaseCarrera}
              keyboardType="numeric"
              onFocus={() => setIsCarFocused(true)}
              onBlur={() => setIsCarFocused(false)}
            />
          </View>
        </View>
      </View>

      {/* Weekly distribution */}
      <Text style={styles.sectionTitle}>Distribución Semanal (%)</Text>
      <View style={styles.card}>
        <View style={styles.distGrid}>
          <View style={styles.distCol}>
            <Text style={styles.label}>Sem 1 (%)</Text>
            <TextInput 
              style={[styles.formInput, { backgroundColor: theme.background }]} 
              value={distSem1} 
              onChangeText={setDistSem1} 
              keyboardType="numeric" 
            />
          </View>
          <View style={styles.distCol}>
            <Text style={styles.label}>Sem 2 (%)</Text>
            <TextInput 
              style={[styles.formInput, { backgroundColor: theme.background }]} 
              value={distSem2} 
              onChangeText={setDistSem2} 
              keyboardType="numeric" 
            />
          </View>
          <View style={styles.distCol}>
            <Text style={styles.label}>Sem 3 (%)</Text>
            <TextInput 
              style={[styles.formInput, { backgroundColor: theme.background }]} 
              value={distSem3} 
              onChangeText={setDistSem3} 
              keyboardType="numeric" 
            />
          </View>
          <View style={styles.distCol}>
            <Text style={styles.label}>Sem 4 (%)</Text>
            <TextInput 
              style={[styles.formInput, { backgroundColor: theme.background }]} 
              value={distSem4} 
              onChangeText={setDistSem4} 
              keyboardType="numeric" 
            />
          </View>
        </View>
      </View>

      {/* Mesocycle Weights & PERIODS PER MESOCYCLE (Requested by User) */}
      <Text style={styles.sectionTitle}>Ponderación y Período por Mesociclo</Text>
      <View style={styles.card}>
        <Text style={styles.mesoCardSub}>Configura el período de entrenamiento y la carga para cada mesociclo:</Text>
        
        {/* Period Selector per Mesociclo */}
        <View style={styles.periodMesoGrid}>
          {Array.from({ length: numMesosNum }).map((_, mIdx) => {
            const currentP = mesosPeriodos[mIdx] || 'General';
            return (
              <View key={mIdx} style={[styles.periodMesoCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Text style={styles.periodMesoTitle}>Mesociclo {mIdx + 1}</Text>
                
                <View style={styles.periodButtonGroup}>
                  {['General', 'Específico', 'Competitivo'].map(pOption => {
                    const isSelected = currentP === pOption;
                    let pColor = theme.primary;
                    if (pOption === 'General') pColor = '#0284c7';
                    if (pOption === 'Específico') pColor = '#ca8a04';
                    if (pOption === 'Competitivo') pColor = '#dc2626';

                    return (
                      <TouchableOpacity
                        key={pOption}
                        style={[
                          styles.periodChoiceBtn,
                          isSelected ? { backgroundColor: pColor, borderColor: pColor } : { borderColor: theme.border }
                        ]}
                        onPress={() => setMesoPeriodValue(mIdx, pOption)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.periodChoiceText,
                          { color: isSelected ? '#fff' : theme.textSecondary, fontWeight: isSelected ? '900' : '600' }
                        ]}>
                          {pOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Meso Percentage Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={styles.mesoTable}>
            <View style={[styles.mesoTableRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.mesoTableCellHeader, { backgroundColor: theme.background }]}><Text style={styles.mesoTableHeaderText}>Disciplina</Text></View>
              {Array.from({ length: numMesosNum }).map((_, mIdx) => (
                <View key={mIdx} style={[styles.mesoTableCellHeader, { backgroundColor: theme.background }]}><Text style={styles.mesoTableHeaderText}>M{mIdx + 1} ({mesosPeriodos[mIdx]?.substring(0, 3) || 'Gen'})</Text></View>
              ))}
            </View>

            {/* Swim Meso Pct */}
            <View style={[styles.mesoTableRow, { borderBottomColor: theme.border }]}>
              <View style={styles.mesoTableCell}><Text style={{ color: theme.swim, fontSize: 12, fontWeight: '700' }}>🏊 % Nat</Text></View>
              {Array.from({ length: numMesosNum }).map((_, mIdx) => (
                <View key={mIdx} style={styles.mesoTableCell}>
                  <TextInput
                    style={[styles.mesoInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    value={(mesosPct.nat[mIdx] !== undefined ? mesosPct.nat[mIdx] : 100).toString()}
                    onChangeText={val => updateMesoPct('nat', mIdx, val)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>

            {/* Bike Meso Pct */}
            <View style={[styles.mesoTableRow, { borderBottomColor: theme.border }]}>
              <View style={styles.mesoTableCell}><Text style={{ color: theme.bike, fontSize: 12, fontWeight: '700' }}>🚴 % Cic</Text></View>
              {Array.from({ length: numMesosNum }).map((_, mIdx) => (
                <View key={mIdx} style={styles.mesoTableCell}>
                  <TextInput
                    style={[styles.mesoInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    value={(mesosPct.cic[mIdx] !== undefined ? mesosPct.cic[mIdx] : 100).toString()}
                    onChangeText={val => updateMesoPct('cic', mIdx, val)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>

            {/* Run Meso Pct */}
            <View style={[styles.mesoTableRow, { borderBottomColor: theme.border }]}>
              <View style={styles.mesoTableCell}><Text style={{ color: theme.run, fontSize: 12, fontWeight: '700' }}>🏃 % Car</Text></View>
              {Array.from({ length: numMesosNum }).map((_, mIdx) => (
                <View key={mIdx} style={styles.mesoTableCell}>
                  <TextInput
                    style={[styles.mesoInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    value={(mesosPct.car[mIdx] !== undefined ? mesosPct.car[mIdx] : 100).toString()}
                    onChangeText={val => updateMesoPct('car', mIdx, val)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Weekly Zone Picker */}
      <Text style={styles.sectionTitle}>Zonas de Entrenamiento por Semana</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Selecciona Semana a Configurar:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginVertical: 8, gap: 6, paddingBottom: 6 }}>
          {Array.from({ length: totalWeeksNum }).map((_, wIdx) => {
            const isSelected = activeZoneWeekIndex === wIdx;
            const wMesoIdx = Math.ceil((wIdx + 1) / 4) - 1;
            const wPeriodo = mesosPeriodos[wMesoIdx] || 'General';

            return (
              <TouchableOpacity
                key={wIdx}
                style={[
                  styles.weekBubble, 
                  { height: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12 },
                  isSelected ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }
                ]}
                onPress={() => setActiveZoneWeekIndex(wIdx)}
              >
                <Text style={[
                  styles.weekBubbleText, 
                  { color: isSelected ? '#fff' : theme.textSecondary, fontWeight: '750' }
                ]}>
                  Semana {wIdx + 1}
                </Text>
                <Text style={{
                  fontSize: 7.5,
                  color: isSelected ? 'rgba(255,255,255,0.85)' : theme.textMuted,
                  marginTop: 1,
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {getWeekStartDateStr(wIdx)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
 
        <View style={[styles.zoneControlBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.zoneControlTitle, { color: theme.primary }]}>
            Configurar Zonas Semana {activeZoneWeekIndex + 1} ({getWeekStartDateStr(activeZoneWeekIndex)})
          </Text>
          
          {/* Swim Zone Selector */}
          <View style={styles.zoneRow}>
            <Text style={[styles.zoneRowLabel, { color: theme.swim }]}>🏊 Natación</Text>
            <View style={styles.zonesSelectorRow}>
              {['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8'].map(z => {
                const activeVal = zonasSemanales.nat[activeZoneWeekIndex] || 'Z2';
                const isSelected = activeVal.split(/[\s,/\-+]+/g).map(x => x.trim()).includes(z);
                return (
                  <TouchableOpacity
                    key={z}
                    style={[
                      styles.zonePill,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      isSelected ? { backgroundColor: theme.swim, borderColor: theme.swim } : null
                    ]}
                    onPress={() => updateZone('nat', activeZoneWeekIndex, z)}
                  >
                    <Text style={[
                      styles.zonePillText, 
                      { color: isSelected ? '#fff' : theme.textSecondary }
                    ]}>
                      {z}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
 
          {/* Bike Zone Selector */}
          <View style={styles.zoneRow}>
            <Text style={[styles.zoneRowLabel, { color: theme.bike }]}>🚴 Ciclismo</Text>
            <View style={styles.zonesSelectorRow}>
              {['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8'].map(z => {
                const activeVal = zonasSemanales.cic[activeZoneWeekIndex] || 'Z2';
                const isSelected = activeVal.split(/[\s,/\-+]+/g).map(x => x.trim()).includes(z);
                return (
                  <TouchableOpacity
                    key={z}
                    style={[
                      styles.zonePill,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      isSelected ? { backgroundColor: theme.bike, borderColor: theme.bike } : null
                    ]}
                    onPress={() => updateZone('cic', activeZoneWeekIndex, z)}
                  >
                    <Text style={[
                      styles.zonePillText, 
                      { color: isSelected ? '#fff' : theme.textSecondary }
                    ]}>
                      {z}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
 
          {/* Run Zone Selector */}
          <View style={styles.zoneRow}>
            <Text style={[styles.zoneRowLabel, { color: theme.run }]}>🏃 Carrera</Text>
            <View style={styles.zonesSelectorRow}>
              {['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8'].map(z => {
                const activeVal = zonasSemanales.car[activeZoneWeekIndex] || 'Z2';
                const isSelected = activeVal.split(/[\s,/\-+]+/g).map(x => x.trim()).includes(z);
                return (
                  <TouchableOpacity
                    key={z}
                    style={[
                      styles.zonePill,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      isSelected ? { backgroundColor: theme.run, borderColor: theme.run } : null
                    ]}
                    onPress={() => updateZone('car', activeZoneWeekIndex, z)}
                  >
                    <Text style={[
                      styles.zonePillText, 
                      { color: isSelected ? '#fff' : theme.textSecondary }
                    ]}>
                      {z}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity activeOpacity={0.85} style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => calculatePlan()}>
          <Ionicons name="sync" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Calcular Distribución</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={[styles.btn, { backgroundColor: theme.success }]} onPress={handleSavePlan}>
          <Ionicons name="save" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Guardar Plan en Ficha</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={[styles.btn, { backgroundColor: theme.error }]} onPress={handleDownloadPDF}>
          <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Generar Reporte PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Calculation output summary card */}
      {calcCache && (
        <View style={[styles.calcSummaryBox, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.success }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-done-circle" size={20} color={theme.success} style={{ marginRight: 6 }} />
              <Text style={[styles.calcSummaryTitle, { color: theme.text }]}>Plan de Entrenamiento</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }}
              onPress={handleDownloadPDF}
            >
              <Ionicons name="share-social" size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.calcSummaryText, { color: theme.textSecondary }]}>
            Lunes <Text style={{ color: theme.text, fontWeight: 'bold' }}>{calcCache.fechaInicio}</Text> al Domingo <Text style={{ color: theme.text, fontWeight: 'bold' }}>{calcCache.fechaFin}</Text>
          </Text>
          <Text style={[styles.calcSummaryDates, { color: theme.textMuted }]}>
            Duración: {calcCache.semanas} Semanas ({calcCache.mesos} Mesociclos)
          </Text>
          <View style={[styles.summaryTotalsRow, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.swim, fontWeight: 'bold', fontSize: 13 }}>🏊 {Math.round(calcCache.totNat).toLocaleString()}m</Text>
            <Text style={{ color: theme.bike, fontWeight: 'bold', fontSize: 13 }}>🚴 {formatHours(calcCache.totCic)}</Text>
            <Text style={{ color: theme.run, fontWeight: 'bold', fontSize: 13 }}>🏃 {formatHours(calcCache.totCar)}</Text>
          </View>
        </View>
      )}

      {/* Weekly Microcycles workout-style timeline scroll */}
      {showWeeksList && calcCache && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Cronograma de Microciclos</Text>
          {calcCache.fechasColumnas.map((fecha, idx) => {
            let currentWeekComps = [];
            if (calcCache.competencias && calcCache.competencias.length > 0) {
              const [day, month, yearShort] = fecha.split('/').map(Number);
              const startOfWeek = new Date(2000 + yearShort, month - 1, day);
              const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

              calcCache.competencias.forEach(c => {
                const compDate = new Date(c.fecha + 'T00:00:00');
                if (compDate >= startOfWeek && compDate <= endOfWeek) {
                  currentWeekComps.push(c.nombre);
                }
              });
            }

            const isExpanded = !!expandedWeeks[idx];
            const mesoNum = Math.ceil((idx + 1) / 4);
            const mesoPeriodo = mesosPeriodos[mesoNum - 1] || 'General';

            let badgePeriodColor = '#0284c7';
            if (mesoPeriodo === 'Específico') badgePeriodColor = '#ca8a04';
            if (mesoPeriodo === 'Competitivo') badgePeriodColor = '#dc2626';

            return (
              <View key={idx} style={[styles.weekCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Expandable Header */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={styles.weekCardHeader}
                  onPress={() => toggleWeekExpanded(idx)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[styles.weekCardTitle, { color: theme.text }]}>Semana {idx + 1}</Text>
                      <View style={[styles.mesoLabelBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.mesoLabelBadgeText, { color: theme.primary }]}>Meso {mesoNum}</Text>
                      </View>
                      <View style={[styles.periodTagBadge, { backgroundColor: badgePeriodColor + '18', borderColor: badgePeriodColor + '50' }]}>
                        <Text style={[styles.periodTagBadgeText, { color: badgePeriodColor }]}>Período {mesoPeriodo}</Text>
                      </View>
                    </View>
                    <Text style={[styles.weekCardDate, { color: theme.textSecondary }]}>{fecha}</Text>
                  </View>
                  
                  {/* Collapsed short metrics preview */}
                  {!isExpanded && (
                    <View style={styles.metricsPreviewRow}>
                      <View style={[styles.previewMetricPill, { backgroundColor: theme.swimBg }]}>
                        <Text style={[styles.previewMetricText, { color: theme.swim }]}>🏊 {Math.round(calcCache.nat[idx]/1000)}k</Text>
                      </View>
                      <View style={[styles.previewMetricPill, { backgroundColor: theme.bikeBg }]}>
                        <Text style={[styles.previewMetricText, { color: theme.bike }]}>🚴 {Math.round(calcCache.cic[idx]/60)}h</Text>
                      </View>
                      <View style={[styles.previewMetricPill, { backgroundColor: theme.runBg }]}>
                        <Text style={[styles.previewMetricText, { color: theme.run }]}>🏃 {Math.round(calcCache.car[idx]/60)}h</Text>
                      </View>
                    </View>
                  )}

                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.textSecondary} 
                    style={{ marginLeft: 8, alignSelf: 'center' }} 
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
                    {currentWeekComps.map((cName, cIdx) => (
                      <View key={cIdx} style={[styles.weekRaceBadge, { backgroundColor: theme.run }]}>
                        <Ionicons name="trophy-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.weekRaceText}>CARRERA: {cName}</Text>
                      </View>
                    ))}

                    <View style={styles.weekMetricsRow}>
                      {/* Swim block */}
                      <View style={[styles.weekMetricCol, { backgroundColor: theme.swimBg }]}>
                        <Text style={[styles.metricSportLabel, { color: theme.swim }]}>🏊 Natación</Text>
                        <Text style={[styles.weekMetricValue, { color: theme.swim }]}>{Math.round(calcCache.nat[idx]).toLocaleString()} m</Text>
                        <View style={[styles.weekMetricZoneBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[styles.weekMetricZoneText, { color: theme.swim }]}>{calcCache.zNat[idx]}</Text>
                        </View>
                      </View>
                      
                      {/* Bike block */}
                      <View style={[styles.weekMetricCol, { backgroundColor: theme.bikeBg }]}>
                        <Text style={[styles.metricSportLabel, { color: theme.bike }]}>🚴 Ciclismo</Text>
                        <Text style={[styles.weekMetricValue, { color: theme.bike }]}>{formatHours(calcCache.cic[idx])}</Text>
                        <View style={[styles.weekMetricZoneBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[styles.weekMetricZoneText, { color: theme.bike }]}>{calcCache.zCic[idx]}</Text>
                        </View>
                      </View>

                      {/* Run block */}
                      <View style={[styles.weekMetricCol, { backgroundColor: theme.runBg }]}>
                        <Text style={[styles.metricSportLabel, { color: theme.run }]}>🏃 Carrera</Text>
                        <Text style={[styles.weekMetricValue, { color: theme.run }]}>{formatHours(calcCache.car[idx])}</Text>
                        <View style={[styles.weekMetricZoneBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[styles.weekMetricZoneText, { color: theme.run }]}>{calcCache.zCar[idx]}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.primary,
    textTransform: 'uppercase',
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
    paddingLeft: 8,
    marginTop: 22,
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
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
  targetDistanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetDistanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  athleteScroller: {
    gap: 8,
    paddingVertical: 6,
  },
  athleteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  athleteBubbleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyPlansSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  planHistoryScroller: {
    gap: 8,
    paddingVertical: 6,
  },
  historyPlanWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  historyPlanBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  historyPlanText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyPlanDeleteBtn: {
    padding: 7,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  inputFocused: {
    borderColor: theme.primary,
  },
  inputStyle: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    fontWeight: '600',
  },
  compsListContainer: {
    gap: 8,
    marginBottom: 10,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  compIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.runBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text,
  },
  compDate: {
    fontSize: 10.5,
    color: theme.textSecondary,
    marginTop: 1,
  },
  compDeleteBtn: {
    padding: 4,
  },
  emptyTextSub: {
    fontSize: 11.5,
    textAlign: 'center',
    marginVertical: 6,
    fontStyle: 'italic',
  },
  addCompContainer: {
    backgroundColor: theme.surfaceSecondary,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: theme.text,
    fontWeight: '600',
  },
  btnAddComp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: theme.glowColor,
    borderRadius: 12,
    marginTop: 4,
  },
  btnAddCompText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  btnActionSmall: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionSmallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  distGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  distCol: {
    flex: 1,
  },
  mesoCardSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 10,
  },
  periodMesoGrid: {
    gap: 8,
    marginBottom: 10,
  },
  periodMesoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  periodMesoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.text,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  periodButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  periodChoiceBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  periodChoiceText: {
    fontSize: 10,
  },
  mesoTable: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mesoTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mesoTableCellHeader: {
    width: 80,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesoTableHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.textSecondary,
  },
  mesoTableCell: {
    width: 80,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesoInput: {
    width: '100%',
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },
  weekBubble: {
    borderWidth: 1,
    alignItems: 'center',
  },
  weekBubbleText: {
    fontSize: 11,
  },
  zoneControlBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  zoneControlTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  zoneRow: {
    marginBottom: 10,
  },
  zoneRowLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  zonesSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  zonePill: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  zonePillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  actionsContainer: {
    gap: 10,
    marginVertical: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  calcSummaryBox: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  calcSummaryTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  calcSummaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  calcSummaryDates: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  weekCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekCardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  mesoLabelBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mesoLabelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  periodTagBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodTagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  weekCardDate: {
    fontSize: 10,
    marginTop: 2,
  },
  metricsPreviewRow: {
    flexDirection: 'row',
    gap: 4,
  },
  previewMetricPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewMetricText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  expandedContent: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  weekRaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  weekRaceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekMetricCol: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
  },
  metricSportLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  weekMetricValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  weekMetricZoneBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  weekMetricZoneText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  subTabNavContainer: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  subTabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  subTabNavBtnActive: {
    backgroundColor: theme.primary,
  },
  subTabNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  subTabNavTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
