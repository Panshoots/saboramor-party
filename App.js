import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

// Import Theme
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Import Firebase Cloud Services
import { 
  fetchAtletasFromCloud, 
  saveAtletasToCloud, 
  deleteAtletaFromCloud, 
  subscribeToAtletasCloud 
} from './src/services/firebase';

// Import Screens
import LoginScreen from './src/components/LoginScreen';
import DashboardTab from './src/components/DashboardTab';
import MensualidadesTab from './src/components/MensualidadesTab';
import PlanificacionTab from './src/components/PlanificacionTab';
import EcosTab from './src/components/EcosTab';
import ConfiguracionTab from './src/components/ConfiguracionTab';

// Helpers for weekly history of ECOs
function getMondayDate(dateString) {
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
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear()}`;
}

function calculateEcosTotalForSport(ecosWeeklyData, sportKey) {
  let sum = 0;
  if (!ecosWeeklyData) return 0;
  Object.keys(ecosWeeklyData).forEach(day => {
    const dayData = ecosWeeklyData[day];
    if (dayData && dayData[dayDataKeyMap(sportKey)]) {
      sum += parseFloat(dayData[dayDataKeyMap(sportKey)].ecos) || 0;
    }
  });
  return sum;
}

function dayDataKeyMap(sportKey) {
  if (sportKey === 'natacion') return 'natacion';
  if (sportKey === 'ciclismo') return 'ciclismo';
  if (sportKey === 'carrera') return 'carrera';
  return sportKey;
}

function AppContent() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    initApp();
    checkAutomaticUpdates();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAutomaticUpdates();
      }
    });

    // Real-time Cloud Sync Subscription
    const unsubscribeCloud = subscribeToAtletasCloud((cloudList) => {
      if (cloudList && Array.isArray(cloudList) && cloudList.length > 0) {
        setAtletas(cloudList);
        AsyncStorage.setItem('atletas_tri_v10', JSON.stringify(cloudList)).catch(console.log);
      }
    });

    return () => {
      subscription.remove();
      if (typeof unsubscribeCloud === 'function') {
        unsubscribeCloud();
      }
    };
  }, []);

  const checkAutomaticUpdates = async () => {
    if (Platform.OS === 'web' || __DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (e) {
      // Background check fails silently if offline
    }
  };

  const initApp = async () => {
    try {
      // 1. Session Persistence Check
      const remembered = await AsyncStorage.getItem('epl_session_remembered');
      if (remembered === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      // 2. Load Athletes from Cloud Firestore with Local Storage Fallback
      await loadAtletas();
    } catch (e) {
      console.log('Error initializing app:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAtletas = async () => {
    try {
      // Attempt cloud fetch first
      const cloudAtletas = await fetchAtletasFromCloud();
      if (cloudAtletas && Array.isArray(cloudAtletas) && cloudAtletas.length > 0) {
        setAtletas(cloudAtletas);
        await AsyncStorage.setItem('atletas_tri_v10', JSON.stringify(cloudAtletas));
        return;
      }

      // Fallback to local storage if offline or initial load
      const stored = await AsyncStorage.getItem('atletas_tri_v10');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAtletas(parsed);
        if (parsed.length > 0) {
          saveAtletasToCloud(parsed).catch(console.log);
        }
      }
    } catch (e) {
      console.log('Error loading athletes:', e);
    }
  };

  const saveAtletas = async (updatedList) => {
    try {
      setAtletas(updatedList);
      await AsyncStorage.setItem('atletas_tri_v10', JSON.stringify(updatedList));
      await saveAtletasToCloud(updatedList);
    } catch (e) {
      console.log('Error saving athletes:', e);
    }
  };

  const handleSaveAtleta = (athleteData) => {
    let updatedList;
    if (athleteData.id) {
      // Edit existing athlete & log modification
      updatedList = atletas.map(a => {
        if (a.id === athleteData.id) {
          const editLog = {
            id: Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            tipo: 'Modificación',
            descripcion: `Actualización de perfil/ficha del atleta (Plan: ${athleteData.tipoPlan || a.tipoPlan || 'Mensual'}, Monto: $${Math.round(athleteData.monto || a.monto || 0).toLocaleString('es-CL')})`
          };
          return {
            ...a,
            ...athleteData,
            historial: [editLog, ...(a.historial || [])]
          };
        }
        return a;
      });
    } else {
      // New athlete
      const newAthlete = {
        id: Date.now(),
        nombre: athleteData.nombre,
        email: athleteData.email || '',
        tipoAtleta: athleteData.tipoAtleta || 'Triathlete',
        genero: athleteData.genero || 'Female',
        username: athleteData.username || athleteData.nombre.toLowerCase().replace(/\s/g, ''),
        direccion: athleteData.direccion || '',
        ciudad: athleteData.ciudad || '',
        estadoProvincia: athleteData.estadoProvincia || '',
        codigoPostal: athleteData.codigoPostal || '',
        pais: athleteData.pais || 'Chile',
        zonaHoraria: athleteData.zonaHoraria || 'America/Santiago (GMT-4)',
        telefono: athleteData.telefono || '',
        celular: athleteData.celular || '',
        fechaNacimiento: athleteData.fechaNacimiento || '',
        monto: athleteData.monto || 40000,
        estado: athleteData.estado || (athleteData.pagado !== false ? 'Al Día' : 'Deuda'),
        plan: null,
        planHistory: [],
        ecosWeekly: null,
        ecosWeeks: {},
        ecosHistory: [],
        tipoPlan: athleteData.tipoPlan || 'mensual',
        fechaInicioPlan: athleteData.fechaInicioPlan || new Date().toISOString().split('T')[0],
        pagado: athleteData.pagado !== undefined ? athleteData.pagado : true,
        historial: [
          {
            id: Date.now(),
            fecha: new Date().toISOString().split('T')[0],
            tipo: 'Registro',
            descripcion: `Registro de ficha del atleta (${athleteData.tipoPlan === 'trimestral' ? 'Plan Trimestral' : 'Plan Mensual'})`
          }
        ]
      };
      updatedList = [...atletas, newAthlete];
    }
    saveAtletas(updatedList);
  };

  const handleDeleteAtleta = (id) => {
    const updatedList = atletas.filter(a => a.id !== id);
    saveAtletas(updatedList);
    deleteAtletaFromCloud(id).catch(console.log);
  };

  const handleAddAbono = (athleteId, abonoData) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const abonos = a.abonos || [];
        const newAbono = {
          id: Date.now(),
          fecha: abonoData.fecha || new Date().toISOString().split('T')[0],
          monto: parseFloat(abonoData.monto) || 0,
          metodo: abonoData.metodo || 'Transferencia',
          banco: abonoData.banco || 'BancoEstado',
          notas: abonoData.notas || ''
        };
        const updatedAbonos = [newAbono, ...abonos];
        const totalAbonado = updatedAbonos.reduce((sum, ab) => sum + (ab.monto || 0), 0);
        const totalMonto = a.monto || 40000;
        const saldoRestante = Math.max(0, totalMonto - totalAbonado);
        const isFullyPaid = totalAbonado >= totalMonto;

        const feeFormatted = Math.round(newAbono.monto).toLocaleString('es-CL');
        const totalFormatted = Math.round(totalAbonado).toLocaleString('es-CL');
        const maxFormatted = Math.round(totalMonto).toLocaleString('es-CL');
        const saldoFormatted = Math.round(saldoRestante).toLocaleString('es-CL');

        const nuevoLog = {
          id: Date.now() + 1,
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Abono',
          descripcion: `Abono de $${feeFormatted} recibido (${newAbono.metodo} - ${newAbono.banco}). Total pagado: $${totalFormatted} / $${maxFormatted}. Saldo pendiente: $${saldoFormatted}.${newAbono.notas ? ' Nota: ' + newAbono.notas : ''}`
        };

        return {
          ...a,
          abonos: updatedAbonos,
          pagado: isFullyPaid,
          estado: isFullyPaid ? 'Al Día' : (totalAbonado > 0 ? 'Abonado Parcial' : 'Deuda'),
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleDeleteAbono = (athleteId, abonoId) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const abonos = (a.abonos || []).filter(ab => ab.id !== abonoId);
        const totalAbonado = abonos.reduce((sum, ab) => sum + (ab.monto || 0), 0);
        const totalMonto = a.monto || 40000;
        const isFullyPaid = totalAbonado >= totalMonto;

        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Abono Revertido',
          descripcion: `Se eliminó un registro de abono. Total pagado actual: $${Math.round(totalAbonado).toLocaleString('es-CL')}`
        };

        return {
          ...a,
          abonos,
          pagado: isFullyPaid,
          estado: isFullyPaid ? 'Al Día' : (totalAbonado > 0 ? 'Abonado Parcial' : 'Deuda'),
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleTogglePago = (id) => {
    const updatedList = atletas.map(a => {
      if (a.id === id) {
        const nuevoEstado = a.estado === 'Al Día' ? 'Deuda' : 'Al Día';
        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: nuevoEstado === 'Al Día' ? 'Pago' : 'Deuda',
          descripcion: nuevoEstado === 'Al Día' 
            ? `Pago de mensualidad registrado: $${Math.round(a.monto).toLocaleString('es-CL')}`
            : 'Deuda registrada de mensualidad'
        };
        return {
          ...a,
          estado: nuevoEstado,
          pagado: nuevoEstado === 'Al Día',
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleSavePlan = (athleteId, planData) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const planHistory = a.planHistory || [];
        const index = planHistory.findIndex(p => p.fechaInicio === planData.fechaInicio);
        let updatedHistory;
        if (index !== -1) {
          updatedHistory = planHistory.map((p, i) => i === index ? planData : p);
        } else {
          updatedHistory = [planData, ...planHistory];
        }

        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Plan',
          descripcion: `Guardada planificación macrociclo: ${planData.mesos} mesociclos (Inicio: ${planData.fechaInicio})`
        };

        return {
          ...a,
          plan: planData,
          planHistory: updatedHistory,
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleDeletePlan = (athleteId, fechaInicio) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const planHistory = (a.planHistory || []).filter(p => p.fechaInicio !== fechaInicio);
        let activePlan = a.plan;
        if (activePlan && activePlan.fechaInicio === fechaInicio) {
          activePlan = planHistory.length > 0 ? planHistory[0] : null;
        }

        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Sistema',
          descripcion: `Planificación eliminada del historial (Inicio: ${fechaInicio})`
        };

        return {
          ...a,
          plan: activePlan,
          planHistory: planHistory,
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleAddHistoryEntry = (athleteId, tipo, descripcion) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: tipo || 'Nota',
          descripcion: descripcion
        };
        return {
          ...a,
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleSaveCumplimiento = (updatedAthlete, weekNum) => {
    const compLog = {
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'Cumplimiento',
      descripcion: `Registro de cumplimiento de entrenamiento - Semana ${weekNum || ''}`
    };
    const athleteWithLog = {
      ...updatedAthlete,
      historial: [compLog, ...(updatedAthlete.historial || [])]
    };
    const updatedList = atletas.map(a => a.id === athleteWithLog.id ? athleteWithLog : a);
    saveAtletas(updatedList);
  };

  const handleDeleteHistoryEntry = (athleteId, logId) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        return {
          ...a,
          historial: (a.historial || []).filter(h => h.id !== logId)
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleSaveEcos = (athleteId, ecosWeeklyData, totalEcos, weekStartDateStr) => {
    const updatedList = atletas.map(a => {
      if (a.id === athleteId) {
        const todayDate = new Date();
        const defaultMonday = getMondayDate(todayDate.toISOString().split('T')[0]);
        const defaultMondayStr = formatDateChile(defaultMonday);

        const mondayStr = weekStartDateStr || defaultMondayStr;
        const ecosHistory = a.ecosHistory || [];
        const index = ecosHistory.findIndex(h => h.semanaFecha === mondayStr);

        const totNat = calculateEcosTotalForSport(ecosWeeklyData, 'natacion');
        const totCic = calculateEcosTotalForSport(ecosWeeklyData, 'ciclismo');
        const totCar = calculateEcosTotalForSport(ecosWeeklyData, 'carrera');

        const historyEntry = {
          id: index !== -1 ? ecosHistory[index].id : Date.now(),
          semanaFecha: mondayStr,
          totals: {
            nat: totNat,
            cic: totCic,
            car: totCar,
            total: totalEcos
          },
          details: ecosWeeklyData
        };

        let updatedHistory;
        if (index !== -1) {
          updatedHistory = ecosHistory.map((h, i) => i === index ? historyEntry : h);
        } else {
          updatedHistory = [historyEntry, ...ecosHistory];
        }

        const ecosWeeks = a.ecosWeeks || {};
        ecosWeeks[mondayStr] = ecosWeeklyData;

        const nuevoLog = {
          id: Date.now(),
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'ECOs',
          descripcion: `Carga semanal ECOs registrada (${mondayStr}): ${totalEcos.toFixed(2)} ECOs (Nat: ${totNat.toFixed(1)}, Cic: ${totCic.toFixed(1)}, Car: ${totCar.toFixed(1)})`
        };

        return {
          ...a,
          ecosWeekly: ecosWeeklyData,
          ecosWeeks: ecosWeeks,
          ecosHistory: updatedHistory,
          historial: [nuevoLog, ...(a.historial || [])]
        };
      }
      return a;
    });
    saveAtletas(updatedList);
  };

  const handleWipeData = async () => {
    try {
      await AsyncStorage.removeItem('atletas_tri_v10');
      await AsyncStorage.removeItem('epl_session_remembered');
      setAtletas([]);
    } catch (e) {
      console.log('Error wiping database:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('epl_session_remembered');
    } catch (e) {}
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardTab
            atletas={atletas}
            setCurrentTab={setCurrentTab}
            onSaveAtleta={handleSaveAtleta}
            onDeleteAtleta={handleDeleteAtleta}
          />
        );
      case 'payments':
        return (
          <MensualidadesTab
            atletas={atletas}
            onSaveAtleta={handleSaveAtleta}
            onDeleteAtleta={handleDeleteAtleta}
            onTogglePago={handleTogglePago}
            onAddAbono={handleAddAbono}
            onDeleteAbono={handleDeleteAbono}
            onAddHistoryEntry={handleAddHistoryEntry}
            onDeleteHistoryEntry={handleDeleteHistoryEntry}
          />
        );
      case 'planning':
        return (
          <PlanificacionTab
            atletas={atletas}
            onSavePlan={handleSavePlan}
            onDeletePlan={handleDeletePlan}
            onSaveCumplimiento={handleSaveCumplimiento}
          />
        );
      case 'ecos':
        return (
          <EcosTab
            atletas={atletas}
            onSaveEcos={handleSaveEcos}
          />
        );
      case 'config':
        return (
          <ConfiguracionTab
            onLogout={handleLogout}
            onWipeData={handleWipeData}
          />
        );
      default:
        return <View />;
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Panel de Control Principal';
      case 'payments':
        return 'Cobros y Mensualidades';
      case 'planning':
        return 'Planificación del Macrociclo';
      case 'ecos':
        return 'Calculadora de Carga ECOs';
      case 'config':
        return 'Ajustes del Sistema';
      default:
        return 'Administración';
    }
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.headerBg} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            EPL <Text style={{ color: theme.primary }}>TRIATLÓN</Text>
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {getHeaderSubtitle()}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerBtn, { marginRight: 8, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]} 
            onPress={toggleTheme} 
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? "sunny" : "moon"} size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]} 
            onPress={handleLogout} 
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Screen Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Custom Bottom Tab Navigation Bar with Android clearance */}
      <View style={[
        styles.tabBar, 
        { 
          backgroundColor: theme.surface, 
          borderColor: theme.border,
          shadowColor: theme.shadowColor,
          shadowOpacity: theme.shadowOpacity
        }
      ]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabItem, 
            currentTab === 'dashboard' ? { backgroundColor: theme.glowColor, borderRadius: 14 } : null
          ]}
          onPress={() => setCurrentTab('dashboard')}
        >
          <Ionicons
            name="grid"
            size={18}
            color={currentTab === 'dashboard' ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.tabLabel, 
            { color: currentTab === 'dashboard' ? theme.primary : theme.textMuted }
          ]}>
            Panel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabItem, 
            currentTab === 'payments' ? { backgroundColor: theme.glowColor, borderRadius: 14 } : null
          ]}
          onPress={() => setCurrentTab('payments')}
        >
          <Ionicons
            name="wallet"
            size={18}
            color={currentTab === 'payments' ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.tabLabel, 
            { color: currentTab === 'payments' ? theme.primary : theme.textMuted }
          ]}>
            Cobros
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabItem, 
            currentTab === 'planning' ? { backgroundColor: theme.glowColor, borderRadius: 14 } : null
          ]}
          onPress={() => setCurrentTab('planning')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={currentTab === 'planning' ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.tabLabel, 
            { color: currentTab === 'planning' ? theme.primary : theme.textMuted }
          ]}>
            Planificación
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabItem, 
            currentTab === 'ecos' ? { backgroundColor: theme.glowColor, borderRadius: 14 } : null
          ]}
          onPress={() => setCurrentTab('ecos')}
        >
          <Ionicons
            name="flash"
            size={18}
            color={currentTab === 'ecos' ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.tabLabel, 
            { color: currentTab === 'ecos' ? theme.primary : theme.textMuted }
          ]}>
            ECOs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabItem, 
            currentTab === 'config' ? { backgroundColor: theme.glowColor, borderRadius: 14 } : null
          ]}
          onPress={() => setCurrentTab('config')}
        >
          <Ionicons
            name="settings"
            size={18}
            color={currentTab === 'config' ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.tabLabel, 
            { color: currentTab === 'config' ? theme.primary : theme.textMuted }
          ]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 104, // Generous padding so content is never hidden behind floating dock
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 32, // Elevated above Android gesture/navigation buttons
    left: 16,
    right: 16,
    height: 64,
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 8,
    marginTop: 3,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
