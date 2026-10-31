/**
 * Modal de Lectura y Desglose de Bambu Studio / OrcaSlicer
 * Con desglose detallado de Placas (Placa 1, Placa 2, Placa 3...)
 * Suma automática de tiempos y gramos en vivo y prevención de doble conteo.
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
  const [selectedImages, setSelectedImages] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

  // Modo de visualización: 'plates' (Desglose por Placas) | 'colors' (Por Color de Filamento)
  const [viewMode, setViewMode] = useState('plates');

  // Lista de Placas detectadas/editables
  const [platesList, setPlatesList] = useState([
    { id: 'p-1', plateNumber: 1, name: 'Placa 1', hours: 1, minutes: 20, grams: 45.0 },
    { id: 'p-2', plateNumber: 2, name: 'Placa 2', hours: 0, minutes: 55, grams: 32.5 },
    { id: 'p-3', plateNumber: 3, name: 'Placa 3', hours: 1, minutes: 10, grams: 28.0 },
  ]);

  // Colores / Ranuras detectados
  const [reviewFilaments, setReviewFilaments] = useState([
    { id: '1', name: 'Color Principal', color: 'Negro', grams: '105.5', filamentId: availableFilaments[0]?.id || '' },
  ]);

  const [wasteModel, setWasteModel] = useState('95.0');
  const [wasteSupport, setWasteSupport] = useState('5.0');
  const [wasteFlush, setWasteFlush] = useState('5.5');
  const [wasteTower, setWasteTower] = useState('0.0');
  const [isTotalAlreadyIncludingWaste, setIsTotalAlreadyIncludingWaste] = useState(true);
  const [missingFieldsNotice, setMissingFieldsNotice] = useState([]);

  // Cálculos automáticos sumados de las placas
  const calculateTotalMinutesFromPlates = () => {
    return platesList.reduce((acc, p) => acc + ((parseInt(p.hours, 10) || 0) * 60) + (parseInt(p.minutes, 10) || 0), 0);
  };

  const calculateTotalGramsFromPlates = () => {
    return platesList.reduce((acc, p) => acc + (parseFloat(p.grams) || 0), 0);
  };

  const totalMins = calculateTotalMinutesFromPlates();
  const totalHoursCombined = Math.floor(totalMins / 60);
  const totalMinsRemainder = totalMins % 60;
  const totalGramsFromPlatesCombined = calculateTotalGramsFromPlates();

  // Acciones en la lista de placas
  const handleAddPlate = () => {
    const nextNum = platesList.length + 1;
    setPlatesList((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        plateNumber: nextNum,
        name: `Placa ${nextNum}`,
        hours: 0,
        minutes: 30,
        grams: 20.0,
      },
    ]);
  };

  const handleRemovePlate = (id) => {
    if (platesList.length <= 1) return;
    setPlatesList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePlate = (id, field, value) => {
    setPlatesList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Manejador de selección de imagen desde la web
  const handleSelectImageWeb = (event) => {
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
        Alert.alert('Permiso necesario', 'Se necesita permiso de cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newImg = { uri: asset.uri, name: `Foto ${selectedImages.length + 1}` };
        setSelectedImages((prev) => [...prev, newImg]);
        processImagesBatch([...selectedImages, newImg]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Galería nativa
  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.85 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImgs = result.assets.map((asset, i) => ({
          uri: asset.uri,
          name: `Captura ${selectedImages.length + i + 1}`,
        }));
        setSelectedImages((prev) => [...prev, ...newImgs]);
        processImagesBatch([...selectedImages, ...newImgs]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Procesamiento por lote de imágenes
  const processImagesBatch = async (imagesList) => {
    if (!imagesList || imagesList.length === 0) return;
    setScanning(true);
    setScanProgress(0.1);
    setScanStatusText('Iniciando lectura OCR...');

    try {
      const parsedResults = [];

      for (let i = 0; i < imagesList.length; i++) {
        const item = imagesList[i];
        setScanStatusText(`Leyendo imagen ${i + 1} de ${imagesList.length}...`);
        
        const rawText = await extractTextFromImage(item.file || item.uri, ({ status, progress }) => {
          setScanStatusText(status);
          setScanProgress(progress);
        });

        const parsed = parseBambuStudioText(rawText);
        parsedResults.push(parsed);
      }

      const combined = combineMultipleSlicerResults(parsedResults);

      // Si detectó placas individuales
      if (combined.platesList && combined.platesList.length > 0) {
        setPlatesList(combined.platesList);
      } else if (combined.platesCount > 1) {
        const generated = [];
        const perPlateGrams = Number((combined.totalGrams / combined.platesCount).toFixed(1));
        const totalMinsCombined = (combined.time.hours * 60) + combined.time.minutes;
        const perPlateMins = Math.floor(totalMinsCombined / combined.platesCount);

        for (let i = 1; i <= combined.platesCount; i++) {
          generated.push({
            id: `p-${i}`,
            plateNumber: i,
            name: `Placa ${i}`,
            hours: Math.floor(perPlateMins / 60),
            minutes: perPlateMins % 60,
            grams: perPlateGrams,
          });
        }
        setPlatesList(generated);
      } else {
        setPlatesList([
          {
            id: 'p-1',
            plateNumber: 1,
            name: 'Placa 1',
            hours: combined.time.hours || 1,
            minutes: combined.time.minutes || 0,
            grams: combined.totalGrams || 50,
          },
        ]);
      }

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
      }

      setIsTotalAlreadyIncludingWaste(combined.isTotalAlreadyIncludingWaste);
      setMissingFieldsNotice(combined.missingFields || []);
      setScanning(false);
    } catch (error) {
      console.error(error);
      setScanning(false);
      Alert.alert('Aviso', 'Puedes ingresar o ajustar las placas manualmente a continuación.');
    }
  };

  // Aplicar datos a la calculadora principal
  const handleApply = () => {
    const finalGrams = totalGramsFromPlatesCombined > 0 ? totalGramsFromPlatesCombined : 10;
    const finalHours = totalHoursCombined;
    const finalMinutes = totalMinsRemainder;
    const totalPlatesCount = platesList.length;

    // Distribuir filamentos acorde a los gramos totales de las placas
    let validFilaments = [];
    if (reviewFilaments.length <= 1) {
      // 1 solo color: toma exactamente el total de gramos de todas las placas sumadas
      validFilaments = [
        {
          filamentId: reviewFilaments[0]?.filamentId || availableFilaments[0]?.id || '',
          name: reviewFilaments[0]?.name || 'PLA Principal',
          grams: finalGrams,
        },
      ];
    } else {
      // Varios colores: verificar si los colores suman algo válido
      const sumReview = reviewFilaments.reduce((acc, f) => acc + (parseFloat(f.grams) || 0), 0);
      if (sumReview > 0) {
        // Escalar proporcionalmente o usar los valores directos
        validFilaments = reviewFilaments.map((f) => ({
          filamentId: f.filamentId,
          name: f.name,
          grams: parseFloat(f.grams) || Number((finalGrams / reviewFilaments.length).toFixed(1)),
        }));
      } else {
        // Repartir equitativamente entre los colores
        const perColor = Number((finalGrams / reviewFilaments.length).toFixed(1));
        validFilaments = reviewFilaments.map((f) => ({
          filamentId: f.filamentId,
          name: f.name,
          grams: perColor,
        }));
      }
    }

    onApplyToCalculator({
      printHours: finalHours,
      printMinutes: finalMinutes,
      platesCount: totalPlatesCount,
      filaments: validFilaments,
      totalGrams: finalGrams,
      platesDetail: platesList,
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
            <Text style={styles.headerSubtitle}>Desglose y verificación de múltiples placas</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {/* Subir foto o capturas */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Subir captura o foto del laminador</Text>
            <Text style={styles.cardHint}>
              Sube la foto del resumen de Bambu Studio. Si tu trabajo tiene varias placas, la aplicación leerá cada una o puedes agregarlas abajo.
            </Text>

            <View style={styles.uploadButtonsRow}>
              {Platform.OS === 'web' ? (
                <>
                  <label style={webUploadLabelStyle}>
                    <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                    <span>Tomar Foto con Cámara</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleSelectImageWeb}
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
                      onChange={handleSelectImageWeb}
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
                    <Text style={styles.secondaryActionButtonText}>Galería</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Miniaturas de imágenes */}
            {selectedImages.length > 0 && (
              <View style={styles.selectedImagesWrap}>
                <Text style={styles.selectedCountText}>
                  {selectedImages.length} {selectedImages.length === 1 ? 'captura subida' : 'capturas subidas'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((img, i) => (
                    <View key={i} style={styles.thumbBox}>
                      <Image source={{ uri: img.uri }} style={{ width: 80, height: 60, borderRadius: 6 }} />
                      <Text style={styles.thumbLabel}>Foto {i + 1}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {scanning && (
              <View style={styles.scanningWrap}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.scanningText}>{scanStatusText}</Text>
              </View>
            )}
          </View>

          {/* Selector de Modo: Placas vs Filamentos */}
          <View style={styles.viewModeSelector}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'plates' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('plates')}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={viewMode === 'plates' ? '#4f46e5' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.viewModeBtnText, viewMode === 'plates' && styles.viewModeBtnTextActive]}>
                Desglose por Placas ({platesList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'colors' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('colors')}
            >
              <Ionicons
                name="color-palette-outline"
                size={16}
                color={viewMode === 'colors' ? '#4f46e5' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.viewModeBtnText, viewMode === 'colors' && styles.viewModeBtnTextActive]}>
                Colores / Material ({reviewFilaments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* SECCIÓN 1: DESGLOSE POR PLACAS */}
          {viewMode === 'plates' ? (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.cardTitle}>2. Placas del Trabajo</Text>
                  <Text style={styles.cardHint}>
                    Verifica el tiempo y los gramos de cada placa. La app suma todo automáticamente sin duplicar.
                  </Text>
                </View>
                <TouchableOpacity onPress={handleAddPlate} style={styles.addPlateBtn}>
                  <Ionicons name="add-circle" size={18} color="#4f46e5" />
                  <Text style={styles.addPlateBtnText}>+ Agregar Placa</Text>
                </TouchableOpacity>
              </View>

              {platesList.map((plate, index) => (
                <View key={plate.id} style={styles.plateRowCard}>
                  <View style={styles.plateHeaderRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>Placa #{index + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.plateNameInput}
                      value={plate.name}
                      onChangeText={(val) => handleUpdatePlate(plate.id, 'name', val)}
                      placeholder="Nombre de placa..."
                    />
                    {platesList.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemovePlate(plate.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.plateInputsGrid}>
                    <View style={styles.plateInputItem}>
                      <Text style={styles.miniLabel}>Tiempo de esta placa</Text>
                      <View style={styles.timeInputsRow}>
                        <View style={styles.miniTimeBox}>
                          <TextInput
                            style={styles.timeInput}
                            keyboardType="numeric"
                            value={String(plate.hours)}
                            onChangeText={(val) => handleUpdatePlate(plate.id, 'hours', parseInt(val, 10) || 0)}
                            placeholder="0"
                          />
                          <Text style={styles.timeUnit}>h</Text>
                        </View>
                        <View style={styles.miniTimeBox}>
                          <TextInput
                            style={styles.timeInput}
                            keyboardType="numeric"
                            value={String(plate.minutes)}
                            onChangeText={(val) => handleUpdatePlate(plate.id, 'minutes', parseInt(val, 10) || 0)}
                            placeholder="0"
                          />
                          <Text style={styles.timeUnit}>m</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.plateInputItem}>
                      <Text style={styles.miniLabel}>Gramos usados (g)</Text>
                      <View style={styles.gramsInputBox}>
                        <TextInput
                          style={styles.timeInput}
                          keyboardType="numeric"
                          value={String(plate.grams)}
                          onChangeText={(val) => handleUpdatePlate(plate.id, 'grams', parseFloat(val) || 0)}
                          placeholder="0.0"
                        />
                        <Text style={styles.timeUnit}>g</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* BANNER TOTAL CONSOLIDADO */}
              <View style={styles.totalConsolidatedBanner}>
                <View>
                  <Text style={styles.totalConsolidatedLabel}>Total de las {platesList.length} placas:</Text>
                  <Text style={styles.totalConsolidatedTime}>
                    ⏱️ {formatHoursMinutes(totalHoursCombined, totalMinsRemainder)} de impresión
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalConsolidatedLabel}>Filamento total:</Text>
                  <Text style={styles.totalConsolidatedGrams}>
                    ⚖️ {totalGramsFromPlatesCombined.toFixed(1)} g
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* SECCIÓN 2: COLORES / FILAMENTOS */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. Colores y Filamentos</Text>
              <Text style={styles.cardHint}>
                Desglose por color si utilizas varios materiales o sistema AMS multicolor.
              </Text>

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
                      onChangeText={(val) => {
                        setReviewFilaments((prev) =>
                          prev.map((f) => (f.id === item.id ? { ...f, name: val } : f))
                        );
                      }}
                      placeholder="Ej: Negro..."
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.miniLabel}>Gramos (g)</Text>
                    <TextInput
                      style={styles.miniInputNumber}
                      keyboardType="numeric"
                      value={item.grams}
                      onChangeText={(val) => {
                        setReviewFilaments((prev) =>
                          prev.map((f) => (f.id === item.id ? { ...f, grams: val } : f))
                        );
                      }}
                      placeholder="0.0"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Prevención de doble conteo */}
          <View style={styles.antiDoubleCountCard}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchTitle}>Evitar conteo doble de material</Text>
                <Text style={styles.switchSubtitle}>
                  Los gramos indicados arriba ya incluyen el modelo, soportes y purga de cada placa.
                </Text>
              </View>
              <Switch
                value={isTotalAlreadyIncludingWaste}
                onValueChange={setIsTotalAlreadyIncludingWaste}
                trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                thumbColor={isTotalAlreadyIncludingWaste ? '#4f46e5' : '#f8fafc'}
              />
            </View>
          </View>

          {/* Botón Aplicar a Calculadora */}
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Ionicons name="calculator" size={22} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.applyButtonText}>
              Aplicar {platesList.length} {platesList.length === 1 ? 'Placa' : 'Placas'} a la Calculadora 3D
            </Text>
          </TouchableOpacity>
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
    fontWeight: '800',
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
    paddingBottom: 40,
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
    fontWeight: '800',
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
  thumbBox: {
    marginRight: 10,
    alignItems: 'center',
  },
  thumbLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
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
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#eef2ff',
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  viewModeBtnTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addPlateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPlateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  plateRowCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  plateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  plateBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3730a3',
  },
  plateNameInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: '#0f172a',
  },
  plateInputsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  plateInputItem: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  gramsInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  timeInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  timeUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 2,
  },
  totalConsolidatedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  totalConsolidatedLabel: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '600',
  },
  totalConsolidatedTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e1b4b',
    marginTop: 2,
  },
  totalConsolidatedGrams: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 2,
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
    fontWeight: '800',
  },
});
