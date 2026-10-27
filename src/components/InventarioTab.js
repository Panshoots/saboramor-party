/**
 * Pestaña de Inventario de Materiales e Insumos
 * Permite gestionar Filamentos ($/g), Cordones/Paracord ($/m), Accesorios ($/u) y Empaque ($/u)
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
import { formatCLP } from '../utils/formatters';

const CATEGORIES = [
  { key: 'filaments', label: 'Filamentos 3D', icon: 'color-palette', unitLabel: '$/g' },
  { key: 'cords', label: 'Cordones / Paracord', icon: 'git-commit', unitLabel: '$/m' },
  { key: 'accessories', label: 'Accesorios & Herrajes', icon: 'hardware-chip', unitLabel: '$/u' },
  { key: 'packaging', label: 'Empaque & Envoltorios', icon: 'cube', unitLabel: '$/u' },
];

export default function InventarioTab({ appData, onUpdateData }) {
  const [activeCategory, setActiveCategory] = useState('filaments');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Campos del formulario modal
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formType, setFormType] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormBrand('');
    setFormType(activeCategory === 'filaments' ? 'PLA' : '');
    setFormColor('');
    setFormPrice(activeCategory === 'filaments' ? '16000' : '5000');
    setFormQuantity(activeCategory === 'filaments' ? '1000' : activeCategory === 'cords' ? '30' : '50');
    setFormNotes('');
    setModalVisible(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.name || item.brand || '');
    setFormBrand(item.brand || '');
    setFormType(item.type || item.category || '');
    setFormColor(item.color || '');
    setFormPrice(String(item.price || item.pricePerSpool || item.pricePerPack || item.pricePerRoll || ''));
    setFormQuantity(
      String(item.weightGrams || item.meters || item.units || item.unitsPerPack || '')
    );
    setFormNotes(item.notes || '');
    setModalVisible(true);
  };

  // Guardar material nuevo o editado
  const handleSaveItem = () => {
    const priceNum = parseFloat(formPrice) || 0;
    const qtyNum = parseFloat(formQuantity) || 1;

    if (priceNum <= 0) {
      Alert.alert('Precio inválido', 'Por favor ingresa un precio mayor a 0 CLP.');
      return;
    }
    if (qtyNum <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad debe ser mayor a 0.');
      return;
    }

    const currentList = [...(appData[activeCategory] || [])];
    const unitCost = priceNum / qtyNum;

    if (editingItem) {
      // Edición
      const updatedList = currentList.map((item) => {
        if (item.id === editingItem.id) {
          if (activeCategory === 'filaments') {
            return {
              ...item,
              brand: formBrand || formName || 'Genérico',
              type: formType || 'PLA',
              color: formColor || 'Varios',
              price: priceNum,
              weightGrams: qtyNum,
              costPerGram: Number(unitCost.toFixed(2)),
              notes: formNotes,
            };
          } else if (activeCategory === 'cords') {
            return {
              ...item,
              name: formName || 'Cordón / Paracord',
              type: formType || 'Paracord 550',
              color: formColor || '',
              price: priceNum,
              meters: qtyNum,
              costPerMeter: Number(unitCost.toFixed(2)),
              notes: formNotes,
            };
          } else if (activeCategory === 'accessories') {
            return {
              ...item,
              name: formName || 'Accesorio',
              category: formType || 'General',
              price: priceNum,
              units: qtyNum,
              costPerUnit: Number(unitCost.toFixed(2)),
              notes: formNotes,
            };
          } else {
            return {
              ...item,
              name: formName || 'Empaque',
              type: formType || 'Bolsa',
              price: priceNum,
              units: qtyNum,
              costPerUnit: Number(unitCost.toFixed(2)),
              notes: formNotes,
            };
          }
        }
        return item;
      });

      onUpdateData({ [activeCategory]: updatedList });
    } else {
      // Creación
      const newId = `${activeCategory.slice(0, 3)}-${Date.now()}`;
      let newItem = {};

      if (activeCategory === 'filaments') {
        newItem = {
          id: newId,
          brand: formBrand || 'Genérico',
          type: formType || 'PLA',
          color: formColor || 'Color estándar',
          hex: '#6366f1',
          price: priceNum,
          weightGrams: qtyNum,
          costPerGram: Number(unitCost.toFixed(2)),
          notes: formNotes,
        };
      } else if (activeCategory === 'cords') {
        newItem = {
          id: newId,
          name: formName || 'Paracord',
          type: formType || 'Paracord 550',
          color: formColor || '',
          price: priceNum,
          meters: qtyNum,
          costPerMeter: Number(unitCost.toFixed(2)),
          notes: formNotes,
        };
      } else if (activeCategory === 'accessories') {
        newItem = {
          id: newId,
          name: formName || 'Accesorio',
          category: formType || 'Accesorios',
          price: priceNum,
          units: qtyNum,
          costPerUnit: Number(unitCost.toFixed(2)),
          notes: formNotes,
        };
      } else {
        newItem = {
          id: newId,
          name: formName || 'Empaque',
          type: formType || 'Empaque',
          price: priceNum,
          units: qtyNum,
          costPerUnit: Number(unitCost.toFixed(2)),
          notes: formNotes,
        };
      }

      onUpdateData({ [activeCategory]: [...currentList, newItem] });
    }

    setModalVisible(false);
  };

  // Eliminar material
  const handleDeleteItem = (item) => {
    Alert.alert(
      'Eliminar Material',
      `¿Estás seguro de eliminar "${item.name || item.brand || item.type}" del inventario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = (appData[activeCategory] || []).filter((i) => i.id !== item.id);
            onUpdateData({ [activeCategory]: updated });
          },
        },
      ]
    );
  };

  // Lista filtrada
  const itemsList = (appData[activeCategory] || []).filter((item) => {
    const textToSearch = `${item.name || ''} ${item.brand || ''} ${item.type || ''} ${item.color || ''} ${item.notes || ''}`.toLowerCase();
    return textToSearch.includes(searchQuery.toLowerCase());
  });

  // Cálculo en vivo del costo unitario en el modal
  const livePrice = parseFloat(formPrice) || 0;
  const liveQty = parseFloat(formQuantity) || 1;
  const liveUnitCost = liveQty > 0 ? livePrice / liveQty : 0;

  return (
    <View style={styles.container}>
      {/* Selector de subcategorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = (appData[cat.key] || []).length;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={isActive ? '#ffffff' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                {cat.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Barra de Búsqueda y Botón Agregar */}
      <View style={styles.actionsBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar en ${CATEGORIES.find((c) => c.key === activeCategory)?.label}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleOpenCreate}>
          <Ionicons name="add" size={20} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Items */}
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listInner}>
        {itemsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No hay materiales registrados</Text>
            <Text style={styles.emptySubtitle}>Presiona "+ Agregar" para registrar tu primer material o insumo.</Text>
          </View>
        ) : (
          itemsList.map((item) => {
            const isFilament = activeCategory === 'filaments';
            const isCord = activeCategory === 'cords';
            const isAccessory = activeCategory === 'accessories';

            const title = isFilament
              ? `${item.brand} - ${item.type} (${item.color})`
              : item.name;

            const unitRate = isFilament
              ? `${formatCLP(item.costPerGram, true)} / gramo`
              : isCord
              ? `${formatCLP(item.costPerMeter, true)} / metro`
              : `${formatCLP(item.costPerUnit, true)} / unidad`;

            const quantityDesc = isFilament
              ? `Rollo de ${item.weightGrams}g por ${formatCLP(item.price)}`
              : isCord
              ? `Rollo de ${item.meters}m por ${formatCLP(item.price)}`
              : `Pack de ${item.units}u por ${formatCLP(item.price)}`;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemMain}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <View style={styles.rateBadge}>
                      <Text style={styles.rateBadgeText}>{unitRate}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemDesc}>{quantityDesc}</Text>

                  {item.notes ? (
                    <Text style={styles.itemNotes} numberOfLines={2}>
                      📝 {item.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Botones de acción */}
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Ionicons name="pencil" size={17} color="#4f46e5" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleDeleteItem(item)}
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Creación / Edición */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar Insumo' : 'Nuevo Insumo'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeCategory === 'filaments' ? (
                <>
                  <Text style={styles.inputLabel}>Marca del Filamento</Text>
                  <TextInput
                    style={styles.input}
                    value={formBrand}
                    onChangeText={setFormBrand}
                    placeholder="Ej: Bambu Lab, Creality, eSun..."
                  />

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Tipo de Filamento</Text>
                      <TextInput
                        style={styles.input}
                        value={formType}
                        onChangeText={setFormType}
                        placeholder="Ej: PLA, PETG, TPU..."
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Color</Text>
                      <TextInput
                        style={styles.input}
                        value={formColor}
                        onChangeText={setFormColor}
                        placeholder="Ej: Negro, Seda Oro..."
                      />
                    </View>
                  </View>

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Precio del Rollo (CLP)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formPrice}
                        onChangeText={setFormPrice}
                        placeholder="16000"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Peso del Rollo (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formQuantity}
                        onChangeText={setFormQuantity}
                        placeholder="1000"
                      />
                    </View>
                  </View>
                </>
              ) : activeCategory === 'cords' ? (
                <>
                  <Text style={styles.inputLabel}>Nombre del Cordón</Text>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Ej: Paracord 550 Militar"
                  />

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Color / Tipo</Text>
                      <TextInput
                        style={styles.input}
                        value={formColor}
                        onChangeText={setFormColor}
                        placeholder="Ej: Negro, Camuflaje..."
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Metros del Rollo</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formQuantity}
                        onChangeText={setFormQuantity}
                        placeholder="30"
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Precio del Rollo (CLP)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="8500"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Nombre del Insumo / Accesorio</Text>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={activeCategory === 'accessories' ? 'Ej: Switch mecánico táctil' : 'Ej: Bolsa celofán 10x15'}
                  />

                  <Text style={styles.inputLabel}>Categoría / Tipo</Text>
                  <TextInput
                    style={styles.input}
                    value={formType}
                    onChangeText={setFormType}
                    placeholder={activeCategory === 'accessories' ? 'Switches, Argollas, Broches...' : 'Bolsas, Etiquetas...'}
                  />

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Precio Paquete (CLP)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formPrice}
                        onChangeText={setFormPrice}
                        placeholder="3500"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Cantidad en Paquete (u)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formQuantity}
                        onChangeText={setFormQuantity}
                        placeholder="50"
                      />
                    </View>
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Notas u observaciones</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Proveedor, enlace o detalles..."
              />

              {/* Indicador de cálculo automático en vivo */}
              <View style={styles.liveCalculationBox}>
                <Ionicons name="sparkles" size={16} color="#4338ca" style={{ marginRight: 6 }} />
                <Text style={styles.liveCalculationText}>
                  Costo automático: <Text style={{ fontWeight: '800' }}>
                    {formatCLP(liveUnitCost, true)}
                  </Text> {activeCategory === 'filaments' ? 'por gramo' : activeCategory === 'cords' ? 'por metro' : 'por unidad'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveItem}>
                <Text style={styles.saveModalButtonText}>Guardar</Text>
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
    maxHeight: 56,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#4f46e5',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTabTextActive: {
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
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
  emptyBox: {
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
    textAlign: 'center',
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemMain: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  rateBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3730a3',
  },
  itemDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  itemNotes: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
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
    maxWidth: 500,
    maxHeight: '90%',
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
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  twoInputsRow: {
    flexDirection: 'row',
  },
  liveCalculationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  liveCalculationText: {
    fontSize: 13,
    color: '#3730a3',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  cancelModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelModalButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  saveModalButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveModalButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
