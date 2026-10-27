/**
 * Utilitarios y formateadores para SaborAmor Party
 * Moneda oficial: Peso Chileno (CLP)
 */

/**
 * Formatea un número como Peso Chileno (CLP): $ 16.000
 * @param {number|string} amount 
 * @param {boolean} showDecimals - Si es verdadero y tiene decimales significativos (para costo/gramo), muestra 1 o 2 decimales
 * @returns {string} Formateado como "$ 16.000"
 */
export function formatCLP(amount, showDecimals = false) {
  const num = parseFloat(amount) || 0;
  if (showDecimals && Math.abs(num) < 100 && num % 1 !== 0) {
    // Para valores pequeños como $16,5 por gramo o $28,3 por metro
    return `$ ${num.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
  }
  return `$ ${Math.round(num).toLocaleString('es-CL')}`;
}

/**
 * Formatea porcentaje con 1 decimal: "45.0%"
 * @param {number|string} value 
 * @returns {string}
 */
export function formatPercent(value) {
  const num = parseFloat(value) || 0;
  return `${num.toFixed(1)}%`;
}

/**
 * Formatea tiempo en horas y minutos legibles
 * @param {number} hours 
 * @param {number} minutes 
 * @returns {string} Ejemplo "2h 45m"
 */
export function formatHoursMinutes(hours, minutes) {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Convierte horas y minutos a horas decimales
 * @param {number} hours 
 * @param {number} minutes 
 * @returns {number}
 */
export function toDecimalHours(hours, minutes) {
  const h = parseFloat(hours) || 0;
  const m = parseFloat(minutes) || 0;
  return h + (m / 60);
}

/**
 * Cálculo del costo eléctrico
 * @param {number} watts - Consumo en vatios (ej: 120W)
 * @param {number} totalHours - Horas totales en decimal
 * @param {number} kwhPrice - Precio por kWh en CLP (ej: $175)
 * @returns {number} Costo en CLP
 */
export function calculateElectricityCost(watts, totalHours, kwhPrice) {
  const w = parseFloat(watts) || 0;
  const h = parseFloat(totalHours) || 0;
  const kwh = parseFloat(kwhPrice) || 0;
  const energyKwh = (w / 1000) * h;
  return energyKwh * kwh;
}

/**
 * Cálculo del costo de desgaste y mantenimiento
 * @param {number} totalHours - Horas totales en decimal
 * @param {number} wearPerHour - Costo de desgaste por hora (ej: $300/h)
 * @returns {number} Costo en CLP
 */
export function calculateWearCost(totalHours, wearPerHour) {
  const h = parseFloat(totalHours) || 0;
  const wear = parseFloat(wearPerHour) || 0;
  return h * wear;
}

/**
 * Cálculo del costo de mano de obra
 * @param {number} prepMinutes - Minutos de preparación, limpieza y armado
 * @param {number} hourlyRate - Valor hora de trabajo (ej: $5.000/h)
 * @returns {number} Costo en CLP
 */
export function calculateLaborCost(prepMinutes, hourlyRate) {
  const mins = parseFloat(prepMinutes) || 0;
  const rate = parseFloat(hourlyRate) || 0;
  return (mins / 60) * rate;
}

/**
 * Calcula precio sugerido según margen sobre el precio de venta
 * Margen % = ((Precio - Costo) / Precio) * 100
 * Precio = Costo / (1 - (Margen / 100))
 * @param {number} unitCost 
 * @param {number} marginPercent 
 * @returns {number}
 */
export function calculateSuggestedPrice(unitCost, marginPercent) {
  const cost = parseFloat(unitCost) || 0;
  const margin = parseFloat(marginPercent) || 0;
  if (margin >= 100) return cost * 2;
  const factor = 1 - (margin / 100);
  if (factor <= 0) return cost * 2;
  return Math.round(cost / factor);
}

/**
 * Calcula margen de ganancia sobre el precio de venta (%)
 * @param {number} sellingPrice 
 * @param {number} unitCost 
 * @returns {number}
 */
export function calculateProfitMargin(sellingPrice, unitCost) {
  const price = parseFloat(sellingPrice) || 0;
  const cost = parseFloat(unitCost) || 0;
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

/**
 * Calcula markup o sobreprecio sobre el costo (%)
 * @param {number} sellingPrice 
 * @param {number} unitCost 
 * @returns {number}
 */
export function calculateMarkup(sellingPrice, unitCost) {
  const price = parseFloat(sellingPrice) || 0;
  const cost = parseFloat(unitCost) || 0;
  if (cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

/**
 * Formatea fecha para Chile: DD/MM/AAAA HH:mm
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatDateChile(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
