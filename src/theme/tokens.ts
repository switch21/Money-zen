/**
 * Money-zen — Tokens de design.
 * Direction : "Éditorial chaleureux" — terracotta + ivoire + sans humaniste.
 * Inspiration : Monzo, Yolt, cartes arrondies douces, palette terre.
 *
 * Principe : calme + contrôle + simplicité (spec section 40).
 * Toutes les couleurs sont centralisées ici — JAMAIS de valeurs arbitraires dans les composants.
 */

// ─── Palette de base ────────────────────────────────────────────────────────
// Terracotta principal : la signature de Money-zen.
export const TERRACOTTA = {
  50: '#FBF0E9',
  100: '#F5DCC9',
  200: '#E8B596',
  300: '#D98E63',
  400: '#C97048', // Principal
  500: '#B5533C', // Accent
  600: '#9B422E',
  700: '#7C3220',
  800: '#5E2418',
  900: '#3F1810',
};

// Ivoire / sable : backgrounds chaleureux.
export const IVORY = {
  50: '#FFFBF5',
  100: '#FBF7F0', // Background principal
  200: '#F5EDDF',
  300: '#EBE0CD',
  400: '#D9CAB0',
  500: '#C2B095',
};

// Sable foncé : texte sur ivoire.
export const SAND = {
  100: '#3D332B',
  200: '#5C4F44',
  300: '#7B6C5E',
  400: '#9B8B7A',
  500: '#B5A89A',
};

// Vert sauge : revenus / succès / positif.
export const SAGE = {
  100: '#E5EDE3',
  200: '#C5D8C1',
  300: '#9CC096',
  400: '#7DA68C',
  500: '#5C8B73',
  600: '#456E58',
  700: '#325440',
};

// Bleu minuit : infos / transferts / comptes.
export const INDIGO_SOFT = {
  100: '#E6EBF2',
  200: '#C5D0E0',
  300: '#9CB0CC',
  400: '#7B8DC9',
  500: '#5C6FA8',
  600: '#465787',
};

// Rouge sobre : dépenses / alertes.
export const CLAY = {
  100: '#F3E0DC',
  200: '#E5BAB1',
  300: '#D08E7E',
  400: '#B66B57',
  500: '#9B4F3C',
  600: '#7B3A2A',
};

// Or pâle : premium / accents doux.
export const PALE_GOLD = {
  100: '#F5EEDC',
  200: '#E5D4A8',
  300: '#D4BE78',
  400: '#BFA35A',
};

// ─── Sémantique : Thème clair ──────────────────────────────────────────────
export const LIGHT_TOKENS = {
  background: IVORY[100],
  backgroundElevated: IVORY[50],
  surface: '#FFFFFF',
  surfaceCard: '#FFF8EC',
  surfaceSubtle: IVORY[200],

  textPrimary: SAND[100],
  textSecondary: SAND[200],
  textTertiary: SAND[300],
  textInverse: IVORY[50],
  textOnAccent: IVORY[50],

  border: IVORY[300],
  borderSubtle: IVORY[200],
  borderStrong: SAND[500],

  brand: TERRACOTTA[400],
  brandStrong: TERRACOTTA[500],
  brandSoft: TERRACOTTA[50],

  positive: SAGE[500],
  negative: CLAY[500],
  neutral: SAND[300],
  info: INDIGO_SOFT[500],
  warning: PALE_GOLD[400],
  error: CLAY[500],
  success: SAGE[500],

  shadow: 'rgba(60, 40, 25, 0.08)',
  shadowElevated: 'rgba(60, 40, 25, 0.14)',
  scrim: 'rgba(40, 30, 20, 0.5)',
} as const;

// ─── Sémantique : Thème sombre ──────────────────────────────────────────────
export const DARK_TOKENS = {
  background: '#1F1813',
  backgroundElevated: '#2A201A',
  surface: '#332821',
  surfaceCard: '#3D3027',
  surfaceSubtle: '#3D3027',

  textPrimary: IVORY[50],
  textSecondary: IVORY[200],
  textTertiary: IVORY[400],
  textInverse: SAND[100],
  textOnAccent: IVORY[50],

  border: '#4A3A2E',
  borderSubtle: '#3D3027',
  borderStrong: '#6B5747',

  brand: TERRACOTTA[300],
  brandStrong: TERRACOTTA[400],
  brandSoft: '#3D2A20',

  positive: SAGE[300],
  negative: CLAY[300],
  neutral: IVORY[400],
  info: INDIGO_SOFT[300],
  warning: PALE_GOLD[300],
  error: CLAY[300],
  success: SAGE[300],

  shadow: 'rgba(0, 0, 0, 0.30)',
  shadowElevated: 'rgba(0, 0, 0, 0.45)',
  scrim: 'rgba(0, 0, 0, 0.65)',
} as const;

// ─── Espacement (échelle 4px) ───────────────────────────────────────────────
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// ─── Rayons ────────────────────────────────────────────────────────────────
export const RADIUS = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

// ─── Typographie ───────────────────────────────────────────────────────────
export const FONT_FAMILY = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  numeric: 'System',
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  2xl: 28,
  3xl: 34,
  4xl: 44,
} as const;

export const LINE_HEIGHT = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

// ─── Tailles d'icônes ──────────────────────────────────────────────────────
export const ICON_SIZE = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

// ─── Zones tactiles (accessibilité — min 44px iOS / 48px Material) ─────────
export const TOUCH_TARGET = {
  min: 44,
  comfortable: 56,
} as const;

// ─── Animations ────────────────────────────────────────────────────────────
export const DURATION = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const EASING = {
  standard: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────
export const LAYOUT = {
  horizontalPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
  maxContentWidth: 480,
  bottomTabHeight: 64,
} as const;
