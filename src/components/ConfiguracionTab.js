import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useTheme } from '../theme/ThemeContext';
import { subscribeToSystemConfig } from '../services/firebase';
import { useEffect } from 'react';

export default function ConfiguracionTab({ onLogout, onWipeData }) {
  const { theme, isDark, themeMode, setTheme } = useTheme();
  const styles = getStyles(theme);

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [dangerZoneEnabled, setDangerZoneEnabled] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSystemConfig((cfg) => {
      if (cfg && cfg.dangerZoneEnabled === true) {
        setDangerZoneEnabled(true);
      } else {
        setDangerZoneEnabled(false);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [isOldFocused, setIsOldFocused] = useState(false);
  const [isNewFocused, setIsNewFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);

  const handleCheckUpdates = async () => {
    if (Platform.OS === 'web' || __DEV__) {
      Alert.alert('Actualizaciones', 'En modo Web/Desarrollo las actualizaciones son en tiempo real.');
      return;
    }
    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Nueva Versión Encontrada', 'Descargando e instalando actualización automática...');
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        Alert.alert('Al día', 'Tienes instalada la última versión disponible de la aplicación.');
      }
    } catch (e) {
      Alert.alert('Actualizaciones', 'No se pudo conectar al servidor de actualizaciones.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const saveSecureItem = async (key, value) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      await AsyncStorage.setItem(key, value);
    }
  };

  const getSecureItem = async (key) => {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        return await SecureStore.getItemAsync(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (e) {
      return await AsyncStorage.getItem(key);
    }
  };

  const handleChangePasscode = async () => {
    setError('');
    setSuccess('');

    if (!oldPass || !newPass || !confirmPass) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (newPass.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    try {
      const storedPass = await getSecureItem('app_passcode');
      const currentStored = storedPass || 'admin';

      if (oldPass !== currentStored) {
        setError('La contraseña actual es incorrecta.');
        return;
      }

      await saveSecureItem('app_passcode', newPass);
      setSuccess('¡Contraseña actualizada con éxito!');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e) {
      setError('Error al actualizar la contraseña.');
    }
  };

  const handleWipeDatabase = () => {
    const performWipe = () => {
      onWipeData();
      Alert.alert('Datos borrados', 'Toda la información del dispositivo ha sido eliminada.');
    };

    if (Platform.OS === 'web') {
      if (confirm('¡ATENCIÓN! Esto borrará permanentemente todos los atletas, cobros y planes de entrenamiento. ¿Deseas continuar?')) {
        performWipe();
      }
    } else {
      Alert.alert(
        '¡PELIGRO: Borrar Base de Datos!',
        'Esto eliminará de forma permanente a todos los deportistas, cobros y planes de entrenamiento. Esta acción es irreversible.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'SÍ, BORRAR TODO', onPress: performWipe, style: 'destructive' }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      <Text style={styles.sectionTitle}>Apariencia</Text>
      
      {/* Theme selector card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Tema de la Aplicación</Text>
        <Text style={styles.themeDesc}>Elige cómo deseas visualizar la interfaz gráfica de EPL Triatlón.</Text>
        
        <View style={styles.themeSelectorGrid}>
          {/* Light option */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.themeSelectorBtn,
              themeMode === 'light' ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
            ]}
            onPress={() => setTheme('light')}
          >
            <Ionicons name="sunny-outline" size={16} color={themeMode === 'light' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.themeSelectorText, { color: themeMode === 'light' ? '#fff' : theme.textSecondary }]}>
              Claro
            </Text>
          </TouchableOpacity>

          {/* Dark option */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.themeSelectorBtn,
              themeMode === 'dark' ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
            ]}
            onPress={() => setTheme('dark')}
          >
            <Ionicons name="moon-outline" size={16} color={themeMode === 'dark' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.themeSelectorText, { color: themeMode === 'dark' ? '#fff' : theme.textSecondary }]}>
              Oscuro
            </Text>
          </TouchableOpacity>

          {/* System option */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.themeSelectorBtn,
              themeMode === 'system' ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
            ]}
            onPress={() => setTheme('system')}
          >
            <Ionicons name="cog-outline" size={16} color={themeMode === 'system' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.themeSelectorText, { color: themeMode === 'system' ? '#fff' : theme.textSecondary }]}>
              Sistema
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Seguridad</Text>
      
      {/* Change Password Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Cambiar Contraseña de Acceso</Text>
        
        {error ? (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.error} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} style={{ marginRight: 6 }} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contraseña Actual</Text>
          <TextInput
            style={[styles.input, isOldFocused ? styles.inputFocused : null]}
            secureTextEntry
            value={oldPass}
            onChangeText={setOldPass}
            placeholder="Ingresa clave actual"
            placeholderTextColor={theme.textMuted}
            onFocus={() => setIsOldFocused(true)}
            onBlur={() => setIsOldFocused(false)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nueva Contraseña</Text>
          <TextInput
            style={[styles.input, isNewFocused ? styles.inputFocused : null]}
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Mínimo 4 caracteres"
            placeholderTextColor={theme.textMuted}
            onFocus={() => setIsNewFocused(true)}
            onBlur={() => setIsNewFocused(false)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
          <TextInput
            style={[styles.input, isConfirmFocused ? styles.inputFocused : null]}
            secureTextEntry
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Confirma clave nueva"
            placeholderTextColor={theme.textMuted}
            onFocus={() => setIsConfirmFocused(true)}
            onBlur={() => setIsConfirmFocused(false)}
          />
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.btnSave} onPress={handleChangePasscode}>
          <Text style={styles.btnSaveText}>Actualizar Contraseña</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Acciones de Sistema</Text>
      
      {/* System actions Card */}
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.85} style={styles.btnLogout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={theme.textSecondary} style={styles.btnIcon} />
          <Text style={[styles.btnText, { color: theme.textSecondary }]}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.dangerTitle}>Zona de Peligro</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: dangerZoneEnabled ? 'rgba(239, 68, 68, 0.15)' : theme.surfaceSecondary, borderWidth: 1, borderColor: dangerZoneEnabled ? theme.error : theme.border }}>
            <Ionicons name={dangerZoneEnabled ? "lock-open-outline" : "lock-closed"} size={12} color={dangerZoneEnabled ? theme.error : theme.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: dangerZoneEnabled ? theme.error : theme.textMuted, textTransform: 'uppercase' }}>
              {dangerZoneEnabled ? 'Habilitada' : 'Bloqueada'}
            </Text>
          </View>
        </View>

        {dangerZoneEnabled ? (
          <>
            <Text style={styles.dangerDesc}>
              ⚠️ ATENCIÓN: Esta acción borrará de forma permanente todas las mensualidades, atletas de biblioteca y planes de entrenamiento.
            </Text>
            <TouchableOpacity activeOpacity={0.85} style={styles.btnWipe} onPress={handleWipeDatabase}>
              <Ionicons name="trash-outline" size={18} color="#fff" style={styles.btnIcon} />
              <Text style={styles.btnText}>Restablecer Base de Datos</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.dangerDesc, { color: theme.textMuted }]}>
              🔒 Sección bloqueada por seguridad. Para habilitarla desde Firebase Firestore, establece el campo <Text style={{ fontWeight: '800', color: theme.primary }}>dangerZoneEnabled: true</Text> en el documento <Text style={{ fontWeight: '800' }}>configuracion/sistema</Text>.
            </Text>
            <TouchableOpacity 
              activeOpacity={0.5} 
              style={[styles.btnWipe, { backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border, opacity: 0.5 }]} 
              disabled={true}
            >
              <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.btnIcon} />
              <Text style={[styles.btnText, { color: theme.textMuted }]}>Restablecer Bloqueado</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Actualizaciones</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Ionicons name="cloud-done" size={20} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '750', color: theme.text }}>Actualizaciones Automáticas</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>Activadas vía EAS Cloud (OTA)</Text>
          </View>
        </View>
        
        <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 16, marginBottom: 14 }}>
          La app busca y aplica mejoras y correcciones automáticamente cada vez que la abres, sin necesidad de reinstalar archivos APK.
        </Text>

        <TouchableOpacity 
          activeOpacity={0.8} 
          style={{ 
            flexDirection: 'row', 
            height: 42, 
            borderRadius: 12, 
            backgroundColor: theme.primary, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }} 
          onPress={handleCheckUpdates}
          disabled={checkingUpdate}
        >
          <Ionicons name="sync-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '750' }}>
            {checkingUpdate ? 'Buscando actualizaciones...' : 'Buscar Actualización Ahora'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Acerca de la App</Text>
      
      {/* About App Card */}
      <View style={[styles.card, styles.aboutCard]}>
        <View style={styles.aboutBadge}>
          <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
        </View>
        <Text style={styles.aboutTitle}>EPL Triatlón Chile</Text>
        <Text style={styles.aboutVersion}>Versión Móvil 1.0 Beta</Text>
        <Text style={styles.aboutDesc}>
          Aplicación móvil oficial diseñada para la planificación avanzada de macrociclos cronológicos, gestión de zonas de entrenamiento, control de competencias y registro administrativo de mensualidades para atletas del club.
        </Text>
        <Text style={styles.aboutCopyright}>EPL Triatlón Chile © 2026</Text>
      </View>
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
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
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
    padding: 18,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 14,
    fontWeight: '500',
  },
  themeSelectorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  themeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  themeSelectorText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.errorBg,
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: theme.error,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.successBg,
    borderWidth: 1,
    borderColor: theme.success,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  btnSave: {
    backgroundColor: theme.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  btnLogout: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnWipe: {
    flexDirection: 'row',
    backgroundColor: theme.error,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnIcon: {
    marginRight: 6,
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 18,
  },
  dangerTitle: {
    color: theme.error,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dangerDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  aboutBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 11,
    color: theme.primary,
    marginBottom: 14,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  aboutDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  aboutCopyright: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
