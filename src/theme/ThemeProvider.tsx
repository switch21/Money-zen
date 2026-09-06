/**
 * Money-zen — Thème (light/dark/system) via React Context.
 * Conforme spec section 5 : thème clair + thème sombre + préférence système.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Appearance } from 'react-native';

import {
  DARK_TOKENS,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  ICON_SIZE,
  LAYOUT,
  LIGHT_TOKENS,
  LINE_HEIGHT,
  RADIUS,
  SPACING,
} from './tokens';
import type { UserSettings } from '@types/index';

type ThemeName = 'light' | 'dark';
type Tokens = typeof LIGHT_TOKENS;

interface ThemeContextValue {
  themeName: ThemeName;
  tokens: Tokens;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  font: typeof FONT_FAMILY;
  fontSize: typeof FONT_SIZE;
  fontWeight: typeof FONT_WEIGHT;
  lineHeight: typeof LINE_HEIGHT;
  iconSize: typeof ICON_SIZE;
  layout: typeof LAYOUT;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  preference,
  children,
}: {
  preference: UserSettings['themePreference'];
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(() => resolveTheme(preference, systemScheme));

  useEffect(() => {
    const newTheme = resolveTheme(preference, systemScheme);
    setThemeName(newTheme);
  }, [preference, systemScheme]);

  // Écoute les changements système en live (si préférence = 'system').
  useEffect(() => {
    if (preference !== 'system') return;
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setThemeName(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => listener.remove();
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      tokens: themeName === 'dark' ? (DARK_TOKENS as Tokens) : (LIGHT_TOKENS as Tokens),
      spacing: SPACING,
      radius: RADIUS,
      font: FONT_FAMILY,
      fontSize: FONT_SIZE,
      fontWeight: FONT_WEIGHT,
      lineHeight: LINE_HEIGHT,
      iconSize: ICON_SIZE,
      layout: LAYOUT,
    }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function resolveTheme(
  preference: UserSettings['themePreference'],
  systemScheme: 'light' | 'dark' | null | undefined,
): ThemeName {
  switch (preference) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    case 'system':
    default:
      return systemScheme === 'dark' ? 'dark' : 'light';
  }
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
