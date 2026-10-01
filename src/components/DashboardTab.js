import { parseFlexibleDate, normalizeDateToISO, formatDateChile, getDaysRemaining } from '../utils/dateUtils';
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

export default function DashboardTab({ atletas, setCurrentTab, onSaveAtleta, onDeleteAtleta, onSaveCompetencias }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [activeSection, setActiveSection] = useState('Perfil'); // 'Perfil', 'Pagos', 'Config'

  // Personal Info Form States
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [tipoAtleta, setTipoAtleta] = useState('Triathlete'); // Triathlete, Runner, Swimmer, Cyclist
  const [distanciaObjetivo, setDistanciaObjetivo] = useState('Olímpica'); // Sprint, Olímpica, Media distancia / 70.3, Ironman
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

  // Quick Add Competition Modal State
  const [showQuickCompModal, setShowQuickCompModal] = useState(false);
  const [quickCompAtletaId, setQuickCompAtletaId] = useState('');
  const [quickCompNombre, setQuickCompNombre] = useState('');
  const [quickCompFecha, setQuickCompFecha] = useState('');

  // Next Competition in Athlete Profile Modal
  const [proximaCompNombre, setProximaCompNombre] = useState('');
  const [proximaCompFecha, setProximaCompFecha] = useState('');

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
    setDistanciaObjetivo(athlete.distanciaObjetivo || 'Olímpica');
    const comps = athlete.competencias || athlete.plan?.competencias || [];
    if (comps.length > 0) {
      setProximaCompNombre(comps[0].nombre || '');
      setProximaCompFecha(comps[0].fecha || '');
    } else {
      setProximaCompNombre('');
      setProximaCompFecha('');
    }
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
    setDistanciaObjetivo('Olímpica');
    setProximaCompNombre('');
    setProximaCompFecha('');
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

    let athleteCompetencias = Array.isArray(editingAthlete?.competencias)
      ? [...editingAthlete.competencias]
      : (Array.isArray(editingAthlete?.plan?.competencias) ? [...editingAthlete.plan.competencias] : []);

    if (proximaCompNombre.trim() && proximaCompFecha.trim()) {
      const normDate = normalizeDateToISO(proximaCompFecha.trim());
      const existingIdx = athleteCompetencias.findIndex(c => c.nombre.toLowerCase().trim() === proximaCompNombre.trim().toLowerCase());
      if (existingIdx >= 0) {
        athleteCompetencias[existingIdx] = { nombre: proximaCompNombre.trim(), fecha: normDate };
      } else {
        athleteCompetencias = [{ nombre: proximaCompNombre.trim(), fecha: normDate }, ...athleteCompetencias];
      }
    }

    const athleteData = {
      nombre: nombre.trim(),
      email: email.trim(),
      tipoAtleta,
      distanciaObjetivo,
      competencias: athleteCompetencias,
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
        if (dayData) {
          if (dayData.natacion?.ecos) athleteSum += parseFloat(dayData.natacion.ecos) || 0;
          if (dayData.ciclismo?.ecos) athleteSum += parseFloat(dayData.ciclismo.ecos) || 0;
          if (dayData.carrera?.ecos) athleteSum += parseFloat(dayData.carrera.ecos) || 0;
          if (dayData.fuerza?.ecos) athleteSum += parseFloat(dayData.fuerza.ecos) || 0;
        }
      });
      totalWeeklyEcosSum += athleteSum;
    }
  });
  const avgWeeklyEcos = athletesWithEcos > 0 ? totalWeeklyEcosSum / athletesWithEcos : 0;

  // 2. Aggregate Competitions (Upcoming across all plans and athletes)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCompetitions = [];
  (atletas || []).forEach(a => {
    const allComps = [];
    if (Array.isArray(a.competencias)) allComps.push(...a.competencias);
    if (Array.isArray(a.plan?.competencias)) allComps.push(...a.plan.competencias);
    if (Array.isArray(a.planHistory)) {
      a.planHistory.forEach(p => {
        if (Array.isArray(p.competencias)) allComps.push(...p.competencias);
      });
    }

    const seen = new Set();
    allComps.forEach(c => {
      if (!c || !c.nombre || !c.fecha) return;
      const normDate = normalizeDateToISO(c.fecha);
      const key = `${c.nombre.toLowerCase().trim()}_${normDate}`;
      if (seen.has(key)) return;
      seen.add(key);

      const compDate = parseFlexibleDate(c.fecha);
      if (compDate) {
        compDate.setHours(0, 0, 0, 0);
        const diffDays = getDaysRemaining(compDate);
        if (diffDays !== null && diffDays >= -3) {
          upcomingCompetitions.push({
            atletaId: a.id,
            atletaNombre: a.nombre,
            carreraNombre: c.nombre,
            fecha: normDate || c.fecha,
            fechaObj: compDate,
            diasRestantes: diffDays
          });
        }
      }
    });
  });
  upcomingCompetitions.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const openQuickCompModal = (presetAthleteId = null) => {
    setQuickCompAtletaId(presetAthleteId || (atletas && atletas.length > 0 ? atletas[0].id : ''));
    setQuickCompNombre('');
    setQuickCompFecha('');
    setShowQuickCompModal(true);
  };

  const handleSaveQuickComp = () => {
    if (!quickCompAtletaId) {
      Alert.alert('Error', 'Selecciona un atleta.');
      return;
    }
    if (!quickCompNombre.trim()) {
      Alert.alert('Error', 'Ingresa el nombre de la competencia.');
      return;
    }
    if (!quickCompFecha.trim()) {
      Alert.alert('Error', 'Ingresa la fecha de la competencia.');
      return;
    }

    const targetAthlete = atletas.find(a => a.id === quickCompAtletaId);
    const currentComps = targetAthlete?.competencias || targetAthlete?.plan?.competencias || [];
    const normDate = normalizeDateToISO(quickCompFecha.trim());
    const newComp = { nombre: quickCompNombre.trim(), fecha: normDate };
    const updated = [newComp, ...currentComps.filter(c => c.nombre.toLowerCase().trim() !== newComp.nombre.toLowerCase().trim())];

    if (onSaveCompetencias) {
      onSaveCompetencias(quickCompAtletaId, updated, {
        text: `🏆 Nueva competencia registrada: ${newComp.nombre} (${formatDateChile(normDate)})`,
        nombre: newComp.nombre
      });
    }

    setShowQuickCompModal(false);
    setQuickCompNombre('');
    setQuickCompFecha('');
    Alert.alert('Éxito', `Competencia "${newComp.nombre}" agregada y guardada para ${targetAthlete?.nombre || 'el atleta'}.`);
  };

  const handleDeleteQuickComp = (atletaId, compNombre, compFecha) => {
    Alert.alert(
      'Eliminar Competencia',
      `¿Deseas eliminar "${compNombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const targetAthlete = atletas.find(a => a.id === atletaId);
            const currentComps = targetAthlete?.competencias || targetAthlete?.plan?.competencias || [];
            const normDate = normalizeDateToISO(compFecha);
            const updated = currentComps.filter(c => !(c.nombre.toLowerCase().trim() === compNombre.toLowerCase().trim() && normalizeDateToISO(c.fecha) === normDate));
            
            if (onSaveCompetencias) {
              onSaveCompetencias(atletaId, updated, {
                text: `Competencia eliminada: ${compNombre}`,
                nombre: compNombre
              });
            }
          }
        }
      ]
    );
  };

  // 3. Macrocycles Progress
  const macrocyclesProgress = [];
  atletas.forEach(a => {
    if (a.plan && a.plan.fechaInicio) {
      const d = new Date(a.plan.fechaInicio + 'T00:00:00');
      const mesos = parseInt(a.plan.mesos) || 3;
      const totalDays = mesos * 4 * 7;
      const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
      
      let pct = 0;
      let statusText = 'Por iniciar';
      if (diffDays >= 0) {
        pct = Math.min(100, Math.round((diffDays / totalDays) * 100));
        const currentWeek = Math.min(mesos * 4, Math.floor(diffDays / 7) + 1);
        statusText = `Semana ${currentWeek} de ${mesos * 4} (${pct}%)`;
      }
      macrocyclesProgress.push({
        atletaNombre: a.nombre,
        porcentaje: pct,
        statusText
      });
    }
  });

  // 4. Feed/Activity Logs
  const allLogs = [];
  atletas.forEach(a => {
    const hist = a.historial || [];
    hist.forEach(h => {
      allLogs.push({
        ...h,
        atletaNombre: a.nombre,
        atletaId: a.id
      });
    });
  });
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

      {/* Athlete Management List */}
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
                    {atleta.distanciaObjetivo ? (
                      <Text style={{ color: theme.primary, fontWeight: '700' }}>{atleta.distanciaObjetivo} • </Text>
                    ) : null}
                    {atleta.tipoPlan === 'trimestral' ? 'Trimestral' : 'Mensual'} • {formatCLP(atleta.monto)}
                  </Text>
                  {(() => {
                    const athleteComp = upcomingCompetitions.find(c => c.atletaId === atleta.id && c.diasRestantes >= 0);
                    if (!athleteComp) return null;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={[styles.athleteCompBadge, { backgroundColor: theme.runBg, borderColor: theme.run }]}>
                          <Ionicons name="trophy" size={10} color={theme.run} style={{ marginRight: 4 }} />
                          <Text style={[styles.athleteCompBadgeText, { color: theme.run }]} numberOfLines={1}>
                            {athleteComp.carreraNombre} ({athleteComp.diasRestantes === 0 ? '¡Hoy!' : `${athleteComp.diasRestantes}d`})
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
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
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Próximas Competencias ({upcomingCompetitions.length})</Text>
        <TouchableOpacity onPress={() => openQuickCompModal()} style={styles.linkHeaderBtn}>
          <Text style={[styles.linkHeaderText, { color: theme.run }]}>+ Añadir</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {upcomingCompetitions.length > 0 ? (
          upcomingCompetitions.map((item, idx) => (
            <View key={idx} style={[styles.agendaRow, idx < upcomingCompetitions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null]}>
              <View style={[styles.agendaIcon, { backgroundColor: theme.runBg, borderColor: theme.run }]}>
                <Ionicons name="trophy" size={14} color={theme.run} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.agendaCompTitle}>{item.carreraNombre}</Text>
                <Text style={styles.agendaAthleteName}>{item.atletaNombre} • {formatDateChile(item.fecha)}</Text>
              </View>
              <View style={[styles.agendaDaysBadge, { backgroundColor: item.diasRestantes <= 14 ? theme.errorBg : theme.surfaceSecondary }]}>
                <Text style={[styles.agendaDaysText, { color: item.diasRestantes <= 14 ? theme.error : theme.text }]}>
                  {item.diasRestantes === 0 ? '¡Hoy!' : item.diasRestantes < 0 ? `hace ${Math.abs(item.diasRestantes)}d` : `en ${item.diasRestantes}d`}
                </Text>
              </View>
              {onSaveCompetencias && item.atletaId ? (
                <TouchableOpacity 
                  onPress={() => handleDeleteQuickComp(item.atletaId, item.carreraNombre, item.fecha)}
                  style={{ padding: 6, marginLeft: 6 }}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Ionicons name="trophy-outline" size={28} color={theme.textMuted} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay competencias programadas próximamente.</Text>
            <TouchableOpacity 
              onPress={() => openQuickCompModal()} 
              style={[styles.btnAddCompQuick, { backgroundColor: theme.runBg, borderColor: theme.run, marginTop: 10 }]}
            >
              <Ionicons name="add" size={15} color={theme.run} />
              <Text style={[styles.btnAddCompQuickText, { color: theme.run }]}>Registrar Competencia</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent Activity Log */}
      <Text style={styles.sectionTitle}>Registro de Actividades Recientes</Text>
      <View style={styles.feedCard}>
        {recentLogs.length > 0 ? (
          recentLogs.map((log, idx) => {
            const colors = getLogColors(log.tipo);
            return (
              <View 
                key={log.id || idx} 
                style={[
                  styles.feedRow,
                  idx < recentLogs.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null
                ]}
              >
                <View style={styles.feedHeaderRow}>
                  <View style={[styles.feedIconBox, { backgroundColor: colors.bg }]}>
                    <Ionicons name={colors.icon} size={13} color={colors.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedAthlete}>{log.atletaNombre}</Text>
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
                          <Text style={styles.photoBoxText}>🏃‍♂️</Text>
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

                      {/* Distancia Objetivo (Requested by User) */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>🎯 Distancia Objetivo</Text>
                        <View style={styles.segmentPicker}>
                          {[
                            { id: 'Sprint', label: 'Sprint' },
                            { id: 'Olímpica', label: 'Olímpica' },
                            { id: 'Media distancia / 70.3', label: '70.3' },
                            { id: 'Ironman', label: 'Ironman' }
                          ].map(d => (
                            <TouchableOpacity
                              key={d.id}
                              style={[styles.segmentBtn, distanciaObjetivo === d.id ? { backgroundColor: theme.primary } : null]}
                              onPress={() => setDistanciaObjetivo(d.id)}
                            >
                              <Text style={[styles.segmentText, { color: distanciaObjetivo === d.id ? '#fff' : theme.textSecondary }]}>
                                {d.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Próxima Competencia Objetivo (Opcional) */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>🏆 Próxima Competencia Objetivo (Opcional)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'proximaCompNombre' ? styles.inputFocused : null]}
                          value={proximaCompNombre}
                          onChangeText={setProximaCompNombre}
                          placeholder="Ej: Ironman 70.3 Valdivia, Maratón Santiago"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('proximaCompNombre')}
                          onBlur={() => setFocusedField(null)}
                        />
                        <TextInput 
                          style={[styles.input, { marginTop: 8 }, focusedField === 'proximaCompFecha' ? styles.inputFocused : null]}
                          value={proximaCompFecha}
                          onChangeText={setProximaCompFecha}
                          placeholder="Fecha (AAAA-MM-DD o DD/MM/AAAA)"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('proximaCompFecha')}
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
                          placeholder="Ej: montserrat.coilla"
                          placeholderTextColor={theme.textMuted}
                          autoCapitalize="none"
                          onFocus={() => setFocusedField('username')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Fecha de nacimiento (DD/MM/AAAA)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'fechaNacimiento' ? styles.inputFocused : null]}
                          value={fechaNacimiento}
                          onChangeText={setFechaNacimiento}
                          placeholder="Ej: 01/07/1994"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('fechaNacimiento')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Dirección y contacto</Text>
                      
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Dirección física</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'direccion' ? styles.inputFocused : null]}
                          value={direccion}
                          onChangeText={setDireccion}
                          placeholder="Ej: Av. Las Condes 12345"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('direccion')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.rowTwoCols}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Ciudad</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'ciudad' ? styles.inputFocused : null]}
                            value={ciudad}
                            onChangeText={setCiudad}
                            placeholder="Santiago"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('ciudad')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={styles.label}>Región / Estado</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'estadoProvincia' ? styles.inputFocused : null]}
                            value={estadoProvincia}
                            onChangeText={setEstadoProvincia}
                            placeholder="Metropolitana"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('estadoProvincia')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>

                      <View style={styles.rowTwoCols}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>País</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'pais' ? styles.inputFocused : null]}
                            value={pais}
                            onChangeText={setPais}
                            placeholder="Chile"
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setFocusedField('pais')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={styles.label}>Código Postal</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'codigoPostal' ? styles.inputFocused : null]}
                            value={codigoPostal}
                            onChangeText={setCodigoPostal}
                            placeholder="7550000"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="numeric"
                            onFocus={() => setFocusedField('codigoPostal')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>

                      <View style={styles.rowTwoCols}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Teléfono</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'telefono' ? styles.inputFocused : null]}
                            value={telefono}
                            onChangeText={setTelefono}
                            placeholder="+56 2 2233 4455"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            onFocus={() => setFocusedField('telefono')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={styles.label}>Celular (WhatsApp)</Text>
                          <TextInput 
                            style={[styles.input, focusedField === 'celular' ? styles.inputFocused : null]}
                            value={celular}
                            onChangeText={setCelular}
                            placeholder="+56 9 8765 4321"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                            onFocus={() => setFocusedField('celular')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {activeSection === 'Pagos' && (
                    <View>
                      <Text style={styles.sectionHeader}>Planes y Pagos de Mensualidad</Text>
                      <Text style={styles.sectionSubtitle}>Ajustes de facturación del deportista</Text>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Monto del plan (CLP)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'monto' ? styles.inputFocused : null]}
                          value={monto}
                          onChangeText={setMonto}
                          placeholder="40000"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="numeric"
                          onFocus={() => setFocusedField('monto')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Frecuencia de Facturación</Text>
                        <View style={styles.segmentPicker}>
                          {[
                            { id: 'mensual', label: 'Mensual' },
                            { id: 'trimestral', label: 'Trimestral' }
                          ].map(p => (
                            <TouchableOpacity
                              key={p.id}
                              style={[styles.segmentBtn, tipoPlan === p.id ? { backgroundColor: theme.primary } : null]}
                              onPress={() => setTipoPlan(p.id)}
                            >
                              <Text style={[styles.segmentText, { color: tipoPlan === p.id ? '#fff' : theme.textSecondary }]}>
                                {p.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Fecha inicio de suscripción (YYYY-MM-DD)</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'fechaInicioPlan' ? styles.inputFocused : null]}
                          value={fechaInicioPlan}
                          onChangeText={setFechaInicioPlan}
                          placeholder="2026-09-01"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('fechaInicioPlan')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Estado del Pago Actual</Text>
                        <View style={styles.segmentPicker}>
                          <TouchableOpacity
                            style={[styles.segmentBtn, pagado ? { backgroundColor: theme.success } : null]}
                            onPress={() => setPagado(true)}
                          >
                            <Text style={[styles.segmentText, { color: pagado ? '#fff' : theme.textSecondary }]}>
                              🟢 Al Día
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.segmentBtn, !pagado ? { backgroundColor: theme.error } : null]}
                            onPress={() => setPagado(false)}
                          >
                            <Text style={[styles.segmentText, { color: !pagado ? '#fff' : theme.textSecondary }]}>
                              🔴 Pendiente / Deuda
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {activeSection === 'Config' && (
                    <View>
                      <Text style={styles.sectionHeader}>Preferencias del Sistema</Text>
                      <Text style={styles.sectionSubtitle}>Zona horaria y notificaciones</Text>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Zona Horaria</Text>
                        <TextInput 
                          style={[styles.input, focusedField === 'zonaHoraria' ? styles.inputFocused : null]}
                          value={zonaHoraria}
                          onChangeText={setZonaHoraria}
                          placeholder="America/Santiago (GMT-4)"
                          placeholderTextColor={theme.textMuted}
                          onFocus={() => setFocusedField('zonaHoraria')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  )}

                </ScrollView>
              </View>
            </View>

            {/* Modal Bottom Actions Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.btnSaveAndClose}
                onPress={() => handleSave(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSaveText}>Guardar y cerrar</Text>
              </TouchableOpacity>
              
              {!editingAthlete && (
                <TouchableOpacity 
                  style={styles.btnSaveAndNew}
                  onPress={() => handleSave(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSaveAndNewText}>Guardar y agregar otro</Text>
                </TouchableOpacity>
              )}
            </View>

          </KeyboardAvoidingView>
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
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 40,
    },
    welcomeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: 0.3,
    },
    welcomeSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    btnAddQuick: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    btnAddQuickText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
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
      marginBottom: 6,
    },
    kpiLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: 0.3,
    },
    kpiSubtext: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 10,
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
      fontSize: 11,
      fontWeight: '800',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 10,
    },
    shortcutsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },
    shortcutCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 4,
      elevation: 1,
    },
    shortcutIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    shortcutMainText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.text,
    },
    shortcutSubText: {
      fontSize: 9,
      color: theme.textSecondary,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
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
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 14,
      marginBottom: 18,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 8,
      elevation: 2,
    },
    athleteCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    athleteAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    athleteAvatarText: {
      fontSize: 13,
      fontWeight: '900',
    },
    athleteInfoCol: {
      flex: 1,
    },
    athleteNameText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
    },
    athleteSubDetails: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 10,
    },
    statusBadgePaid: {
      backgroundColor: theme.successBg,
    },
    statusBadgeDebt: {
      backgroundColor: theme.errorBg,
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
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 12,
      textAlign: 'center',
    },
    progressItemRow: {
      paddingVertical: 10,
    },
    progressItemInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressItemName: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    progressItemStatus: {
      fontSize: 11,
      fontWeight: '600',
    },
    progressItemBarCol: {
      height: 6,
    },
    athleteCompBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    athleteCompBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    modalCardQuick: {
      width: '92%',
      maxWidth: 420,
      borderRadius: 18,
      borderWidth: 1,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    athleteChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
    },
    athleteChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    btnAddCompQuick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    btnAddCompQuickText: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    modalCancelBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    modalSubmitBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSubmitBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    agendaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    agendaIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaCompTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    agendaAthleteName: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    agendaDaysBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    agendaDaysText: {
      fontSize: 11,
      fontWeight: '800',
    },
    feedCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 14,
      marginBottom: 18,
    },
    feedRow: {
      paddingVertical: 10,
    },
    feedHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    feedIconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    feedAthlete: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    feedLogDate: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    feedDescription: {
      fontSize: 11,
      lineHeight: 16,
      marginLeft: 32,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalSheet: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.text,
      flex: 1,
      paddingRight: 10,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalBody: {
      flexShrink: 1,
    },
    modalTabsRow: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 6,
      gap: 6,
      backgroundColor: theme.surfaceSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      borderRadius: 10,
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
      color: '#fff',
      fontWeight: '900',
    },
    modalContent: {
      maxHeight: 400,
    },
    scrollContent: {
      padding: 16,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionSubtitle: {
      fontSize: 11,
      color: theme.textSecondary,
      marginBottom: 12,
      marginTop: 2,
    },
    photoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 12,
    },
    photoBox: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBoxText: {
      fontSize: 22,
    },
    photoActions: {
      flexDirection: 'row',
      gap: 8,
    },
    photoBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSecondary,
    },
    photoBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text,
    },
    formGroup: {
      marginBottom: 12,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    input: {
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
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
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentText: {
      fontSize: 11,
      fontWeight: '800',
    },
    rowTwoCols: {
      flexDirection: 'row',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
      backgroundColor: theme.surface,
    },
    btnSaveAndClose: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 12,
    },
    btnSaveText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '900',
    },
    btnSaveAndNew: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      borderRadius: 12,
    },
    btnSaveAndNewText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: '800',
    },
  });
