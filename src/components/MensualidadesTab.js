import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Keyboard,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const formatCLP = (value) => {
  if (isNaN(value) || value === null) return '$0';
  return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getInitials = (name) => {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const getAvatarTheme = (name, isDark) => {
  if (!name) return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };
  const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colors = isDark ? [
    { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
    { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
    { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
    { bg: 'rgba(6, 182, 212, 0.2)', text: '#22d3ee' },
    { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' },
  ] : [
    { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
    { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
    { bg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed' },
    { bg: 'rgba(6, 182, 212, 0.1)', text: '#0891b2' },
    { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  ];
  return colors[charCodeSum % colors.length];
};

const getMonday = (dateString) => {
  let d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) d = new Date();
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateChile = (date) => {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear().toString().substring(2)}`;
};

const formatHours = (totalMinutes) => {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";
  let hours = Math.floor(totalMinutes / 60);
  let minutes = Math.floor(totalMinutes % 60);
  let seconds = Math.round((totalMinutes % 1) * 60);
  if (seconds === 60) { minutes += 1; seconds = 0; }
  if (minutes === 60) { hours += 1; minutes = 0; }
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
};

const calculatePlanWeeks = (plan) => {
  if (!plan) return [];
  const numMesos = plan.mesos || 3;
  const totalWeeks = numMesos * 4;
  const mondayStart = getMonday(plan.fechaInicio);

  const baseSwim = parseFloat(plan.baseNat) || 0;
  const baseBike = parseFloat(plan.baseCic) || 0;
  const baseRun = parseFloat(plan.baseCar) || 0;

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

  let weeks = [];
  for (let s = 1; s <= totalWeeks; s++) {
    const mIdx = Math.ceil(s / 4) - 1;
    const weekFactor = weeklyDistributionArr[(s - 1) % 4];

    const mesoNat = (plan.mesosPct && plan.mesosPct.nat && plan.mesosPct.nat[mIdx] !== undefined) ? plan.mesosPct.nat[mIdx] : 100;
    const mesoCic = (plan.mesosPct && plan.mesosPct.cic && plan.mesosPct.cic[mIdx] !== undefined) ? plan.mesosPct.cic[mIdx] : 100;
    const mesoRun = (plan.mesosPct && plan.mesosPct.car && plan.mesosPct.car[mIdx] !== undefined) ? plan.mesosPct.car[mIdx] : 100;

    const weekSwim = (totalMacroSwim * (mesoNat / pools.nat)) * weekFactor;
    const weekBike = (totalMacroBikeMin * (mesoCic / pools.cic)) * weekFactor;
    const weekRun = (totalMacroRunMin * (mesoRun / pools.car)) * weekFactor;

    const currentMon = new Date(mondayStart.getTime());
    currentMon.setDate(currentMon.getDate() + (s - 1) * 7);

    weeks.push({
      semanaNum: s,
      mesoNum: mIdx + 1,
      fecha: formatDateChile(currentMon),
      nat: weekSwim,
      cic: weekBike,
      car: weekRun,
      zNat: (plan.zonasSemanales && plan.zonasSemanales.nat && plan.zonasSemanales.nat[s - 1]) || 'Z2',
      zCic: (plan.zonasSemanales && plan.zonasSemanales.cic && plan.zonasSemanales.cic[s - 1]) || 'Z2',
      zCar: (plan.zonasSemanales && plan.zonasSemanales.car && plan.zonasSemanales.car[s - 1]) || 'Z2'
    });
  }
  return weeks;
};

const getBillingStatus = (a) => {
  if (!a.fechaInicioPlan) {
    return { status: 'Al Día', label: 'Sin Datos', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', daysRemaining: 999, expirationDateStr: '' };
  }
  const start = new Date(a.fechaInicioPlan + 'T00:00:00');
  if (isNaN(start.getTime())) {
    return { status: 'Al Día', label: 'Sin Datos', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', daysRemaining: 999, expirationDateStr: '' };
  }
  
  const expiration = new Date(start.getTime());
  if (a.tipoPlan === 'trimestral') {
    expiration.setMonth(expiration.getMonth() + 3);
  } else {
    expiration.setMonth(expiration.getMonth() + 1);
  }
  
  const today = new Date();
  today.setHours(0,0,0,0);
  expiration.setHours(0,0,0,0);
  
  const diffTime = expiration - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const yyyy = expiration.getFullYear();
  const mm = String(expiration.getMonth() + 1).padStart(2, '0');
  const dd = String(expiration.getDate()).padStart(2, '0');
  const expirationDateStr = `${dd}/${mm}/${yyyy}`;
  
  let status = 'Al Día';
  let label = 'Pagado';
  let color = '#10b981';
  let bg = 'rgba(16, 185, 129, 0.08)';
  
  const isPaidForCurrentCycle = a.pagado !== false;
  
  if (!isPaidForCurrentCycle) {
    if (diffDays < 0) {
      status = 'Deuda';
      label = `Vencido (hace ${Math.abs(diffDays)} d)`;
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.08)';
    } else {
      status = 'Deuda';
      label = `Pendiente (vence en ${diffDays} d)`;
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.08)';
    }
  } else {
    if (diffDays < 0) {
      status = 'Deuda';
      label = `Vencido (hace ${Math.abs(diffDays)} d)`;
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.08)';
    } else if (diffDays <= 5) {
      status = 'Por Vencer';
      label = `Por Vencer (vence en ${diffDays} d)`;
      color = '#f97316';
      bg = 'rgba(249, 115, 22, 0.08)';
    } else {
      status = 'Al Día';
      label = `Pagado (vence en ${diffDays} d)`;
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.08)';
    }
  }
  
  return {
    status,
    label,
    color,
    bg,
    daysRemaining: diffDays,
    expirationDateStr,
    expirationDateObj: expiration
  };
};

const formatCLPDate = (date) => {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear()}`;
};

export default function MensualidadesTab({ 
  atletas, 
  onSaveAtleta, 
  onDeleteAtleta, 
  onTogglePago,
  onAddHistoryEntry,
  onDeleteHistoryEntry
}) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [estado, setEstado] = useState('Al Día');
  
  // Subscription Fields
  const [tipoPlan, setTipoPlan] = useState('mensual');
  const [fechaInicioPlan, setFechaInicioPlan] = useState(() => new Date().toISOString().split('T')[0]);
  const [pagado, setPagado] = useState(true);
  const [isFechaFocused, setIsFechaFocused] = useState(false);

  const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const [buscar, setBuscar] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isMontoFocused, setIsMontoFocused] = useState(false);

  // States for History Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [activeHistoryAthleteId, setActiveHistoryAthleteId] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedNoteType, setSelectedNoteType] = useState('Nota'); // 'Nota' or 'Competencia'
  const [isNoteInputFocused, setIsNoteInputFocused] = useState(false);
  const [detailedPlanData, setDetailedPlanData] = useState(null);

  const handleSubmit = () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del atleta.');
      return;
    }
    const cleanedMonto = monto.toString().replace(/\D/g, '');
    const valorMonto = parseInt(cleanedMonto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido.');
      return;
    }

    const athleteData = {
      nombre: nombre.trim(),
      monto: valorMonto,
      estado: estado,
      tipoPlan,
      fechaInicioPlan,
      pagado
    };

    if (editId) {
      athleteData.id = editId;
    }

    onSaveAtleta(athleteData);
    resetForm();
    Keyboard.dismiss();
  };

  const resetForm = () => {
    setNombre('');
    setMonto('');
    setEstado('Al Día');
    setTipoPlan('mensual');
    setFechaInicioPlan(new Date().toISOString().split('T')[0]);
    setPagado(true);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (atleta) => {
    setNombre(atleta.nombre);
    setMonto(atleta.monto.toString());
    setEstado(atleta.estado || 'Al Día');
    setTipoPlan(atleta.tipoPlan || 'mensual');
    setFechaInicioPlan(atleta.fechaInicioPlan || new Date().toISOString().split('T')[0]);
    setPagado(atleta.pagado !== false);
    setEditId(atleta.id);
    setShowForm(true);
  };

  const handleRegisterPayment = (atleta) => {
    const billing = getBillingStatus(atleta);
    const oldExp = billing.expirationDateObj;
    
    const yyyy = oldExp.getFullYear();
    const mm = String(oldExp.getMonth() + 1).padStart(2, '0');
    const dd = String(oldExp.getDate()).padStart(2, '0');
    const nextExpirationStr = `${dd}/${mm}/${yyyy}`;
    
    const performRegister = () => {
      const newStartDateStr = `${yyyy}-${mm}-${dd}`;
      const updated = {
        ...atleta,
        fechaInicioPlan: newStartDateStr,
        pagado: true,
        estado: 'Al Día'
      };
      
      const feeStr = formatCLP(atleta.monto);
      const cycleStr = atleta.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual';
      const logDesc = `Pago registrado (${cycleStr}): ${feeStr}. Próximo vencimiento: ${nextExpirationStr}.`;
      
      onSaveAtleta(updated);
      if (onAddHistoryEntry) {
        onAddHistoryEntry(atleta.id, 'Pago', logDesc);
      }
      
      Alert.alert('Pago Registrado', `Plan de ${atleta.nombre} renovado. Próximo vencimiento: ${nextExpirationStr}.`);
    };
    
    if (Platform.OS === 'web') {
      if (confirm(`¿Registrar pago de mensualidad para ${atleta.nombre}?\n\nEsto renovará su plan (${atleta.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual'}) y establecerá el próximo vencimiento para el ${nextExpirationStr}.`)) {
        performRegister();
      }
    } else {
      Alert.alert(
        'Registrar Pago',
        `¿Deseas registrar el pago de mensualidad para ${atleta.nombre}?\n\nEsto renovará su plan y establecerá el próximo vencimiento para el ${nextExpirationStr}.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrar', onPress: performRegister }
        ]
      );
    }
  };

  const confirmDelete = (id, name) => {
    if (Platform.OS === 'web') {
      if (confirm(`¿Estás seguro de eliminar a ${name}?`)) {
        onDeleteAtleta(id);
      }
    } else {
      Alert.alert(
        'Eliminar Atleta',
        `¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', onPress: () => onDeleteAtleta(id), style: 'destructive' }
        ]
      );
    }
  };

  const openHistoryModal = (athlete) => {
    setActiveHistoryAthleteId(athlete.id);
    setHistoryModalVisible(true);
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setActiveHistoryAthleteId(null);
    setNewNoteText('');
    setSelectedNoteType('Nota');
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) {
      Alert.alert('Error', 'Escribe el contenido de la nota antes de guardar.');
      return;
    }
    onAddHistoryEntry(activeHistoryAthleteId, selectedNoteType, newNoteText.trim());
    setNewNoteText('');
    Keyboard.dismiss();
  };

  const activeHistoryAthlete = atletas.find(a => a.id === activeHistoryAthleteId) || null;
  const historyLog = activeHistoryAthlete ? (activeHistoryAthlete.historial || []) : [];

  const athletesWithBilling = (atletas || []).map(a => {
    const billing = getBillingStatus(a);
    return {
      ...a,
      computedStatus: billing.status,
      billing
    };
  });

  const totalRecaudado = athletesWithBilling
    .filter(x => x.computedStatus === 'Al Día' || x.computedStatus === 'Por Vencer')
    .reduce((sum, x) => sum + (x.monto || 0), 0);

  const totalPendiente = athletesWithBilling
    .filter(x => x.computedStatus === 'Deuda')
    .reduce((sum, x) => sum + (x.monto || 0), 0);

  const totalCajaPotencial = totalRecaudado + totalPendiente;
  const percentCollected = totalCajaPotencial > 0 ? (totalRecaudado / totalCajaPotencial) * 100 : 0;

  const filteredAtletas = athletesWithBilling.filter(x => {
    let matchesFilter = true;
    if (filtro === 'Al Día') {
      matchesFilter = x.computedStatus === 'Al Día' || x.computedStatus === 'Por Vencer';
    } else if (filtro === 'Deuda') {
      matchesFilter = x.computedStatus === 'Deuda';
    }
    const matchesSearch = x.nombre.toLowerCase().includes(buscar.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLogColors = (type) => {
    switch (type) {
      case 'Registro':
        return { border: theme.textMuted, bg: theme.surfaceSecondary, icon: 'person-add', color: theme.textSecondary };
      case 'Pago':
        return { border: theme.success, bg: theme.successBg, icon: 'cash-outline', color: theme.success };
      case 'Deuda':
        return { border: theme.error, bg: theme.errorBg, icon: 'alert-circle-outline', color: theme.error };
      case 'Plan':
        return { border: theme.primary, bg: theme.glowColor, icon: 'calendar-outline', color: theme.primary };
      case 'Competencia':
        return { border: theme.run, bg: theme.runBg, icon: 'trophy-outline', color: theme.run };
      case 'Nota':
      default:
        return { border: theme.accent, bg: 'rgba(139, 92, 246, 0.08)', icon: 'create-outline', color: theme.accent };
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAtletas}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View style={{ paddingBottom: 10 }}>
            {/* Financial Summary Grid */}
            <View style={styles.dashboardContainer}>
              {/* Main Box Card */}
              <View style={styles.mainBoxCard}>
                <View style={styles.mainBoxHeader}>
                  <View style={styles.mainBoxIconBg}>
                    <Ionicons name="stats-chart" size={14} color={theme.primary} />
                  </View>
                  <Text style={styles.mainBoxTitle}>Caja Potencial Total</Text>
                </View>
                <Text style={styles.mainBoxMonto}>{formatCLP(totalCajaPotencial)}</Text>
                
                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>Progreso de Recaudación</Text>
                    <Text style={styles.progressPercent}>{Math.round(percentCollected)}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${percentCollected}%`, backgroundColor: theme.success }]} />
                  </View>
                </View>
              </View>

              {/* 2 Sub cards row */}
              <View style={styles.subDashboardRow}>
                <View style={[styles.subCard, styles.bgCardGreen]}>
                  <View style={styles.subCardHeader}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <Text style={[styles.subCardTitle, { color: theme.success }]}>Recaudado</Text>
                  </View>
                  <Text style={[styles.subCardMonto, { color: theme.success }]}>{formatCLP(totalRecaudado)}</Text>
                </View>

                <View style={[styles.subCard, styles.bgCardRed]}>
                  <View style={styles.subCardHeader}>
                    <Ionicons name="alert-circle" size={14} color={theme.error} />
                    <Text style={[styles.subCardTitle, { color: theme.error }]}>Deuda</Text>
                  </View>
                  <Text style={[styles.subCardMonto, { color: theme.error }]}>{formatCLP(totalPendiente)}</Text>
                </View>
              </View>
            </View>

            {/* Add Athlete Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btnToggle, showForm ? styles.btnToggleCancel : styles.btnToggleSuccess]}
              onPress={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
            >
              <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" style={styles.btnIcon} />
              <Text style={styles.btnToggleText}>
                {showForm ? 'Cerrar Formulario' : 'Registrar Triatleta'}
              </Text>
            </TouchableOpacity>

            {/* Form Card */}
            {showForm && (
              <View style={styles.formCard}>
                <Text style={styles.formHeader}>
                  {editId ? 'Modificar Ficha Atleta' : 'Registrar Nuevo Atleta'}
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre Completo</Text>
                  <TextInput
                    style={[styles.input, isNameFocused ? styles.inputFocused : null]}
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej: Montserrat Coilla"
                    placeholderTextColor={theme.textMuted}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Valor Mensualidad ($)</Text>
                  <TextInput
                    style={[styles.input, isMontoFocused ? styles.inputFocused : null]}
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="numeric"
                    placeholder="Ej: 40000"
                    placeholderTextColor={theme.textMuted}
                    onFocus={() => setIsMontoFocused(true)}
                    onBlur={() => setIsMontoFocused(false)}
                  />
                </View>

                {/* Tipo de Plan Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tipo de Plan</Text>
                  <View style={styles.segmentPicker}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentBtn, 
                        tipoPlan === 'mensual' ? { backgroundColor: theme.primary } : null
                      ]}
                      onPress={() => {
                        setTipoPlan('mensual');
                        setEstado('Al Día');
                      }}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={14} 
                        color={tipoPlan === 'mensual' ? '#fff' : theme.primary} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={[styles.segmentText, tipoPlan === 'mensual' ? { color: '#fff' } : { color: theme.primary }]}>
                        Mensual
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentBtn, 
                        tipoPlan === 'trimestral' ? { backgroundColor: theme.primary } : null
                      ]}
                      onPress={() => {
                        setTipoPlan('trimestral');
                        setEstado('Al Día');
                      }}
                    >
                      <Ionicons 
                        name="grid-outline" 
                        size={14} 
                        color={tipoPlan === 'trimestral' ? '#fff' : theme.primary} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={[styles.segmentText, tipoPlan === 'trimestral' ? { color: '#fff' } : { color: theme.primary }]}>
                        Trimestral
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Fecha de Inicio del Plan */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fecha Inicio del Periodo Actual (AAAA-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, isFechaFocused ? styles.inputFocused : null]}
                    value={fechaInicioPlan}
                    onChangeText={setFechaInicioPlan}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.textMuted}
                    onFocus={() => setIsFechaFocused(true)}
                    onBlur={() => setIsFechaFocused(false)}
                  />
                </View>

                {/* Pago del Periodo */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Estado de Pago</Text>
                  <View style={styles.segmentPicker}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentBtn, 
                        pagado ? { backgroundColor: theme.success } : null
                      ]}
                      onPress={() => {
                        setPagado(true);
                        setEstado('Al Día');
                      }}
                    >
                      <Ionicons 
                        name="checkmark-circle-outline" 
                        size={14} 
                        color={pagado ? '#fff' : theme.success} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={[styles.segmentText, pagado ? { color: '#fff' } : { color: theme.success }]}>
                        Pagado (Al Día)
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentBtn, 
                        !pagado ? { backgroundColor: theme.error } : null
                      ]}
                      onPress={() => {
                        setPagado(false);
                        setEstado('Deuda');
                      }}
                    >
                      <Ionicons 
                        name="close-circle-outline" 
                        size={14} 
                        color={!pagado ? '#fff' : theme.error} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={[styles.segmentText, !pagado ? { color: '#fff' } : { color: theme.error }]}>
                        Pendiente (Deuda)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.85} style={styles.btnSave} onPress={handleSubmit}>
                  <Text style={styles.btnSaveText}>
                    {editId ? 'Guardar Cambios' : 'Agregar Triatleta'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter and Search Container */}
            <View style={styles.filterCard}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={buscar}
                  onChangeText={setBuscar}
                  placeholder="Buscar deportista..."
                  placeholderTextColor={theme.textMuted}
                />
                {buscar.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscar('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.tabsRow}>
                {['Todos', 'Al Día', 'Deuda'].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tabBtn, 
                      filtro === tab ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
                    ]}
                    onPress={() => setFiltro(tab)}
                  >
                    <Text style={[
                      styles.tabBtnText, 
                      { color: filtro === tab ? '#fff' : theme.textSecondary }
                    ]}>
                      {tab === 'Deuda' ? 'Con Deuda' : tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const avatar = getAvatarTheme(item.nombre, isDark);
          return (
            <View style={styles.athleteCard}>
              <View style={[styles.accentStripe, { backgroundColor: item.billing.color }]} />
              
              <View style={styles.cardMainRow}>
                {/* Initials Circle with Custom Dynamic Color */}
                <View style={[styles.initialsCircle, { backgroundColor: avatar.bg, borderColor: avatar.bg }]}>
                  <Text style={[styles.initialsText, { color: avatar.text }]}>
                    {getInitials(item.nombre)}
                  </Text>
                </View>
 
                <View style={styles.athleteDetails}>
                  <Text style={styles.athleteName}>{item.nombre}</Text>
                  <Text style={styles.athleteMonto}>
                    {formatCLP(item.monto)} / {item.tipoPlan === 'trimestral' ? 'trimestre' : 'mes'}
                  </Text>
                </View>
 
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.badgePill,
                    { backgroundColor: item.billing.bg, borderColor: item.billing.color, borderWidth: 1 }
                  ]}
                  onPress={() => handleRegisterPayment(item)}
                >
                  <Text style={[
                    styles.badgeText, 
                    { color: item.billing.color, fontSize: 8.5 }
                  ]}>
                    {item.billing.label}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardActionsRow}>
                <Text style={{ fontSize: 10, color: theme.textMuted, fontWeight: '600' }}>
                  Vence: {item.billing.expirationDateStr || 'Sin fecha'}
                </Text>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionCircle} 
                    onPress={() => openHistoryModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time" size={15} color={theme.accent} />
                  </TouchableOpacity>
 
                  <TouchableOpacity 
                    style={styles.actionCircle} 
                    onPress={() => startEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={15} color={theme.primary} />
                  </TouchableOpacity>
 
                  <TouchableOpacity 
                    style={styles.actionCircle} 
                    onPress={() => confirmDelete(item.id, item.nombre)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Biblioteca vacía o sin coincidencias.
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listPadding, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* History Log Modal */}
      {activeHistoryAthlete && (
        <Modal
          visible={historyModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeHistoryModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Bitácora de Actividades</Text>
                  <Text style={styles.modalSubtitle}>{activeHistoryAthlete.nombre}</Text>
                </View>
                <TouchableOpacity onPress={closeHistoryModal} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Scrollable logs list */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Add Custom Note Section */}
                <Text style={styles.modalSectionTitle}>Añadir Nota Manual</Text>
                <View style={[styles.noteFormCard, { borderColor: theme.border }]}>
                  {/* Note input */}
                  <TextInput
                    style={[styles.noteInput, isNoteInputFocused ? styles.inputFocused : null]}
                    multiline
                    numberOfLines={3}
                    placeholder="Escribe una actualización o nota de entrenamiento aquí..."
                    placeholderTextColor={theme.textMuted}
                    value={newNoteText}
                    onChangeText={setNewNoteText}
                    onFocus={() => setIsNoteInputFocused(true)}
                    onBlur={() => setIsNoteInputFocused(false)}
                  />

                  {/* Note type and submit buttons row */}
                  <View style={styles.noteFormActions}>
                    <View style={styles.noteTypeSelector}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.noteTypeBtn,
                          selectedNoteType === 'Nota' ? { backgroundColor: theme.accent } : null
                        ]}
                        onPress={() => setSelectedNoteType('Nota')}
                      >
                        <Text style={[styles.noteTypeText, selectedNoteType === 'Nota' ? { color: '#fff' } : { color: theme.textSecondary }]}>
                          Nota
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.noteTypeBtn,
                          selectedNoteType === 'Competencia' ? { backgroundColor: theme.run } : null
                        ]}
                        onPress={() => setSelectedNoteType('Competencia')}
                      >
                        <Text style={[styles.noteTypeText, selectedNoteType === 'Competencia' ? { color: '#fff' } : { color: theme.textSecondary }]}>
                          Carrera
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      activeOpacity={0.85} 
                      style={[styles.btnSaveNote, { backgroundColor: theme.primary }]}
                      onPress={handleAddNote}
                    >
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={styles.btnSaveNoteText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Timeline title */}
                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Historial Cronológico</Text>

                {historyLog.length > 0 ? (
                  historyLog.map((log) => {
                    const logStyle = getLogColors(log.tipo);
                    return (
                      <View 
                        key={log.id} 
                        style={[
                          styles.logCard, 
                          { backgroundColor: theme.surfaceSecondary, borderLeftColor: logStyle.border }
                        ]}
                      >
                        <View style={styles.logHeader}>
                          <View style={styles.logBadgeRow}>
                            <View style={[styles.logTypeIconCircle, { backgroundColor: logStyle.bg }]}>
                              <Ionicons name={logStyle.icon} size={14} color={logStyle.color} />
                            </View>
                            <View style={[styles.logTypeBadge, { backgroundColor: logStyle.bg, borderColor: logStyle.border }]}>
                              <Text style={[styles.logTypeTextBadge, { color: logStyle.color }]}>
                                {log.tipo}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.logDate, { color: theme.textMuted }]}>{log.fecha}</Text>
                            
                            {/* Allow deleting manual entries */}
                            {(log.tipo === 'Nota' || log.tipo === 'Competencia') && (
                              <TouchableOpacity 
                                style={styles.logDeleteBtn} 
                                onPress={() => onDeleteHistoryEntry(activeHistoryAthlete.id, log.id)}
                              >
                                <Ionicons name="trash-outline" size={14} color={theme.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.logText, { color: theme.text }]}>
                          {log.descripcion}
                        </Text>
                        {log.tipo === 'Plan' && (() => {
                          const dateMatch = log.descripcion.match(/Inicio:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
                          const fInicio = dateMatch ? dateMatch[1] : null;
                          const matchingPlan = fInicio && activeHistoryAthlete && (activeHistoryAthlete.planHistory || []).find(p => p.fechaInicio === fInicio);
                          if (matchingPlan) {
                            return (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.btnViewPlanDetail, { borderColor: theme.primary }]}
                                onPress={() => setDetailedPlanData(matchingPlan)}
                              >
                                <Ionicons name="eye-outline" size={13} color={theme.primary} style={{ marginRight: 6 }} />
                                <Text style={[styles.btnViewPlanDetailText, { color: theme.primary }]}>Ver Planificación Completa</Text>
                              </TouchableOpacity>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyLogsBox}>
                    <Ionicons name="hourglass-outline" size={32} color={theme.textMuted} />
                    <Text style={[styles.emptyLogsText, { color: theme.textMuted }]}>
                      Sin actividades registradas.
                    </Text>
                  </View>
                )}
                {/* Spacer at the bottom of the scroll */}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Detailed Plan Sub-Modal */}
      {detailedPlanData && (
        <Modal
          visible={!!detailedPlanData}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDetailedPlanData(null)}
        >
          <View style={styles.subModalBackdrop}>
            <View style={styles.subModalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Planificación del Macrociclo</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.success }]}>
                    Inicio: {detailedPlanData.fechaInicio} ({detailedPlanData.mesos} Mesociclos)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailedPlanData(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.subModalBody} showsVerticalScrollIndicator={false}>
                {/* Base Volumes Info */}
                <Text style={styles.modalSectionTitle}>Volúmenes Base Semanales</Text>
                <View style={styles.baseVolumesRow}>
                  <View style={[styles.baseVolCol, { backgroundColor: theme.swimBg }]}>
                    <Text style={{ color: theme.swim, fontSize: 9, fontWeight: '850', textTransform: 'uppercase' }}>🏊 Natación</Text>
                    <Text style={{ color: theme.swim, fontSize: 13, fontWeight: '900', marginTop: 4 }}>{detailedPlanData.baseNat} m</Text>
                  </View>
                  <View style={[styles.baseVolCol, { backgroundColor: theme.bikeBg }]}>
                    <Text style={{ color: theme.bike, fontSize: 9, fontWeight: '850', textTransform: 'uppercase' }}>🚴 Ciclismo</Text>
                    <Text style={{ color: theme.bike, fontSize: 13, fontWeight: '900', marginTop: 4 }}>{detailedPlanData.baseCic} h</Text>
                  </View>
                  <View style={[styles.baseVolCol, { backgroundColor: theme.runBg }]}>
                    <Text style={{ color: theme.run, fontSize: 9, fontWeight: '850', textTransform: 'uppercase' }}>🏃 Carrera</Text>
                    <Text style={{ color: theme.run, fontSize: 13, fontWeight: '900', marginTop: 4 }}>{detailedPlanData.baseCar} h</Text>
                  </View>
                </View>

                {/* Weeks Listing */}
                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Cronograma Semana a Semana</Text>
                {calculatePlanWeeks(detailedPlanData).map((wk) => (
                  <View key={wk.semanaNum} style={[styles.detailWeekCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={styles.detailWeekHeader}>
                      <Text style={[styles.detailWeekTitle, { color: theme.text }]}>Semana {wk.semanaNum}</Text>
                      <View style={[styles.detailMesoBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: theme.primary }}>Meso {wk.mesoNum}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 'auto', fontWeight: '650' }}>{wk.fecha}</Text>
                    </View>

                    <View style={styles.detailWeekMetricsGrid}>
                      <View style={styles.detailMetricItem}>
                        <Text style={{ color: theme.swim, fontSize: 8, fontWeight: '850', textTransform: 'uppercase' }}>🏊 Natación</Text>
                        <Text style={{ color: theme.swim, fontSize: 11, fontWeight: '900', marginTop: 2 }}>{Math.round(wk.nat).toLocaleString()} m</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 9, marginTop: 2, fontWeight: '800' }}>Zona: {wk.zNat}</Text>
                      </View>

                      <View style={styles.detailMetricItem}>
                        <Text style={{ color: theme.bike, fontSize: 8, fontWeight: '850', textTransform: 'uppercase' }}>🚴 Ciclismo</Text>
                        <Text style={{ color: theme.bike, fontSize: 11, fontWeight: '900', marginTop: 2 }}>{formatHours(wk.cic)}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 9, marginTop: 2, fontWeight: '800' }}>Zona: {wk.zCic}</Text>
                      </View>

                      <View style={styles.detailMetricItem}>
                        <Text style={{ color: theme.run, fontSize: 8, fontWeight: '850', textTransform: 'uppercase' }}>🏃 Carrera</Text>
                        <Text style={{ color: theme.run, fontSize: 11, fontWeight: '900', marginTop: 2 }}>{formatHours(wk.car)}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 9, marginTop: 2, fontWeight: '800' }}>Zona: {wk.zCar}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.background,
  },
  dashboardContainer: {
    marginBottom: 16,
    gap: 8,
  },
  mainBoxCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 12,
    elevation: 3,
  },
  mainBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainBoxIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.glowColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  mainBoxTitle: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mainBoxMonto: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: 0.5,
  },
  progressSection: {
    width: '100%',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 10,
    color: theme.success,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  subDashboardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  bgCardGreen: {
    borderLeftWidth: 3,
    borderLeftColor: theme.success,
  },
  bgCardRed: {
    borderLeftWidth: 3,
    borderLeftColor: theme.error,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subCardMonto: {
    fontSize: 16,
    fontWeight: '800',
  },
  btnToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
  },
  btnToggleSuccess: { 
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  btnToggleCancel: { 
    backgroundColor: theme.textSecondary,
    shadowColor: theme.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  btnIcon: { marginRight: 4 },
  btnToggleText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.shadowOpacity * 1.5,
    shadowRadius: 14,
    elevation: 4,
  },
  formHeader: {
    fontSize: 13,
    color: theme.primary,
    textTransform: 'uppercase',
    fontWeight: '800',
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
    paddingLeft: 8,
    marginBottom: 14,
    letterSpacing: 0.5,
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
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.surface,
  },
  segmentPicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.background,
    padding: 4,
    gap: 4,
    height: 44,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnSave: {
    backgroundColor: theme.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  btnSaveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterCard: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listPadding: {
    paddingBottom: 24,
  },
  athleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  stripeGreen: { backgroundColor: theme.success },
  stripeRed: { backgroundColor: theme.error },
  initialsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 12,
    borderWidth: 1,
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '900',
  },
  athleteDetails: {
    flex: 1.2,
  },
  athleteName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  athleteMonto: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
    width: '100%',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionCircle: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '82%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: theme.text,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.surfaceSecondary,
  },
  modalBody: {
    flex: 1,
  },
  modalSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  noteFormCard: {
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    height: 64,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  noteFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  noteTypeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 3,
  },
  noteTypeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  noteTypeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  btnSaveNote: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  btnSaveNoteText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  logCard: {
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTypeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logTypeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  logTypeTextBadge: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  logDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  logDeleteBtn: {
    padding: 4,
  },
  logText: {
    fontSize: 12,
    fontWeight: '550',
    lineHeight: 18,
  },
  emptyLogsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyLogsText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  btnViewPlanDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 10,
  },
  btnViewPlanDetailText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  subModalSheet: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.shadowOpacity * 1.5,
    shadowRadius: 20,
    elevation: 5,
  },
  subModalBody: {
    marginTop: 10,
  },
  baseVolumesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  baseVolCol: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailWeekCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  detailWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailWeekTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailMesoBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 6,
  },
  detailWeekMetricsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  detailMetricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 10,
  },
});
