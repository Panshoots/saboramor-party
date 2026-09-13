import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
  light: {
    background: '#f8fafc', // Soft blue-gray
    surface: '#ffffff', // Pure white for cards
    surfaceSecondary: '#f1f5f9', // Light gray surface
    primary: '#2563eb', // Electric royal blue
    primaryHover: '#1d4ed8',
    secondary: '#06b6d4', // Neon Cyan
    accent: '#8b5cf6', // Indigo Violet
    success: '#10b981', // Emerald
    successBg: 'rgba(16, 185, 129, 0.1)',
    error: '#ef4444', // Coral red
    errorBg: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b', // Sport orange/amber
    warningBg: 'rgba(245, 158, 11, 0.1)',
    text: '#0f172a', // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94a3b8', // Slate 400
    border: '#e2e8f0', // Slate 200
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    glowColor: 'rgba(37, 99, 235, 0.08)',
    tabBarBg: '#ffffff',
    tabActive: '#2563eb',
    tabInactive: '#64748b',
    headerBg: '#ffffff',
    swim: '#0284c7',
    swimBg: 'rgba(2, 132, 199, 0.06)',
    bike: '#16a34a',
    bikeBg: 'rgba(22, 163, 74, 0.06)',
    run: '#ea580c',
    runBg: 'rgba(234, 88, 12, 0.06)',
  },
  dark: {
    background: '#090d16', // Ultra deep space navy
    surface: '#131a2a', // Matte navy card
    surfaceSecondary: '#1e293b', // Slate 800
    primary: '#3b82f6', // Cyber electric blue
    primaryHover: '#60a5fa',
    secondary: '#22d3ee', // Cyber Cyan
    accent: '#a78bfa', // Bright violet
    success: '#34d399', // Bright emerald
    successBg: 'rgba(52, 211, 153, 0.15)',
    error: '#f87171', // Bright red
    errorBg: 'rgba(248, 113, 113, 0.15)',
    warning: '#fbbf24', // Yellow sun
    warningBg: 'rgba(251, 191, 36, 0.15)',
    text: '#f8fafc', // Slate 50
    textSecondary: '#94a3b8', // Slate 400
    textMuted: '#64748b', // Slate 500
    border: '#1e293d', // Cyber border
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    glowColor: 'rgba(59, 130, 246, 0.2)',
    tabBarBg: '#131a2a',
    tabActive: '#3b82f6',
    tabInactive: '#64748b',
    headerBg: '#131a2a',
    swim: '#38bdf8',
    swimBg: 'rgba(56, 189, 248, 0.12)',
    bike: '#4ade80',
    bikeBg: 'rgba(74, 222, 128, 0.12)',
    run: '#fb923c',
    runBg: 'rgba(251, 146, 60, 0.12)',
  }
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    const loadThemeSetting = async () => {
      try {
        const saved = await AsyncStorage.getItem('app_theme_mode');
        if (saved) {
          setThemeMode(saved);
        }
      } catch (e) {
        console.log('Error reading theme mode:', e);
      }
    };
    loadThemeSetting();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemScheme]);

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('app_theme_mode', mode);
    } catch (e) {
      console.log('Error storing theme mode:', e);
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const currentTheme = isDark ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark, themeMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
