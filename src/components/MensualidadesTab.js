import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const BANKS_LIST = [
  'BancoEstado (CuentaRUT)',
  'Banco de Chile / Edwards',
  'Santander',
  'BCI / MACH',
  'Scotiabank',
  'Itaú',
  'BICE / Security',
  'Tenpo / Mercado Pago',
  'Efectivo',
  'WebPay / Tarjeta',
  'Otra Transferencia'
];

export default function MensualidadesTab({ 
  atletas, 
  onSaveAtleta, 
  onDeleteAtleta, 
  onTogglePago,
  onAddAbono,
  onDeleteAbono,
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

  // States for Abono Modal
  const [abonoModalVisible, setAbonoModalVisible] = useState(false);
  const [selectedAthleteForAbono, setSelectedAthleteForAbono] = useState(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoFecha, setAbonoFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [abonoMetodo, setAbonoMetodo] = useState('BancoEstado (CuentaRUT)');
  const [abonoNotas, setAbonoNotas] = useState('');

  // States for Bank Info Modal
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    banco: 'BancoEstado',
    tipoCuenta: 'Cuenta Vista / CuentaRUT',
    numeroCuenta: '12345678',
    titular: 'EPL Triatlón Chile',
    rut: '12.345.678-9',
    email: 'pagos@epltriatlon.cl'
  });

  // States for History & Abonos Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [activeHistoryAthleteId, setActiveHistoryAthleteId] = useState(null);
  const [historyTab, setHistoryTab] = useState('abonos'); // 'abonos' or 'actividad'
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedNoteType, setSelectedNoteType] = useState('Nota');

  useEffect(() => {
    loadBankInfo();
  }, []);

  const loadBankInfo = async () => {
    try {
      const saved = await AsyncStorage.getItem('epl_bank_info');
      if (saved) {
        setBankInfo(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Error loading bank info:', e);
    }
  };

  const saveBankInfo = async (newInfo) => {
    try {
      setBankInfo(newInfo);
      await AsyncStorage.setItem('epl_bank_info', JSON.stringify(newInfo));
      Alert.alert('Guardado', 'Datos bancarios actualizados correctamente.');
      setBankModalVisible(false);
    } catch (e) {
      console.log('Error saving bank info:', e);
    }
  };

  const shareBankInfoWhatsApp = async () => {
    const msg = 
      '🏦 *DATOS DE TRANSFERENCIA - EPL TRIATLÓN*\n\n' +
      '• *Banco:* ' + bankInfo.banco + '\n' +
      '• *Tipo de Cuenta:* ' + bankInfo.tipoCuenta + '\n' +
      '• *N° de Cuenta:* ' + bankInfo.numeroCuenta + '\n' +
      '• *Titular:* ' + bankInfo.titular + '\n' +
      '• *RUT:* ' + bankInfo.rut + '\n' +
      '• *Email:* ' + bankInfo.email + '\n\n' +
      '📌 *Por favor enviar el comprobante de transferencia una vez realizado el pago. ¡Muchas gracias!* 💪🔥';

    try {
      await Share.share({ message: msg });
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

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
    setMonto(atleta.monto ? atleta.monto.toString() : '40000');
    setEstado(atleta.estado || 'Al Día');
    setTipoPlan(atleta.tipoPlan || 'mensual');
    setFechaInicioPlan(atleta.fechaInicioPlan || new Date().toISOString().split('T')[0]);
    setPagado(atleta.pagado !== false);
    setEditId(atleta.id);
    setShowForm(true);
  };

  const openAbonoModal = (atleta) => {
    setSelectedAthleteForAbono(atleta);
    const totalAbonado = (atleta.abonos || []).reduce((sum, ab) => sum + (parseFloat(ab.monto) || 0), 0);
    const saldoPendiente = Math.max(0, (atleta.monto || 40000) - totalAbonado);
    setAbonoMonto(saldoPendiente > 0 ? String(saldoPendiente) : '');
    setAbonoFecha(new Date().toISOString().split('T')[0]);
    setAbonoMetodo('BancoEstado (CuentaRUT)');
    setAbonoNotas('');
    setAbonoModalVisible(true);
  };

  const handleSaveAbono = (shareViaWhatsApp = false) => {
    if (!selectedAthleteForAbono) return;
    const cleanedMonto = abonoMonto.toString().replace(/\D/g, '');
    const valorMonto = parseFloat(cleanedMonto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      Alert.alert('Error', 'Ingresa un monto de abono válido.');
      return;
    }

    const abonoData = {
      monto: valorMonto,
      fecha: abonoFecha,
      metodo: 'Transferencia',
      banco: abonoMetodo,
      notas: abonoNotas
    };

    if (onAddAbono) {
      onAddAbono(selectedAthleteForAbono.id, abonoData);
    }

    const totalAbonosAnteriores = (selectedAthleteForAbono.abonos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
    const nuevoTotalAbonado = totalAbonosAnteriores + valorMonto;
    const montoPlan = selectedAthleteForAbono.monto || 40000;
    const nuevoSaldo = Math.max(0, montoPlan - nuevoTotalAbonado);

    setAbonoModalVisible(false);

    if (shareViaWhatsApp) {
      const msg = 
        '💳 *COMPROBANTE DE ABONO - EPL TRIATLÓN*\n' +
        '👤 *Atleta:* ' + selectedAthleteForAbono.nombre + '\n' +
        '📅 *Fecha:* ' + abonoFecha + '\n' +
        '💵 *Abono registrado:* ' + formatCLP(valorMonto) + '\n' +
        '🏦 *Medio:* ' + abonoMetodo + '\n\n' +
        '📊 *ESTADO DE CUENTA:*\n' +
        '• *Total Plan:* ' + formatCLP(montoPlan) + '\n' +
        '• *Total Pagado:* ' + formatCLP(nuevoTotalAbonado) + ' (' + Math.round((nuevoTotalAbonado / montoPlan) * 100) + '%)\n' +
        '• *Saldo Restante:* ' + formatCLP(nuevoSaldo) + '\n' +
        (abonoNotas ? ('📝 *Detalle:* ' + abonoNotas + '\n\n') : '\n') +
        '💪 ¡Muchas gracias por tu abono! 🚀';

      Share.share({ message: msg }).catch(console.log);
    } else {
      Alert.alert('Abono Registrado', 'Abono de ' + formatCLP(valorMonto) + ' registrado exitosamente para ' + selectedAthleteForAbono.nombre + '.');
    }
  };

  const handleShareBalanceWhatsApp = (atleta) => {
    const totalAbonado = (atleta.abonos || []).reduce((sum, ab) => sum + (parseFloat(ab.monto) || 0), 0);
    const montoPlan = atleta.monto || 40000;
    const saldo = Math.max(0, montoPlan - totalAbonado);
    const pct = montoPlan > 0 ? Math.round((totalAbonado / montoPlan) * 100) : 0;

    const msg = 
      '📋 *ESTADO DE CUENTA Y COBRO - EPL TRIATLÓN*\n' +
      '👤 *Atleta:* ' + atleta.nombre + '\n' +
      '📅 *Plan:* ' + (atleta.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual') + '\n' +
      '💰 *Valor Total:* ' + formatCLP(montoPlan) + '\n' +
      '💵 *Total Abonado:* ' + formatCLP(totalAbonado) + ' (' + pct + '%)\n' +
      '⚠️ *Saldo Pendiente:* ' + formatCLP(saldo) + '\n\n' +
      '🏦 *Datos de Transferencia:*\n' +
      '• Banco: ' + bankInfo.banco + '\n' +
      '• Cuenta: ' + bankInfo.tipoCuenta + ' ' + bankInfo.numeroCuenta + '\n' +
      '• Titular: ' + bankInfo.titular + '\n' +
      '• RUT: ' + bankInfo.rut + '\n' +
      '• Email: ' + bankInfo.email + '\n\n' +
      '¡Quedamos atentos a tu comprobante! Muchas gracias. 💪';

    Share.share({ message: msg }).catch(console.log);
  };

  const confirmDelete = (id, name) => {
    if (Platform.OS === 'web') {
      if (confirm('¿Estás seguro de eliminar a ' + name + '?')) {
        onDeleteAtleta(id);
      }
    } else {
      Alert.alert(
        'Eliminar Atleta',
        '¿Estás seguro de eliminar a ' + name + '? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', onPress: () => onDeleteAtleta(id), style: 'destructive' }
        ]
      );
    }
  };

  const openHistoryModal = (athlete) => {
    setActiveHistoryAthleteId(athlete.id);
    setHistoryTab('abonos');
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
  const abonosList = activeHistoryAthlete ? (activeHistoryAthlete.abonos || []) : [];

  // Enhanced calculation for athletes with Abonos
  const athletesWithCalculatedBilling = (atletas || []).map(a => {
    const totalAbonado = (a.abonos || []).reduce((sum, ab) => sum + (parseFloat(ab.monto) || 0), 0);
    const montoPlan = a.monto || 40000;
    const saldoPendiente = Math.max(0, montoPlan - totalAbonado);
    const pct = montoPlan > 0 ? Math.min(100, Math.round((totalAbonado / montoPlan) * 100)) : 0;

    let computedStatus = 'Deuda';
    let statusLabel = 'Sin Pagos';
    let statusColor = theme.error;
    let statusBg = theme.errorBg;

    if (totalAbonado >= montoPlan || a.pagado === true) {
      computedStatus = 'Al Día';
      statusLabel = '100% Pagado';
      statusColor = theme.success;
      statusBg = theme.successBg;
    } else if (totalAbonado > 0) {
      computedStatus = 'Abonado Parcial';
      statusLabel = 'Abonado ' + pct + '%';
      statusColor = theme.warning;
      statusBg = theme.warningBg;
    }

    return {
      ...a,
      totalAbonado: (a.pagado && totalAbonado === 0) ? montoPlan : totalAbonado,
      saldoPendiente: a.pagado ? 0 : saldoPendiente,
      pctPagado: a.pagado ? 100 : pct,
      computedStatus,
      statusLabel,
      statusColor,
      statusBg
    };
  });

  const totalRecaudado = athletesWithCalculatedBilling.reduce((sum, x) => sum + x.totalAbonado, 0);
  const totalPendiente = athletesWithCalculatedBilling.reduce((sum, x) => sum + x.saldoPendiente, 0);
  const totalCajaPotencial = totalRecaudado + totalPendiente;
  const percentCollected = totalCajaPotencial > 0 ? (totalRecaudado / totalCajaPotencial) * 100 : 0;

  const filteredAtletas = athletesWithCalculatedBilling.filter(x => {
    let matchesFilter = true;
    if (filtro === 'Al Día') {
      matchesFilter = x.computedStatus === 'Al Día';
    } else if (filtro === 'Abono Parcial') {
      matchesFilter = x.computedStatus === 'Abonado Parcial';
    } else if (filtro === 'Deuda') {
      matchesFilter = x.computedStatus === 'Deuda' || x.computedStatus === 'Abonado Parcial';
    }
    const matchesSearch = x.nombre.toLowerCase().includes(buscar.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAtletas}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View>
            {/* KPI METRICS OVERVIEW CARD */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiTopRow}>
                <View>
                  <Text style={styles.kpiMainTitle}>Recaudación y Cobros</Text>
                  <Text style={styles.kpiSubTitle}>Control de cuotas y abonos en tiempo real</Text>
                </View>
                <TouchableOpacity style={styles.btnBankHeader} onPress={() => setBankModalVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="card-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.btnBankHeaderText}>Datos Bancarios</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.kpiStatsRow}>
                <View style={styles.kpiStatBox}>
                  <Text style={styles.kpiStatLabel}>TOTAL RECAUDADO</Text>
                  <Text style={[styles.kpiStatVal, { color: theme.success }]}>{formatCLP(totalRecaudado)}</Text>
                </View>
                <View style={styles.kpiStatDivider} />
                <View style={styles.kpiStatBox}>
                  <Text style={styles.kpiStatLabel}>SALDO PENDIENTE</Text>
                  <Text style={[styles.kpiStatVal, { color: theme.error }]}>{formatCLP(totalPendiente)}</Text>
                </View>
              </View>

              {/* Progress Bar for Total Potencial */}
              <View style={styles.kpiProgressTrack}>
                <View style={[styles.kpiProgressFill, { width: percentCollected + '%', backgroundColor: theme.primary }]} />
              </View>
              <Text style={styles.kpiProgressText}>
                {percentCollected.toFixed(1)}% recaudado del total mensual ({formatCLP(totalCajaPotencial)})
              </Text>
            </View>

            {/* Toggle Button for Add Athlete */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={styles.btnToggleForm}
              onPress={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
            >
              <Ionicons name={showForm ? "close" : "person-add"} size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnToggleText}>
                {showForm ? 'Cerrar Formulario' : 'Registrar Nuevo Atleta'}
              </Text>
            </TouchableOpacity>

            {/* Add / Edit Form Card */}
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
                  <Text style={styles.label}>Monto Total del Plan ($)</Text>
                  <TextInput
                    style={[styles.input, isMontoFocused ? styles.inputFocused : null]}
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="numeric"
                    placeholder="Ej: 600000 o 40000"
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
                      style={[styles.segmentBtn, tipoPlan === 'mensual' && styles.segmentBtnActive]}
                      onPress={() => setTipoPlan('mensual')}
                    >
                      <Ionicons name="calendar-outline" size={13} color={tipoPlan === 'mensual' ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.segmentText, tipoPlan === 'mensual' && styles.segmentTextActive]}>
                        Mensual
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.segmentBtn, tipoPlan === 'trimestral' && styles.segmentBtnActive]}
                      onPress={() => setTipoPlan('trimestral')}
                    >
                      <Ionicons name="grid-outline" size={13} color={tipoPlan === 'trimestral' ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.segmentText, tipoPlan === 'trimestral' && styles.segmentTextActive]}>
                        Trimestral
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.85} style={styles.btnSave} onPress={handleSubmit}>
                  <Ionicons name="checkmark-sharp" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnSaveText}>
                    {editId ? 'Guardar Cambios' : 'Registrar Atleta'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter and Search Container */}
            <View style={styles.filterCard}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={15} color={theme.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  value={buscar}
                  onChangeText={setBuscar}
                  placeholder="Buscar atleta por nombre..."
                  placeholderTextColor={theme.textMuted}
                />
                {buscar.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscar('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.tabsRow}>
                {['Todos', 'Al Día', 'Abono Parcial', 'Deuda'].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tabBtn, 
                      filtro === tab ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
                    ]}
                    onPress={() => setFiltro(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.tabBtnText, 
                      { color: filtro === tab ? '#fff' : theme.textSecondary }
                    ]}>
                      {tab}
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
              <View style={styles.cardMainRow}>
                {/* Initials Circle */}
                <View style={[styles.initialsCircle, { backgroundColor: avatar.bg }]}>
                  <Text style={[styles.initialsText, { color: avatar.text }]}>
                    {getInitials(item.nombre)}
                  </Text>
                </View>
 
                <View style={styles.athleteDetails}>
                  <Text style={styles.athleteName}>{item.nombre}</Text>
                  <Text style={styles.athletePlanType}>
                    Plan {item.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual'}: <Text style={{ fontWeight: '800', color: theme.text }}>{formatCLP(item.monto)}</Text>
                  </Text>
                </View>
 
                <View style={[styles.badgePill, { backgroundColor: item.statusBg, borderColor: item.statusColor + '40' }]}>
                  <Text style={[styles.badgeText, { color: item.statusColor }]}>
                    {item.statusLabel}
                  </Text>
                </View>
              </View>

              {/* Progress and Balances */}
              <View style={styles.balanceSection}>
                <View style={styles.balanceInfoRow}>
                  <Text style={styles.balanceLabel}>
                    Abonado: <Text style={{ fontWeight: '800', color: theme.success }}>{formatCLP(item.totalAbonado)}</Text>
                  </Text>
                  <Text style={styles.balanceLabel}>
                    Saldo: <Text style={{ fontWeight: '800', color: item.saldoPendiente > 0 ? theme.error : theme.textMuted }}>{formatCLP(item.saldoPendiente)}</Text>
                  </Text>
                </View>
                <View style={styles.balanceTrack}>
                  <View style={[styles.balanceFill, { width: item.pctPagado + '%', backgroundColor: item.pctPagado === 100 ? theme.success : theme.primary }]} />
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Actions Row */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity 
                  style={styles.btnAbonarAction} 
                  onPress={() => openAbonoModal(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cash-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.btnAbonarActionText}>Abonar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnHistoryAction} 
                  onPress={() => openHistoryModal(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="receipt-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.btnHistoryActionText}>
                    Abonos ({(item.abonos || []).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCircle} 
                  onPress={() => handleShareBalanceWhatsApp(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
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
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>
              No hay atletas registrados o no coinciden con la búsqueda.
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listPadding, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* 1. MODAL REGISTRAR ABONO / PAGO PARCIAL */}
      {selectedAthleteForAbono && (
        <Modal visible={abonoModalVisible} transparent animationType="slide" onRequestClose={() => setAbonoModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Registrar Abono / Pago</Text>
                  <Text style={styles.modalSubtitle}>{selectedAthleteForAbono.nombre}</Text>
                </View>
                <TouchableOpacity onPress={() => setAbonoModalVisible(false)}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Balance summary */}
                <View style={styles.modalBalanceBox}>
                  <View style={styles.modalBalanceItem}>
                    <Text style={styles.modalBalanceLabel}>VALOR PLAN</Text>
                    <Text style={styles.modalBalanceVal}>{formatCLP(selectedAthleteForAbono.monto)}</Text>
                  </View>
                  <View style={styles.modalBalanceItem}>
                    <Text style={styles.modalBalanceLabel}>YA ABONADO</Text>
                    <Text style={[styles.modalBalanceVal, { color: theme.success }]}>
                      {formatCLP((selectedAthleteForAbono.abonos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0))}
                    </Text>
                  </View>
                </View>

                {/* Amount input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Monto del Abono ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={abonoMonto}
                    onChangeText={setAbonoMonto}
                    keyboardType="numeric"
                    placeholder="Ej. 200000"
                    placeholderTextColor={theme.textMuted}
                  />
                  {/* Quick amount pills */}
                  <View style={styles.quickAmountsRow}>
                    {[100000, 200000, 300000].map(amt => (
                      <TouchableOpacity key={amt} style={styles.quickAmtBtn} onPress={() => setAbonoMonto(String(amt))}>
                        <Text style={styles.quickAmtText}>{formatCLP(amt)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Bank / Method selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Banco / Medio de Transferencia</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankPickerScroll}>
                    {BANKS_LIST.map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.bankChip, abonoMetodo === b && styles.bankChipActive]}
                        onPress={() => setAbonoMetodo(b)}
                      >
                        <Text style={[styles.bankChipText, abonoMetodo === b && styles.bankChipTextActive]}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Date */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fecha del Abono (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={abonoFecha}
                    onChangeText={setAbonoFecha}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                {/* Notes / Plan details */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nota / Compromiso de Pago</Text>
                  <TextInput
                    style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                    multiline
                    value={abonoNotas}
                    onChangeText={setAbonoNotas}
                    placeholder="Ej. Transfiere 200k hoy, 100k mañana y 300k a fin de mes..."
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAbonoModalVisible(false)}>
                  <Text style={styles.btnModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnModalSaveWhatsApp} onPress={() => handleSaveAbono(true)}>
                  <Ionicons name="logo-whatsapp" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.btnModalSaveText}>Guardar & WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnModalSave} onPress={() => handleSaveAbono(false)}>
                  <Text style={styles.btnModalSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. MODAL HISTORIAL & ABONOS DE ESTE ATLETA */}
      {activeHistoryAthlete && (
        <Modal visible={historyModalVisible} transparent animationType="slide" onRequestClose={closeHistoryModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Historial Financiero</Text>
                  <Text style={styles.modalSubtitle}>{activeHistoryAthlete.nombre}</Text>
                </View>
                <TouchableOpacity onPress={closeHistoryModal}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* SubTabs: Abonos vs Actividad */}
              <View style={styles.modalTabsRow}>
                <TouchableOpacity 
                  style={[styles.modalTabBtn, historyTab === 'abonos' && styles.modalTabBtnActive]} 
                  onPress={() => setHistoryTab('abonos')}
                >
                  <Text style={[styles.modalTabBtnText, historyTab === 'abonos' && styles.modalTabBtnTextActive]}>
                    Abonos Registrados ({abonosList.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalTabBtn, historyTab === 'actividad' && styles.modalTabBtnActive]} 
                  onPress={() => setHistoryTab('actividad')}
                >
                  <Text style={[styles.modalTabBtnText, historyTab === 'actividad' && styles.modalTabBtnTextActive]}>
                    Historial General
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {historyTab === 'abonos' ? (
                  abonosList.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Ionicons name="wallet-outline" size={40} color={theme.textMuted} />
                      <Text style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary, fontWeight: '700' }}>
                        No hay abonos parciales registrados aún.
                      </Text>
                    </View>
                  ) : (
                    abonosList.map((ab, idx) => (
                      <View key={ab.id || idx} style={styles.abonoItemCard}>
                        <View style={styles.abonoItemTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="cash" size={15} color={theme.success} />
                            <Text style={styles.abonoItemMonto}>{formatCLP(ab.monto)}</Text>
                          </View>
                          <Text style={styles.abonoItemFecha}>{ab.fecha}</Text>
                        </View>
                        <Text style={styles.abonoItemMetodo}>🏦 {ab.banco || ab.metodo || 'Transferencia'}</Text>
                        {ab.notas ? <Text style={styles.abonoItemNotas}>📝 {ab.notas}</Text> : null}
                        
                        {onDeleteAbono && (
                          <TouchableOpacity 
                            style={styles.abonoDeleteBtn} 
                            onPress={() => onDeleteAbono(activeHistoryAthlete.id, ab.id)}
                          >
                            <Ionicons name="trash-outline" size={12} color={theme.error} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 10, color: theme.error, fontWeight: '800' }}>Eliminar Abono</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )
                ) : (
                  historyLog.map((log, idx) => (
                    <View key={log.id || idx} style={styles.logItemCard}>
                      <View style={styles.logItemTop}>
                        <Text style={styles.logItemTipo}>{log.tipo || 'Actividad'}</Text>
                        <Text style={styles.logItemFecha}>{log.fecha}</Text>
                      </View>
                      <Text style={styles.logItemDesc}>{log.descripcion}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={styles.btnCloseHistory} onPress={closeHistoryModal}>
                <Text style={styles.btnCloseHistoryText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* 3. MODAL DATOS BANCARIOS DEL CLUB */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Datos de Transferencia</Text>
                <Text style={styles.modalSubtitle}>Cuentas del Club para recibir pagos</Text>
              </View>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Banco</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.banco}
                  onChangeText={t => setBankInfo(p => ({ ...p, banco: t }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo de Cuenta</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.tipoCuenta}
                  onChangeText={t => setBankInfo(p => ({ ...p, tipoCuenta: t }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Número de Cuenta</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.numeroCuenta}
                  onChangeText={t => setBankInfo(p => ({ ...p, numeroCuenta: t }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Titular de la Cuenta</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.titular}
                  onChangeText={t => setBankInfo(p => ({ ...p, titular: t }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>RUT</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.rut}
                  onChangeText={t => setBankInfo(p => ({ ...p, rut: t }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email de Confirmación</Text>
                <TextInput
                  style={styles.input}
                  value={bankInfo.email}
                  onChangeText={t => setBankInfo(p => ({ ...p, email: t }))}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.btnModalSaveWhatsApp} onPress={shareBankInfoWhatsApp}>
                <Ionicons name="logo-whatsapp" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.btnModalSaveText}>Enviar WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSave} onPress={() => saveBankInfo(bankInfo)}>
                <Text style={styles.btnModalSaveText}>Guardar Datos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listPadding: {
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    kpiCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 8,
      elevation: 2,
    },
    kpiTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    kpiMainTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.text,
    },
    kpiSubTitle: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    btnBankHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnBankHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
    },
    kpiStatsRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
    },
    kpiStatBox: {
      flex: 1,
      alignItems: 'center',
    },
    kpiStatLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    kpiStatVal: {
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    kpiStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: theme.border,
    },
    kpiProgressTrack: {
      height: 6,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 3,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    kpiProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    kpiProgressText: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '700',
      marginTop: 5,
      textAlign: 'center',
    },
    btnToggleForm: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 12,
      marginBottom: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    btnToggleText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    formCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
    },
    formHeader: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.text,
      marginBottom: 12,
    },
    formGroup: {
      marginBottom: 12,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
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
    inputFocused: {
      borderColor: theme.primary,
    },
    segmentPicker: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    segmentTextActive: {
      color: '#fff',
      fontWeight: '800',
    },
    btnSave: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 4,
    },
    btnSaveText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    filterCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 38,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: theme.text,
      fontWeight: '600',
    },
    tabsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    athleteCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 4,
      elevation: 2,
    },
    cardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    initialsCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    initialsText: {
      fontSize: 13,
      fontWeight: '900',
    },
    athleteDetails: {
      flex: 1,
    },
    athleteName: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
    },
    athletePlanType: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    badgePill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    balanceSection: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
    },
    balanceInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    balanceLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    balanceTrack: {
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    balanceFill: {
      height: '100%',
      borderRadius: 3,
    },
    cardDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 10,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    btnAbonarAction: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    btnAbonarActionText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#ffffff',
    },
    btnHistoryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSecondary,
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnHistoryActionText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    actionCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyBox: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: '700',
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
    modalSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
    modalBalanceBox: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 10,
      marginBottom: 12,
    },
    modalBalanceItem: {
      flex: 1,
      alignItems: 'center',
    },
    modalBalanceLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    modalBalanceVal: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.text,
      marginTop: 2,
    },
    quickAmountsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 6,
    },
    quickAmtBtn: {
      flex: 1,
      backgroundColor: theme.surfaceSecondary,
      paddingVertical: 5,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    quickAmtText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
    },
    bankPickerScroll: {
      gap: 6,
      paddingVertical: 4,
    },
    bankChip: {
      backgroundColor: theme.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bankChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    bankChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    bankChipTextActive: {
      color: '#ffffff',
    },
    modalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    btnModalCancel: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: theme.surfaceSecondary,
    },
    btnModalCancelText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    btnModalSaveWhatsApp: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: '#25D366',
    },
    btnModalSave: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
    btnModalSaveText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#ffffff',
    },
    modalTabsRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 3,
      marginBottom: 12,
    },
    modalTabBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 9,
    },
    modalTabBtnActive: {
      backgroundColor: theme.primary,
    },
    modalTabBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    modalTabBtnTextActive: {
      color: '#ffffff',
      fontWeight: '800',
    },
    abonoItemCard: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    abonoItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    abonoItemMonto: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.text,
    },
    abonoItemFecha: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    abonoItemMetodo: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    abonoItemNotas: {
      fontSize: 11,
      color: theme.text,
      marginTop: 4,
      fontStyle: 'italic',
    },
    abonoDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      alignSelf: 'flex-end',
    },
    logItemCard: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    logItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    logItemTipo: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
    },
    logItemFecha: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    logItemDesc: {
      fontSize: 12,
      color: theme.text,
      lineHeight: 16,
    },
    btnCloseHistory: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnCloseHistoryText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textSecondary,
    }
  });
