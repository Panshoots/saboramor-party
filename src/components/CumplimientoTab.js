import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Share,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { generateCompliancePDF } from '../utils/pdfComplianceGenerator';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function formatHoursShort(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '0h';
  let hours = Math.floor(totalMinutes / 60);
  let minutes = Math.round(totalMinutes % 60);
  if (minutes === 0) return String(hours) + 'h';
  return String(hours) + 'h ' + String(minutes) + 'm';
}

function getMonday(dateString) {
  let d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) d = new Date();
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateChile(date) {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return (dd < 10 ? '0' + dd : dd) + '/' + (mm < 10 ? '0' + mm : mm) + '/' + date.getFullYear().toString().substring(2);
}

const getInitials = (name) => {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
};

export default function CumplimientoTab({ atletas, onSaveCumplimiento }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [selectedAtletaId, setSelectedAtletaId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('distancia');
  
  const [showInputModal, setShowInputModal] = useState(false);
  const [compNatMeters, setCompNatMeters] = useState('');
  const [compCicHours, setCompCicHours] = useState('');
  const [compCarHours, setCompCarHours] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [breakdownCounts, setBreakdownCounts] = useState({
    green: '3',
    yellow: '1',
    orange: '1',
    red: '1',
    extra: '1'
  });

  useEffect(() => {
    if (atletas && atletas.length > 0 && !selectedAtletaId) {
      setSelectedAtletaId(atletas[0].id);
    }
  }, [atletas]);

  const selectedAthlete = (atletas || []).find(a => a.id === selectedAtletaId) || (atletas && atletas[0]) || null;

  const plan = selectedAthlete?.plan || {};
  const numMesos = plan.mesos || 3;
  const totalWeeks = numMesos * 4;

  const baseSwim = parseFloat(plan.baseNat) || 6000;
  const baseBike = parseFloat(plan.baseCic) || 5;
  const baseRun = parseFloat(plan.baseCar) || 4;

  const pS1 = (parseFloat(plan.distSem1) || 23) / 100;
  const pS2 = (parseFloat(plan.distSem2) || 27) / 100;
  const pS3 = (parseFloat(plan.distSem3) || 32) / 100;
  const pS4 = (parseFloat(plan.distSem4) || 18) / 100;
  const weeklyDistributionArr = [pS1, pS2, pS3, pS4];

  const totalMacroSwim = baseSwim * totalWeeks;
  const totalMacroBikeMin = (baseBike * totalWeeks) * 60;
  const totalMacroRunMin = (baseRun * totalWeeks) * 60;

  let pools = { nat: 0, cic: 0, car: 0 };
  for (let m = 0; m < numMesos; m++) {
    pools.nat += (plan.mesosPct && plan.mesosPct.nat && plan.mesosPct.nat[m] !== undefined) ? plan.mesosPct.nat[m] : 100;
    pools.cic += (plan.mesosPct && plan.mesosPct.cic && plan.mesosPct.cic[m] !== undefined) ? plan.mesosPct.cic[m] : 100;
    pools.car += (plan.mesosPct && plan.mesosPct.car && plan.mesosPct.car[m] !== undefined) ? plan.mesosPct.car[m] : 100;
  }
  if (pools.nat === 0) pools.nat = 1;
  if (pools.cic === 0) pools.cic = 1;
  if (pools.car === 0) pools.car = 1;

  const mondayStart = getMonday(plan.fechaInicio || new Date().toISOString().split('T')[0]);

  const calculatedWeeks = [];
  for (let s = 1; s <= totalWeeks; s++) {
    const mIdx = Math.ceil(s / 4) - 1;
    const weekFactor = weeklyDistributionArr[(s - 1) % 4];

    const mesoNat = (plan.mesosPct && plan.mesosPct.nat && plan.mesosPct.nat[mIdx] !== undefined) ? plan.mesosPct.nat[mIdx] : 100;
    const mesoCic = (plan.mesosPct && plan.mesosPct.cic && plan.mesosPct.cic[mIdx] !== undefined) ? plan.mesosPct.cic[mIdx] : 100;
    const mesoRun = (plan.mesosPct && plan.mesosPct.car && plan.mesosPct.car[mIdx] !== undefined) ? plan.mesosPct.car[mIdx] : 100;

    const weekSwimM = (totalMacroSwim * (mesoNat / pools.nat)) * weekFactor;
    const weekBikeMin = (totalMacroBikeMin * (mesoCic / pools.cic)) * weekFactor;
    const weekRunMin = (totalMacroRunMin * (mesoRun / pools.car)) * weekFactor;

    const currentMon = new Date(mondayStart.getTime());
    currentMon.setDate(currentMon.getDate() + (s - 1) * 7);

    calculatedWeeks.push({
      weekIndex: s - 1,
      semanaNum: s,
      mesoNum: mIdx + 1,
      fechaInicio: formatDateChile(currentMon),
      planned: {
        natM: weekSwimM,
        cicMin: weekBikeMin,
        carMin: weekRunMin,
        totalKm: (weekSwimM / 1000) + (weekBikeMin / 60 * 28) + (weekRunMin / 60 * 12),
        totalMin: (weekSwimM / 100 * 2) + weekBikeMin + weekRunMin,
        totalEcos: (weekSwimM / 100 * 2 * 0.75 * 2) + (weekBikeMin * 0.5 * 2) + (weekRunMin * 1.0 * 2)
      }
    });
  }

  const complianceWeeks = selectedAthlete?.cumplimientoWeeks || {};

  const startIdx = Math.max(0, activeWeekIndex - selectedPeriod + 1);
  const endIdx = activeWeekIndex;

  let aggPlannedKm = 0;
  let aggCompletedKm = 0;
  let aggPlannedMin = 0;
  let aggCompletedMin = 0;
  let aggPlannedEcos = 0;
  let aggCompletedEcos = 0;

  let aggNatPlannedM = 0;
  let aggNatCompletedM = 0;
  let aggCicPlannedMin = 0;
  let aggCicCompletedMin = 0;
  let aggCarPlannedMin = 0;
  let aggCarCompletedMin = 0;

  let aggBreakdown = { green: 0, yellow: 0, orange: 0, red: 0, extra: 0 };

  for (let w = startIdx; w <= endIdx; w++) {
    const wPlan = calculatedWeeks[w]?.planned || { natM: 6000, cicMin: 300, carMin: 240, totalKm: 50, totalMin: 600, totalEcos: 400 };
    const wComp = complianceWeeks[w] || null;

    aggPlannedKm += wPlan.totalKm;
    aggPlannedMin += wPlan.totalMin;
    aggPlannedEcos += wPlan.totalEcos;

    aggNatPlannedM += wPlan.natM;
    aggCicPlannedMin += wPlan.cicMin;
    aggCarPlannedMin += wPlan.carMin;

    if (wComp) {
      const cNatM = parseFloat(wComp.natM) || 0;
      const cCicMin = (parseFloat(wComp.cicHours) || 0) * 60;
      const cCarMin = (parseFloat(wComp.carHours) || 0) * 60;

      const cKm = (cNatM / 1000) + (cCicMin / 60 * 28) + (cCarMin / 60 * 12);
      const cMin = (cNatM / 100 * 2) + cCicMin + cCarMin;
      const cEcos = (cNatM / 100 * 2 * 0.75 * 2) + (cCicMin * 0.5 * 2) + (cCarMin * 1.0 * 2);

      aggCompletedKm += cKm;
      aggCompletedMin += cMin;
      aggCompletedEcos += cEcos;

      aggNatCompletedM += cNatM;
      aggCicCompletedMin += cCicMin;
      aggCarCompletedMin += cCarMin;

      if (wComp.breakdown) {
        aggBreakdown.green += parseInt(wComp.breakdown.green) || 0;
        aggBreakdown.yellow += parseInt(wComp.breakdown.yellow) || 0;
        aggBreakdown.orange += parseInt(wComp.breakdown.orange) || 0;
        aggBreakdown.red += parseInt(wComp.breakdown.red) || 0;
        aggBreakdown.extra += parseInt(wComp.breakdown.extra) || 0;
      }
    } else {
      const defaultFact = 0.84;
      aggCompletedKm += wPlan.totalKm * defaultFact;
      aggCompletedMin += wPlan.totalMin * defaultFact;
      aggCompletedEcos += wPlan.totalEcos * defaultFact;

      aggNatCompletedM += wPlan.natM * defaultFact;
      aggCicCompletedMin += wPlan.cicMin * defaultFact;
      aggCarCompletedMin += wPlan.carMin * defaultFact;

      aggBreakdown.green += 3;
      aggBreakdown.yellow += 1;
      aggBreakdown.orange += 1;
      aggBreakdown.red += 1;
      aggBreakdown.extra += 1;
    }
  }

  let currentPlannedStr = '';
  let currentCompletedStr = '';
  let currentPct = 0;

  if (selectedMetric === 'distancia') {
    currentPlannedStr = aggPlannedKm.toFixed(1) + ' km';
    currentCompletedStr = aggCompletedKm.toFixed(1) + ' km';
    currentPct = aggPlannedKm > 0 ? Math.round((aggCompletedKm / aggPlannedKm) * 100) : 0;
  } else if (selectedMetric === 'duracion') {
    currentPlannedStr = formatHoursShort(aggPlannedMin);
    currentCompletedStr = formatHoursShort(aggCompletedMin);
    currentPct = aggPlannedMin > 0 ? Math.round((aggCompletedMin / aggPlannedMin) * 100) : 0;
  } else {
    currentPlannedStr = Math.round(aggPlannedEcos) + ' ECOs';
    currentCompletedStr = Math.round(aggCompletedEcos) + ' ECOs';
    currentPct = aggPlannedEcos > 0 ? Math.round((aggCompletedEcos / aggPlannedEcos) * 100) : 0;
  }

  const getStatusColor = (pct) => {
    if (pct >= 80 && pct <= 120) return theme.success;
    if (pct >= 55 && pct < 80) return theme.warning;
    if (pct > 120) return '#f97316';
    return theme.error;
  };

  const getStatusBgColor = (pct) => {
    if (pct >= 80 && pct <= 120) return theme.successBg || 'rgba(16, 185, 129, 0.15)';
    if (pct >= 55 && pct < 80) return theme.warningBg || 'rgba(245, 158, 11, 0.15)';
    if (pct > 120) return 'rgba(249, 115, 22, 0.15)';
    return theme.errorBg || 'rgba(239, 68, 68, 0.15)';
  };

  const getStatusLabel = (pct) => {
    if (pct >= 80 && pct <= 120) return 'Óptimo';
    if (pct >= 55 && pct < 80) return 'En Progreso';
    if (pct > 120) return 'Exceso';
    return 'Bajo';
  };

  const natPct = aggNatPlannedM > 0 ? Math.round((aggNatCompletedM / aggNatPlannedM) * 100) : 0;
  const cicPct = aggCicPlannedMin > 0 ? Math.round((aggCicCompletedMin / aggCicPlannedMin) * 100) : 0;
  const carPct = aggCarPlannedMin > 0 ? Math.round((aggCarCompletedMin / aggCarPlannedMin) * 100) : 0;

  const openRegisterModal = () => {
    const existing = complianceWeeks[activeWeekIndex];
    const wPlan = calculatedWeeks[activeWeekIndex]?.planned || { natM: 6000, cicMin: 300, carMin: 240 };
    
    if (existing) {
      setCompNatMeters(String(existing.natM || ''));
      setCompCicHours(String(existing.cicHours || ''));
      setCompCarHours(String(existing.carHours || ''));
      setCoachNotes(existing.notes || '');
      setBreakdownCounts({
        green: String(existing.breakdown?.green ?? '3'),
        yellow: String(existing.breakdown?.yellow ?? '1'),
        orange: String(existing.breakdown?.orange ?? '1'),
        red: String(existing.breakdown?.red ?? '1'),
        extra: String(existing.breakdown?.extra ?? '1')
      });
    } else {
      setCompNatMeters(String(Math.round(wPlan.natM * 0.85)));
      setCompCicHours((wPlan.cicMin / 60 * 0.85).toFixed(1));
      setCompCarHours((wPlan.carMin / 60 * 0.85).toFixed(1));
      setCoachNotes('');
      setBreakdownCounts({
        green: '3',
        yellow: '1',
        orange: '1',
        red: '1',
        extra: '1'
      });
    }
    setShowInputModal(true);
  };

  const handleSaveComplianceRecord = () => {
    if (!selectedAthlete) return;

    const natVal = parseFloat(compNatMeters) || 0;
    const cicVal = parseFloat(compCicHours) || 0;
    const carVal = parseFloat(compCarHours) || 0;

    const updatedComplianceWeeks = {
      ...(selectedAthlete.cumplimientoWeeks || {}),
      [activeWeekIndex]: {
        natM: natVal,
        cicHours: cicVal,
        carHours: carVal,
        notes: coachNotes,
        breakdown: {
          green: parseInt(breakdownCounts.green) || 0,
          yellow: parseInt(breakdownCounts.yellow) || 0,
          orange: parseInt(breakdownCounts.orange) || 0,
          red: parseInt(breakdownCounts.red) || 0,
          extra: parseInt(breakdownCounts.extra) || 0
        },
        savedAt: new Date().toISOString()
      }
    };

    const updatedAthlete = {
      ...selectedAthlete,
      cumplimientoWeeks: updatedComplianceWeeks
    };

    if (onSaveCumplimiento) {
      onSaveCumplimiento(updatedAthlete, activeWeekIndex + 1);
    }

    setShowInputModal(false);
    Alert.alert('Éxito', '¡Registro de cumplimiento de la Semana ' + (activeWeekIndex + 1) + ' guardado correctamente!');
  };

  const handleShareWhatsApp = async () => {
    if (!selectedAthlete) return;
    const periodLabel = selectedPeriod === 1 ? ('Semana ' + (activeWeekIndex + 1)) : (selectedPeriod + ' Semanas (Mesociclo)');
    const msg = 
      '📊 *REPORTE DE CUMPLIMIENTO DE ENTRENAMIENTO*\n' +
      '👤 *Atleta:* ' + selectedAthlete.nombre + '\n' +
      '📅 *Periodo:* ' + periodLabel + '\n\n' +
      '📈 *CUMPLIMIENTO GLOBAL: ' + currentPct + '% (' + getStatusLabel(currentPct) + ')*\n' +
      '• *Distancia:* ' + aggCompletedKm.toFixed(1) + ' km / ' + aggPlannedKm.toFixed(1) + ' km\n' +
      '• *Duración:* ' + formatHoursShort(aggCompletedMin) + ' / ' + formatHoursShort(aggPlannedMin) + '\n' +
      '• *Carga:* ' + Math.round(aggCompletedEcos) + ' / ' + Math.round(aggPlannedEcos) + ' ECOs\n\n' +
      '🏊 *Natación:* ' + (aggNatCompletedM / 1000).toFixed(1) + ' km / ' + (aggNatPlannedM / 1000).toFixed(1) + ' km (' + natPct + '%)\n' +
      '🚴 *Ciclismo:* ' + (aggCicCompletedMin / 60).toFixed(1) + ' h / ' + (aggCicPlannedMin / 60).toFixed(1) + ' h (' + cicPct + '%)\n' +
      '🏃 *Carrera:* ' + (aggCarCompletedMin / 60).toFixed(1) + ' h / ' + (aggCarPlannedMin / 60).toFixed(1) + ' h (' + carPct + '%)\n\n' +
      '🎯 *Estado de Sesiones:*\n' +
      '🟢 En Objetivo: ' + aggBreakdown.green + '\n' +
      '🟡 Desviación >20%: ' + aggBreakdown.yellow + '\n' +
      '🟠 No Completado: ' + aggBreakdown.orange + '\n' +
      '🔴 Sin Registro: ' + aggBreakdown.red + '\n' +
      '⚪ Extra: ' + aggBreakdown.extra + '\n\n' +
      (coachNotes ? ('📝 *Comentarios del Entrenador:* ' + coachNotes + '\n\n') : '') +
      '💪 ¡A seguir dándolo todo en el próximo microciclo! 🔥';

    try {
      await Share.share({ message: msg });
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedAthlete) return;
    try {
      const dataForPDF = {
        athleteName: selectedAthlete.nombre,
        periodLabel: selectedPeriod === 1 ? ('Semana ' + (activeWeekIndex + 1)) : (selectedPeriod + ' Semanas (Mesociclo)'),
        semanaNum: activeWeekIndex + 1,
        startDate: calculatedWeeks[activeWeekIndex]?.fechaInicio || '',
        currentPct,
        statusLabel: getStatusLabel(currentPct),
        statusColor: getStatusColor(currentPct),
        plannedKm: aggPlannedKm.toFixed(1),
        completedKm: aggCompletedKm.toFixed(1),
        plannedDuration: formatHoursShort(aggPlannedMin),
        completedDuration: formatHoursShort(aggCompletedMin),
        plannedEcos: Math.round(aggPlannedEcos),
        completedEcos: Math.round(aggCompletedEcos),
        natPlanned: (aggNatPlannedM / 1000).toFixed(1) + ' km',
        natCompleted: (aggNatCompletedM / 1000).toFixed(1) + ' km',
        natPct,
        cicPlanned: (aggCicPlannedMin / 60).toFixed(1) + ' h',
        cicCompleted: (aggCicCompletedMin / 60).toFixed(1) + ' h',
        cicPct,
        carPlanned: (aggCarPlannedMin / 60).toFixed(1) + ' h',
        carCompleted: (aggCarCompletedMin / 60).toFixed(1) + ' h',
        carPct,
        breakdown: aggBreakdown,
        coachNotes: complianceWeeks[activeWeekIndex]?.notes || '',
        calculatedWeeks,
        complianceWeeks,
        activeWeekIndex,
        selectedPeriod
      };

      await generateCompliancePDF(dataForPDF);
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF: ' + err.message);
    }
  };

  if (!atletas || atletas.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="people-outline" size={56} color={theme.textMuted} />
        <Text style={styles.emptyText}>No hay atletas registrados</Text>
      </View>
    );
  }

  const activeWeekData = calculatedWeeks[activeWeekIndex] || { semanaNum: 1, fechaInicio: '' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* 1. ATHLETES LIST SELECTOR (Styled identical to PlanificacionTab) */}
      <View style={styles.selectorCard}>
        <Text style={styles.label}>SELECCIONAR ATLETA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.athleteScroller}>
          {atletas.map(a => {
            const isSel = a.id === selectedAthlete?.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.athleteBubble,
                  isSel ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
                ]}
                onPress={() => {
                  setSelectedAtletaId(a.id);
                  setActiveWeekIndex(0);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person"
                  size={12}
                  color={isSel ? '#ffffff' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.athleteBubbleText,
                    { color: isSel ? '#ffffff' : theme.textSecondary }
                  ]}
                  numberOfLines={1}
                >
                  {a.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. PERIOD SELECTOR (1, 2, 3, 4 Semanas) */}
      <View style={styles.card}>
        <Text style={styles.label}>AGRUPACIÓN TEMPORAL</Text>
        <View style={styles.periodRow}>
          {[1, 2, 3, 4].map((p) => {
            const isSel = selectedPeriod === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, isSel && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodBtnText, isSel && styles.periodBtnTextActive]}>
                  {p === 1 ? '1 Sem' : p === 4 ? '4 Sem (Meso)' : p + ' Sem'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. WEEKS SELECTOR CAROUSEL */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>SELECCIONAR MICROCICLO / SEMANA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeksScroll}>
            {calculatedWeeks.map((w, idx) => {
              const isSel = idx === activeWeekIndex;
              const hasComp = !!complianceWeeks[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.weekPill,
                    isSel ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
                  ]}
                  onPress={() => setActiveWeekIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.weekPillNum, isSel ? { color: '#ffffff' } : null]}>
                    Semana {w.semanaNum}
                  </Text>
                  <Text style={[styles.weekPillDate, isSel ? { color: 'rgba(255,255,255,0.85)' } : null]}>
                    {w.fechaInicio}
                  </Text>
                  {hasComp && (
                    <View style={[styles.hasCompDot, isSel ? { backgroundColor: '#ffffff' } : null]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 4. METRIC SWITCHER TABS (Duración, Distancia, TSS/ECOs) */}
      <View style={styles.metricTabsRow}>
        {[
          { id: 'distancia', label: 'Distancia', icon: 'map-outline' },
          { id: 'duracion', label: 'Duración', icon: 'time-outline' },
          { id: 'tss', label: 'TSS / ECOs', icon: 'flash-outline' },
        ].map((m) => {
          const isSel = selectedMetric === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.metricTab, isSel && styles.metricTabActive]}
              onPress={() => setSelectedMetric(m.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={m.icon}
                size={14}
                color={isSel ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.metricTabText, isSel && styles.metricTabTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. MAIN COMPLIANCE CARD (Instantánea Semanal) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardTitle}>Instantánea Semanal</Text>
            <Text style={styles.cardSubtitle}>
              Semana {activeWeekData.semanaNum} • Desde {activeWeekData.fechaInicio}
            </Text>
          </View>
          <TouchableOpacity style={styles.btnActionSmall} onPress={openRegisterModal} activeOpacity={0.7}>
            <Ionicons name="pencil" size={12} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={styles.btnActionSmallText}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* COMPARISON METRIC BLOCK */}
        <View style={styles.comparisonBox}>
          <View style={styles.compCol}>
            <Text style={styles.compColLabel}>PLANEADO</Text>
            <Text style={styles.compColVal} numberOfLines={1}>{currentPlannedStr}</Text>
          </View>

          <View style={styles.compDivider} />

          <View style={styles.compCol}>
            <Text style={styles.compColLabel}>REALIZADO</Text>
            <Text style={[styles.compColVal, { color: getStatusColor(currentPct) }]} numberOfLines={1}>
              {currentCompletedStr}
            </Text>
          </View>

          <View style={[styles.complianceBadge, { backgroundColor: getStatusBgColor(currentPct), borderColor: getStatusColor(currentPct) + '40' }]}>
            <Text style={[styles.complianceBadgePct, { color: getStatusColor(currentPct) }]}>
              {currentPct}%
            </Text>
            <Text style={[styles.complianceBadgeLabel, { color: getStatusColor(currentPct) }]}>
              {getStatusLabel(currentPct)}
            </Text>
          </View>
        </View>

        {/* DAY-BY-DAY BAR CHART */}
        <View style={styles.dailyChartContainer}>
          <Text style={styles.label}>CUMPLIMIENTO DIARIO</Text>
          <View style={styles.dailyBarsRow}>
            {DAY_LETTERS.map((letter, dIdx) => {
              const heights = [70, 90, 80, 100, 60, 110, 40];
              const h = heights[dIdx % heights.length];
              const barColor = h >= 80 ? theme.success : h >= 50 ? theme.warning : theme.error;
              return (
                <View key={dIdx} style={styles.dayCol}>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: (h * 0.45) + '%', backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.dayLetterText}>{letter}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* BREAKDOWN LIST */}
        <View style={styles.breakdownSection}>
          <Text style={styles.label}>ESTADO DE SESIONES</Text>
          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.success }]} />
              <Text style={styles.breakdownName}>En el objetivo</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.successBg }]}>
                <Text style={[styles.countBadgeText, { color: theme.success }]}>{aggBreakdown.green} sesiones</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.warning }]} />
              <Text style={styles.breakdownName}>Desviación &gt;20%</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.warningBg }]}>
                <Text style={[styles.countBadgeText, { color: theme.warning }]}>{aggBreakdown.yellow} sesiones</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.colorDot, { backgroundColor: '#f97316' }]} />
              <Text style={styles.breakdownName}>No completados</Text>
              <View style={[styles.countBadge, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
                <Text style={[styles.countBadgeText, { color: '#f97316' }]}>{aggBreakdown.orange} sesiones</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.error }]} />
              <Text style={styles.breakdownName}>Sin registro / Cancelados</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.errorBg }]}>
                <Text style={[styles.countBadgeText, { color: theme.error }]}>{aggBreakdown.red} sesiones</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.colorDot, { backgroundColor: theme.textMuted }]} />
              <Text style={styles.breakdownName}>Ejercicios extra</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.countBadgeText, { color: theme.textSecondary }]}>{aggBreakdown.extra} sesiones</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 6. DISCIPLINE BREAKDOWN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DESGLOSE POR DISCIPLINA</Text>
        
        {/* Natación */}
        <View style={styles.disciplineRow}>
          <View style={styles.disciplineTop}>
            <View style={styles.disciplineIconWrap}>
              <Ionicons name="water" size={14} color={theme.swim || '#38bdf8'} />
              <Text style={styles.disciplineName}>Natación</Text>
            </View>
            <Text style={styles.disciplineValues}>
              {(aggNatCompletedM / 1000).toFixed(1)}k / {(aggNatPlannedM / 1000).toFixed(1)}k m ({natPct}%)
            </Text>
          </View>
          <View style={styles.disciplineTrack}>
            <View style={[styles.disciplineBar, { width: Math.min(100, natPct) + '%', backgroundColor: theme.swim || '#38bdf8' }]} />
          </View>
        </View>

        {/* Ciclismo */}
        <View style={styles.disciplineRow}>
          <View style={styles.disciplineTop}>
            <View style={styles.disciplineIconWrap}>
              <Ionicons name="bicycle" size={14} color={theme.bike || '#4ade80'} />
              <Text style={styles.disciplineName}>Ciclismo</Text>
            </View>
            <Text style={styles.disciplineValues}>
              {(aggCicCompletedMin / 60).toFixed(1)}h / {(aggCicPlannedMin / 60).toFixed(1)}h ({cicPct}%)
            </Text>
          </View>
          <View style={styles.disciplineTrack}>
            <View style={[styles.disciplineBar, { width: Math.min(100, cicPct) + '%', backgroundColor: theme.bike || '#4ade80' }]} />
          </View>
        </View>

        {/* Carrera */}
        <View style={styles.disciplineRow}>
          <View style={styles.disciplineTop}>
            <View style={styles.disciplineIconWrap}>
              <Ionicons name="walk" size={14} color={theme.run || '#fb923c'} />
              <Text style={styles.disciplineName}>Carrera</Text>
            </View>
            <Text style={styles.disciplineValues}>
              {(aggCarCompletedMin / 60).toFixed(1)}h / {(aggCarPlannedMin / 60).toFixed(1)}h ({carPct}%)
            </Text>
          </View>
          <View style={styles.disciplineTrack}>
            <View style={[styles.disciplineBar, { width: Math.min(100, carPct) + '%', backgroundColor: theme.run || '#fb923c' }]} />
          </View>
        </View>
      </View>

      {/* 7. COACH NOTES (IF PRESENT) */}
      {complianceWeeks[activeWeekIndex]?.notes ? (
        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.primary} />
            <Text style={styles.notesTitle}>Comentarios del Entrenador</Text>
          </View>
          <Text style={styles.notesContent}>{complianceWeeks[activeWeekIndex].notes}</Text>
        </View>
      ) : null}

      {/* 8. ACTION BUTTONS */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.btnWhatsapp} onPress={handleShareWhatsApp} activeOpacity={0.8}>
          <Ionicons name="logo-whatsapp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.btnTextWhite}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnPdf} onPress={handleExportPDF} activeOpacity={0.8}>
          <Ionicons name="document-text-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.btnTextWhite}>Informe PDF</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnRegisterMain} onPress={openRegisterModal} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.btnTextMain}>Registrar Datos Reales (S{activeWeekIndex + 1})</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* 9. INPUT MODAL */}
      <Modal visible={showInputModal} transparent animationType="slide" onRequestClose={() => setShowInputModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Cumplimiento S{activeWeekIndex + 1}</Text>
              <TouchableOpacity onPress={() => setShowInputModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.label}>EJECUCIÓN REAL POR DISCIPLINA</Text>
              
              <View style={styles.inputFieldWrap}>
                <Text style={styles.inputLabel}>🏊 Natación Real (Metros):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Ej. 5200"
                  placeholderTextColor={theme.textMuted}
                  value={compNatMeters}
                  onChangeText={setCompNatMeters}
                />
              </View>

              <View style={styles.inputFieldWrap}>
                <Text style={styles.inputLabel}>🚴 Ciclismo Real (Horas):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Ej. 4.5"
                  placeholderTextColor={theme.textMuted}
                  value={compCicHours}
                  onChangeText={setCompCicHours}
                />
              </View>

              <View style={styles.inputFieldWrap}>
                <Text style={styles.inputLabel}>🏃 Carrera Real (Horas):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Ej. 3.2"
                  placeholderTextColor={theme.textMuted}
                  value={compCarHours}
                  onChangeText={setCompCarHours}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>SESIONES REALIZADAS POR ESTADO</Text>
              <View style={styles.statusGrid}>
                <View style={styles.statusGridItem}>
                  <Text style={[styles.statusMiniLabel, { color: theme.success }]}>🟢 En objetivo:</Text>
                  <TextInput
                    style={styles.miniInput}
                    keyboardType="numeric"
                    value={breakdownCounts.green}
                    onChangeText={t => setBreakdownCounts(p => ({ ...p, green: t }))}
                  />
                </View>
                <View style={styles.statusGridItem}>
                  <Text style={[styles.statusMiniLabel, { color: theme.warning }]}>🟡 Desviación:</Text>
                  <TextInput
                    style={styles.miniInput}
                    keyboardType="numeric"
                    value={breakdownCounts.yellow}
                    onChangeText={t => setBreakdownCounts(p => ({ ...p, yellow: t }))}
                  />
                </View>
                <View style={styles.statusGridItem}>
                  <Text style={[styles.statusMiniLabel, { color: '#f97316' }]}>🟠 No compl.:</Text>
                  <TextInput
                    style={styles.miniInput}
                    keyboardType="numeric"
                    value={breakdownCounts.orange}
                    onChangeText={t => setBreakdownCounts(p => ({ ...p, orange: t }))}
                  />
                </View>
                <View style={styles.statusGridItem}>
                  <Text style={[styles.statusMiniLabel, { color: theme.error }]}>🔴 Sin registro:</Text>
                  <TextInput
                    style={styles.miniInput}
                    keyboardType="numeric"
                    value={breakdownCounts.red}
                    onChangeText={t => setBreakdownCounts(p => ({ ...p, red: t }))}
                  />
                </View>
                <View style={styles.statusGridItem}>
                  <Text style={[styles.statusMiniLabel, { color: theme.textMuted }]}>⚪ Extra:</Text>
                  <TextInput
                    style={styles.miniInput}
                    keyboardType="numeric"
                    value={breakdownCounts.extra}
                    onChangeText={t => setBreakdownCounts(p => ({ ...p, extra: t }))}
                  />
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>NOTAS Y FEEDBACK DEL COACH</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                multiline
                placeholder="Observaciones de rendimiento para el deportista..."
                placeholderTextColor={theme.textMuted}
                value={coachNotes}
                onChangeText={setCoachNotes}
              />
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowInputModal(false)} activeOpacity={0.7}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSaveComplianceRecord} activeOpacity={0.8}>
                <Ionicons name="checkmark-sharp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSaveText}>Guardar</Text>
              </TouchableOpacity>
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
      backgroundColor: theme.background
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 40
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40
    },
    emptyText: {
      marginTop: 12,
      fontSize: 15,
      color: theme.textSecondary,
      fontWeight: '700'
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
      fontSize: 9,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 8,
      letterSpacing: 0.5,
      fontWeight: '800',
    },
    athleteScroller: {
      gap: 8,
      paddingVertical: 4,
    },
    athleteBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 14,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    athleteBubbleText: {
      fontSize: 12,
      fontWeight: '800',
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
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    btnActionSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnActionSmallText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
    },
    periodRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    periodBtnActive: {
      backgroundColor: theme.primary,
    },
    periodBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    periodBtnTextActive: {
      color: '#ffffff',
      fontWeight: '900',
    },
    weeksScroll: {
      gap: 8,
      paddingVertical: 4,
    },
    weekPill: {
      backgroundColor: theme.surfaceSecondary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      minWidth: 84,
    },
    weekPillNum: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    weekPillDate: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    hasCompDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.success,
      marginTop: 4,
    },
    metricTabsRow: {
      flexDirection: 'row',
      marginBottom: 12,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 10,
    },
    metricTabActive: {
      backgroundColor: theme.primary,
    },
    metricTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    metricTabTextActive: {
      color: '#ffffff',
      fontWeight: '900',
    },
    comparisonBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 16,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    compCol: {
      flex: 1,
    },
    compColLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    compColVal: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.text,
      marginTop: 2,
    },
    compDivider: {
      width: 1,
      height: 28,
      backgroundColor: theme.border,
      marginHorizontal: 8,
    },
    complianceBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      minWidth: 64,
    },
    complianceBadgePct: {
      fontSize: 15,
      fontWeight: '900',
    },
    complianceBadgeLabel: {
      fontSize: 9,
      fontWeight: '800',
      marginTop: 1,
    },
    dailyChartContainer: {
      marginBottom: 14,
    },
    dailyBarsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 75,
      alignItems: 'flex-end',
      backgroundColor: theme.surfaceSecondary,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dayCol: {
      alignItems: 'center',
      flex: 1,
    },
    barBackground: {
      width: 12,
      height: 46,
      backgroundColor: theme.border,
      borderRadius: 6,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: 6,
    },
    dayLetterText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
      marginTop: 4,
    },
    breakdownSection: {},
    breakdownList: {
      gap: 6,
    },
    breakdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    colorDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      marginRight: 8,
    },
    breakdownName: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '700',
      flex: 1,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    disciplineRow: {
      marginBottom: 12,
    },
    disciplineTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    disciplineIconWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    disciplineName: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    disciplineValues: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    disciplineTrack: {
      height: 7,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 3.5,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    disciplineBar: {
      height: '100%',
      borderRadius: 3.5,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 6,
    },
    notesTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    notesContent: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
      fontWeight: '600',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    btnWhatsapp: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#25D366',
      paddingVertical: 12,
      borderRadius: 14,
      shadowColor: '#25D366',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    btnPdf: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 14,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    btnTextWhite: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    },
    btnRegisterMain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 13,
      borderRadius: 14,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    btnTextMain: {
      fontSize: 14,
      fontWeight: '900',
      color: '#ffffff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: '90%',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.text,
    },
    inputFieldWrap: {
      marginBottom: 10,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 4,
    },
    textInput: {
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: theme.text,
      fontWeight: '600',
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    statusGridItem: {
      width: '48%',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusMiniLabel: {
      fontSize: 11,
      fontWeight: '800',
    },
    miniInput: {
      width: 36,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
      paddingVertical: 2,
    },
    modalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    btnCancel: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnCancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    btnSave: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    btnSaveText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#ffffff',
    }
  });
