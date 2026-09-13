import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView
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

export default function DashboardTab({ atletas, setCurrentTab, onSaveAtleta, onDeleteAtleta }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [activeSection, setActiveSection] = useState('Perfil'); // 'Perfil', 'Pagos', 'Config'

  // Personal Info Form States
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [tipoAtleta, setTipoAtleta] = useState('Triathlete'); // Triathlete, Runner, Swimmer, Cyclist
  const [genero, setGenero] = useState('Female'); // Female, Male, Otro
  const [username, setUsername] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('01/07/1994');
  const [fotoPerfil, setFotoPerfil] = useState(null); // Simulated photo

  // Address & Contacts info
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [estadoProvincia, setEstadoProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [pais, setPais] = useState('Chile');
  const [zonaHoraria, setZonaHoraria] = useState('America/Santiago (GMT-4)');
  const [telefono, setTelefono] = useState('');
  const [celular, setCelular] = useState('');

  // Subscription/Payment settings
  const [monto, setMonto] = useState('40000');
  const [tipoPlan, setTipoPlan] = useState('mensual');
  const [fechaInicioPlan, setFechaInicioPlan] = useState(() => new Date().toISOString().split('T')[0]);
  const [pagado, setPagado] = useState(true);

  // Focus states
  const [focusedField, setFocusedField] = useState(null);

  const openAddModal = () => {
    resetForm();
    setEditingAthlete(null);
    setShowAddModal(true);
  };

  const openEditModal = (athlete) => {
    setEditingAthlete(athlete);
    setNombre(athlete.nombre || '');
    setEmail(athlete.email || '');
    setTipoAtleta(athlete.tipoAtleta || 'Triathlete');
    setGenero(athlete.genero || 'Female');
    setUsername(athlete.username || '');
    setFechaNacimiento(athlete.fechaNacimiento || '01/07/1994');
    setDireccion(athlete.direccion || '');
    setCiudad(athlete.ciudad || '');
    setEstadoProvincia(athlete.estadoProvincia || '');
    setCodigoPostal(athlete.codigoPostal || '');
    setPais(athlete.pais || 'Chile');
    setZonaHoraria(athlete.zonaHoraria || 'America/Santiago (GMT-4)');
    setTelefono(athlete.telefono || '');
    setCelular(athlete.celular || '');
    setMonto(athlete.monto ? athlete.monto.toString() : '40000');
    setTipoPlan(athlete.tipoPlan || 'mensual');
    setFechaInicioPlan(athlete.fechaInicioPlan || new Date().toISOString().split('T')[0]);
    setPagado(athlete.pagado !== false);
    setActiveSection('Perfil');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNombre('');
    setEmail('');
    setTipoAtleta('Triathlete');
    setGenero('Female');
    setUsername('');
    setFechaNacimiento('01/07/1994');
    setFotoPerfil(null);
    setDireccion('');
    setCiudad('');
    setEstadoProvincia('');
    setCodigoPostal('');
    setPais('Chile');
    setZonaHoraria('America/Santiago (GMT-4)');
    setTelefono('');
    setCelular('');
    setMonto('40000');
    setTipoPlan('mensual');
    setFechaInicioPlan(new Date().toISOString().split('T')[0]);
    setPagado(true);
    setActiveSection('Perfil');
    setEditingAthlete(null);
  };

  const handleSave = (shouldClose) => {
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
      email: email.trim(),
      tipoAtleta,
      genero,
      username: username.trim() || nombre.toLowerCase().replace(/\s/g, ''),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
      estadoProvincia: estadoProvincia.trim(),
      codigoPostal: codigoPostal.trim(),
      pais: pais.trim(),
      zonaHoraria,
      telefono: telefono.trim(),
      celular: celular.trim(),
      fechaNacimiento,
      monto: valorMonto,
      tipoPlan,
      fechaInicioPlan,
      pagado,
      estado: pagado ? 'Al Día' : 'Deuda'
    };

    if (editingAthlete) {
      athleteData.id = editingAthlete.id;
    }

    if (onSaveAtleta) {
      onSaveAtleta(athleteData);
      Alert.alert('Éxito', `Atleta ${nombre} ${editingAthlete ? 'actualizado' : 'registrado'} correctamente.`);
      if (shouldClose) {
        setShowAddModal(false);
        resetForm();
      } else if (!editingAthlete) {
        resetForm();
      }
    }
  };

  const confirmDelete = (athlete) => {
    if (Platform.OS === 'web') {
      if (confirm(`¿Estás seguro de eliminar a ${athlete.nombre}? Esta acción borrará sus planes, cobros e historial.`)) {
        if (onDeleteAtleta) onDeleteAtleta(athlete.id);
      }
    } else {
      Alert.alert(
        'Eliminar Atleta',
        `¿Estás seguro de eliminar a ${athlete.nombre}? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            onPress: () => {
              if (onDeleteAtleta) onDeleteAtleta(athlete.id);
            }, 
            style: 'destructive' 
          }
        ]
      );
    }
  };

  // 1. Calculations for KPIs
  const totalAtletas = atletas.length;

  const totalRecaudado = atletas
    .filter(a => a.estado === 'Al Día')
    .reduce((sum, a) => sum + (a.monto || 0), 0);

  const totalPendiente = atletas
    .filter(a => a.estado === 'Deuda')
    .reduce((sum, a) => sum + (a.monto || 0), 0);

  const totalCajaPotencial = totalRecaudado + totalPendiente;
  const percentCollected = totalCajaPotencial > 0 ? (totalRecaudado / totalCajaPotencial) * 100 : 0;

  // Average weekly ECOs
  let athletesWithEcos = 0;
  let totalWeeklyEcosSum = 0;
  atletas.forEach(a => {
    if (a.ecosWeekly) {
      athletesWithEcos++;
      let athleteSum = 0;
      Object.keys(a.ecosWeekly).forEach(day => {
        const dayData = a.ecosWeekly[day];
        athleteSum += (parseFloat(dayData.natacion.ecos) || 0);
        athleteSum += (parseFloat(dayData.ciclismo.ecos) || 0);
        athleteSum += (parseFloat(dayData.carrera.ecos) || 0);
      });
      totalWeeklyEcosSum += athleteSum;
    }
  });
  const avgWeeklyEcos = athletesWithEcos > 0 ? totalWeeklyEcosSum / athletesWithEcos : 0;

  // 2. Aggregate Competitions (Upcoming)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCompetitions = [];
  atletas.forEach(a => {
    // Check both plan and planHistory
    const comps = a.plan?.competencias || [];
    comps.forEach(c => {
      const compDate = new Date(c.fecha + 'T00:00:00');
      if (compDate >= today) {
        const diffTime = compDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        upcomingCompetitions.push({
          atletaNombre: a.nombre,
          carreraNombre: c.nombre,
          fecha: c.fecha,
          diasRestantes: diffDays
        });
      }
    });
  });
  // Sort by days remaining
  upcomingCompetitions.sort((a, b) => a.diasRestantes - b.diasRestantes);

  // 3. Macrocycle Progress Tracking
  const macrocyclesProgress = [];
  atletas.forEach(a => {
    const plan = a.plan;
    if (plan && plan.fechaInicio) {
      const numMesos = plan.mesos || 3;
      const totalWeeks = numMesos * 4;
      
      // Calculate Monday of start week
      let d = new Date(plan.fechaInicio + 'T00:00:00');
      let day = d.getDay();
      let diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startMonday = new Date(d.setDate(diff));
      startMonday.setHours(0,0,0,0);

      const diffTime = today - startMonday;
      const weekIndex = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;

      let pct = 0;
      let statusText = '';
      if (weekIndex < 1) {
        pct = 0;
        statusText = 'Por comenzar';
      } else if (weekIndex > totalWeeks) {
        pct = 100;
        statusText = 'Completado';
      } else {
        pct = (weekIndex / totalWeeks) * 100;
        statusText = `Semana ${weekIndex} de ${totalWeeks}`;
      }

      macrocyclesProgress.push({
        atletaNombre: a.nombre,
        semanaActual: weekIndex,
        semanasTotales: totalWeeks,
        porcentaje: pct,
        statusText: statusText
      });
    }
  });

  // 4. Centralized Activity Feed (Top 5 Logs)
  const allLogs = [];
  atletas.forEach(a => {
    const logs = a.historial || [];
    logs.forEach(l => {
      allLogs.push({
        ...l,
        atletaNombre: a.nombre,
        atletaId: a.id
      });
    });
  });
  // Sort logs by ID (timestamp) descending
  allLogs.sort((a, b) => b.id - a.id);
  const recentLogs = allLogs.slice(0, 5);

  const getLogColors = (type) => {
    switch (type) {
      case 'Registro':
        return { bg: theme.surfaceSecondary, icon: 'person-add', color: theme.textSecondary };
      case 'Pago':
        return { bg: theme.successBg, icon: 'cash-outline', color: theme.success };
      case 'Deuda':
        return { bg: theme.errorBg, icon: 'alert-circle-outline', color: theme.error };
      case 'Plan':
        return { bg: theme.glowColor, icon: 'calendar-outline', color: theme.primary };
      case 'Competencia':
        return { bg: theme.runBg, icon: 'trophy-outline', color: theme.run };
      case 'Nota':
      default:
        return { bg: 'rgba(139, 92, 246, 0.08)', icon: 'create-outline', color: theme.accent };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header Info */}
      <View style={styles.welcomeBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeTitle}>Hola, Coach 👋</Text>
          <Text style={styles.welcomeSubtitle}>Panel de control EPL Triatlón Chile</Text>
        </View>
        <TouchableOpacity 
          style={styles.btnAddQuick} 
          activeOpacity={0.8}
          onPress={openAddModal}
        >
          <Ionicons name="person-add" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnAddQuickText}>Atleta</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs Grid */}
      <View style={styles.kpiGrid}>
        {/* Card 1: Total Athletes */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Deportistas</Text>
            <View style={[styles.kpiIconCircle, { backgroundColor: theme.glowColor }]}>
              <Ionicons name="people" size={16} color={theme.primary} />
            </View>
          </View>
          <Text style={styles.kpiValue}>{totalAtletas}</Text>
          <Text style={styles.kpiSubtext}>Registrados activos</Text>
        </View>

        {/* Card 2: Average Load */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>ECOs Semanales</Text>
            <View style={[styles.kpiIconCircle, { backgroundColor: theme.runBg }]}>
              <Ionicons name="flash" size={16} color={theme.run} />
            </View>
          </View>
          <Text style={styles.kpiValue}>{avgWeeklyEcos.toFixed(0)}</Text>
          <Text style={styles.kpiSubtext}>Promedio por deportista</Text>
        </View>

        {/* Card 3: Financial Summary Card */}
        <View style={[styles.kpiCardFull, { borderColor: theme.border }]}>
          <View style={styles.kpiHeader}>
            <View>
              <Text style={styles.kpiLabel}>Recaudación Mensual</Text>
              <Text style={styles.kpiValue}>{formatCLP(totalRecaudado)} <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '500' }}>de {formatCLP(totalCajaPotencial)}</Text></Text>
            </View>
            <View style={[styles.kpiIconCircle, { backgroundColor: theme.successBg }]}>
              <Ionicons name="wallet-sharp" size={16} color={theme.success} />
            </View>
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percentCollected}%`, backgroundColor: theme.success }]} />
            </View>
            <Text style={[styles.progressPercentText, { color: theme.success }]}>{Math.round(percentCollected)}%</Text>
          </View>
        </View>
      </View>

      {/* Quick Navigation Shortcuts */}
      <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
      <View style={styles.shortcutsRow}>
        <TouchableOpacity 
          activeOpacity={0.75} 
          style={styles.shortcutCard} 
          onPress={openAddModal}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: theme.glowColor }]}>
            <Ionicons name="person-add" size={18} color={theme.primary} />
          </View>
          <Text style={styles.shortcutMainText}>Registrar</Text>
          <Text style={styles.shortcutSubText}>Atleta</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          activeOpacity={0.75} 
          style={styles.shortcutCard} 
          onPress={() => setCurrentTab('planning')}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: theme.successBg }]}>
            <Ionicons name="calendar" size={18} color={theme.success} />
          </View>
          <Text style={styles.shortcutMainText}>Planificar</Text>
          <Text style={styles.shortcutSubText}>Macrociclo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          activeOpacity={0.75} 
          style={styles.shortcutCard} 
          onPress={() => setCurrentTab('ecos')}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: theme.runBg }]}>
            <Ionicons name="flash" size={18} color={theme.run} />
          </View>
          <Text style={styles.shortcutMainText}>Cargar</Text>
          <Text style={styles.shortcutSubText}>ECOs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.75} 
          style={styles.shortcutCard} 
          onPress={() => setCurrentTab('payments')}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: theme.surfaceSecondary }]}>
            <Ionicons name="wallet-outline" size={18} color={theme.text} />
          </View>
          <Text style={styles.shortcutMainText}>Cobros</Text>
          <Text style={styles.shortcutSubText}>Mensualidad</Text>
        </TouchableOpacity>
      </View>

      {/* Athlete Management List (Complete CRUD directly from Dashboard) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Gestión de Deportistas ({totalAtletas})</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.linkHeaderBtn}>
          <Text style={[styles.linkHeaderText, { color: theme.primary }]}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {atletas && atletas.length > 0 ? (
          atletas.map((atleta, index) => {
            const isPaid = atleta.estado === 'Al Día';
            return (
              <View 
                key={atleta.id || index} 
                style={[
                  styles.athleteCardRow,
                  index < atletas.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null
                ]}
              >
                <View style={[styles.athleteAvatar, { backgroundColor: theme.glowColor }]}>
                  <Text style={[styles.athleteAvatarText, { color: theme.primary }]}>
                    {getInitials(atleta.nombre)}
                  </Text>
                </View>

                <View style={styles.athleteInfoCol}>
                  <Text style={styles.athleteNameText}>{atleta.nombre}</Text>
                  <Text style={styles.athleteSubDetails}>
                    {atleta.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual'} • {formatCLP(atleta.monto)}
                  </Text>
                </View>

                <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgeDebt]}>
                  <Text style={[styles.statusBadgeText, { color: isPaid ? theme.success : theme.error }]}>
                    {isPaid ? 'Al Día' : 'Deuda'}
                  </Text>
                </View>

                <View style={styles.athleteActionBtns}>
                  <TouchableOpacity 
                    style={[styles.miniActionBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={() => openEditModal(atleta)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.miniActionBtn, { backgroundColor: theme.errorBg, borderColor: theme.error }]}
                    onPress={() => confirmDelete(atleta)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Ionicons name="people-outline" size={36} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginVertical: 8 }]}>
              Aún no has registrado deportistas en el club.
            </Text>
            <TouchableOpacity 
              style={[styles.btnAddQuick, { paddingHorizontal: 16, marginTop: 4 }]} 
              onPress={openAddModal}
            >
              <Text style={styles.btnAddQuickText}>Registrar Primer Atleta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Athlete Training Progress monitoring */}
      <Text style={styles.sectionTitle}>Monitoreo de Planes Deportivos</Text>
      <View style={styles.card}>
        {macrocyclesProgress.length > 0 ? (
          macrocyclesProgress.map((item, idx) => (
            <View key={idx} style={[styles.progressItemRow, idx < macrocyclesProgress.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null]}>
              <View style={styles.progressItemInfo}>
                <Text style={styles.progressItemName}>{item.atletaNombre}</Text>
                <Text style={[styles.progressItemStatus, { color: theme.textSecondary }]}>{item.statusText}</Text>
              </View>
              <View style={styles.progressItemBarCol}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.porcentaje}%`, backgroundColor: theme.primary }]} />
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Ningún macrociclo activo para deportistas.</Text>
        )}
      </View>

      {/* Competitions Agenda Timeline */}
      <Text style={styles.sectionTitle}>Próximas Competencias</Text>
      <View style={styles.card}>
        {upcomingCompetitions.length > 0 ? (
          upcomingCompetitions.map((item, idx) => (
            <View key={idx} style={styles.agendaRow}>
              <View style={[styles.agendaIcon, { backgroundColor: theme.runBg, borderColor: theme.run }]}>
                <Ionicons name="trophy" size={14} color={theme.run} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.agendaRaceName}>{item.carreraNombre}</Text>
                <Text style={styles.agendaAthleteName}>{item.atletaNombre} — {item.fecha}</Text>
              </View>
              <View style={[styles.agendaCountdown, { backgroundColor: item.diasRestantes <= 14 ? theme.errorBg : theme.surfaceSecondary }]}>
                <Text style={[styles.agendaCountdownText, { color: item.diasRestantes <= 14 ? theme.error : theme.textSecondary }]}>
                  {item.diasRestantes} días
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay competencias futuras agendadas.</Text>
        )}
      </View>

      {/* Centralized Feed of Recent Activity */}
      <Text style={styles.sectionTitle}>Bitácora de Actividad Reciente</Text>
      <View style={styles.feedContainer}>
        {recentLogs.length > 0 ? (
          recentLogs.map((log) => {
            const style = getLogColors(log.tipo);
            return (
              <View key={log.id} style={[styles.feedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.feedHeader}>
                  <View style={[styles.feedIconBg, { backgroundColor: style.bg }]}>
                    <Ionicons name={style.icon} size={14} color={style.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.feedAthleteName}>{log.atletaNombre}</Text>
                    <Text style={styles.feedLogDate}>{log.fecha} • {log.tipo}</Text>
                  </View>
                </View>
                <Text style={[styles.feedDescription, { color: theme.text }]}>
                  {log.descripcion}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.card, { alignItems: 'center', padding: 20 }]}>
            <Ionicons name="chatbox-ellipses-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 8 }]}>Sin registros de actividad recientes.</Text>
          </View>
        )}
      </View>
      </ScrollView>

      {/* ATHLETE CONFIGURATION REGISTRATION MODAL */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalSheet}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAthlete ? `Editar: ${editingAthlete.nombre}` : 'Configuración de la cuenta de atleta'}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body (Top Navigation Tabs + Bottom Content Scroll) */}
            <View style={styles.modalBody}>
              {/* Top Navigation Tabs Segmented bar */}
              <View style={styles.modalTabsRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.modalTabBtn, activeSection === 'Perfil' ? styles.modalTabBtnActive : null]}
                  onPress={() => setActiveSection('Perfil')}
                >
                  <Ionicons name="person-outline" size={13} color={activeSection === 'Perfil' ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.modalTabBtnText, activeSection === 'Perfil' ? styles.modalTabBtnTextActive : null]}>
                    Perfil
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.modalTabBtn, activeSection === 'Pagos' ? styles.modalTabBtnActive : null]}
                  onPress={() => setActiveSection('Pagos')}
                >
                  <Ionicons name="card-outline" size={13} color={activeSection === 'Pagos' ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.modalTabBtnText, activeSection === 'Pagos' ? styles.modalTabBtnTextActive : null]}>
                    Pagos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.modalTabBtn, activeSection === 'Config' ? styles.modalTabBtnActive : null]}
                  onPress={() => setActiveSection('Config')}
                >
                  <Ionicons name="settings-outline" size={13} color={activeSection === 'Config' ? '#fff' : theme.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.modalTabBtnText, activeSection === 'Config' ? styles.modalTabBtnTextActive : null]}>
                    Config
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Content Panel (full width scroll view) */}
              <View style={styles.modalContent}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  
                  {activeSection === 'Perfil' && (
                    <View>
                      <Text style={styles.sectionHeader}>{nombre ? nombre.toUpperCase() : 'NUEVO ATLETA'} Perfil</Text>
                      <Text style={styles.sectionSubtitle}>Información personal del deportista</Text>

                      {/* Photo Section */}
                      <Text style={styles.label}>Foto de perfil</Text>
                      <View style={styles.photoSection}>
                        <View style={styles.photoBox}>
                          <Text style={styles.photoBoxText}>👩‍✈️</Text>
                        </View>
                        <View style={styles.photoActions}>
                          <TouchableOpacity style={styles.photoBtn} activeOpacity={0.7} onPress={() => Alert.alert('Simulador', 'Foto de perfil predefinida cargada.')}>
                            <Text style={styles.photoBtnText}>Subir foto</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.photoBtn, { borderColor: theme.error }]} activeOpacity={0.7} onPress={() => Alert.alert('Simulador', 'Foto eliminada.')}>
                            <Text style={[styles.photoBtnText, { color: theme.error }]}>Eliminar foto</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Personal Fields */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Nombre y apellido</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'nombre' ? styles.inputFocused : null]}
                          value={nombre}
                          onChangeText={setNombre}
                          placeholder="Ej: Montserrat Coilla"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('nombre')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Dirección de correo electrónico</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'email' ? styles.inputFocused : null]}
                          value={email}
                          onChangeText={setEmail}
                          placeholder="Ej: mcoilla@gmail.com"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="email-address"
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Tipo de Atleta</Text>
                        <View style={styles.segmentPicker}>
                          {['Triathlete', 'Runner'].map(t => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.segmentBtn, tipoAtleta === t ? { backgroundColor: theme.primary } : null]}
                              onPress={() => setTipoAtleta(t)}
                            >
                              <Text style={[styles.segmentText, { color: tipoAtleta === t ? '#fff' : theme.textSecondary }]}>
                                {t === 'Triathlete' ? 'Triatleta' : 'Corredor'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Género</Text>
                        <View style={styles.segmentPicker}>
                          {['Female', 'Male'].map(g => (
                            <TouchableOpacity
                              key={g}
                              style={[styles.segmentBtn, genero === g ? { backgroundColor: theme.primary } : null]}
                              onPress={() => setGenero(g)}
                            >
                              <Text style={[styles.segmentText, { color: genero === g ? '#fff' : theme.textSecondary }]}>
                                {g === 'Female' ? 'Femenino' : 'Masculino'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Nombre de usuario</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'username' ? styles.inputFocused : null]}
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Ej: Conysolis"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('username')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  )}

                  {activeSection === 'Pagos' && (
                    <View>
                      <Text style={styles.sectionHeader}>Suscripción y pagos</Text>
                      <Text style={styles.sectionSubtitle}>Detalles del plan mensual o trimestral</Text>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Tipo de Cuenta</Text>
                        <View style={[styles.photoSection, { padding: 14 }]}>
                          <Ionicons name="shield-checkmark" size={20} color={theme.success} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Premium Trial</Text>
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Monto Suscripción ($)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'monto' ? styles.inputFocused : null]}
                          value={monto}
                          onChangeText={setMonto}
                          placeholder="Ej: 40000"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="numeric"
                          onFocus={() => setFocusedField('monto')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Tipo de Plan</Text>
                        <View style={styles.segmentPicker}>
                          {['mensual', 'trimestral'].map(p => (
                            <TouchableOpacity
                              key={p}
                              style={[styles.segmentBtn, tipoPlan === p ? { backgroundColor: theme.primary } : null]}
                              onPress={() => setTipoPlan(p)}
                            >
                              <Text style={[styles.segmentText, { color: tipoPlan === p ? '#fff' : theme.textSecondary }]}>
                                {p === 'mensual' ? 'Mensual' : 'Trimestral'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Fecha Inicio del Periodo Actual (AAAA-MM-DD)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'fInicio' ? styles.inputFocused : null]}
                          value={fechaInicioPlan}
                          onChangeText={setFechaInicioPlan}
                          placeholder="AAAA-MM-DD"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('fInicio')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Estado de Pago Inicial</Text>
                        <View style={styles.segmentPicker}>
                          <TouchableOpacity
                            style={[styles.segmentBtn, pagado ? { backgroundColor: theme.success } : null]}
                            onPress={() => setPagado(true)}
                          >
                            <Text style={[styles.segmentText, { color: pagado ? '#fff' : theme.success }]}>Pagado</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.segmentBtn, !pagado ? { backgroundColor: theme.error } : null]}
                            onPress={() => setPagado(false)}
                          >
                            <Text style={[styles.segmentText, { color: !pagado ? '#fff' : theme.error }]}>Deuda</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {activeSection === 'Config' && (
                    <View>
                      <Text style={styles.sectionHeader}>Configuración del sistema</Text>
                      <Text style={styles.sectionSubtitle}>Dirección y contactos del atleta</Text>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Dirección</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'direccion' ? styles.inputFocused : null]}
                          value={direccion}
                          onChangeText={setDireccion}
                          placeholder="Ej: Av. Vitacura 1234"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('direccion')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formRow}>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>Ciudad</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'ciudad' ? styles.inputFocused : null]}
                            value={ciudad}
                            onChangeText={setCiudad}
                            placeholder="Ej: Santiago"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('ciudad')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>Estado/Región</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'estado' ? styles.inputFocused : null]}
                            value={estadoProvincia}
                            onChangeText={setEstadoProvincia}
                            placeholder="Ej: RM"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('estado')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>

                      <View style={styles.formRow}>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>Código Postal</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'postal' ? styles.inputFocused : null]}
                            value={codigoPostal}
                            onChangeText={setCodigoPostal}
                            placeholder="Ej: 7500000"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('postal')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>País</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'pais' ? styles.inputFocused : null]}
                            value={pais}
                            onChangeText={setPais}
                            placeholder="Ej: Chile"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('pais')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Zona Horaria</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'tz' ? styles.inputFocused : null]}
                          value={zonaHoraria}
                          onChangeText={setZonaHoraria}
                          placeholder="Ej: America/Santiago (GMT-4)"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('tz')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formRow}>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>Teléfono Fijo</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'tel' ? styles.inputFocused : null]}
                            value={telefono}
                            onChangeText={setTelefono}
                            placeholder="Ej: 222345678"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            onFocus={() => setFocusedField('tel')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={styles.formCol}>
                          <Text style={styles.label}>Teléfono Celular</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'cel' ? styles.inputFocused : null]}
                            value={celular}
                            onChangeText={setCelular}
                            placeholder="Ej: +56998765432"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            onFocus={() => setFocusedField('cel')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Fecha de nacimiento</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'nacimiento' ? styles.inputFocused : null]}
                          value={fechaNacimiento}
                          onChangeText={setFechaNacimiento}
                          placeholder="DD/MM/AAAA"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('nacimiento')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  )}

                </ScrollView>
              </View>
            </View>

            {/* Modal Footer (Guardar, Guardar y cerrar) */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.btnSave}
                onPress={() => handleSave(false)}
              >
                <Text style={styles.btnSaveText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.btnSaveClose}
                onPress={() => handleSave(true)}
              >
                <Text style={styles.btnSaveCloseText}>Guardar y cerrar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
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
  welcomeBox: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.text,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
    fontWeight: '550',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 14,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiCardFull: {
    width: '100%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 9,
    color: theme.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
  },
  kpiSubtext: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 4,
    fontWeight: '550',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.primary,
    textTransform: 'uppercase',
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
    paddingLeft: 8,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 6,
    elevation: 2,
  },
  shortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutMainText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  shortcutSubText: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  progressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  progressItemInfo: {
    flex: 1.2,
  },
  progressItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  progressItemStatus: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '550',
  },
  progressItemBarCol: {
    flex: 1.8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
    fontWeight: '550',
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  agendaIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agendaRaceName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  agendaAthleteName: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  agendaCountdown: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  agendaCountdownText: {
    fontSize: 10,
    fontWeight: '800',
  },
  feedContainer: {
    gap: 8,
  },
  feedCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 4,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedAthleteName: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedLogDate: {
    fontSize: 9,
    color: theme.textMuted,
    fontWeight: '500',
  },
  feedDescription: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '550',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    backgroundColor: theme.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    width: Platform.OS === 'web' ? '70%' : '100%',
    height: Platform.OS === 'web' ? '85%' : '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: theme.surface,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: theme.text,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    flex: 1,
    flexDirection: 'column',
  },
  modalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surfaceSecondary,
    padding: 8,
    gap: 8,
  },
  modalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  modalTabBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  modalTabBtnText: {
    fontSize: 11,
    fontWeight: '750',
    color: theme.textSecondary,
  },
  modalTabBtnTextActive: {
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '750',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    color: theme.text,
    fontSize: 12.5,
  },
  inputFocused: {
    borderColor: theme.primary,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.background,
  },
  photoBox: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    overflow: 'hidden',
  },
  photoBoxText: {
    fontSize: 22,
  },
  photoActions: {
    flex: 1,
    gap: 8,
  },
  photoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnText: {
    fontSize: 10,
    fontWeight: '750',
    color: theme.textSecondary,
  },
  segmentPicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.surfaceSecondary,
    padding: 2,
    height: 36,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 10.5,
    fontWeight: '750',
  },
  modalFooter: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: theme.surface,
  },
  btnSave: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#fff',
  },
  btnSaveClose: {
    flex: 1.2,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveCloseText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#fff',
  },
  btnAddQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnAddQuickText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  linkHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  linkHeaderText: {
    fontSize: 12,
    fontWeight: '800',
  },
  athleteCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  athleteAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  athleteAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  athleteInfoCol: {
    flex: 1,
  },
  athleteNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text,
  },
  athleteSubDetails: {
    fontSize: 10.5,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  statusBadgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgeDebt: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  athleteActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
