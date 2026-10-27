/**
 * Modal de Lectura de Capturas / Fotos de Bambu Studio y OrcaSlicer
 * Permite subir una o varias fotos (múltiples placas), realizar OCR en el dispositivo,
 * revisar/corregir los datos antes de calcular y evitar doble conteo de material.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { extractTextFromImage, parseBambuStudioText, combineMultipleSlicerResults } from '../services/slicerParser';
import { formatHoursMinutes } from '../utils/formatters';

export default function BambuScannerModal({ visible, onClose, onApplyToCalculator, availableFilaments = [] }) {
  const [selectedImages, setSelectedImages] = useState([]); // [{ uri, name, status, parsedResult }]
  const [scanning, setScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

  // Datos consolidados para revisión y corrección
  const [reviewTimeHours, setReviewTimeHours] = useState('1');
  const [reviewTimeMinutes, setReviewTimeMinutes] = useState('45');
  const [reviewPlates, setReviewPlates] = useState('1');
  const [reviewFilaments, setReviewFilaments] = useState([
    { id: '1', name: 'Filamento 1', color: 'Negro', grams: '25.0', filamentId: availableFilaments[0]?.id || '' },
  ]);
  const [wasteModel, setWasteModel] = useState('20.0');
  const [wasteSupport, setWasteSupport] = useState('2.0');
  const [wasteFlush, setWasteFlush] = useState('3.0');
  const [wasteTower, setWasteTower] = useState('0.0');
  const [isTotalAlreadyIncludingWaste, setIsTotalAlreadyIncludingWaste] = useState(true);
  const [missingFieldsNotice, setMissingFieldsNotice] = useState([]);

  // Modo de entrada manual directa como alternativa
  const [manualMode, setManualMode] = useState(false);

  // Manejador de selección de imagen desde la web o móvil
  const handleSelectImage = (event) => {
    const files = event.target?.files;
    if (!files || files.length === 0) return;

    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        file,
        uri: url,
        name: file.name || `Captura ${selectedImages.length + i + 1}`,
        status: 'pending',
      });
    }

    setSelectedImages((prev) => [...prev, ...newImages]);
    processImagesBatch([...selectedImages, ...newImages]);
  };

  // Tomar foto con ImagePicker nativo
  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Se necesita permiso de cámara para tomar fotos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newImg = {
          uri: asset.uri,
          name: `Foto Cámara ${selectedImages.length + 1}`,
          status: 'pending',
        };
        setSelectedImages((prev) => [...prev, newImg]);
        processImagesBatch([...selectedImages, newImg]);
      }
    } catch (e) {
      console.error('Error al abrir cámara:', e);
    }
  };

  // Seleccionar de galería nativa
  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a las fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImgs = result.assets.map((asset, i) => ({
          uri: asset.uri,
          name: `Captura ${selectedImages.length + i + 1}`,
          status: 'pending',
        }));
        setSelectedImages((prev) => [...prev, ...newImgs]);
        processImagesBatch([...selectedImages, ...newImgs]);
      }
    } catch (e) {
      console.error('Error al abrir galería:', e);
    }
  };

  // Procesamiento por lote de imágenes
  const processImagesBatch = async (imagesList) => {
    if (!imagesList || imagesList.length === 0) return;
    setScanning(true);
    setScanProgress(0.1);
    setScanStatusText('Preparando imagen...');

    try {
      const parsedResults = [];

      for (let i = 0; i < imagesList.length; i++) {
        const item = imagesList[i];
        setScanStatusText(`Escaneando imagen ${i + 1} de ${imagesList.length} con OCR local...`);
        
        const rawText = await extractTextFromImage(item.file || item.uri, ({ status, progress }) => {
          setScanStatusText(status);
          setScanProgress(progress);
        });

        const parsed = parseBambuStudioText(rawText);
        parsedResults.push(parsed);
      }

      // Combinar los resultados de todas las capturas (por si hay varias placas)
      const combined = combineMultipleSlicerResults(parsedResults);

      // Poblar el formulario de revisión
      setReviewTimeHours(String(combined.time.hours || 0));
      setReviewTimeMinutes(String(combined.time.minutes || 0));
      setReviewPlates(String(combined.plates.totalPlates || imagesList.length));

      if (combined.filaments && combined.filaments.length > 0) {
        setReviewFilaments(
          combined.filaments.map((f, idx) => ({
            id: String(idx + 1),
            name: f.name || `Color ${idx + 1}`,
            color: f.color || 'Detectado',
            grams: String(f.grams || 0),
            filamentId: availableFilaments[idx % availableFilaments.length]?.id || availableFilaments[0]?.id || '',
          }))
        );
      } else if (combined.totalGrams > 0) {
        setReviewFilaments([
          {
            id: '1',
            name: 'Filamento Total',
            color: 'Detectado',
            grams: String(combined.totalGrams),
            filamentId: availableFilaments[0]?.id || '',
          },
        ]);
      }

      if (combined.wasteBreakdown?.hasBreakdown) {
        setWasteModel(String(combined.wasteBreakdown.modelGrams || 0));
        setWasteSupport(String(combined.wasteBreakdown.supportGrams || 0));
        setWasteFlush(String(combined.wasteBreakdown.flushGrams || 0));
        setWasteTower(String(combined.wasteBreakdown.towerGrams || 0));
      }

      setIsTotalAlreadyIncludingWaste(combined.isTotalAlreadyIncludingWaste);
      setMissingFieldsNotice(combined.missingFields || []);
      setScanning(false);
    } catch (error) {
      console.error('Error al escanear capturas:', error);
      setScanning(false);
      Alert.alert(
        'Ingreso Manual Recomendado',
        'No pudimos leer todos los datos de la captura automáticamente. Puedes ingresarlos directamente en el formulario.'
      );
      setManualMode(true);
    }
  };

  // Agregar fila de filamento
  const handleAddFilamentRow = () => {
    setReviewFilaments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: `Color ${prev.length + 1}`,
        color: 'Adicional',
        grams: '10.0',
        filamentId: availableFilaments[0]?.id || '',
      },
    ]);
  };

  // Remover fila de filamento
  const handleRemoveFilamentRow = (id) => {
    if (reviewFilaments.length <= 1) return;
    setReviewFilaments((prev) => prev.filter((item) => item.id !== id));
  };

  // Actualizar fila
  const handleUpdateFilamentRow = (id, field, value) => {
    setReviewFilaments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Cálculo total de gramos a usar
  const calculateFinalTotalGrams = () => {
    const sumColors = reviewFilaments.reduce((acc, f) => acc + (parseFloat(f.grams) || 0), 0);
    if (isTotalAlreadyIncludingWaste) {
      return sumColors;
    } else {
      const extraWaste = (parseFloat(wasteSupport) || 0) + (parseFloat(wasteFlush) || 0) + (parseFloat(wasteTower) || 0);
      return sumColors + extraWaste;
    }
  };

  // Aplicar datos verificados a la calculadora 3D
  const handleApply = () => {
    const hours = parseInt(reviewTimeHours, 10) || 0;
    const minutes = parseInt(reviewTimeMinutes, 10) || 0;
    const plates = parseInt(reviewPlates, 10) || 1;

    // Validación según regla: no inventar datos, requerir confirmación
    if (hours === 0 && minutes === 0) {
      Alert.alert('Tiempo requerido', 'Por favor ingresa el tiempo estimado de impresión.');
      return;
    }

    const validFilaments = reviewFilaments.map((f) => ({
      filamentId: f.filamentId,
      name: f.name,
      grams: parseFloat(f.grams) || 0,
    }));

    onApplyToCalculator({
      printHours: hours,
      printMinutes: minutes,
      platesCount: plates,
      filaments: validFilaments,
      totalGrams: calculateFinalTotalGrams(),
      wasteBreakdown: {
        model: parseFloat(wasteModel) || 0,
        support: parseFloat(wasteSupport) || 0,
        flush: parseFloat(wasteFlush) || 0,
        tower: parseFloat(wasteTower) || 0,
        alreadyIncluded: isTotalAlreadyIncludingWaste,
      },
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Encabezado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="close" size={26} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Lectura de Bambu Studio</Text>
            <Text style={styles.headerSubtitle}>Reconocimiento local y verificación de datos</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {/* Aviso de privacidad y costo cero */}
          <View style={styles.privacyBanner}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={styles.privacyText}>
              <Text style={{ fontWeight: 'bold' }}>100% Gratuito y Privado:</Text> El reconocimiento óptico (OCR) se realiza localmente en tu navegador. Tus fotos y datos nunca salen de tu celular o computador.
            </Text>
          </View>

          {/* Selector de Capturas / Fotos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Subir captura o tomar foto del resumen</Text>
            <Text style={styles.cardHint}>
              Toma una foto de la pantalla o sube una captura del resumen de Bambu Studio / OrcaSlicer (puedes subir varias si tienes varias placas).
            </Text>

            <View style={styles.uploadButtonsRow}>
              {Platform.OS === 'web' ? (
                <>
                  <label style={webUploadLabelStyle}>
                    <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                    <span>Tomar Foto / Cámara</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleSelectImage}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <label style={webUploadSecondaryLabelStyle}>
                    <Ionicons name="images" size={20} color="#4338ca" style={{ marginRight: 6 }} />
                    <span>Subir Captura</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSelectImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    style={[styles.primaryActionButton, { flex: 1 }]}
                    onPress={handleLaunchCamera}
                  >
                    <Ionicons name="camera" size={20} color="#ffffff" />
                    <Text style={styles.primaryActionButtonText}>Tomar Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryActionButton, { flex: 1 }]}
                    onPress={handleLaunchGallery}
                  >
                    <Ionicons name="images" size={20} color="#4338ca" />
                    <Text style={styles.secondaryActionButtonText}>Galería / Capturas</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Lista de imágenes cargadas */}
            {selectedImages.length > 0 && (
              <View style={styles.selectedImagesWrap}>
                <Text style={styles.selectedCountText}>
                  {selectedImages.length} {selectedImages.length === 1 ? 'captura subida' : 'capturas subidas'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbsScroll}>
                  {selectedImages.map((img, i) => (
                    <View key={i} style={styles.thumbBox}>
                      <Image
                        source={{ uri: img.uri }}
                        style={{ width: 80, height: 60, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                      <Text style={styles.thumbLabel} numberOfLines={1}>
                        Placa {i + 1}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Barra de progreso de escaneo */}
            {scanning && (
              <View style={styles.scanningWrap}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.scanningText}>{scanStatusText}</Text>
              </View>
            )}
          </View>

          {/* Alerta de datos no leídos (no inventar datos) */}
          {missingFieldsNotice.length > 0 && (
            <View style={styles.warningAlert}>
              <Ionicons name="alert-circle" size={22} color="#b45309" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Datos pendientes por ingresar</Text>
                <Text style={styles.warningText}>
                  No pudimos detectar con total certeza: {missingFieldsNotice.join(', ')}. Por favor revísalos e ingrésalos en el formulario a continuación.
                </Text>
              </View>
            </View>
          )}

          {/* Formulario de Revisión y Corrección de Datos */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>2. Revisar y Corregir Datos Reconocidos</Text>
              <TouchableOpacity
                onPress={() => setManualMode(!manualMode)}
                style={styles.textButton}
              >
                <Text style={styles.textButtonLabel}>
                  {manualMode ? 'Ocultar extras' : 'Ingreso manual detallado'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardHint}>
              Verifica los valores extraídos antes de aplicarlos. Todo es 100% editable.
            </Text>

            {/* Fila Tiempo y Placas */}
            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Tiempo de Impresión</Text>
                <View style={styles.timeInputsRow}>
                  <View style={styles.timeInputBox}>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="numeric"
                      value={reviewTimeHours}
                      onChangeText={setReviewTimeHours}
                      placeholder="0"
                    />
                    <Text style={styles.timeUnit}>h</Text>
                  </View>
                  <View style={styles.timeInputBox}>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="numeric"
                      value={reviewTimeMinutes}
                      onChangeText={setReviewTimeMinutes}
                      placeholder="0"
                    />
                    <Text style={styles.timeUnit}>m</Text>
                  </View>
                </View>
              </View>

              <View style={styles.col}>
                <Text style={styles.inputLabel}>Número de Placas</Text>
                <View style={styles.plateInputBox}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    value={reviewPlates}
                    onChangeText={setReviewPlates}
                    placeholder="1"
                  />
                  <Text style={styles.timeUnit}>placas</Text>
                </View>
              </View>
            </View>

            {/* Filamentos por Color en Gramos */}
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Text style={styles.subSectionTitle}>Filamento por Color (Gramos)</Text>
                <TouchableOpacity onPress={handleAddFilamentRow} style={styles.addRowButton}>
                  <Ionicons name="add-circle" size={18} color="#4f46e5" />
                  <Text style={styles.addRowButtonText}>Agregar Color</Text>
                </TouchableOpacity>
              </View>

              {reviewFilaments.map((item, index) => (
                <View key={item.id} style={styles.filamentEditRow}>
                  <View style={styles.filamentColorBadge}>
                    <Text style={styles.filamentColorNumber}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <Text style={styles.miniLabel}>Nombre / Color</Text>
                    <TextInput
                      style={styles.miniInput}
                      value={item.name}
                      onChangeText={(val) => handleUpdateFilamentRow(item.id, 'name', val)}
                      placeholder="Ej: Negro, Dorado..."
                    />
                  </View>
                  <View style={{ flex: 1.5, marginRight: 8 }}>
                    <Text style={styles.miniLabel}>Gramos (g)</Text>
                    <TextInput
                      style={styles.miniInputNumber}
                      keyboardType="numeric"
                      value={item.grams}
                      onChangeText={(val) => handleUpdateFilamentRow(item.id, 'grams', val)}
                      placeholder="0.0"
                    />
                  </View>
                  {reviewFilaments.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveFilamentRow(item.id)}
                      style={styles.removeRowButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Regla Anti-Doble Conteo */}
            <View style={styles.antiDoubleCountCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.switchTitle}>Evitar conteo doble de material</Text>
                  <Text style={styles.switchSubtitle}>
                    {isTotalAlreadyIncludingWaste
                      ? 'Activado: Los gramos por color arriba YA incluyen purga, soportes y torre.'
                      : 'Desactivado: Los soportes y purga se sumarán adicionalmente a los colores.'}
                  </Text>
                </View>
                <Switch
                  value={isTotalAlreadyIncludingWaste}
                  onValueChange={setIsTotalAlreadyIncludingWaste}
                  trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                  thumbColor={isTotalAlreadyIncludingWaste ? '#4f46e5' : '#f8fafc'}
                />
              </View>

              {/* Detalle opcional de soportes y purga */}
              {(manualMode || !isTotalAlreadyIncludingWaste) && (
                <View style={styles.wasteDetailGrid}>
                  <View style={styles.wasteCol}>
                    <Text style={styles.miniLabel}>Soportes (g)</Text>
                    <TextInput
                      style={styles.miniInputNumber}
                      value={wasteSupport}
                      onChangeText={setWasteSupport}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.wasteCol}>
                    <Text style={styles.miniLabel}>Purga / Flush (g)</Text>
                    <TextInput
                      style={styles.miniInputNumber}
                      value={wasteFlush}
                      onChangeText={setWasteFlush}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.wasteCol}>
                    <Text style={styles.miniLabel}>Torre (g)</Text>
                    <TextInput
                      style={styles.miniInputNumber}
                      value={wasteTower}
                      onChangeText={setWasteTower}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Resumen Final Verificado */}
            <View style={styles.totalBadgeBox}>
              <Text style={styles.totalBadgeLabel}>Total a calcular:</Text>
              <Text style={styles.totalBadgeValue}>
                {calculateFinalTotalGrams().toFixed(1)} g en {formatHoursMinutes(reviewTimeHours, reviewTimeMinutes)} ({reviewPlates} {parseInt(reviewPlates, 10) === 1 ? 'placa' : 'placas'})
              </Text>
            </View>

            {/* Botón de Aplicar */}
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Ionicons name="calculator-outline" size={22} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.applyButtonText}>Confirmar y Aplicar a Calculadora 3D</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const webUploadLabelStyle = {
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  padding: '12px 18px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  flex: 1,
  textAlign: 'center',
  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
};

const webUploadSecondaryLabelStyle = {
  backgroundColor: '#eef2ff',
  color: '#4338ca',
  padding: '12px 18px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  flex: 1,
  textAlign: 'center',
  border: '1px solid #c7d2fe',
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  secondaryActionButtonText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedImagesWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  thumbsScroll: {
    flexDirection: 'row',
  },
  thumbBox: {
    marginRight: 10,
    alignItems: 'center',
  },
  thumbLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    maxWidth: 80,
  },
  scanningWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 10,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
  },
  scanningText: {
    fontSize: 13,
    color: '#6d28d9',
    fontWeight: '500',
  },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textButtonLabel: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  plateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  timeInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  timeUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  subSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addRowButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  filamentEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filamentColorBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filamentColorNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  miniLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  miniInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
  },
  miniInputNumber: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  removeRowButton: {
    padding: 6,
  },
  antiDoubleCountCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  wasteDetailGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  wasteCol: {
    flex: 1,
  },
  totalBadgeBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  totalBadgeLabel: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '600',
  },
  totalBadgeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#312e81',
    marginTop: 2,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
