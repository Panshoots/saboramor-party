/**
 * SaborAmor Party - Calculadora de Costos y Precios de Venta (CLP)
 * Impresión 3D, Clickers, Paracords, Llaveros y Productos Personalizados
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Servicios de almacenamiento y datos
import { loadAppData, saveAppData, INITIAL_DATA } from './src/services/storage';

// Componentes y Pestañas
import Calculadora3DTab from './src/components/Calculadora3DTab';
import ProductosTab from './src/components/ProductosTab';
import InventarioTab from './src/components/InventarioTab';
import HistorialTab from './src/components/HistorialTab';
import AjustesTab from './src/components/AjustesTab';
import BambuScannerModal from './src/components/BambuScannerModal';

const TABS = [
  { key: 'calc3d', label: 'Calculadora 3D', icon: 'calculator-outline', iconActive: 'calculator' },
  { key: 'products', label: 'Productos', icon: 'cube-outline', iconActive: 'cube' },
  { key: 'inventory', label: 'Inventario', icon: 'pricetags-outline', iconActive: 'pricetags' },
  { key: 'history', label: 'Historial', icon: 'time-outline', iconActive: 'time' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('calc3d');
  const [appData, setAppData] = useState(INITIAL_DATA);

  // Modal de escáner Bambu Studio
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [incomingScannerData, setIncomingScannerData] = useState(null);

  // Carga inicial persistente
  useEffect(() => {
    async function init() {
      const data = await loadAppData();
      setAppData(data);
      setLoading(false);
    }
    init();
  }, []);

  // Actualizar datos y persistir
  const handleUpdateData = async (partialData) => {
    const nextData = { ...appData, ...partialData };
    setAppData(nextData);
    await saveAppData(nextData);
  };

  // Restablecer valores de fábrica
  const handleResetAllData = async () => {
    setAppData(INITIAL_DATA);
    await saveAppData(INITIAL_DATA);
  };

  // Recibir datos desde el escáner de Bambu Studio y llevar a la calculadora
  const handleApplyScannerToCalculator = (scannerResult) => {
    setIncomingScannerData(scannerResult);
    setCurrentTab('calc3d');
  };

  // Guardar cálculo en el historial
  const handleSaveToHistory = async (newRecord) => {
    const updatedHistory = [newRecord, ...(appData.history || [])];
    await handleUpdateData({ history: updatedHistory });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Cargando SaborAmor Party...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Barra de Encabezado Superior */}
      <View style={styles.topHeader}>
        <View style={styles.brandWrap}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeIcon}>🎉</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>SaborAmor Party</Text>
            <Text style={styles.brandSubtitle}>Calculadora de Costos & Precios (CLP)</Text>
          </View>
        </View>

        {/* Botones de acción rápida visibles en la barra superior */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.scannerQuickBtn}
            onPress={() => setScannerModalVisible(true)}
          >
            <Ionicons name="camera" size={17} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.scannerQuickBtnText}>Foto Bambu</Text>
          </TouchableOpacity>

          {isDesktop && (
            <TouchableOpacity
              style={styles.calcQuickBtn}
              onPress={() => setCurrentTab('calc3d')}
            >
              <Ionicons name="calculator" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.calcQuickBtnText}>Calcular</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navegación por Pestañas (Estilo Escritorio Superior) */}
      {isDesktop && (
        <View style={styles.desktopTabsBar}>
          <View style={styles.desktopTabsInner}>
            {TABS.map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.desktopTabItem, isActive && styles.desktopTabItemActive]}
                  onPress={() => setCurrentTab(tab.key)}
                >
                  <Ionicons
                    name={isActive ? tab.iconActive : tab.icon}
                    size={18}
                    color={isActive ? '#4f46e5' : '#64748b'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.desktopTabText, isActive && styles.desktopTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Contenido Principal de la Pestaña Activa */}
      <View style={styles.mainContent}>
        {currentTab === 'calc3d' && (
          <Calculadora3DTab
            appData={appData}
            onUpdateData={handleUpdateData}
            onOpenScanner={() => setScannerModalVisible(true)}
            incomingScannerData={incomingScannerData}
            onClearScannerData={() => setIncomingScannerData(null)}
            onSaveToHistory={handleSaveToHistory}
          />
        )}

        {currentTab === 'products' && (
          <ProductosTab appData={appData} onUpdateData={handleUpdateData} />
        )}

        {currentTab === 'inventory' && (
          <InventarioTab appData={appData} onUpdateData={handleUpdateData} />
        )}

        {currentTab === 'history' && (
          <HistorialTab appData={appData} onUpdateData={handleUpdateData} />
        )}

        {currentTab === 'settings' && (
          <AjustesTab
            appData={appData}
            onUpdateData={handleUpdateData}
            onResetAllData={handleResetAllData}
          />
        )}
      </View>

      {/* Navegación Inferior para Móvil */}
      {!isDesktop && (
        <View style={styles.mobileTabBar}>
          {TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.mobileTabButton}
                onPress={() => setCurrentTab(tab.key)}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={20}
                  color={isActive ? '#4f46e5' : '#94a3b8'}
                />
                <Text
                  style={[styles.mobileTabLabel, isActive && styles.mobileTabLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Modal de Lectura de Capturas / Fotos de Bambu Studio */}
      <BambuScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onApplyToCalculator={handleApplyScannerToCalculator}
        availableFilaments={appData.filaments || []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#312e81',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4338ca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoBadgeIcon: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#c7d2fe',
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  scannerQuickBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  calcQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  calcQuickBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  desktopTabsBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  desktopTabsInner: {
    flexDirection: 'row',
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  desktopTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  desktopTabItemActive: {
    borderBottomColor: '#4f46e5',
  },
  desktopTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  desktopTabTextActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mobileTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  mobileTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  mobileTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  mobileTabLabelActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
});
