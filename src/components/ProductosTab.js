/**
 * Pestaña de Productos Completos (Fichas de Producto) de SaborAmor Party
 * Combina impresión 3D, cordones/paracord, accesorios, empaque y armado.
 * Permite guardar, duplicar, editar y recalcular costos ante cambios en insumos
 * conservando el costo histórico de trabajos anteriores.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatCLP,
  formatPercent,
  formatHoursMinutes,
  calculateSuggestedPrice,
  calculateProfitMargin,
} from '../utils/formatters';

const PRODUCT_CATEGORIES = ['Todos', 'Clickers', 'Paracords', 'Figuras 3D', 'Llaveros', 'Personalizados'];

export default function ProductosTab({ appData, onUpdateData }) {
  const products = appData.products || [];
  const filaments = appData.filaments || [];
  const cords = appData.cords || [];
  const accessories = appData.accessories || [];
  const packaging = appData.packaging || [];
  const settings = appData.settings || {};

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Formulario de Ficha de Producto
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Clickers');
  const [formDescription, setFormDescription] = useState('');

  // 1. Componente Impresión 3D
  const [has3DPrint, setHas3DPrint] = useState(true);
  const [printGrams, setPrintGrams] = useState('22');
  const [selectedFilamentId, setSelectedFilamentId] = useState(filaments[0]?.id || '');
  const [printMinutes, setPrintMinutes] = useState('35');

  // 2. Componente Cordón / Paracord
  const [hasCord, setHasCord] = useState(false);
  const [selectedCordId, setSelectedCordId] = useState(cords[0]?.id || '');
  const [cordMeters, setCordMeters] = useState('1.5');

  // 3. Componentes Accesorios (Switches, Argollas, Broches, etc.)
  const [selectedAccessories, setSelectedAccessories] = useState([]); // [{ accessoryId, quantity }]

  // 4. Componentes Empaque (Bolsas, Etiquetas, Tarjetas)
  const [selectedPackaging, setSelectedPackaging] = useState([]); // [{ packagingId, quantity }]

  // 5. Mano de obra y armado
  const [assemblyMinutes, setAssemblyMinutes] = useState('5');
  const [extraExpenses, setExtraExpenses] = useState('0'); // Pegamento, pintura, etc.

  // 6. Precio y Margen
  const [targetMargin, setTargetMargin] = useState(String(settings.defaultTargetMargin || 45));
  const [sellingPrice, setSellingPrice] = useState('3500');

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Clickers');
    setFormDescription('');
    setHas3DPrint(true);
    setPrintGrams('20');
    setSelectedFilamentId(filaments[0]?.id || '');
    setPrintMinutes('30');
    setHasCord(false);
    setSelectedCordId(cords[0]?.id || '');
    setCordMeters('1.5');
    setSelectedAccessories([
      { accessoryId: accessories[0]?.id || '', quantity: 1 },
      { accessoryId: accessories[1]?.id || '', quantity: 1 },
    ]);
    setSelectedPackaging([
      { packagingId: packaging[0]?.id || '', quantity: 1 },
      { packagingId: packaging[1]?.id || '', quantity: 1 },
    ]);
    setAssemblyMinutes('5');
    setExtraExpenses('0');
    setTargetMargin(String(settings.defaultTargetMargin || 45));
    setSellingPrice('3500');
    setModalVisible(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category || 'Clickers');
    setFormDescription(prod.description || '');

    if (prod.printSpecs) {
      setHas3DPrint(true);
      setPrintGrams(String(prod.printSpecs.grams || 20));
      setSelectedFilamentId(prod.printSpecs.filamentId || filaments[0]?.id || '');
      setPrintMinutes(String(prod.printSpecs.printMinutes || 30));
    } else {
      setHas3DPrint(false);
    }

    if (prod.cords && prod.cords.length > 0) {
      setHasCord(true);
      setSelectedCordId(prod.cords[0].cordId || cords[0]?.id || '');
      setCordMeters(String(prod.cords[0].meters || 1.5));
    } else {
      setHasCord(false);
    }

    setSelectedAccessories(prod.accessories || []);
    setSelectedPackaging(prod.packaging || []);
    setAssemblyMinutes(String(prod.assemblyMinutes || 5));
    setExtraExpenses(String(prod.extraCost || 0));
    setTargetMargin(String(prod.targetMargin || 45));
    setSellingPrice(String(prod.sellingPrice || 3500));
    setModalVisible(true);
  };

  // Duplicar producto
  const handleDuplicate = (prod) => {
    const duplicated = {
      ...prod,
      id: `prod-${Date.now()}`,
      name: `${prod.name} (Copia)`,
      updatedAt: new Date().toISOString(),
    };
    onUpdateData({ products: [...products, duplicated] });
  };

  // Eliminar producto
  const handleDelete = (prod) => {
    Alert.alert(
      'Eliminar Ficha',
      `¿Deseas eliminar "${prod.name}"? Los registros del historial conservarán sus costos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = products.filter((p) => p.id !== prod.id);
            onUpdateData({ products: updated });
          },
        },
      ]
    );
  };

  // Actualizar costos de todos los productos según precios actuales del inventario
  const handleUpdateAllProductsCost = () => {
    const updated = products.map((prod) => {
      let cost3D = 0;
      if (prod.printSpecs) {
        const fil = filaments.find((f) => f.id === prod.printSpecs.filamentId);
        const rate = fil ? fil.costPerGram : 16;
        const g = parseFloat(prod.printSpecs.grams) || 0;
        const filCost = g * rate;
        const hours = (parseFloat(prod.printSpecs.printMinutes) || 30) / 60;
        const elec = (settings.printerPowerWatts / 1000) * hours * settings.electricityKwhPrice;
        const wear = hours * settings.wearMaintenancePerHour;
        const fail = (filCost + elec + wear) * (settings.defaultFailureReservePercent / 100);
        cost3D = filCost + elec + wear + fail;
      }

      let costCords = 0;
      if (prod.cords) {
        prod.cords.forEach((c) => {
          const found = cords.find((item) => item.id === c.cordId);
          const mRate = found ? found.costPerMeter : 283;
          costCords += (parseFloat(c.meters) || 0) * mRate;
        });
      }

      let costAcc = 0;
      if (prod.accessories) {
        prod.accessories.forEach((a) => {
          const found = accessories.find((item) => item.id === a.accessoryId);
          const uRate = found ? found.costPerUnit : 100;
          costAcc += (parseFloat(a.quantity) || 1) * uRate;
        });
      }

      let costPack = 0;
      if (prod.packaging) {
        prod.packaging.forEach((p) => {
          const found = packaging.find((item) => item.id === p.packagingId);
          const uRate = found ? found.costPerUnit : 30;
          costPack += (parseFloat(p.quantity) || 1) * uRate;
        });
      }

      const laborHours = (parseFloat(prod.assemblyMinutes) || 5) / 60;
      const laborCost = laborHours * settings.laborHourlyRate;
      const extra = parseFloat(prod.extraCost) || 0;

      const newTotalCost = Math.round(cost3D + costCords + costAcc + costPack + laborCost + extra);
      const sug = calculateSuggestedPrice(newTotalCost, prod.targetMargin || 45);

      return {
        ...prod,
        totalCost: newTotalCost,
        suggestedPrice: sug,
        updatedAt: new Date().toISOString(),
      };
    });

    onUpdateData({ products: updated });
    Alert.alert(
      'Costos Actualizados',
      'Las fichas de producto ahora reflejan las tarifas vigentes de tus materiales. Los registros anteriores en el historial se conservaron intactos.'
    );
  };

  // Cálculo en vivo del costo unitario en el modal
  const calculateLiveModalCost = () => {
    let cost3D = 0;
    if (has3DPrint) {
      const fil = filaments.find((f) => f.id === selectedFilamentId);
      const rate = fil ? fil.costPerGram : 16;
      const g = parseFloat(printGrams) || 0;
      const filCost = g * rate;
      const hours = (parseFloat(printMinutes) || 0) / 60;
      const elec = (settings.printerPowerWatts / 1000) * hours * settings.electricityKwhPrice;
      const wear = hours * settings.wearMaintenancePerHour;
      const fail = (filCost + elec + wear) * (settings.defaultFailureReservePercent / 100);
      cost3D = filCost + elec + wear + fail;
    }

    let costCords = 0;
    if (hasCord) {
      const cord = cords.find((c) => c.id === selectedCordId);
      const mRate = cord ? cord.costPerMeter : 283.33;
      costCords = (parseFloat(cordMeters) || 0) * mRate;
    }

    let costAcc = 0;
    selectedAccessories.forEach((a) => {
      const acc = accessories.find((item) => item.id === a.accessoryId);
      const uRate = acc ? acc.costPerUnit : 100;
      costAcc += (parseFloat(a.quantity) || 1) * uRate;
    });

    let costPack = 0;
    selectedPackaging.forEach((p) => {
      const pack = packaging.find((item) => item.id === p.packagingId);
      const uRate = pack ? pack.costPerUnit : 30;
      costPack += (parseFloat(p.quantity) || 1) * uRate;
    });

    const laborHours = (parseFloat(assemblyMinutes) || 0) / 60;
    const costLabor = laborHours * (settings.laborHourlyRate || 5000);
    const extra = parseFloat(extraExpenses) || 0;

    return Math.round(cost3D + costCords + costAcc + costPack + costLabor + extra);
  };

  const liveTotalCost = calculateLiveModalCost();
  const liveMargin = parseFloat(targetMargin) || 45;
  const liveSuggestedPrice = calculateSuggestedPrice(liveTotalCost, liveMargin);
  const liveSellingPrice = parseFloat(sellingPrice) || 0;
  const liveProfit = liveSellingPrice - liveTotalCost;
  const liveMarginPercent = calculateProfitMargin(liveSellingPrice, liveTotalCost);

  // Guardar Ficha
  const handleSaveProduct = () => {
    if (!formName.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa el nombre del producto.');
      return;
    }

    const newProd = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      description: formDescription.trim(),
      printSpecs: has3DPrint
        ? {
            grams: parseFloat(printGrams) || 0,
            filamentId: selectedFilamentId,
            printMinutes: parseInt(printMinutes, 10) || 0,
          }
        : null,
      cords: hasCord
        ? [
            {
              cordId: selectedCordId,
              meters: parseFloat(cordMeters) || 0,
            },
          ]
        : [],
      accessories: selectedAccessories,
      packaging: selectedPackaging,
      assemblyMinutes: parseInt(assemblyMinutes, 10) || 0,
      extraCost: parseFloat(extraExpenses) || 0,
      totalCost: liveTotalCost,
      targetMargin: liveMargin,
      suggestedPrice: liveSuggestedPrice,
      sellingPrice: liveSellingPrice,
      historyCost: editingProduct ? editingProduct.historyCost || liveTotalCost : liveTotalCost,
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct) {
      const updatedList = products.map((p) => (p.id === editingProduct.id ? newProd : p));
      onUpdateData({ products: updatedList });
    } else {
      onUpdateData({ products: [...products, newProd] });
    }

    setModalVisible(false);
  };

  // Filtrado de productos
  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategoryFilter === 'Todos' || p.category === activeCategoryFilter;
    const matchesSearch = `${p.name} ${p.description || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Barra de Filtro de Categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
        {PRODUCT_CATEGORIES.map((cat) => {
          const isActive = activeCategoryFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBadge, isActive && styles.catBadgeActive]}
              onPress={() => setActiveCategoryFilter(cat)}
            >
              <Text style={[styles.catBadgeText, isActive && styles.catBadgeTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Barra de Acciones */}
      <View style={styles.actionsBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity style={styles.syncBtn} onPress={handleUpdateAllProductsCost}>
          <Ionicons name="sync" size={16} color="#4338ca" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.createBtn} onPress={handleOpenCreate}>
          <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Nuevo Producto</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Fichas de Productos */}
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listInner}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="gift-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No hay productos en esta categoría</Text>
            <Text style={styles.emptySubtitle}>Presiona "+ Nuevo Producto" para diseñar una ficha completa.</Text>
          </View>
        ) : (
          filteredProducts.map((prod) => {
            const profit = (prod.sellingPrice || 0) - (prod.totalCost || 0);
            const margin = calculateProfitMargin(prod.sellingPrice || 0, prod.totalCost || 0);

            return (
              <View key={prod.id} style={styles.prodCard}>
                <View style={styles.prodCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View style={styles.catPill}>
                        <Text style={styles.catPillText}>{prod.category || 'Producto'}</Text>
                      </View>
                      {prod.historyCost && prod.historyCost !== prod.totalCost && (
                        <View style={styles.histCostBadge}>
                          <Text style={styles.histCostBadgeText}>
                            Histórico: {formatCLP(prod.historyCost)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.prodName}>{prod.name}</Text>
                  </View>

                  <View style={styles.prodPriceBox}>
                    <Text style={styles.prodPriceLabel}>Precio Venta</Text>
                    <Text style={styles.prodPriceVal}>{formatCLP(prod.sellingPrice)}</Text>
                  </View>
                </View>

                {prod.description ? (
                  <Text style={styles.prodDesc} numberOfLines={2}>
                    {prod.description}
                  </Text>
                ) : null}

                {/* Resumen de componentes */}
                <View style={styles.recipeTagsRow}>
                  {prod.printSpecs && (
                    <View style={styles.recipeTag}>
                      <Ionicons name="cube-outline" size={13} color="#4338ca" style={{ marginRight: 3 }} />
                      <Text style={styles.recipeTagText}>{prod.printSpecs.grams}g 3D ({prod.printSpecs.printMinutes}m)</Text>
                    </View>
                  )}
                  {prod.cords && prod.cords.length > 0 && (
                    <View style={styles.recipeTag}>
                      <Ionicons name="git-commit-outline" size={13} color="#047857" style={{ marginRight: 3 }} />
                      <Text style={styles.recipeTagText}>{prod.cords[0].meters}m cordón</Text>
                    </View>
                  )}
                  {prod.accessories && prod.accessories.length > 0 && (
                    <View style={styles.recipeTag}>
                      <Ionicons name="hardware-chip-outline" size={13} color="#b45309" style={{ marginRight: 3 }} />
                      <Text style={styles.recipeTagText}>{prod.accessories.length} accesorio(s)</Text>
                    </View>
                  )}
                  {prod.assemblyMinutes > 0 && (
                    <View style={styles.recipeTag}>
                      <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 3 }} />
                      <Text style={styles.recipeTagText}>{prod.assemblyMinutes} min armado</Text>
                    </View>
                  )}
                </View>

                {/* Barra de Costo y Ganancia */}
                <View style={styles.prodMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Costo Unitario:</Text>
                    <Text style={styles.costVal}>{formatCLP(prod.totalCost)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Ganancia Neta:</Text>
                    <Text style={[styles.profitVal, profit >= 0 ? styles.positiveText : styles.negativeText]}>
                      {formatCLP(profit)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Margen:</Text>
                    <Text style={styles.marginVal}>{formatPercent(margin)}</Text>
                  </View>
                </View>

                {/* Acciones */}
                <View style={styles.prodActionsRow}>
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDuplicate(prod)}>
                    <Ionicons name="copy-outline" size={15} color="#475569" />
                    <Text style={styles.cardActionBtnText}>Duplicar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleOpenEdit(prod)}>
                    <Ionicons name="pencil-outline" size={15} color="#4f46e5" />
                    <Text style={[styles.cardActionBtnText, { color: '#4f46e5' }]}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDelete(prod)}>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text style={[styles.cardActionBtnText, { color: '#ef4444' }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Ficha de Producto */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Editar Producto' : 'Crear Ficha de Producto'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nombre del Producto</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ej: Clicker Fidget Anti-Estrés con Argolla"
              />

              <View style={styles.twoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Categoría</Text>
                  <TextInput
                    style={styles.input}
                    value={formCategory}
                    onChangeText={setFormCategory}
                    placeholder="Clickers, Paracords, Figuras..."
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Minutos Armado</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={assemblyMinutes}
                    onChangeText={setAssemblyMinutes}
                    placeholder="5"
                  />
                </View>
              </View>

              {/* Componente Impresión 3D */}
              <View style={styles.componentBox}>
                <View style={styles.componentHeaderRow}>
                  <Text style={styles.componentTitle}>1. Piezas Impresas 3D</Text>
                  <TouchableOpacity onPress={() => setHas3DPrint(!has3DPrint)}>
                    <Text style={styles.toggleLink}>{has3DPrint ? 'Quitar 3D' : '+ Incluir 3D'}</Text>
                  </TouchableOpacity>
                </View>

                {has3DPrint && (
                  <View style={styles.twoCols}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.miniLabel}>Gramos Totales (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={printGrams}
                        onChangeText={setPrintGrams}
                        placeholder="22"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniLabel}>Tiempo Impresión (min)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={printMinutes}
                        onChangeText={setPrintMinutes}
                        placeholder="35"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Componente Cordón / Paracord */}
              <View style={styles.componentBox}>
                <View style={styles.componentHeaderRow}>
                  <Text style={styles.componentTitle}>2. Cordón / Paracord</Text>
                  <TouchableOpacity onPress={() => setHasCord(!hasCord)}>
                    <Text style={styles.toggleLink}>{hasCord ? 'Quitar Cordón' : '+ Incluir Cordón'}</Text>
                  </TouchableOpacity>
                </View>

                {hasCord && (
                  <View style={styles.twoCols}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.miniLabel}>Metros de Cordón</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={cordMeters}
                        onChangeText={setCordMeters}
                        placeholder="1.5"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniLabel}>Cordón del Inventario</Text>
                      <Text style={styles.inventorySelectedText}>
                        {cords[0]?.name || 'Paracord estándar'} ({formatCLP(cords[0]?.costPerMeter || 283, true)}/m)
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Componentes Accesorios y Empaque */}
              <View style={styles.componentBox}>
                <Text style={styles.componentTitle}>3. Accesorios y Empaque Incluidos</Text>
                <Text style={styles.miniHint}>
                  Seleccionados por defecto desde tu inventario (switches, argollas, bolsas celofán y etiquetas).
                </Text>

                {accessories.map((acc) => {
                  const existing = selectedAccessories.find((a) => a.accessoryId === acc.id);
                  const isChecked = Boolean(existing);

                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.checkboxItem, isChecked && styles.checkboxItemActive]}
                      onPress={() => {
                        if (isChecked) {
                          setSelectedAccessories((prev) => prev.filter((a) => a.accessoryId !== acc.id));
                        } else {
                          setSelectedAccessories((prev) => [...prev, { accessoryId: acc.id, quantity: 1 }]);
                        }
                      }}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={isChecked ? '#4f46e5' : '#94a3b8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.checkboxItemText}>
                        {acc.name} ({formatCLP(acc.costPerUnit, true)}/u)
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {packaging.map((pack) => {
                  const existing = selectedPackaging.find((p) => p.packagingId === pack.id);
                  const isChecked = Boolean(existing);

                  return (
                    <TouchableOpacity
                      key={pack.id}
                      style={[styles.checkboxItem, isChecked && styles.checkboxItemActive]}
                      onPress={() => {
                        if (isChecked) {
                          setSelectedPackaging((prev) => prev.filter((p) => p.packagingId !== pack.id));
                        } else {
                          setSelectedPackaging((prev) => [...prev, { packagingId: pack.id, quantity: 1 }]);
                        }
                      }}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={isChecked ? '#4f46e5' : '#94a3b8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.checkboxItemText}>
                        {pack.name} ({formatCLP(pack.costPerUnit, true)}/u)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Gastos extras */}
              <Text style={styles.inputLabel}>Insumos Extras (Pintura, pegamento, etc. en CLP)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={extraExpenses}
                onChangeText={setExtraExpenses}
                placeholder="0"
              />

              {/* Resumen de Costo y Fijación de Precio */}
              <View style={styles.calculationPreviewBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Costo de Producción Calculado:</Text>
                  <Text style={styles.calcCostVal}>{formatCLP(liveTotalCost)}</Text>
                </View>

                <View style={styles.twoCols}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.miniLabel}>Margen Objetivo (%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={targetMargin}
                      onChangeText={setTargetMargin}
                      placeholder="45"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Precio Sugerido</Text>
                    <TouchableOpacity
                      style={styles.sugBtn}
                      onPress={() => setSellingPrice(String(liveSuggestedPrice))}
                    >
                      <Text style={styles.sugBtnText}>{formatCLP(liveSuggestedPrice)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Precio de Venta Final (CLP)</Text>
                  <TextInput
                    style={[styles.input, { fontSize: 18, fontWeight: '800', color: '#4f46e5' }]}
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    placeholder="3500"
                  />
                </View>

                <View style={styles.liveProfitBanner}>
                  <Text style={styles.liveProfitText}>
                    Ganancia estimada: <Text style={{ fontWeight: '800' }}>{formatCLP(liveProfit)}</Text> ({formatPercent(liveMarginPercent)} margen)
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>Guardar Ficha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  categoriesBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 54,
  },
  catBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  catBadgeActive: {
    backgroundColor: '#4f46e5',
  },
  catBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  catBadgeTextActive: {
    color: '#ffffff',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  syncBtn: {
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  listScroll: {
    flex: 1,
  },
  listInner: {
    padding: 14,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  prodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  prodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  catPill: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730a3',
  },
  histCostBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  histCostBadgeText: {
    fontSize: 10,
    color: '#64748b',
  },
  prodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  prodPriceBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  prodPriceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  prodPriceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4f46e5',
  },
  prodDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  recipeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  recipeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recipeTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  prodMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  costVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  profitVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  positiveText: {
    color: '#059669',
  },
  negativeText: {
    color: '#dc2626',
  },
  marginVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  prodActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 550,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
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
  twoCols: {
    flexDirection: 'row',
  },
  miniLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  componentBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  componentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  componentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  toggleLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  miniHint: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  inventorySelectedText: {
    fontSize: 12,
    color: '#4338ca',
    paddingVertical: 9,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  checkboxItemActive: {
    backgroundColor: '#eef2ff',
  },
  checkboxItemText: {
    fontSize: 12,
    color: '#334155',
  },
  calculationPreviewBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4c1d95',
  },
  calcCostVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#5b21b6',
  },
  sugBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  sugBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b21b6',
  },
  liveProfitBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  liveProfitText: {
    fontSize: 12,
    color: '#065f46',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
