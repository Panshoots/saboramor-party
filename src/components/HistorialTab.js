/**
 * Pestaña de Historial de Presupuestos y Costos Reales de SaborAmor Party
 * Permite buscar, filtrar, editar registros y exportar a CSV / Excel
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
import { formatCLP, formatPercent, formatDateChile } from '../utils/formatters';
import { generateHistoryCSV, downloadFile } from '../services/storage';

export default function HistorialTab({ appData, onUpdateData }) {
  const history = appData.history || [];

  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'presupuesto' | 'real'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Campos para edición de registro histórico
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editTotalCost, setEditTotalCost] = useState('0');
  const [editSellingPrice, setEditSellingPrice] = useState('0');
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState('presupuesto');

  // Filtrado
  const filteredList = history.filter((item) => {
    const matchesType = activeFilter === 'todos' || item.type === activeFilter;
    const matchesSearch = `${item.productName || ''} ${item.notes || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Métricas acumuladas del filtro
  const totalRevenueSum = filteredList.reduce((acc, r) => acc + (parseFloat(r.totalRevenue) || 0), 0);
  const totalCostSum = filteredList.reduce((acc, r) => acc + (parseFloat(r.totalBatchCost) || 0), 0);
  const totalProfitSum = totalRevenueSum - totalCostSum;
  const avgMargin = totalRevenueSum > 0 ? ((totalProfitSum / totalRevenueSum) * 100) : 0;

  // Abrir modal de edición
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setEditName(record.productName || '');
    setEditQuantity(String(record.quantity || 1));
    setEditTotalCost(String(record.totalBatchCost || 0));
    setEditSellingPrice(String(record.sellingPriceUnit || 0));
    setEditNotes(record.notes || '');
    setEditType(record.type || 'presupuesto');
    setModalVisible(true);
  };

  // Guardar edición
  const handleSaveEdit = () => {
    const qty = parseInt(editQuantity, 10) || 1;
    const cost = parseFloat(editTotalCost) || 0;
    const priceUnit = parseFloat(editSellingPrice) || 0;
    const unitCost = qty > 0 ? cost / qty : cost;
    const revenue = priceUnit * qty;
    const profit = revenue - cost;
    const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;

    const updatedList = history.map((item) => {
      if (item.id === editingRecord.id) {
        return {
          ...item,
          productName: editName.trim() || item.productName,
          type: editType,
          quantity: qty,
          totalBatchCost: Math.round(cost),
          unitCost: Math.round(unitCost),
          sellingPriceUnit: Math.round(priceUnit),
          totalRevenue: Math.round(revenue),
          estimatedProfit: Math.round(profit),
          profitMarginPercent: Number(margin.toFixed(1)),
          notes: editNotes.trim(),
        };
      }
      return item;
    });

    onUpdateData({ history: updatedList });
    setModalVisible(false);
  };

  // Eliminar registro
  const handleDelete = (record) => {
    Alert.alert(
      'Eliminar Registro',
      `¿Deseas eliminar el registro "${record.productName}" del historial?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = history.filter((i) => i.id !== record.id);
            onUpdateData({ history: updated });
          },
        },
      ]
    );
  };

  // Exportar a Excel / CSV
  const handleExportCSV = () => {
    if (history.length === 0) {
      Alert.alert('Sin datos', 'No hay registros en el historial para exportar.');
      return;
    }
    const csvData = generateHistoryCSV(filteredList);
    const fileName = `SaborAmor_Historial_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvData, fileName, 'text/csv;charset=utf-8;');
  };

  return (
    <View style={styles.container}>
      {/* Tarjetas métricas superiores */}
      <View style={styles.metricsTopBanner}>
        <View style={styles.metricCard}>
          <Text style={styles.metricCardLabel}>Trabajos</Text>
          <Text style={styles.metricCardVal}>{filteredList.length}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricCardLabel}>Costo Total</Text>
          <Text style={styles.metricCardVal}>{formatCLP(totalCostSum)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricCardLabel}>Ventas</Text>
          <Text style={styles.metricCardVal}>{formatCLP(totalRevenueSum)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricCardLabel}>Ganancia Neta</Text>
          <Text style={[styles.metricCardVal, { color: '#059669' }]}>{formatCLP(totalProfitSum)}</Text>
        </View>
      </View>

      {/* Filtros de Tipo */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilter === 'todos' && styles.filterBtnActive]}
          onPress={() => setActiveFilter('todos')}
        >
          <Text style={[styles.filterBtnText, activeFilter === 'todos' && styles.filterBtnTextActive]}>
            Todos ({history.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilter === 'presupuesto' && styles.filterBtnActivePres]}
          onPress={() => setActiveFilter('presupuesto')}
        >
          <Text style={[styles.filterBtnText, activeFilter === 'presupuesto' && styles.filterBtnTextActivePres]}>
            Presupuestos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilter === 'real' && styles.filterBtnActiveReal]}
          onPress={() => setActiveFilter('real')}
        >
          <Text style={[styles.filterBtnText, activeFilter === 'real' && styles.filterBtnTextActiveReal]}>
            Costos Reales
          </Text>
        </TouchableOpacity>

        {/* Botón Exportar */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.exportBtnText}>Excel / CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color="#94a3b8" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o nota en el historial..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista del Historial */}
      <ScrollView style={styles.scrollList} contentContainerStyle={styles.listInner}>
        {filteredList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="file-tray-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No hay registros en el historial</Text>
            <Text style={styles.emptySubtitle}>
              Realiza un cálculo en la Calculadora 3D y presiona "Guardar en Historial" para comenzar tu registro.
            </Text>
          </View>
        ) : (
          filteredList.map((item) => {
            const isReal = item.type === 'real';

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.typeBadge, isReal ? styles.realBadge : styles.presBadge]}>
                        <Text style={[styles.typeBadgeText, isReal ? styles.realBadgeText : styles.presBadgeText]}>
                          {isReal ? 'Costo Real Registrado' : 'Presupuesto Estimado'}
                        </Text>
                      </View>
                      <Text style={styles.dateText}>{formatDateChile(item.date)}</Text>
                    </View>
                    <Text style={styles.productNameTitle}>
                      {item.productName} ({item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'})
                    </Text>
                  </View>

                  <View style={styles.unitCostBox}>
                    <Text style={styles.unitCostSmallLabel}>Costo Unit.</Text>
                    <Text style={styles.unitCostSmallVal}>{formatCLP(item.unitCost)}</Text>
                  </View>
                </View>

                {/* Desglose resumido */}
                <View style={styles.costGrid}>
                  <View style={styles.costGridCol}>
                    <Text style={styles.costGridLabel}>Materiales:</Text>
                    <Text style={styles.costGridVal}>{formatCLP(item.materialCost)}</Text>
                  </View>
                  <View style={styles.costGridCol}>
                    <Text style={styles.costGridLabel}>Luz y Máquina:</Text>
                    <Text style={styles.costGridVal}>{formatCLP((item.electricityCost || 0) + (item.wearCost || 0))}</Text>
                  </View>
                  <View style={styles.costGridCol}>
                    <Text style={styles.costGridLabel}>Mano de Obra:</Text>
                    <Text style={styles.costGridVal}>{formatCLP(item.laborCost)}</Text>
                  </View>
                  <View style={styles.costGridCol}>
                    <Text style={styles.costGridLabel}>Insumos/Empaque:</Text>
                    <Text style={styles.costGridVal}>{formatCLP(item.suppliesCost)}</Text>
                  </View>
                </View>

                {/* Resumen de Venta y Margen */}
                <View style={styles.financialBanner}>
                  <View>
                    <Text style={styles.finLabel}>Venta Lote:</Text>
                    <Text style={styles.finVal}>{formatCLP(item.totalRevenue)}</Text>
                  </View>
                  <View>
                    <Text style={styles.finLabel}>Costo Lote:</Text>
                    <Text style={styles.finVal}>{formatCLP(item.totalBatchCost)}</Text>
                  </View>
                  <View>
                    <Text style={styles.finLabel}>Ganancia Neta:</Text>
                    <Text style={[styles.finVal, { color: '#059669', fontWeight: '800' }]}>
                      {formatCLP(item.estimatedProfit)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.finLabel}>Margen:</Text>
                    <Text style={[styles.finVal, { color: '#4f46e5', fontWeight: '800' }]}>
                      {formatPercent(item.profitMarginPercent)}
                    </Text>
                  </View>
                </View>

                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    💬 {item.notes}
                  </Text>
                ) : null}

                {/* Botones de acción */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                    <Ionicons name="create-outline" size={15} color="#4f46e5" />
                    <Text style={[styles.actionBtnText, { color: '#4f46e5' }]}>Editar / Corregir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal para editar registro del historial */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Registro Histórico</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nombre del Producto / Trabajo</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Tipo de Registro</Text>
                  <View style={styles.typeToggleRow}>
                    <TouchableOpacity
                      style={[styles.smallTypeBtn, editType === 'presupuesto' && styles.smallTypeBtnActive]}
                      onPress={() => setEditType('presupuesto')}
                    >
                      <Text style={[styles.smallTypeBtnText, editType === 'presupuesto' && styles.smallTypeBtnTextActive]}>
                        Presupuesto
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallTypeBtn, editType === 'real' && styles.smallTypeBtnActiveReal]}
                      onPress={() => setEditType('real')}
                    >
                      <Text style={[styles.smallTypeBtnText, editType === 'real' && styles.smallTypeBtnTextActiveReal]}>
                        Real
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cantidad (unidades)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                  />
                </View>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Costo Total del Lote (CLP)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editTotalCost}
                    onChangeText={setEditTotalCost}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio Venta Unitario (CLP)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editSellingPrice}
                    onChangeText={setEditSellingPrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Notas / Correcciones posteriores</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Ajustes de gramos pesados reales, electricidad medida, fallos..."
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Actualizar</Text>
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
  metricsTopBanner: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metricCardVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: '#334155',
  },
  filterBtnActivePres: {
    backgroundColor: '#4f46e5',
  },
  filterBtnActiveReal: {
    backgroundColor: '#059669',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  filterBtnTextActivePres: {
    color: '#ffffff',
  },
  filterBtnTextActiveReal: {
    color: '#ffffff',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  scrollList: {
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
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presBadge: {
    backgroundColor: '#e0e7ff',
  },
  realBadge: {
    backgroundColor: '#d1fae5',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presBadgeText: {
    color: '#3730a3',
  },
  realBadgeText: {
    color: '#065f46',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  productNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  unitCostBox: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  unitCostSmallLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  unitCostSmallVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  costGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  costGridCol: {
    flex: 1,
  },
  costGridLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  costGridVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 1,
  },
  financialBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  finLabel: {
    fontSize: 10,
    color: '#5b21b6',
  },
  finVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  notesText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  smallTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  smallTypeBtnActive: {
    backgroundColor: '#4f46e5',
  },
  smallTypeBtnActiveReal: {
    backgroundColor: '#059669',
  },
  smallTypeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  smallTypeBtnTextActive: {
    color: '#ffffff',
  },
  smallTypeBtnTextActiveReal: {
    color: '#ffffff',
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
  },
});
