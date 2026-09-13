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

function formatDateChile(date) {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear().toString().substring(2)}`;
}

export default function PlanificacionTab({ atletas, onSavePlan, onDeletePlan, onSaveCumplimiento }) {
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

    setMesociclos(plan.mesos ? plan.mesos.toString() : '3');
    setBaseNatacion(plan.baseNat ? plan.baseNat.toString() : '6000');
    setBaseCiclismo(plan.baseCic ? plan.baseCic.toString() : '5');
    setBaseCarrera(plan.baseCar ? plan.baseCar.toString() : '4');

    setDistSem1(plan.distSem1 ? plan.distSem1.toString() : '23');
    setDistSem2(plan.distSem2 ? plan.distSem2.toString() : '27');
    setDistSem3(plan.distSem3 ? plan.distSem3.toString() : '32');
    setDistSem4(plan.distSem4 ? plan.distSem4.toString() : '18');

    setCompetencias(plan.competencias || []);
    setMesosPct(plan.mesosPct || DEFAULT_MESO_PCT);
    setFeedback(plan.feedback || '');
    setShowCompetenciasInReport(plan.showCompetenciasInReport !== false);
    setShowFeedbackInReport(plan.showFeedbackInReport !== false);

    const numMeso = plan.mesos || 3;
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
      
      // Parse active zones
      let activeZones = currentVal.split(/[\s,/\-+]+/g).map(z => z.trim()).filter(z => z.startsWith('Z'));
      
      if (activeZones.includes(clickedZone)) {
        if (activeZones.length > 1) {
          activeZones = activeZones.filter(z => z !== clickedZone);
        }
      } else {
        activeZones.push(clickedZone);
      }
      
      // Sort zones (Z1, Z2, Z3...)
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

    // Sync calcCache immediately for real-time UI updates
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

  const handleAddComp = () => {
    if (!newCompNombre.trim()) {
      Alert.alert('Error', 'Ingresa el nombre de la competencia.');
      return;
    }
    if (!newCompFecha) {
      Alert.alert('Error', 'Ingresa la fecha de la competencia.');
      return;
    }

    setCompetencias(prev => [
      ...prev,
      { nombre: newCompNombre.trim(), fecha: newCompFecha }
    ]);
    setNewCompNombre('');
    setNewCompFecha('');
    setShowCompForm(false);
  };

  const handleDeleteComp = (idx) => {
    setCompetencias(prev => prev.filter((_, i) => i !== idx));
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
        pools.nat += planSource.mesosPct.nat[m] !== undefined ? planSource.mesosPct.nat[m] : 100;
        pools.cic += planSource.mesosPct.cic[m] !== undefined ? planSource.mesosPct.cic[m] : 100;
        pools.car += planSource.mesosPct.car[m] !== undefined ? planSource.mesosPct.car[m] : 100;
      }

      if (pools.nat === 0) pools.nat = 1;
      if (pools.cic === 0) pools.cic = 1;
      if (pools.car === 0) pools.car = 1;

      let fileNatMts = [];
      let fileCicMin = [];
      let fileCarMin = [];
      let colDates = [];

      let sumNat = 0, sumCic = 0, sumCar = 0;

      for (let s = 1; s <= totalWeeks; s++) {
        const mIdx = Math.ceil(s / 4) - 1;
        const weekFactor = weeklyDistributionArr[(s - 1) % 4];

        const mesoNat = planSource.mesosPct.nat[mIdx] !== undefined ? planSource.mesosPct.nat[mIdx] : 100;
        const mesoCic = planSource.mesosPct.cic[mIdx] !== undefined ? planSource.mesosPct.cic[mIdx] : 100;
        const mesoRun = planSource.mesosPct.car[mIdx] !== undefined ? planSource.mesosPct.car[mIdx] : 100;

        const weekSwim = (totalMacroSwim * (mesoNat / pools.nat)) * weekFactor;
        const weekBike = (totalMacroBikeMin * (mesoCic / pools.cic)) * weekFactor;
        const weekRun = (totalMacroRunMin * (mesoRun / pools.car)) * weekFactor;

        fileNatMts.push(weekSwim);
        fileCicMin.push(weekBike);
        fileCarMin.push(weekRun);

        sumNat += weekSwim;
        sumCic += weekBike;
        sumCar += weekRun;

        const currentMon = new Date(mondayStart.getTime());
        currentMon.setDate(currentMon.getDate() + (s - 1) * 7);
        colDates.push(formatDateChile(currentMon));
      }

      const results = {
        atleta: nombreDeportista,
        fechaInicio: formatDateChile(mondayStart),
        fechaFin: formatDateChile(endDate),
        mesos: numMesos,
        semanas: totalWeeks,
        fechasColumnas: colDates,
        competencias: planSource.competencias,
        nat: fileNatMts,
        cic: fileCicMin,
        car: fileCarMin,
        totNat: sumNat,
        totCic: sumCic,
        totCar: sumCar,
        zNat: planSource.zonasSemanales.nat,
        zCic: planSource.zonasSemanales.cic,
        zCar: planSource.zonasSemanales.car,
        rawPlan: planSource,
        feedback: planSource.feedback !== undefined ? planSource.feedback : feedback,
        showCompetenciasInReport: planSource.showCompetenciasInReport !== undefined ? planSource.showCompetenciasInReport : showCompetenciasInReport,
        showFeedbackInReport: planSource.showFeedbackInReport !== undefined ? planSource.showFeedbackInReport : showFeedbackInReport
      };

      setCalcCache(results);
      setShowWeeksList(true);
    } catch (e) {
      Alert.alert('Error', 'Fallo al calcular el macrociclo: ' + e.message);
    }
  };

  const loadPlanData = (planData) => {
    if (!planData) return;
    setFechaInicio(planData.fechaInicio);
    setMesociclos(planData.mesos ? planData.mesos.toString() : '3');
    setBaseNatacion(planData.baseNat ? planData.baseNat.toString() : '6000');
    setBaseCiclismo(planData.baseCic ? planData.baseCic.toString() : '5');
    setBaseCarrera(planData.baseCar ? planData.baseCar.toString() : '4');

    setDistSem1(planData.distSem1 ? planData.distSem1.toString() : '23');
    setDistSem2(planData.distSem2 ? planData.distSem2.toString() : '27');
    setDistSem3(planData.distSem3 ? planData.distSem3.toString() : '32');
    setDistSem4(planData.distSem4 ? planData.distSem4.toString() : '18');

    setCompetencias(planData.competencias || []);
    setMesosPct(planData.mesosPct || DEFAULT_MESO_PCT);
    setZonasSemanales(planData.zonasSemanales || { nat: [], cic: [], car: [] });
    setFeedback(planData.feedback || '');
    setShowCompetenciasInReport(planData.showCompetenciasInReport !== false);
    setShowFeedbackInReport(planData.showFeedbackInReport !== false);
    
    // Calcular de inmediato usando la estructura del plan histórico
    calculatePlan(planData);
    setExpandedWeeks({});
  };

  const confirmDeletePlan = (fInicio) => {
    const performDelete = () => {
      onDeletePlan(selectedAtletaId, fInicio);
      setCalcCache(null);
      setShowWeeksList(false);
      Alert.alert('Plan eliminado', `Se eliminó el plan con fecha de inicio ${fInicio}.`);
    };

    if (Platform.OS === 'web') {
      if (confirm(`¿Estás seguro de eliminar el plan con fecha de inicio ${fInicio} de este atleta?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Eliminar Plan de Historial',
        `¿Estás seguro de eliminar el plan con fecha de inicio ${fInicio}? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', onPress: performDelete, style: 'destructive' }
        ]
      );
    }
  };

  const handleSavePlan = () => {
    if (!selectedAtletaId) {
      Alert.alert('Error', 'Selecciona un deportista primero.');
      return;
    }

    calculatePlan();
    
    const planData = {
      fechaInicio,
      mesos: parseInt(mesociclos),
      baseNat: parseInt(baseNatacion),
      baseCic: parseInt(baseCiclismo),
      baseCar: parseInt(baseCarrera),
      distSem1: parseInt(distSem1),
      distSem2: parseInt(distSem2),
      distSem3: parseInt(distSem3),
      distSem4: parseInt(distSem4),
      competencias: competencias,
      mesosPct: mesosPct,
      zonasSemanales: zonasSemanales,
      feedback: feedback,
      showCompetenciasInReport: showCompetenciasInReport,
      showFeedbackInReport: showFeedbackInReport
    };

    onSavePlan(selectedAtletaId, planData);
    Alert.alert('Guardado', 'Planificación de macrociclo guardada exitosamente.');
  };

  const handleDownloadPDF = async () => {
    if (!calcCache) {
      Alert.alert('Calcular primero', 'Por favor calcula la distribución antes de exportar.');
      return;
    }
    await generatePDFReport(calcCache);
  };

  if (!atletas || atletas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Registra un atleta en la pestaña "Cobros" antes de poder planificar un macrociclo.
        </Text>
      </View>
    );
  }

  const athlete = atletas.find(a => a.id === selectedAtletaId);
  const planHistory = athlete ? (athlete.planHistory || []) : [];
  const numMesosNum = parseInt(mesociclos) || 3;
  const totalWeeksNum = numMesosNum * 4;

  if (activeSubTab === 'cumplimiento') {
    return (
      <View style={styles.container}>
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

      {/* SubTab Switcher: Macrociclo vs Cumplimiento Real */}
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
        <Text style={styles.label}>Seleccionar Atleta de Biblioteca</Text>
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
                  <Text style={styles.compDate}>{comp.fecha}</Text>
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

      {/* Mesocycle Weights */}
      <Text style={styles.sectionTitle}>Ponderación (%) por Mesociclo</Text>
      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.mesoTable}>
            <View style={[styles.mesoTableRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.mesoTableCellHeader, { backgroundColor: theme.background }]}><Text style={styles.mesoTableHeaderText}>Disciplina</Text></View>
              {Array.from({ length: numMesosNum }).map((_, mIdx) => (
                <View key={mIdx} style={[styles.mesoTableCellHeader, { backgroundColor: theme.background }]}><Text style={styles.mesoTableHeaderText}>M{mIdx + 1}</Text></View>
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
            return (
              <TouchableOpacity
                key={wIdx}
                style={[
                  styles.weekBubble, 
                  { height: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
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

            return (
              <View key={idx} style={[styles.weekCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Expandable Header */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={styles.weekCardHeader}
                  onPress={() => toggleWeekExpanded(idx)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.weekCardTitle, { color: theme.text }]}>Semana {idx + 1}</Text>
                      <View style={[styles.mesoLabelBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.mesoLabelBadgeText, { color: theme.primary }]}>Meso {Math.ceil((idx + 1) / 4)}</Text>
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
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  historyPlanBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  historyPlanText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyPlanDeleteBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 9,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.surface,
  },
  inputStyle: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    height: '100%',
    fontWeight: '500',
  },
  compsListContainer: {
    marginBottom: 12,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  compIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  compDate: {
    color: theme.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  compDeleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTextSub: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
  btnAddComp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnAddCompText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  addCompContainer: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    fontWeight: '500',
  },
  btnActionSmall: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionSmallText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  distCol: {
    flex: 1,
  },
  mesoTable: {
    flexDirection: 'column',
    minWidth: 380,
  },
  mesoTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  mesoTableCellHeader: {
    flex: 1.2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mesoTableHeaderText: {
    color: theme.primary,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mesoTableCell: {
    flex: 1.2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  mesoInput: {
    width: '100%',
    borderWidth: 1,
    textAlign: 'center',
    borderRadius: 8,
    fontSize: 13,
    paddingVertical: 6,
    fontWeight: '600',
  },
  weekBubble: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  weekBubbleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  zoneControlBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  zoneControlTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 1,
  },
  zoneRow: {
    marginBottom: 14,
  },
  zoneRowLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
    fontWeight: '800',
  },
  zonesSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  zonePill: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 38,
  },
  zonePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsContainer: {
    gap: 10,
    marginVertical: 16,
  },
  btn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  btnText: {
    color: '#fff',
    fontWeight: '850',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcSummaryBox: {
    borderLeftWidth: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 10,
  },
  calcSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  calcSummaryText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  calcSummaryDates: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  summaryTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  weekCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekCardDate: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  mesoLabelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
  mesoLabelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricsPreviewRow: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'center',
  },
  previewMetricPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  previewMetricText: {
    fontSize: 9,
    fontWeight: '800',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  weekRaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  weekRaceText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekMetricCol: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  metricSportLabel: {
    fontSize: 10,
    fontWeight: '850',
    textTransform: 'uppercase',
  },
  weekMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    marginVertical: 4,
  },
  weekMetricZoneBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 2,
    borderWidth: 1,
  },
  weekMetricZoneText: {
    fontSize: 9,
    fontWeight: '900',
  },
  subTabNavContainer: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceSecondary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  subTabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  subTabNavBtnActive: {
    backgroundColor: theme.primary,
  },
  subTabNavText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  subTabNavTextActive: {
    color: '#ffffff',
  },
});
