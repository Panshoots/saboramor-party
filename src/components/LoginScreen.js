import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function LoginScreen({ onLoginSuccess }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    setError("");
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError("Por favor ingresa tu usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      // Credenciales requeridas: admin / app2026
      if (cleanUser === "admin" && cleanPass === "app2026") {
        if (rememberMe) {
          await AsyncStorage.setItem("epl_session_remembered", "true");
        } else {
          await AsyncStorage.removeItem("epl_session_remembered");
        }
        onLoginSuccess();
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    } catch (e) {
      setError("Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={36} color={theme.primary} />
          </View>
          <Text style={styles.brandTitle}>
            EPL <Text style={{ color: theme.primary }}>TRIATLÓN</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            Acceso de Administrador
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.instructions}>
            Ingresa tus credenciales de coach para gestionar atletas, finanzas, planes y cargas de entrenamiento.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.error} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <Text style={styles.fieldLabel}>Usuario</Text>
          <View style={[
            styles.inputContainer,
            userFocused ? styles.inputFocused : null
          ]}>
            <Ionicons 
              name="person-outline" 
              size={18} 
              color={userFocused ? theme.primary : theme.textMuted} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu usuario"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              onFocus={() => setUserFocused(true)}
              onBlur={() => setUserFocused(false)}
            />
          </View>

          {/* Password Field */}
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={[
            styles.inputContainer,
            passFocused ? styles.inputFocused : null
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={18} 
              color={passFocused ? theme.primary : theme.textMuted} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Remember Account Option */}
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.rememberRow} 
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Recordar cuenta (mantener sesión iniciada)</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.btnSubmit}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnSubmitText}>Ingresar al Sistema</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>EPL Triatlón Chile • App de Gestión Deportiva</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 10,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    color: theme.text,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 22,
    padding: 22,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 16,
    elevation: 4,
  },
  instructions: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
    marginBottom: 18,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.errorBg,
    borderColor: theme.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: theme.error,
    fontWeight: "600",
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.surfaceSecondary,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: theme.text,
  },
  eyeBtn: {
    padding: 6,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  rememberText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  btnSubmit: {
    flexDirection: "row",
    backgroundColor: theme.primary,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  btnSubmitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 11,
    fontWeight: "600",
    color: theme.textMuted,
  },
});
