/**
 * Money-zen — Composant Text (typographie primitive).
 * Toutes les variantes de texte : titres, corps, montant, etc.
 * Respecte les tokens typographiques (sans humaniste, tabular figures pour montants).
 */
import { Text as RNText, TextStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import type { TranslationKey } from '@i18n/index';
import { t } from '@i18n/index';

type Variant = 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'amount' | 'amountLarge';
type ColorKey =
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'textOnAccent'
  | 'brand'
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'info'
  | 'warning'
  | 'error';

interface TextProps {
  variant?: Variant;
  color?: ColorKey;
  align?: 'left' | 'center' | 'right';
  children: ReactNode;
  i18nKey?: TranslationKey;
  i18nOptions?: Record<string, string | number>;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  testID?: string;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align = 'left',
  children,
  i18nKey,
  i18nOptions,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  testID,
}: TextProps) {
  const { tokens, fontSize, fontWeight, lineHeight } = useTheme();

  const variantStyle: TextStyle = (() => {
    switch (variant) {
      case 'h1':
        return { fontSize: fontSize['4xl'], fontWeight: fontWeight.bold, lineHeight: lineHeight.tight };
      case 'h2':
        return { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, lineHeight: lineHeight.tight };
      case 'h3':
        return { fontSize: fontSize['2xl'], fontWeight: fontWeight.semiBold, lineHeight: lineHeight.snug };
      case 'title':
        return { fontSize: fontSize.xl, fontWeight: fontWeight.semiBold, lineHeight: lineHeight.snug };
      case 'body':
        return { fontSize: fontSize.md, fontWeight: fontWeight.regular, lineHeight: lineHeight.normal };
      case 'bodyStrong':
        return { fontSize: fontSize.md, fontWeight: fontWeight.medium, lineHeight: lineHeight.normal };
      case 'caption':
        return { fontSize: fontSize.sm, fontWeight: fontWeight.regular, lineHeight: lineHeight.snug };
      case 'label':
        return { fontSize: fontSize.xs, fontWeight: fontWeight.medium, lineHeight: lineHeight.snug, letterSpacing: 0.5 };
      case 'amount':
        return { fontSize: fontSize.lg, fontWeight: fontWeight.semiBold, lineHeight: lineHeight.tight, fontVariant: ['tabular-nums'] };
      case 'amountLarge':
        return { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, lineHeight: lineHeight.tight, fontVariant: ['tabular-nums'] };
    }
  })();

  const colorValue = tokens[color];

  const baseStyle: TextStyle = {
    ...variantStyle,
    color: colorValue,
    textAlign: align,
  };

  return (
    <RNText
      style={[baseStyle, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      testID={testID}
    >
      {i18nKey ? t(i18nKey, i18nOptions) : children}
    </RNText>
  );
}
