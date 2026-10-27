/**
 * Calculadora de Impresión 3D de SaborAmor Party
 * Calcula costos de lote y unitario, desglose detallado (material, electricidad estimada,
 * desgaste estimado, fallos, mano de obra, insumos), simulador de margen y ganancia.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatCLP,
  formatPercent,
  formatHoursMinutes,
  toDecimalHours,
  calculateElectricityCost,
  calculateWearCost,
  calculateLaborCost,
  calculateSuggestedPrice,
  calculateProfitMargin,
  calculateMarkup,
} from '../utils/formatters';

export default function Calculadora3DTab({
  appData,
  onUpdateData,
  onOpenScanner,
  incomingScannerData,
  onClearScannerData,
  onSaveToHistory,
}) {
  const settings = appData.settings || {};
  const filamentsInventory = appData.filaments || [];

  // Estado del trabajo
  const [jobName, setJobName] = useState('Impresión 3D SaborAmor');
  const [recordType, setRecordType] = useState('presupuesto'); // 'presupuesto' | 'real'
  const [quantity, setQuantity] = useState('1'); // Cantidad de productos terminados en el lote

  // Tiempo de impresión
  const [hours, setHours] = useState('2');
  const [minutes, setMinutes] = useState('30');
  const [platesCount, setPlatesCount] = useState('1');

  // Filamentos usados
  const [filamentsUsed, setFilamentsUsed] = useState([
    {
      id: 'f-1',
      filamentId: filamentsInventory[0]?.id || '',
      name: filamentsInventory[0] ? `${filamentsInventory[0].brand} ${filamentsInventory[0].color}` : 'PLA Básico',
      grams: '45.0',
      customCostPerGram: filamentsInventory[0]?.costPerGram || 16.0,
    },
  ]);

  // Parámetros de máquina y taller
  const [printerWatts, setPrinterWatts] = useState(String(settings.printerPowerWatts || 120));
  const [kwhPrice, setKwhPrice] = useState(String(settings.electricityKwhPrice || 175));
  const [isElectricityMeasured, setIsElectricityMeasured] = useState(false); // Medido vs Estimado

  const [wearPerHour, setWearPerHour] = useState(String(settings.wearMaintenancePerHour || 300));
  const [isWearMeasured, setIsWearMeasured] = useState(false); // Medido vs Estimado

  const [failureReservePercent, setFailureReservePercent] = useState(String(settings.defaultFailureReservePercent || 8));
  
  // Mano de obra
  const [prepMinutes, setPrepMinutes] = useState('15'); // Minutos de preparación, limpieza y armado
  const [laborHourlyRate, setLaborHourlyRate] = useState(String(settings.laborHourlyRate || 5000));

  // Insumos extras o gastos adicionales
  const [extraExpenses, setExtraExpenses] = useState('0'); // Pegamento, imanes, etc.

  // Simulador de Precio y Ganancia
  const [targetMargin, setTargetMargin] = useState(String(settings.defaultTargetMargin || 45));
  const [sellingPrice, setSellingPrice] = useState('6500');
  const [showVolumeTiers, setShowVolumeTiers] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [includeVat, setIncludeVat] = useState(false);
  const [includeGatewayFee, setIncludeGatewayFee] = useState(false);

  // Escuchar si vienen datos desde el escáner de Bambu Studio
  React.useEffect(() => {
    if (incomingScannerData) {
      setHours(String(incomingScannerData.printHours || 0));
      setMinutes(String(incomingScannerData.printMinutes || 0));
      setPlatesCount(String(incomingScannerData.platesCount || 1));

      if (incomingScannerData.filaments && incomingScannerData.filaments.length > 0) {
        setFilamentsUsed(
          incomingScannerData.filaments.map((f, idx) => {
            const matched = filamentsInventory.find((inv) => inv.id === f.filamentId) || filamentsInventory[idx % filamentsInventory.length] || filamentsInventory[0];
            return {
              id: `f-${idx + 1}`,
              filamentId: matched?.id || '',
              name: f.name || (matched ? `${matched.brand} ${matched.color}` : 'PLA Básico'),
              grams: String(f.grams || 0),
              customCostPerGram: matched?.costPerGram || 16.0,
            };
          })
        );
      }
      onClearScannerData && onClearScannerData();
    }
  }, [incomingScannerData]);

  // Manejo de filamentos
  const handleAddFilament = () => {
    const defaultFil = filamentsInventory[0];
    setFilamentsUsed((prev) => [
      ...prev,
      {
        id: `f-${Date.now()}`,
        filamentId: defaultFil?.id || '',
        name: defaultFil ? `${defaultFil.brand} ${defaultFil.color}` : 'Filamento Adicional',
        grams: '10.0',
        customCostPerGram: defaultFil?.costPerGram || 16.0,
      },
    ]);
  };

  const handleUpdateFilament = (id, field, value) => {
    setFilamentsUsed((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === 'filamentId') {
            const found = filamentsInventory.find((f) => f.id === value);
            return {
              ...item,
              filamentId: value,
              name: found ? `${found.brand} ${found.color}` : item.name,
              customCostPerGram: found ? found.costPerGram : item.customCostPerGram,
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveFilament = (id) => {
    if (filamentsUsed.length <= 1) return;
    setFilamentsUsed((prev) => prev.filter((item) => item.id !== id));
  };

  // ================= CÁLCULOS MATEMÁTICOS RIGUROSOS =================
  const qty = parseInt(quantity, 10) || 1;
  const totalHoursDecimal = toDecimalHours(hours, minutes);

  // 1. Costo de filamentos
  let totalFilamentGrams = 0;
  let totalFilamentCost = 0;
  filamentsUsed.forEach((f) => {
    const g = parseFloat(f.grams) || 0;
    const rate = parseFloat(f.customCostPerGram) || 16.0;
    totalFilamentGrams += g;
    totalFilamentCost += g * rate;
  });

  // 2. Costo eléctrico
  const costElectricity = calculateElectricityCost(printerWatts, totalHoursDecimal, kwhPrice);

  // 3. Costo de desgaste y mantenimiento
  const costWear = calculateWearCost(totalHoursDecimal, wearPerHour);

  // 4. Reserva por fallos (se aplica sobre materiales + electricidad + desgaste de máquina)
  const failurePercentNum = parseFloat(failureReservePercent) || 0;
  const failureBaseCost = totalFilamentCost + costElectricity + costWear;
  const costFailureReserve = failureBaseCost * (failurePercentNum / 100);

  // 5. Mano de obra
  const costLabor = calculateLaborCost(prepMinutes, laborHourlyRate);

  // 6. Insumos extras
  const costExtras = parseFloat(extraExpenses) || 0;

  // 7. COSTO TOTAL DEL LOTE Y COSTO UNITARIO
  const totalBatchCost = totalFilamentCost + costElectricity + costWear + costFailureReserve + costLabor + costExtras;
  const unitCost = qty > 0 ? totalBatchCost / qty : totalBatchCost;

  // 8. Precio sugerido según margen objetivo
  const marginNum = parseFloat(targetMargin) || 45;
  const suggestedUnitPrice = calculateSuggestedPrice(unitCost, marginNum);

  // 9. Ganancia con el precio de venta ingresado
  const currentSellingPrice = parseFloat(sellingPrice) || 0;
  const profitPerUnit = currentSellingPrice - unitCost;
  const profitBatch = (currentSellingPrice * qty) - totalBatchCost;
  const marginReal = calculateProfitMargin(currentSellingPrice, unitCost);
  const markupReal = calculateMarkup(currentSellingPrice, unitCost);

  // Ajustes de IVA y Pasarelas si el usuario los activa
  const vatRate = parseFloat(settings.taxVatPercent) || 19;
  const paymentFee = parseFloat(settings.paymentFeePercent) || 2.5;
  const vatAmount = includeVat ? (currentSellingPrice * (vatRate / 100)) : 0;
  const gatewayFeeAmount = includeGatewayFee ? (currentSellingPrice * (paymentFee / 100)) : 0;
  const netRevenueUnit = currentSellingPrice - vatAmount - gatewayFeeAmount;
  const netProfitUnit = netRevenueUnit - unitCost;

  // Actualizar precio de venta sugerido al tocar preset
  const handleApplyMarginPreset = (preset) => {
    setTargetMargin(String(preset));
    const sug = calculateSuggestedPrice(unitCost, preset);
    setSellingPrice(String(sug));
  };

  // Guardar cálculo en el historial
  const handleSaveCalculation = () => {
    const record = {
      id: `calc-${Date.now()}`,
      date: new Date().toISOString(),
      type: recordType,
      productName: jobName || 'Impresión 3D',
      quantity: qty,
      materialCost: Math.round(totalFilamentCost),
      electricityCost: Math.round(costElectricity),
      wearCost: Math.round(costWear),
      failureReserve: Math.round(costFailureReserve),
      laborCost: Math.round(costLabor),
      suppliesCost: Math.round(costExtras),
      totalBatchCost: Math.round(totalBatchCost),
      unitCost: Math.round(unitCost),
      sellingPriceUnit: Math.round(currentSellingPrice),
      totalRevenue: Math.round(currentSellingPrice * qty),
      estimatedProfit: Math.round(profitBatch),
      profitMarginPercent: Number(marginReal.toFixed(1)),
      notes: `${formatHoursMinutes(hours, minutes)} de impresión, ${totalFilamentGrams.toFixed(1)}g totales (${platesCount} ${parseInt(platesCount, 10) === 1 ? 'placa' : 'placas'}). Electricidad: ${isElectricityMeasured ? 'Medida' : 'Estimada'}, Desgaste: ${isWearMeasured ? 'Medido' : 'Estimado'}.`,
    };

    onSaveToHistory(record);
    Alert.alert('¡Guardado!', `El ${recordType === 'presupuesto' ? 'presupuesto' : 'costo real'} fue guardado exitosamente en el Historial.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Botón destacado para escanear captura de Bambu Studio */}
      <TouchableOpacity style={styles.scannerHeroButton} onPress={onOpenScanner}>
        <View style={styles.scannerHeroIconWrap}>
          <Ionicons name="camera" size={24} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scannerHeroTitle}>Lectura de Foto de Bambu Studio</Text>
          <Text style={styles.scannerHeroSubtitle}>
            Toma foto o sube captura para autocompletar gramos, colores y tiempo
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#a5b4fc" />
      </TouchableOpacity>

      {/* Selector de Presupuesto vs Costo Real */}
      <View style={styles.typeSelectorRow}>
        <TouchableOpacity
          style={[styles.typeButton, recordType === 'presupuesto' && styles.typeButtonActive]}
          onPress={() => setRecordType('presupuesto')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={recordType === 'presupuesto' ? '#4f46e5' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.typeButtonText, recordType === 'presupuesto' && styles.typeButtonTextActive]}>
            Presupuesto Estimado
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeButton, recordType === 'real' && styles.typeButtonActiveReal]}
          onPress={() => setRecordType('real')}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={recordType === 'real' ? '#059669' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.typeButtonText, recordType === 'real' && styles.typeButtonTextActiveReal]}>
            Costo Real Registrado
          </Text>
        </TouchableOpacity>
      </View>

      {/* Datos Generales del Trabajo */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Datos del Trabajo</Text>
        <View style={styles.rowTwoCols}>
          <View style={{ flex: 2, marginRight: 10 }}>
            <Text style={styles.inputLabel}>Nombre del Producto / Trabajo</Text>
            <TextInput
              style={styles.input}
              value={jobName}
              onChangeText={setJobName}
              placeholder="Ej: Lote Clickers, Figura Dragón..."
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Piezas en Lote</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontWeight: '700' }]}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1"
            />
          </View>
        </View>

        {/* Tiempo y Placas */}
        <View style={styles.rowTwoCols}>
          <View style={{ flex: 2, marginRight: 10 }}>
            <Text style={styles.inputLabel}>Tiempo Total de Impresión</Text>
            <View style={styles.timeInputsRow}>
              <View style={styles.timeInputBox}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="numeric"
                  value={hours}
                  onChangeText={setHours}
                  placeholder="0"
                />
                <Text style={styles.unitText}>h</Text>
              </View>
              <View style={styles.timeInputBox}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="numeric"
                  value={minutes}
                  onChangeText={setMinutes}
                  placeholder="0"
                />
                <Text style={styles.unitText}>m</Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Total Placas</Text>
            <View style={styles.timeInputBox}>
              <TextInput
                style={styles.timeInput}
                keyboardType="numeric"
                value={platesCount}
                onChangeText={setPlatesCount}
                placeholder="1"
              />
              <Text style={styles.unitText}>placa</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filamentos Usados (Colores múltiples) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Filamentos y Material ({totalFilamentGrams.toFixed(1)}g)</Text>
          <TouchableOpacity onPress={handleAddFilament} style={styles.inlineActionBtn}>
            <Ionicons name="add" size={16} color="#4f46e5" />
            <Text style={styles.inlineActionBtnText}>Otro Color</Text>
          </TouchableOpacity>
        </View>

        {filamentsUsed.map((f, index) => (
          <View key={f.id} style={styles.filamentItemRow}>
            <View style={{ flex: 2, marginRight: 8 }}>
              <Text style={styles.miniLabel}>Filamento #{index + 1}</Text>
              <TextInput
                style={styles.inputSmall}
                value={f.name}
                onChangeText={(v) => handleUpdateFilament(f.id, 'name', v)}
                placeholder="Nombre o color..."
              />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.miniLabel}>Gramos (g)</Text>
              <TextInput
                style={[styles.inputSmall, { textAlign: 'center', fontWeight: '700' }]}
                keyboardType="numeric"
                value={f.grams}
                onChangeText={(v) => handleUpdateFilament(f.id, 'grams', v)}
                placeholder="0"
              />
            </View>

            <View style={{ flex: 1.2, marginRight: 4 }}>
              <Text style={styles.miniLabel}>$/g (CLP)</Text>
              <TextInput
                style={[styles.inputSmall, { textAlign: 'center' }]}
                keyboardType="numeric"
                value={String(f.customCostPerGram)}
                onChangeText={(v) => handleUpdateFilament(f.id, 'customCostPerGram', v)}
                placeholder="16"
              />
            </View>

            {filamentsUsed.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveFilament(f.id)}
                style={{ padding: 6, alignSelf: 'flex-end', marginBottom: 4 }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={styles.subtotalBanner}>
          <Text style={styles.subtotalBannerText}>Subtotal Material:</Text>
          <Text style={styles.subtotalBannerValue}>{formatCLP(totalFilamentCost)}</Text>
        </View>
      </View>

      {/* Costos de Máquina, Electricidad y Taller */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Costos de Máquina y Taller</Text>

        {/* Electricidad */}
        <View style={styles.machineRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.labelWithTag}>
              <Text style={styles.inputLabel}>Consumo Eléctrico</Text>
              <View style={[styles.estimateBadge, isElectricityMeasured && styles.measuredBadge]}>
                <Text style={[styles.estimateBadgeText, isElectricityMeasured && styles.measuredBadgeText]}>
                  {isElectricityMeasured ? 'Medido' : 'Estimado'}
                </Text>
              </View>
            </View>
            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="numeric"
                  value={printerWatts}
                  onChangeText={setPrinterWatts}
                  placeholder="Watts"
                />
                <Text style={styles.fieldSubHint}>Potencia W (120W)</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="numeric"
                  value={kwhPrice}
                  onChangeText={setKwhPrice}
                  placeholder="$/kWh"
                />
                <Text style={styles.fieldSubHint}>$/kWh ($175)</Text>
              </View>
            </View>
          </View>

          <View style={styles.machineCostBox}>
            <Text style={styles.machineCostVal}>{formatCLP(costElectricity)}</Text>
            <TouchableOpacity onPress={() => setIsElectricityMeasured(!isElectricityMeasured)}>
              <Text style={styles.toggleMeasureLink}>
                {isElectricityMeasured ? 'Cambiar a Estimado' : 'Tengo medición'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desgaste y Mantenimiento */}
        <View style={[styles.machineRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.labelWithTag}>
              <Text style={styles.inputLabel}>Desgaste y Boquilla</Text>
              <View style={[styles.estimateBadge, isWearMeasured && styles.measuredBadge]}>
                <Text style={[styles.estimateBadgeText, isWearMeasured && styles.measuredBadgeText]}>
                  {isWearMeasured ? 'Medido' : 'Estimado'}
                </Text>
              </View>
            </View>
            <TextInput
              style={[styles.inputSmall, { width: 140 }]}
              keyboardType="numeric"
              value={wearPerHour}
              onChangeText={setWearPerHour}
              placeholder="300"
            />
            <Text style={styles.fieldSubHint}>CLP por hora de impresión</Text>
          </View>

          <View style={styles.machineCostBox}>
            <Text style={styles.machineCostVal}>{formatCLP(costWear)}</Text>
          </View>
        </View>

        {/* Reserva por fallos */}
        <View style={[styles.machineRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Reserva por Fallos (%)</Text>
            <TextInput
              style={[styles.inputSmall, { width: 100 }]}
              keyboardType="numeric"
              value={failureReservePercent}
              onChangeText={setFailureReservePercent}
              placeholder="8"
            />
            <Text style={styles.fieldSubHint}>Colchón ante pérdidas de impresión</Text>
          </View>

          <View style={styles.machineCostBox}>
            <Text style={styles.machineCostVal}>{formatCLP(costFailureReserve)}</Text>
          </View>
        </View>
      </View>

      {/* Mano de Obra e Insumos Adicionales */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Mano de Obra y Otros Gastos</Text>
        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Limpieza y Armado (min)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={prepMinutes}
              onChangeText={setPrepMinutes}
              placeholder="15"
            />
            <Text style={styles.fieldSubHint}>Retiro de soportes y ensamble</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Valor Hora Trabajo</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={laborHourlyRate}
              onChangeText={setLaborHourlyRate}
              placeholder="5000"
            />
            <Text style={styles.fieldSubHint}>$ CLP por hora de trabajo</Text>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.inputLabel}>Insumos Extras / Empaque de este lote (CLP)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={extraExpenses}
            onChangeText={setExtraExpenses}
            placeholder="0"
          />
          <Text style={styles.fieldSubHint}>Bolsas, stickers o pegamento aplicados a esta tirada</Text>
        </View>
      </View>

      {/* DESGLOSE Y COSTO FINAL DEL LOTE */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Desglose de Costos del Trabajo</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Filamentos ({totalFilamentGrams.toFixed(1)}g):</Text>
          <Text style={styles.breakdownVal}>{formatCLP(totalFilamentCost)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Electricidad ({printerWatts}W, {formatHoursMinutes(hours, minutes)})
            <Text style={styles.dimLabel}> [{isElectricityMeasured ? 'Medida' : 'Estimada'}]</Text>:
          </Text>
          <Text style={styles.breakdownVal}>{formatCLP(costElectricity)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Desgaste y Mantenimiento
            <Text style={styles.dimLabel}> [{isWearMeasured ? 'Medido' : 'Estimado'}]</Text>:
          </Text>
          <Text style={styles.breakdownVal}>{formatCLP(costWear)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Reserva de Fallos ({failurePercentNum}%):</Text>
          <Text style={styles.breakdownVal}>{formatCLP(costFailureReserve)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Mano de Obra ({prepMinutes} min):</Text>
          <Text style={styles.breakdownVal}>{formatCLP(costLabor)}</Text>
        </View>
        {costExtras > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Insumos Extras:</Text>
            <Text style={styles.breakdownVal}>{formatCLP(costExtras)}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalBatchLabel}>Costo Total del Lote ({qty} {qty === 1 ? 'unidad' : 'unidades'}):</Text>
            <Text style={styles.totalBatchVal}>{formatCLP(totalBatchCost)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.unitCostLabel}>Costo por Unidad:</Text>
            <Text style={styles.unitCostVal}>{formatCLP(unitCost)}</Text>
          </View>
        </View>
      </View>

      {/* PRECIO Y GANANCIA (REQUERIMIENTO 5) */}
      <View style={styles.profitCard}>
        <Text style={styles.profitCardTitle}>Simulador de Precio y Ganancia</Text>

        {/* Margen deseado y presets */}
        <Text style={styles.inputLabel}>Margen Objetivo sobre Venta (%):</Text>
        <View style={styles.marginPresetsRow}>
          {[35, 45, 50, 60, 70].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.marginPresetBtn,
                parseInt(targetMargin, 10) === preset && styles.marginPresetBtnActive,
              ]}
              onPress={() => handleApplyMarginPreset(preset)}
            >
              <Text
                style={[
                  styles.marginPresetBtnText,
                  parseInt(targetMargin, 10) === preset && styles.marginPresetBtnTextActive,
                ]}
              >
                {preset}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.suggestedPriceBanner}>
          <Text style={styles.suggestedPriceText}>
            Precio sugerido con {targetMargin}% de margen:{' '}
            <Text style={{ fontWeight: '800' }}>{formatCLP(suggestedUnitPrice)}</Text> por unidad
          </Text>
        </View>

        {/* Precio de Venta Editable */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.inputLabel}>Precio de Venta a Cobrar (CLP por unidad):</Text>
          <TextInput
            style={[styles.input, styles.sellingPriceInput]}
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={setSellingPrice}
            placeholder="0"
          />
        </View>

        {/* Métricas de Ganancia */}
        <View style={styles.profitMetricsGrid}>
          <View style={styles.profitMetricCol}>
            <Text style={styles.metricLabel}>Ganancia / Unidad</Text>
            <Text style={[styles.metricVal, profitPerUnit >= 0 ? styles.positiveVal : styles.negativeVal]}>
              {formatCLP(profitPerUnit)}
            </Text>
          </View>

          <View style={styles.profitMetricCol}>
            <Text style={styles.metricLabel}>Ganancia Total Lote</Text>
            <Text style={[styles.metricVal, profitBatch >= 0 ? styles.positiveVal : styles.negativeVal]}>
              {formatCLP(profitBatch)}
            </Text>
          </View>

          <View style={styles.profitMetricCol}>
            <Text style={styles.metricLabel}>Margen s/ Venta</Text>
            <Text style={styles.metricVal}>{formatPercent(marginReal)}</Text>
          </View>

          <View style={styles.profitMetricCol}>
            <Text style={styles.metricLabel}>Markup s/ Costo</Text>
            <Text style={styles.metricVal}>{formatPercent(markupReal)}</Text>
          </View>
        </View>

        {/* Toggles opcionales de IVA y pasarela */}
        <View style={styles.clarificationsBox}>
          <TouchableOpacity
            style={styles.taxToggleRow}
            onPress={() => setShowTaxDetails(!showTaxDetails)}
          >
            <Ionicons name="information-circle-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.taxToggleText}>
              {showTaxDetails ? 'Ocultar deducciones (IVA / Pasarela)' : 'Ver deducciones de IVA y comisión de pago'}
            </Text>
          </TouchableOpacity>

          {showTaxDetails && (
            <View style={styles.taxExpandedBox}>
              <View style={styles.switchOption}>
                <Text style={styles.switchOptionText}>Descontar IVA 19% (Venta con Boleta/Factura):</Text>
                <Switch
                  value={includeVat}
                  onValueChange={setIncludeVat}
                  trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                  thumbColor={includeVat ? '#4f46e5' : '#f8fafc'}
                />
              </View>

              <View style={styles.switchOption}>
                <Text style={styles.switchOptionText}>Descontar Comisión Transbank / Pos (2.5%):</Text>
                <Switch
                  value={includeGatewayFee}
                  onValueChange={setIncludeGatewayFee}
                  trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                  thumbColor={includeGatewayFee ? '#4f46e5' : '#f8fafc'}
                />
              </View>

              {(includeVat || includeGatewayFee) && (
                <View style={styles.netProfitNotice}>
                  <Text style={styles.netProfitNoticeText}>
                    Ganancia real tras deducciones: <Text style={{ fontWeight: '800' }}>{formatCLP(netProfitUnit)}</Text> por unidad.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Advertencia obligatoria según requerimiento */}
          <Text style={styles.disclaimerText}>
            ⚠️ <Text style={{ fontWeight: '600' }}>Importante:</Text> Los impuestos, comisiones bancarias y despacho solo están incluidos si los activas arriba. No consideres la diferencia entre venta y costo de impresión como ganancia líquida si aún faltan otros gastos fijos.
          </Text>
        </View>

        {/* Comparación por cantidad / mayoreo */}
        <TouchableOpacity
          style={styles.volumeTierToggle}
          onPress={() => setShowVolumeTiers(!showVolumeTiers)}
        >
          <Ionicons name="pricetags-outline" size={16} color="#4338ca" style={{ marginRight: 6 }} />
          <Text style={styles.volumeTierToggleText}>
            {showVolumeTiers ? 'Ocultar escala por volumen' : 'Comparar precio individual vs precio por cantidad'}
          </Text>
        </TouchableOpacity>

        {showVolumeTiers && (
          <View style={styles.volumeTable}>
            <View style={styles.volumeHeaderRow}>
              <Text style={[styles.volTh, { flex: 1 }]}>Cantidad</Text>
              <Text style={[styles.volTh, { flex: 1.5 }]}>Desc. Sugerido</Text>
              <Text style={[styles.volTh, { flex: 1.5 }]}>Precio Unit.</Text>
              <Text style={[styles.volTh, { flex: 1.5 }]}>Ganancia Lote</Text>
            </View>
            {[
              { qty: 1, discount: 0 },
              { qty: 5, discount: 5 },
              { qty: 10, discount: 10 },
              { qty: 25, discount: 15 },
              { qty: 50, discount: 20 },
            ].map((tier) => {
              const tierPrice = Math.round(currentSellingPrice * (1 - tier.discount / 100));
              const tierProfit = (tierPrice - unitCost) * tier.qty;
              return (
                <View key={tier.qty} style={styles.volumeDataRow}>
                  <Text style={[styles.volTd, { flex: 1, fontWeight: '700' }]}>{tier.qty} u</Text>
                  <Text style={[styles.volTd, { flex: 1.5 }]}>{tier.discount > 0 ? `-${tier.discount}%` : 'Normal'}</Text>
                  <Text style={[styles.volTd, { flex: 1.5, color: '#1e293b' }]}>{formatCLP(tierPrice)}</Text>
                  <Text style={[styles.volTd, { flex: 1.5, color: '#059669', fontWeight: '700' }]}>{formatCLP(tierProfit)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Botón para Guardar en Historial */}
      <TouchableOpacity style={styles.saveHistoryBtn} onPress={handleSaveCalculation}>
        <Ionicons name="save-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.saveHistoryBtnText}>
          Guardar como {recordType === 'presupuesto' ? 'Presupuesto Estimado' : 'Costo Real Registrado'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inner: {
    padding: 14,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  scannerHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3730a3',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#3730a3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  scannerHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scannerHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  scannerHeroSubtitle: {
    fontSize: 12,
    color: '#c7d2fe',
    marginTop: 2,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  typeButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  typeButtonActiveReal: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  typeButtonTextActiveReal: {
    color: '#059669',
    fontWeight: '700',
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    marginBottom: 10,
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
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  inputSmall: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0f172a',
  },
  miniLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  fieldSubHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
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
  timeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 6,
  },
  inlineActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
    marginLeft: 4,
  },
  filamentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subtotalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  subtotalBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  subtotalBannerValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  machineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelWithTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  estimateBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  estimateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  measuredBadge: {
    backgroundColor: '#ecfdf5',
  },
  measuredBadgeText: {
    color: '#065f46',
  },
  machineCostBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  machineCostVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  toggleMeasureLink: {
    fontSize: 11,
    color: '#4f46e5',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#c7d2fe',
  },
  dimLabel: {
    fontSize: 11,
    color: '#a5b4fc',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBatchLabel: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  totalBatchVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  unitCostLabel: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  unitCostVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#34d399',
  },
  profitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profitCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  marginPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  marginPresetBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  marginPresetBtnActive: {
    backgroundColor: '#4f46e5',
  },
  marginPresetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  marginPresetBtnTextActive: {
    color: '#ffffff',
  },
  suggestedPriceBanner: {
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  suggestedPriceText: {
    fontSize: 13,
    color: '#3730a3',
  },
  sellingPriceInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4f46e5',
  },
  profitMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  profitMetricCol: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  positiveVal: {
    color: '#059669',
  },
  negativeVal: {
    color: '#dc2626',
  },
  clarificationsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taxToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxToggleText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
  },
  taxExpandedBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  switchOptionText: {
    fontSize: 12,
    color: '#334155',
  },
  netProfitNotice: {
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  netProfitNoticeText: {
    fontSize: 12,
    color: '#065f46',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
    marginTop: 6,
  },
  volumeTierToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  volumeTierToggleText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '600',
  },
  volumeTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  volumeHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  volTh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  volumeDataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  volTd: {
    fontSize: 12,
    color: '#64748b',
  },
  saveHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveHistoryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
