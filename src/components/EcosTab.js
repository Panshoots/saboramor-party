import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  Clipboard,
  Share,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const COEF = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 6,
  6: 9,
  7: 15,
  8: 50
};

const createInitialEcosState = () => {
  const state = {};
  DAYS.forEach(d => {
    state[d] = {
      natacion: { reps: '1', minutos: '', segundos: '', zona: '2', distancia: '', ritmo100: '', total: 0, ecos: 0 },
      ciclismo: { reps: '1', minutos: '', segundos: '', zona: '2', distancia: '', ritmo100: '', total: 0, ecos: 0 },
      carrera: { reps: '1', minutos: '', segundos: '', zona: '2', distancia: '', ritmo100: '', total: 0, ecos: 0 }
    };
  });
  return state;
};

const getMondayDate = (dateString) => {
  let d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateChile = (date) => {
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${date.getFullYear().toString().substring(2)}`;
};

const getEcosWeekStartDate = (athlete, wIdx) => {
  if (!athlete?.plan?.fechaInicio) {
    const todayDate = new Date();
    const monday = getMondayDate(todayDate.toISOString().split('T')[0]);
    return formatDateChile(monday);
  }
  const d = new Date(athlete.plan.fechaInicio + 'T00:00:00');
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mondayStart = new Date(d.setDate(diff));
  
  const weekDate = new Date(mondayStart.getTime());
  weekDate.setDate(weekDate.getDate() + (wIdx * 7));
  return formatDateChile(weekDate);
};

export default function EcosTab({ atletas, onSaveEcos }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  const [selectedAtletaId, setSelectedAtletaId] = useState(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [activeDay, setActiveDay] = useState('Lunes');
  const [ecosState, setEcosState] = useState(createInitialEcosState());

  // Converter States for Natacion & Carrera
  const [convDist, setConvDist] = useState('');
  const [convRitmo, setConvRitmo] = useState('');
  const [showConverterSport, setShowConverterSport] = useState(null); // 'natacion' or 'carrera' or null

  // Focus state helpers
  const [focusedInput, setFocusedInput] = useState(null); // format: 'sport-field' e.g. 'natacion-reps'

  const selectedAthlete = atletas.find(a => a.id === selectedAtletaId) || null;

  const loadAthleteWeekEcos = (athlete, weekIndex) => {
    if (!athlete) return;
    const weekStartDate = getEcosWeekStartDate(athlete, weekIndex);
    
    if (athlete.ecosWeeks && athlete.ecosWeeks[weekStartDate]) {
      setEcosState(athlete.ecosWeeks[weekStartDate]);
    } else {
      // Check if it exists in history
      const historyItem = (athlete.ecosHistory || []).find(h => h.semanaFecha === weekStartDate);
      if (historyItem && historyItem.details) {
        setEcosState(historyItem.details);
      } else {
        setEcosState(createInitialEcosState());
      }
    }
  };

  useEffect(() => {
    if (atletas && atletas.length > 0) {
      const activeId = selectedAtletaId || atletas[0].id;
      if (!selectedAtletaId) {
        setSelectedAtletaId(activeId);
      }
      const active = atletas.find(a => a.id === activeId);
      if (active) {
        loadAthleteWeekEcos(active, activeWeekIndex);
      }
    }
  }, [atletas, selectedAtletaId, activeWeekIndex]);

  const handleSelectAthlete = (id) => {
    setSelectedAtletaId(id);
    setActiveWeekIndex(0);
  };

  const calculateRowValues = (sport, repsStr, minStr, segStr, zonaStr) => {
    const reps = parseFloat(repsStr) || 0;
    const minutos = parseFloat(minStr) || 0;
    const segundos = parseFloat(segStr) || 0;
    const zona = parseInt(zonaStr) || 1;

    const total = (segundos * reps / 60) + (minutos * reps);
    const coef = COEF[zona] || 0;

    let factor = 1.0;
    if (sport === 'natacion') factor = 0.75;
    if (sport === 'ciclismo') factor = 0.5;
    if (sport === 'carrera') factor = 1.0;

    const ecos = total * coef * factor;

    return {
      total: total,
      ecos: ecos
    };
  };

  const handleInputChange = (sport, field, value) => {
    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const rowData = { ...dayData[sport] };
      
      // Update field
      rowData[field] = value;

      // Recalculate Row values
      const calc = calculateRowValues(
        sport,
        field === 'reps' ? value : rowData.reps,
        field === 'minutos' ? value : rowData.minutos,
        field === 'segundos' ? value : rowData.segundos,
        field === 'zona' ? value : rowData.zona
      );

      rowData.total = calc.total;
      rowData.ecos = calc.ecos;

      dayData[sport] = rowData;

      return {
        ...prev,
        [activeDay]: dayData
      };
    });
  };

  const handleConvert = (sport) => {
    const dist = parseFloat(convDist);
    // Ritmo es en min/100m, ej: 1.75 es 1 min 45 seg, 2.0 es 2 min
    const ritmo = parseFloat(convRitmo);

    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Error', 'Ingresa una distancia en metros válida.');
      return;
    }
    if (isNaN(ritmo) || ritmo <= 0) {
      Alert.alert('Error', 'Ingresa un ritmo por 100m válido.');
      return;
    }

    // Convert: totalMinutos = (dist / 100) * ritmo
    const totalMinutos = (dist / 100) * ritmo;
    const minutos = Math.floor(totalMinutos);
    const segundos = Math.round((totalMinutos % 1) * 60);

    setEcosState(prev => {
      const dayData = { ...prev[activeDay] };
      const rowData = { ...dayData[sport] };

      rowData.reps = '1';
      rowData.minutos = minutos.toString();
      rowData.segundos = segundos.toString();
      rowData.distancia = convDist;
      rowData.ritmo100 = convRitmo;

      // Recalculate row
      const calc = calculateRowValues(
        sport,
        '1',
        minutos.toString(),
        segundos.toString(),
        rowData.zona
      );

      rowData.total = calc.total;
      rowData.ecos = calc.ecos;

      dayData[sport] = rowData;

      return {
        ...prev,
        [activeDay]: dayData
      };
    });

    // Clear converter fields
    setConvDist('');
    setConvRitmo('');
    setShowConverterSport(null);
    Keyboard.dismiss();
  };

  const handleSaveEcosWeekly = () => {
    if (!selectedAtletaId) {
      Alert.alert('Error', 'Selecciona un deportista primero.');
      return;
    }

    // Calcular el total de ECOs de la semana
    let totalEcos = 0;
    DAYS.forEach(d => {
      const dayData = ecosState[d];
      totalEcos += (parseFloat(dayData.natacion.ecos) || 0);
      totalEcos += (parseFloat(dayData.ciclismo.ecos) || 0);
      totalEcos += (parseFloat(dayData.carrera.ecos) || 0);
    });

    const weekStartDateStr = getEcosWeekStartDate(selectedAthlete, activeWeekIndex);

    onSaveEcos(selectedAtletaId, ecosState, totalEcos, weekStartDateStr);
    Alert.alert('Guardado', `Carga semanal guardada (${weekStartDateStr}): ${totalEcos.toFixed(2)} ECOs acumulados.`);
  };

  const handleShareCurrentWeekPDF = async () => {
    if (!selectedAthlete) {
      Alert.alert('Error', 'Selecciona un deportista primero.');
      return;
    }
    
    const weekStartDateStr = getEcosWeekStartDate(selectedAthlete, activeWeekIndex);
    
    let dailyRowsHtml = '';
    DAYS.forEach(d => {
      const info = totalsByDay[d];
      const rawNat = ecosState[d].natacion;
      const rawCic = ecosState[d].ciclismo;
      const rawCar = ecosState[d].carrera;
      
      dailyRowsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">${d}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0369a1;">
            ${rawNat.minutos ? `${rawNat.minutos} min` : '-'} 
            ${parseFloat(rawNat.ecos) > 0 ? `<strong>(${rawNat.ecos} ECOs)</strong>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #047857;">
            ${rawCic.minutos ? `${rawCic.minutos} min` : '-'} 
            ${parseFloat(rawCic.ecos) > 0 ? `<strong>(${rawCic.ecos} ECOs)</strong>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #c2410c;">
            ${rawCar.minutos ? `${rawCar.minutos} min` : '-'} 
            ${parseFloat(rawCar.ecos) > 0 ? `<strong>(${rawCar.ecos} ECOs)</strong>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 900; text-align: right; color: #2563eb;">
            ${info.total.toFixed(1)}
          </td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Carga de Entrenamiento Semanal - ${selectedAthlete.nombre}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              background-color: #f8fafc;
            }
            .card {
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .header {
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin-top: 4px;
              font-weight: 550;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
              background-color: #f1f5f9;
              padding: 12px;
              border-radius: 8px;
              font-size: 13px;
            }
            .meta-item {
              margin-bottom: 4px;
            }
            .meta-label {
              font-weight: 700;
              color: #475569;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .th {
              background-color: #f1f5f9;
              padding: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              text-align: left;
              border-bottom: 2px solid #cbd5e1;
            }
            .totals-box {
              background-color: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 12px;
              padding: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 15px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .footer {
              text-align: center;
              margin-top: 24px;
              font-size: 10px;
              color: #94a3b8;
              font-weight: 550;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="title">Resumen de Carga Semanal</div>
              <div class="subtitle">EPL Triatlón Chile — Rendimiento Deportivo</div>
            </div>
            
            <div class="meta-grid">
              <div>
                <div class="meta-item"><span class="meta-label">Deportista:</span> ${selectedAthlete.nombre}</div>
                <div class="meta-item"><span class="meta-label">Semana:</span> ${weekStartDateStr}</div>
              </div>
              <div style="text-align: right;">
                <div class="meta-item"><span class="meta-label">Tipo Plan:</span> ${selectedAthlete.tipoPlan || 'Mensual'}</div>
                <div class="meta-item"><span class="meta-label">Total Semanal:</span> <strong>${weeklyTotals.total.toFixed(1)} ECOs</strong></div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th class="th">Día</th>
                  <th class="th" style="color: #0284c7;">🏊 Nat</th>
                  <th class="th" style="color: #16a34a;">🚴 Cic</th>
                  <th class="th" style="color: #ea580c;">🏃 Car</th>
                  <th class="th" style="text-align: right; color: #2563eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRowsHtml}
              </tbody>
            </table>

            <div class="totals-box">
              <span>Carga Total Acumulada:</span>
              <span style="font-size: 20px; color: #2563eb;">${weeklyTotals.total.toFixed(1)} ECOs</span>
            </div>

            <div class="footer">
              Generado electrónicamente por la plataforma de EPL Triatlón.
            </div>
          </div>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 250);
        } else {
          Alert.alert("Ventana emergente bloqueada", "Permite las ventanas emergentes en tu navegador para imprimir.");
        }
      } catch (e) {
        Alert.alert("Error", "Fallo al abrir ventana de impresión: " + e.message);
      }
      return;
    }

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Resumen de Carga Semanal - ${selectedAthlete.nombre}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Error", "Compartir no disponible en este dispositivo.");
      }
    } catch (error) {
      Alert.alert("Error", "Hubo un error al compartir el PDF: " + error.message);
    }
  };

  const handleWipeEcosWeekly = () => {
    Alert.alert(
      'Limpiar Calculadora',
      '¿Estás seguro de restablecer todos los inputs de la semana a cero?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', onPress: () => setEcosState(createInitialEcosState()), style: 'destructive' }
      ]
    );
  };

  const handleShareEcos = async (entry, athleteName) => {
    const text = `⚡ *EPL Triatlón - Resumen de Carga Semanal* ⚡\n\n` +
      `👤 *Atleta:* ${athleteName}\n` +
      `📅 *Semana del:* ${entry.semanaFecha}\n` +
      `---------------------------------\n` +
      `🏊 *Natación:* ${entry.totals.nat.toFixed(1)} ECOs\n` +
      `🚴 *Ciclismo:* ${entry.totals.cic.toFixed(1)} ECOs\n` +
      `🏃 *Carrera:* ${entry.totals.car.toFixed(1)} ECOs\n\n` +
      `🔥 *CARGA TOTAL:* ${entry.totals.total.toFixed(1)} ECOs\n` +
      `---------------------------------\n` +
      `¡Excelente entrenamiento! Mantén el ritmo. 🏊🚴🏃`;

    Clipboard.setString(text);

    try {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      const whatsappAppUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(whatsappUrl, '_blank');
        }
      } else {
        const canOpen = await Linking.canOpenURL(whatsappAppUrl);
        if (canOpen) {
          await Linking.openURL(whatsappAppUrl);
        } else {
          await Share.share({
            message: text,
            title: `Carga Semanal ECOs - ${athleteName}`
          });
        }
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert('Copiado', 'Resumen de carga semanal copiado al portapapeles.');
    }
  };

  // Calculations for charts and summaries
  const getDayTotals = (dayData) => {
    const nat = parseFloat(dayData.natacion.ecos) || 0;
    const cic = parseFloat(dayData.ciclismo.ecos) || 0;
    const car = parseFloat(dayData.carrera.ecos) || 0;
    return { nat, cic, car, total: nat + cic + car };
  };

  const totalsByDay = {};
  DAYS.forEach(d => {
    totalsByDay[d] = getDayTotals(ecosState[d]);
  });

  const weeklyTotals = { nat: 0, cic: 0, car: 0, total: 0 };
  DAYS.forEach(d => {
    weeklyTotals.nat += totalsByDay[d].nat;
    weeklyTotals.cic += totalsByDay[d].cic;
    weeklyTotals.car += totalsByDay[d].car;
    weeklyTotals.total += totalsByDay[d].total;
  });

  const maxDaily = Math.max(...DAYS.map(d => totalsByDay[d].total), 1);


  if (!atletas || atletas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Registra un atleta en la pestaña "Cobros" antes de poder usar la calculadora de ECOs.
        </Text>
      </View>
    );
  }

  const activeDayData = ecosState[activeDay] || createInitialEcosState()['Lunes'];

  const planSeasons = selectedAthlete?.plan?.mesos ? (selectedAthlete.plan.mesos * 4) : 12;
  const weekOptions = selectedAthlete?.plan 
    ? Array.from({ length: planSeasons }, (_, i) => {
        const startStr = getEcosWeekStartDate(selectedAthlete, i);
        return {
          index: i,
          label: `Semana ${i + 1}`,
          date: startStr
        };
      })
    : [{ index: 0, label: 'Semana General', date: getEcosWeekStartDate(selectedAthlete, 0) }];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Athlete Selector */}
      <Text style={styles.sectionTitle}>Selección de Deportista</Text>
      <View style={styles.selectorCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.athleteScroller}>
          {atletas.map(a => (
            <TouchableOpacity
              activeOpacity={0.8}
              key={a.id}
              style={[
                styles.athleteBubble,
                selectedAtletaId === a.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : null
              ]}
              onPress={() => handleSelectAthlete(a.id)}
            >
              <Ionicons
                name="person"
                size={12}
                color={selectedAtletaId === a.id ? '#fff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.athleteBubbleText,
                { color: selectedAtletaId === a.id ? '#fff' : theme.textSecondary }
              ]}>
                {a.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Week Selector */}
      <Text style={styles.sectionTitle}>Semana de Planificación</Text>
      <View style={styles.selectorCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.athleteScroller}>
          {weekOptions.map(w => (
            <TouchableOpacity
              activeOpacity={0.8}
              key={w.index}
              style={[
                styles.athleteBubble,
                activeWeekIndex === w.index ? { backgroundColor: theme.success, borderColor: theme.success } : null
              ]}
              onPress={() => setActiveWeekIndex(w.index)}
            >
              <Ionicons
                name="calendar-outline"
                size={12}
                color={activeWeekIndex === w.index ? '#fff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[
                styles.athleteBubbleText,
                { color: activeWeekIndex === w.index ? '#fff' : theme.textSecondary }
              ]}>
                {w.label} ({w.date})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Weekly Summary Dashboard */}
      <Text style={styles.sectionTitle}>Resumen Semanal de Carga</Text>
      <View style={styles.card}>
        <View style={styles.weeklyHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Esfuerzo Semanal Acumulado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Text style={styles.weeklyTotalText}>{weeklyTotals.total.toFixed(1)} <Text style={{ fontSize: 13, color: theme.primary }}>ECOs</Text></Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }}
                onPress={handleShareCurrentWeekPDF}
              >
                <Ionicons name="share-social" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sportsLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.swim }]} />
              <Text style={styles.legendText}>🏊 {weeklyTotals.nat.toFixed(0)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.bike }]} />
              <Text style={styles.legendText}>🚴 {weeklyTotals.cic.toFixed(0)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.run }]} />
              <Text style={styles.legendText}>🏃 {weeklyTotals.car.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Visual Daily Stacked Bar Chart */}
        <View style={styles.chartContainer}>
          {DAYS.map(d => {
            const dayInfo = totalsByDay[d];
            const swimHeight = (dayInfo.nat / maxDaily) * 100;
            const bikeHeight = (dayInfo.cic / maxDaily) * 100;
            const runHeight = (dayInfo.car / maxDaily) * 100;

            const isCurrent = activeDay === d;

            return (
              <TouchableOpacity key={d} style={styles.chartColWrapper} activeOpacity={0.8} onPress={() => setActiveDay(d)}>
                <View style={styles.chartColContainer}>
                  {/* Bar Background track */}
                  <View style={[styles.chartColTrack, isCurrent ? { borderColor: theme.primary, borderWidth: 1 } : null]}>
                    <View style={styles.barStackSpacer} />
                    {/* Swim part */}
                    {swimHeight > 0 && <View style={[styles.barStackSwim, { height: `${swimHeight}%`, backgroundColor: theme.swim }]} />}
                    {/* Bike part */}
                    {bikeHeight > 0 && <View style={[styles.barStackBike, { height: `${bikeHeight}%`, backgroundColor: theme.bike }]} />}
                    {/* Run part */}
                    {runHeight > 0 && <View style={[styles.barStackRun, { height: `${runHeight}%`, backgroundColor: theme.run }]} />}
                  </View>
                </View>
                <Text style={[styles.chartLabel, isCurrent ? { color: theme.primary, fontWeight: '900' } : { color: theme.textSecondary }]}>
                  {d.substring(0, 2)}
                </Text>
                <Text style={styles.chartValueLabel}>{dayInfo.total.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day selector tabs */}
      <Text style={styles.sectionTitle}>Control Diario: {activeDay}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorRow}>
        {DAYS.map(d => (
          <TouchableOpacity
            key={d}
            style={[
              styles.dayTab,
              activeDay === d ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }
            ]}
            onPress={() => {
              setActiveDay(d);
              setShowConverterSport(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dayTabText,
              { color: activeDay === d ? '#fff' : theme.textSecondary }
            ]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Discipline Cards */}
      <View style={styles.disciplineCardsContainer}>
        {/* ==================== 1. NATACION ==================== */}
        <View style={styles.disciplineCard}>
          <View style={[styles.cardAccentStripe, { backgroundColor: theme.swim }]} />
          
          <View style={styles.disciplineCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="water" size={16} color={theme.swim} style={{ marginRight: 6 }} />
              <Text style={[styles.disciplineTitle, { color: theme.swim }]}>Natación</Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.btnConvToggle, { borderColor: theme.swim }]}
              onPress={() => {
                setShowConverterSport(showConverterSport === 'natacion' ? null : 'natacion');
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.swim, textTransform: 'uppercase' }}>m → min</Text>
            </TouchableOpacity>
          </View>

          {/* Converter inline */}
          {showConverterSport === 'natacion' && (
            <View style={[styles.converterBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={styles.converterTitle}>Conversión: Metros a Minutos (Natación)</Text>
              <View style={styles.converterInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Distancia (Metros)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surface }]}
                    placeholder="Ej: 800"
                    placeholderTextColor={theme.textMuted}
                    value={convDist}
                    onChangeText={setConvDist}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ritmo/100m (min, ej: 1.8)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surface }]}
                    placeholder="Ej: 1.75"
                    placeholderTextColor={theme.textMuted}
                    value={convRitmo}
                    onChangeText={setConvRitmo}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btnConvSubmit, { backgroundColor: theme.swim }]} onPress={() => handleConvert('natacion')}>
                <Text style={styles.btnConvSubmitText}>Calcular y Cargar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inputs Row */}
          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'nat-reps' ? styles.inputFocused : null]}
                value={activeDayData.natacion.reps}
                onChangeText={v => handleInputChange('natacion', 'reps', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('nat-reps')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Minutos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'nat-min' ? styles.inputFocused : null]}
                value={activeDayData.natacion.minutos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('natacion', 'minutos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('nat-min')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Segundos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'nat-seg' ? styles.inputFocused : null]}
                value={activeDayData.natacion.segundos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('natacion', 'segundos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('nat-seg')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Zona</Text>
              <View style={styles.selectWrapper}>
                <TextInput
                  style={[styles.formInput, { textAlign: 'center' }, focusedInput === 'nat-zona' ? styles.inputFocused : null]}
                  value={activeDayData.natacion.zona}
                  onChangeText={v => {
                    const num = parseInt(v);
                    if (!isNaN(num) && num >= 1 && num <= 8) {
                      handleInputChange('natacion', 'zona', v);
                    } else if (v === '') {
                      handleInputChange('natacion', 'zona', '');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  onFocus={() => setFocusedInput('nat-zona')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          {/* Results Summary Row */}
          <View style={styles.resultDetailsBox}>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Tiempo Total</Text>
              <Text style={styles.resultDetailValue}>{(activeDayData.natacion.total || 0).toFixed(2)} min</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Coeficiente</Text>
              <Text style={styles.resultDetailValue}>× {COEF[activeDayData.natacion.zona] || 1}</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Factor Deporte</Text>
              <Text style={styles.resultDetailValue}>× 0.75</Text>
            </View>
            <View style={[styles.resultDetailCol, { borderRightWidth: 0 }]}>
              <Text style={[styles.resultDetailLabel, { color: theme.swim }]}>Subtotal ECOs</Text>
              <Text style={[styles.resultDetailValue, { color: theme.swim, fontWeight: '900' }]}>{(activeDayData.natacion.ecos || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ==================== 2. CICLISMO ==================== */}
        <View style={styles.disciplineCard}>
          <View style={[styles.cardAccentStripe, { backgroundColor: theme.bike }]} />
          
          <View style={styles.disciplineCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bicycle" size={16} color={theme.bike} style={{ marginRight: 6 }} />
              <Text style={[styles.disciplineTitle, { color: theme.bike }]}>Ciclismo</Text>
            </View>
          </View>

          {/* Inputs Row */}
          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'cic-reps' ? styles.inputFocused : null]}
                value={activeDayData.ciclismo.reps}
                onChangeText={v => handleInputChange('ciclismo', 'reps', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('cic-reps')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Minutos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'cic-min' ? styles.inputFocused : null]}
                value={activeDayData.ciclismo.minutos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('ciclismo', 'minutos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('cic-min')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Segundos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'cic-seg' ? styles.inputFocused : null]}
                value={activeDayData.ciclismo.segundos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('ciclismo', 'segundos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('cic-seg')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Zona</Text>
              <View style={styles.selectWrapper}>
                <TextInput
                  style={[styles.formInput, { textAlign: 'center' }, focusedInput === 'cic-zona' ? styles.inputFocused : null]}
                  value={activeDayData.ciclismo.zona}
                  onChangeText={v => {
                    const num = parseInt(v);
                    if (!isNaN(num) && num >= 1 && num <= 8) {
                      handleInputChange('ciclismo', 'zona', v);
                    } else if (v === '') {
                      handleInputChange('ciclismo', 'zona', '');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  onFocus={() => setFocusedInput('cic-zona')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          {/* Results Summary Row */}
          <View style={styles.resultDetailsBox}>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Tiempo Total</Text>
              <Text style={styles.resultDetailValue}>{(activeDayData.ciclismo.total || 0).toFixed(2)} min</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Coeficiente</Text>
              <Text style={styles.resultDetailValue}>× {COEF[activeDayData.ciclismo.zona] || 1}</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Factor Deporte</Text>
              <Text style={styles.resultDetailValue}>× 0.50</Text>
            </View>
            <View style={[styles.resultDetailCol, { borderRightWidth: 0 }]}>
              <Text style={[styles.resultDetailLabel, { color: theme.bike }]}>Subtotal ECOs</Text>
              <Text style={[styles.resultDetailValue, { color: theme.bike, fontWeight: '900' }]}>{(activeDayData.ciclismo.ecos || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ==================== 3. CARRERA ==================== */}
        <View style={styles.disciplineCard}>
          <View style={[styles.cardAccentStripe, { backgroundColor: theme.run }]} />
          
          <View style={styles.disciplineCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flame" size={16} color={theme.run} style={{ marginRight: 6 }} />
              <Text style={[styles.disciplineTitle, { color: theme.run }]}>Carrera</Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.btnConvToggle, { borderColor: theme.run }]}
              onPress={() => {
                setShowConverterSport(showConverterSport === 'carrera' ? null : 'carrera');
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.run, textTransform: 'uppercase' }}>m → min</Text>
            </TouchableOpacity>
          </View>

          {/* Converter inline */}
          {showConverterSport === 'carrera' && (
            <View style={[styles.converterBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={styles.converterTitle}>Conversión: Metros a Minutos (Carrera)</Text>
              <View style={styles.converterInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Distancia (Metros)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surface }]}
                    placeholder="Ej: 5000"
                    placeholderTextColor={theme.textMuted}
                    value={convDist}
                    onChangeText={setConvDist}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ritmo/100m (min, ej: 0.5)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surface }]}
                    placeholder="Ej: 0.45"
                    placeholderTextColor={theme.textMuted}
                    value={convRitmo}
                    onChangeText={setConvRitmo}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btnConvSubmit, { backgroundColor: theme.run }]} onPress={() => handleConvert('carrera')}>
                <Text style={styles.btnConvSubmitText}>Calcular y Cargar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inputs Row */}
          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'car-reps' ? styles.inputFocused : null]}
                value={activeDayData.carrera.reps}
                onChangeText={v => handleInputChange('carrera', 'reps', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('car-reps')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Minutos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'car-min' ? styles.inputFocused : null]}
                value={activeDayData.carrera.minutos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('carrera', 'minutos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('car-min')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Segundos</Text>
              <TextInput
                style={[styles.formInput, focusedInput === 'car-seg' ? styles.inputFocused : null]}
                value={activeDayData.carrera.segundos}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                onChangeText={v => handleInputChange('carrera', 'segundos', v)}
                keyboardType="numeric"
                onFocus={() => setFocusedInput('car-seg')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.label}>Zona</Text>
              <View style={styles.selectWrapper}>
                <TextInput
                  style={[styles.formInput, { textAlign: 'center' }, focusedInput === 'car-zona' ? styles.inputFocused : null]}
                  value={activeDayData.carrera.zona}
                  onChangeText={v => {
                    const num = parseInt(v);
                    if (!isNaN(num) && num >= 1 && num <= 8) {
                      handleInputChange('carrera', 'zona', v);
                    } else if (v === '') {
                      handleInputChange('carrera', 'zona', '');
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  onFocus={() => setFocusedInput('car-zona')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          {/* Results Summary Row */}
          <View style={styles.resultDetailsBox}>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Tiempo Total</Text>
              <Text style={styles.resultDetailValue}>{(activeDayData.carrera.total || 0).toFixed(2)} min</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Coeficiente</Text>
              <Text style={styles.resultDetailValue}>× {COEF[activeDayData.carrera.zona] || 1}</Text>
            </View>
            <View style={styles.resultDetailCol}>
              <Text style={styles.resultDetailLabel}>Factor Deporte</Text>
              <Text style={styles.resultDetailValue}>× 1.00</Text>
            </View>
            <View style={[styles.resultDetailCol, { borderRightWidth: 0 }]}>
              <Text style={[styles.resultDetailLabel, { color: theme.run }]}>Subtotal ECOs</Text>
              <Text style={[styles.resultDetailValue, { color: theme.run, fontWeight: '900' }]}>{(activeDayData.carrera.ecos || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Day total display box */}
      <View style={[styles.daySummaryBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="flash" size={18} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.daySummaryText, { color: theme.textSecondary }]}>Total ECOs de {activeDay}</Text>
        </View>
        <Text style={[styles.daySummaryTotalText, { color: theme.text }]}>
          {totalsByDay[activeDay].total.toFixed(2)} <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600' }}>ECOs / Día</Text>
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity activeOpacity={0.85} style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleSaveEcosWeekly}>
          <Ionicons name="save" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Guardar ECOs de la Semana</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={[styles.btn, { backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border }]} onPress={handleWipeEcosWeekly}>
          <Ionicons name="trash-outline" size={18} color={theme.error} style={{ marginRight: 6 }} />
          <Text style={[styles.btnText, { color: theme.textSecondary }]}>Limpiar inputs semanales</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly History Section */}
      <Text style={styles.sectionTitle}>Historial de Carga Semanal</Text>
      <View style={[styles.card, { marginBottom: 30 }]}>
        {selectedAthlete && selectedAthlete.ecosHistory && selectedAthlete.ecosHistory.length > 0 ? (
          selectedAthlete.ecosHistory.map((item, idx) => (
            <View 
              key={item.id || idx} 
              style={[
                { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
                idx < selectedAthlete.ecosHistory.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                  Semana: {item.semanaFecha}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                  🏊 {Math.round(item.totals.nat)} • 🚴 {Math.round(item.totals.cic)} • 🏃 {Math.round(item.totals.car)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: theme.primary }}>
                  {item.totals.total.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 2, fontWeight: '600' }}>
                  ECOs
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                style={{
                  backgroundColor: 'rgba(37, 211, 102, 0.12)',
                  borderWidth: 1,
                  borderColor: '#25D366',
                  padding: 8,
                  borderRadius: 10
                }}
                onPress={() => handleShareEcos(item, selectedAthlete.nombre)}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 12, paddingVertical: 12, fontWeight: '600' }}>
            No hay registros de cargas semanales en el historial.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.primary,
    textTransform: 'uppercase',
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
    paddingLeft: 8,
    marginTop: 22,
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  athleteScroller: {
    gap: 8,
    paddingVertical: 4,
  },
  athleteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  athleteBubbleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weeklyTotalText: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.text,
  },
  sportsLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  chartColWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  chartColContainer: {
    height: 80,
    width: 14,
    marginBottom: 4,
  },
  chartColTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barStackSpacer: {
    flex: 1,
  },
  barStackSwim: {
    width: '100%',
  },
  barStackBike: {
    width: '100%',
  },
  barStackRun: {
    width: '100%',
  },
  chartLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  chartValueLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: theme.textMuted,
    marginTop: 1,
  },
  daySelectorRow: {
    gap: 6,
    marginBottom: 14,
    paddingVertical: 4,
  },
  dayTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  disciplineCardsContainer: {
    gap: 12,
  },
  disciplineCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  stripeSwim: { backgroundColor: theme.swim },
  stripeBike: { backgroundColor: theme.bike },
  stripeRun: { backgroundColor: theme.run },
  disciplineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  disciplineTitle: {
    fontSize: 13,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnConvToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  converterBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  converterTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  converterInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnConvSubmit: {
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnConvSubmitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  inputCol: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 5,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 13,
    fontWeight: '600',
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.surfaceSecondary,
  },
  selectWrapper: {
    justifyContent: 'center',
  },
  resultDetailsBox: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 12,
  },
  resultDetailCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  resultDetailLabel: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  resultDetailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    marginTop: 2,
  },
  daySummaryBox: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 8,
    elevation: 2,
  },
  daySummaryText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daySummaryTotalText: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '850',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
