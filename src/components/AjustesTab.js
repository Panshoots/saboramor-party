/**
 * Pestaña de Ajustes y Configuración de SaborAmor Party
 * Parámetros de taller, respaldo de datos (export/import JSON), privacidad y políticas.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCLP } from '../utils/formatters';
import { generateBackupJSON, downloadFile, INITIAL_DATA } from '../services/storage';

export default function AjustesTab({ appData, onUpdateData, onResetAllData }) {
  const settings = appData.settings || {};

  const [printerWatts, setPrinterWatts] = useState(String(settings.printerPowerWatts || 120));
  const [kwhPrice, setKwhPrice] = useState(String(settings.electricityKwhPrice || 175));
  const [wearPerHour, setWearPerHour] = useState(String(settings.wearMaintenancePerHour || 300));
  const [laborHourlyRate, setLaborHourlyRate] = useState(String(settings.laborHourlyRate || 5000));
  const [defaultMargin, setDefaultMargin] = useState(String(settings.defaultTargetMargin || 45));
  const [failureReserve, setFailureReserve] = useState(String(settings.defaultFailureReservePercent || 8));
  const [taxVat, setTaxVat] = useState(String(settings.taxVatPercent || 19));
  const [paymentFee, setPaymentFee] = useState(String(settings.paymentFeePercent || 2.5));

  // Guardar configuración
  const handleSaveSettings = () => {
    const updatedSettings = {
      ...settings,
      printerPowerWatts: parseFloat(printerWatts) || 120,
      electricityKwhPrice: parseFloat(kwhPrice) || 175,
      wearMaintenancePerHour: parseFloat(wearPerHour) || 300,
      laborHourlyRate: parseFloat(laborHourlyRate) || 5000,
      defaultTargetMargin: parseFloat(defaultMargin) || 45,
      defaultFailureReservePercent: parseFloat(failureReserve) || 8,
      taxVatPercent: parseFloat(taxVat) || 19,
      paymentFeePercent: parseFloat(paymentFee) || 2.5,
    };

    onUpdateData({ settings: updatedSettings });
    Alert.alert('Ajustes Guardados', 'Los parámetros de taller se han actualizado correctamente.');
  };

  // Descargar respaldo JSON
  const handleExportBackup = () => {
    const jsonStr = generateBackupJSON(appData);
    const fileName = `SaborAmor_Respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(jsonStr, fileName, 'application/json');
  };

  // Restaurar respaldo JSON
  const handleImportBackup = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.filaments && parsed.settings) {
          onUpdateData(parsed);
          Alert.alert('Respaldo Restaurado', 'Tus materiales, productos e historial se restauraron con éxito.');
        } else {
          Alert.alert('Archivo Inválido', 'El archivo no contiene un respaldo válido de SaborAmor Party.');
        }
      } catch (err) {
        Alert.alert('Error', 'No se pudo leer el archivo JSON seleccionado.');
      }
    };
    reader.readAsText(file);
  };

  // Restaurar datos de fábrica
  const handleFactoryReset = () => {
    Alert.alert(
      'Restablecer Valores Iniciales',
      '¿Deseas restablecer los materiales e insumos a los valores de ejemplo iniciales (Rollo PLA 1kg $16.000, etc.)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            onResetAllData();
            Alert.alert('Listo', 'Valores de ejemplo restablecidos.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Sección Parámetros de Taller */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="construct" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Parámetros de Taller y Máquina</Text>
        </View>

        <View style={styles.twoCols}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Potencia Promedio Impresora (Watts)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={printerWatts}
              onChangeText={setPrinterWatts}
              placeholder="120"
            />
            <Text style={styles.hint}>Bambu A1 / P1S promedian ~120W</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Tarifa Eléctrica ($ CLP / kWh)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={kwhPrice}
              onChangeText={setKwhPrice}
              placeholder="175"
            />
            <Text style={styles.hint}>Promedio Chile: $160 - $190 / kWh</Text>
          </View>
        </View>

        <View style={styles.twoCols}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Desgaste y Mantenimiento ($ CLP / hora)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={wearPerHour}
              onChangeText={setWearPerHour}
              placeholder="300"
            />
            <Text style={styles.hint}>Boquilla, lubricante, correas</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Valor Hora de Mano de Obra (CLP)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={laborHourlyRate}
              onChangeText={setLaborHourlyRate}
              placeholder="5000"
            />
            <Text style={styles.hint}>Para armado, limpieza y postproceso</Text>
          </View>
        </View>

        <View style={styles.twoCols}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Margen Objetivo por Defecto (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={defaultMargin}
              onChangeText={setDefaultMargin}
              placeholder="45"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Reserva por Fallos (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={failureReserve}
              onChangeText={setFailureReserve}
              placeholder="8"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveSettingsBtn} onPress={handleSaveSettings}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.saveSettingsBtnText}>Guardar Parámetros</Text>
        </TouchableOpacity>
      </View>

      {/* Respaldo y Copias de Seguridad */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cloud-upload" size={20} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Respaldo y Seguridad de Datos</Text>
        </View>
        <Text style={styles.cardDesc}>
          Exporta todos tus insumos, fichas de producto e historial en un archivo descargable JSON para tener copias de seguridad o transferirlo a otro celular o computador.
        </Text>

        <View style={styles.backupButtonsRow}>
          <TouchableOpacity style={styles.backupBtn} onPress={handleExportBackup}>
            <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.backupBtnText}>Descargar Respaldo JSON</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <label style={webImportLabelStyle}>
              <Ionicons name="folder-open-outline" size={18} color="#4338ca" style={{ marginRight: 6 }} />
              <span>Restaurar Archivo JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </View>
      </View>

      {/* Explicación de Privacidad y Funcionamiento OCR */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Protección de Datos y Lectura de Fotos</Text>
        </View>

        <View style={styles.infoPoint}>
          <Text style={styles.infoPointTitle}>🔒 ¿Dónde se guardan mis datos?</Text>
          <Text style={styles.infoPointBody}>
            Todos tus costos, lista de materiales, productos y trabajos se guardan de forma <Text style={{ fontWeight: 'bold' }}>100% local en la memoria de tu navegador y celular</Text>. No usamos servidores externos para almacenar tu información privada de negocio.
          </Text>
        </View>

        <View style={styles.infoPoint}>
          <Text style={styles.infoPointTitle}>📷 ¿Cómo funciona el escaneo de fotos?</Text>
          <Text style={styles.infoPointBody}>
            El reconocimiento de capturas de Bambu Studio utiliza <Text style={{ fontWeight: 'bold' }}>Tesseract OCR WebAssembly</Text> procesado dentro de tu propio equipo. Es <Text style={{ fontWeight: 'bold' }}>completamente gratuito, sin límite de fotos y sin enviar tus imágenes a internet</Text>. Si alguna captura está borrosa o le falta algún dato, la aplicación te solicitará ingresarlo manualmente para garantizar precisión exacta.
          </Text>
        </View>

        <View style={styles.infoPoint}>
          <Text style={styles.infoPointTitle}>🇨🇱 Moneda y Fórmulas</Text>
          <Text style={styles.infoPointBody}>
            Todos los cálculos están optimizados para el Peso Chileno (CLP), respetando márgenes sobre el precio de venta final y distinguiendo costos estimados de costos reales.
          </Text>
        </View>

        {/* Botón de restablecer */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleFactoryReset}>
          <Ionicons name="refresh-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.resetBtnText}>Restablecer Datos de Ejemplo Iniciales</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const webImportLabelStyle = {
  backgroundColor: '#eef2ff',
  color: '#4338ca',
  padding: '12px 16px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '13px',
  border: '1px solid #c7d2fe',
  flex: 1,
  textAlign: 'center',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inner: {
    padding: 14,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  twoCols: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  saveSettingsBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backupBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  infoPoint: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoPointTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoPointBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});
