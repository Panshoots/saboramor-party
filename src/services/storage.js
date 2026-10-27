/**
 * Servicio de almacenamiento local y gestión de datos de SaborAmor Party
 * Almacenamiento persistente en navegador (AsyncStorage / localStorage)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = '@saboramor_party_data_v1';

export const INITIAL_DATA = {
  // Ajustes de taller
  settings: {
    printerName: 'Bambu Lab A1 / P1S',
    printerPowerWatts: 120, // 120W promedio de impresión
    electricityKwhPrice: 175, // $175 CLP por kWh (promedio Chile)
    wearMaintenancePerHour: 300, // $300 CLP/hora desgaste y mantenimiento
    laborHourlyRate: 5000, // $5.000 CLP/hora de mano de obra
    defaultFailureReservePercent: 8, // 8% de colchón de fallos
    defaultTargetMargin: 45, // 45% de margen deseado
    taxVatPercent: 19, // IVA 19% opcional
    paymentFeePercent: 2.5, // 2.5% comisión pasarela opcional (Transbank, etc.)
  },

  // Inventario de materiales
  filaments: [
    {
      id: 'fil-1',
      brand: 'Sovol / Creality / Bambu',
      type: 'PLA',
      color: 'Negro',
      hex: '#1e1e1e',
      price: 16000, // $16.000 como ejemplo inicial requerido
      weightGrams: 1000, // 1 kg
      costPerGram: 16.0,
      notes: 'PLA básico alta calidad',
      stockGrams: 950,
    },
    {
      id: 'fil-2',
      brand: 'Bambu Lab',
      type: 'PLA Basic',
      color: 'Blanco Jade',
      hex: '#ffffff',
      price: 16000,
      weightGrams: 1000,
      costPerGram: 16.0,
      notes: 'Excelente para figuras y bases',
      stockGrams: 800,
    },
    {
      id: 'fil-3',
      brand: 'eSun',
      type: 'PLA Silk',
      color: 'Oro Seda',
      hex: '#ffd700',
      price: 19500,
      weightGrams: 1000,
      costPerGram: 19.5,
      notes: 'Brillante para detalles y llaveros',
      stockGrams: 720,
    },
    {
      id: 'fil-4',
      brand: 'Sunlu',
      type: 'PETG',
      color: 'Azul Translúcido',
      hex: '#1e90ff',
      price: 17500,
      weightGrams: 1000,
      costPerGram: 17.5,
      notes: 'Mayor resistencia mecánica',
      stockGrams: 500,
    },
  ],

  cords: [
    {
      id: 'cord-1',
      name: 'Paracord 550 Militar 7 Hebras',
      type: 'Paracord 550',
      color: 'Negro / Camuflaje',
      price: 8500,
      meters: 30, // 30 metros por rollo
      costPerMeter: 283.33,
      notes: 'Cuerda de alta resistencia para llaveros y pulseras',
    },
    {
      id: 'cord-2',
      name: 'Cordón Satinado Cola de Ratón',
      type: 'Satín 2mm',
      color: 'Rojo Pasión',
      price: 3500,
      meters: 20,
      costPerMeter: 175.0,
      notes: 'Suave para colgantes y detalles',
    },
  ],

  accessories: [
    {
      id: 'acc-1',
      name: 'Switch Mecánico Táctil (Azul/Rojo)',
      category: 'Switches',
      price: 4500,
      units: 10, // Paquete de 10
      costPerUnit: 450,
      notes: 'Para clickers antiestrés',
    },
    {
      id: 'acc-2',
      name: 'Argolla para Llavero con Cadena y Triángulo',
      category: 'Argollas',
      price: 3500,
      units: 50,
      costPerUnit: 70,
      notes: 'Niquelada reforzada',
    },
    {
      id: 'acc-3',
      name: 'Mosquetón Mini Giratorio Metálico',
      category: 'Mosquetones',
      price: 3000,
      units: 20,
      costPerUnit: 150,
      notes: 'Para paracord y colgantes',
    },
    {
      id: 'acc-4',
      name: 'Broche Plástico Curvo Liberación Rápida',
      category: 'Broches',
      price: 4000,
      units: 25,
      costPerUnit: 160,
      notes: 'Para pulseras tácticas',
    },
  ],

  packaging: [
    {
      id: 'pack-1',
      name: 'Bolsa Celofán con Adhesivo 10x15 cm',
      type: 'Bolsa',
      price: 2500,
      units: 100,
      costPerUnit: 25,
      notes: 'Empaque individual clickers y llaveros',
    },
    {
      id: 'pack-2',
      name: 'Etiqueta Adhesiva Logo SaborAmor',
      type: 'Etiqueta',
      price: 3000,
      units: 100,
      costPerUnit: 30,
      notes: 'Sticker de cierre de bolsa',
    },
    {
      id: 'pack-3',
      name: 'Tarjeta de Respaldo Cartulina Kraft',
      type: 'Cartón Respaldo',
      price: 2000,
      units: 50,
      costPerUnit: 40,
      notes: 'Base soporte para exhibición',
    },
  ],

  // Fichas de productos completos
  products: [
    {
      id: 'prod-1',
      name: 'Clicker Fidget Anti-Estrés con Argolla',
      category: 'Clickers',
      description: 'Base y tapa impresas en 3D, switch mecánico clicky, argolla para llavero y empaque individual',
      printSpecs: {
        grams: 22,
        filamentId: 'fil-1',
        printMinutes: 35,
        printWatts: 120,
        wearCost: 175,
        elecCost: 128,
        filamentCost: 352,
        failureReserve: 52,
      },
      cords: [],
      accessories: [
        { accessoryId: 'acc-1', quantity: 1, name: 'Switch Mecánico', unitCost: 450 },
        { accessoryId: 'acc-2', quantity: 1, name: 'Argolla con Cadena', unitCost: 70 },
      ],
      packaging: [
        { packagingId: 'pack-1', quantity: 1, name: 'Bolsa Celofán 10x15', unitCost: 25 },
        { packagingId: 'pack-2', quantity: 1, name: 'Etiqueta Logo SaborAmor', unitCost: 30 },
      ],
      assemblyMinutes: 5,
      laborRate: 5000,
      laborCost: 417,
      extraCost: 0,
      totalCost: 1674, // Costo unitario total
      targetMargin: 50,
      suggestedPrice: 3500,
      sellingPrice: 3500,
      historyCost: 1674,
      updatedAt: '2026-10-25T14:30:00Z',
    },
    {
      id: 'prod-2',
      name: 'Llavero Táctico Paracord con Mosquetón',
      category: 'Paracords',
      description: 'Llavero tejido en Paracord 550 militar con mosquetón giratorio y argolla reforzada',
      printSpecs: null,
      cords: [
        { cordId: 'cord-1', meters: 1.5, name: 'Paracord 550', unitCost: 283.33, cost: 425 },
      ],
      accessories: [
        { accessoryId: 'acc-2', quantity: 1, name: 'Argolla con Cadena', unitCost: 70 },
        { accessoryId: 'acc-3', quantity: 1, name: 'Mosquetón Mini', unitCost: 150 },
      ],
      packaging: [
        { packagingId: 'pack-1', quantity: 1, name: 'Bolsa Celofán 10x15', unitCost: 25 },
        { packagingId: 'pack-3', quantity: 1, name: 'Tarjeta Respaldo Kraft', unitCost: 40 },
      ],
      assemblyMinutes: 12, // 12 minutos de tejido a mano
      laborRate: 5000,
      laborCost: 1000,
      extraCost: 0,
      totalCost: 1710,
      targetMargin: 45,
      suggestedPrice: 3200,
      sellingPrice: 3200,
      historyCost: 1710,
      updatedAt: '2026-10-25T15:00:00Z',
    },
    {
      id: 'prod-3',
      name: 'Figura Dragón Articulado 3D (Mediano)',
      category: 'Figuras 3D',
      description: 'Dragón articulado print-in-place impreso en PLA seda bicolor, empaque especial',
      printSpecs: {
        grams: 85,
        filamentId: 'fil-3',
        printMinutes: 210, // 3h 30m
        printWatts: 120,
        wearCost: 1050,
        elecCost: 766,
        filamentCost: 1658,
        failureReserve: 278,
      },
      cords: [],
      accessories: [],
      packaging: [
        { packagingId: 'pack-1', quantity: 1, name: 'Bolsa Celofán 10x15', unitCost: 25 },
        { packagingId: 'pack-2', quantity: 1, name: 'Etiqueta Logo SaborAmor', unitCost: 30 },
      ],
      assemblyMinutes: 10, // Limpieza y acondicionamiento
      laborRate: 5000,
      laborCost: 833,
      extraCost: 0,
      totalCost: 4640,
      targetMargin: 55,
      suggestedPrice: 9990,
      sellingPrice: 9990,
      historyCost: 4640,
      updatedAt: '2026-10-26T11:00:00Z',
    },
  ],

  // Historial de presupuestos y costos reales
  history: [
    {
      id: 'hist-1',
      date: '2026-10-26T16:20:00Z',
      type: 'presupuesto', // 'presupuesto' o 'real'
      productName: 'Lote de 4 Clickers Anti-Estrés (Bambu A1)',
      quantity: 4,
      materialCost: 1408,
      electricityCost: 512,
      wearCost: 700,
      failureReserve: 209,
      laborCost: 1667,
      suppliesCost: 2800, // switches, argollas, empaque para 4u
      totalBatchCost: 7296,
      unitCost: 1824,
      sellingPriceUnit: 3500,
      totalRevenue: 14000,
      estimatedProfit: 6704,
      profitMarginPercent: 47.9,
      notes: 'Presupuesto basado en laminado Bambu Studio: 1h 25m, 88g totales',
    },
    {
      id: 'hist-2',
      date: '2026-10-25T18:00:00Z',
      type: 'real',
      productName: 'Figura Dragón Seda Oro (Lote 1u)',
      quantity: 1,
      materialCost: 1658,
      electricityCost: 766,
      wearCost: 1050,
      failureReserve: 0, // Medido real, no hubo fallo
      laborCost: 833,
      suppliesCost: 55,
      totalBatchCost: 4362,
      unitCost: 4362,
      sellingPriceUnit: 9990,
      totalRevenue: 9990,
      estimatedProfit: 5628,
      profitMarginPercent: 56.3,
      notes: 'Costo real registrado tras impresión sin contratiempos. Peso real verificado en balanza: 84.8g.',
    },
  ],
};

/**
 * Carga todos los datos persistidos o devuelve los iniciales
 */
export async function loadAppData() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Fusión defensiva con estructura inicial
      return {
        ...INITIAL_DATA,
        ...parsed,
        settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) },
        filaments: parsed.filaments || INITIAL_DATA.filaments,
        cords: parsed.cords || INITIAL_DATA.cords,
        accessories: parsed.accessories || INITIAL_DATA.accessories,
        packaging: parsed.packaging || INITIAL_DATA.packaging,
        products: parsed.products || INITIAL_DATA.products,
        history: parsed.history || INITIAL_DATA.history,
      };
    }
    // Si es primera vez, guarda los iniciales
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  } catch (error) {
    console.error('Error al cargar datos desde AsyncStorage:', error);
    return INITIAL_DATA;
  }
}

/**
 * Guarda el estado completo en el almacenamiento persistente
 */
export async function saveAppData(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error al guardar datos:', error);
    return false;
  }
}

/**
 * Genera archivo de respaldo JSON descargable
 */
export function generateBackupJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Genera contenido CSV con codificación UTF-8 BOM para Excel
 */
export function generateHistoryCSV(historyRecords) {
  const headers = [
    'ID',
    'Fecha',
    'Tipo Registro',
    'Producto / Trabajo',
    'Cantidad (u)',
    'Costo Material (CLP)',
    'Costo Electricidad (CLP)',
    'Costo Desgaste (CLP)',
    'Reserva Fallos (CLP)',
    'Costo Mano Obra (CLP)',
    'Insumos y Empaque (CLP)',
    'Costo Total Lote (CLP)',
    'Costo Unitario (CLP)',
    'Precio Venta Unitario (CLP)',
    'Venta Total Lote (CLP)',
    'Ganancia Total (CLP)',
    'Margen Ganancia (%)',
    'Notas y Observaciones',
  ];

  const rows = (historyRecords || []).map((r) => [
    r.id,
    new Date(r.date).toLocaleString('es-CL'),
    r.type === 'presupuesto' ? 'Presupuesto Estimado' : 'Costo Real Registrado',
    `"${(r.productName || '').replace(/"/g, '""')}"`,
    r.quantity || 1,
    Math.round(r.materialCost || 0),
    Math.round(r.electricityCost || 0),
    Math.round(r.wearCost || 0),
    Math.round(r.failureReserve || 0),
    Math.round(r.laborCost || 0),
    Math.round(r.suppliesCost || 0),
    Math.round(r.totalBatchCost || 0),
    Math.round(r.unitCost || 0),
    Math.round(r.sellingPriceUnit || 0),
    Math.round(r.totalRevenue || 0),
    Math.round(r.estimatedProfit || 0),
    (parseFloat(r.profitMarginPercent) || 0).toFixed(1) + '%',
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

  // Se añade \uFEFF (Byte Order Mark) para que Excel abra acentos y ñ sin problemas en español
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
  return csvContent;
}

/**
 * Descarga un archivo en la web de forma transparente
 */
export function downloadFile(content, fileName, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || !window.document) return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
