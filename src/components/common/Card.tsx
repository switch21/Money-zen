/**
 * Money-zen — Composant Card (carte arrondie douce, palette éditoriale).
 */
import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { LAYOUT } from '@theme/tokens';

interface CardProps {
  children: ReactNode;
  padding?: number | 'lg' | 'md' | 'sm';
  elevation?: 'flat' | 'low' | 'medium';
  style?: ViewStyle;
  testID?: string;
}

export function Card({ children, padding = 'md', elevation = 'low', style, testID }: CardProps) {
  const { tokens, spacing, radius } = useTheme();

  const paddingValue = typeof padding === 'number' ? padding : padding === 'lg' ? LAYOUT.cardPadding + 8 : padding === 'sm' ? 12 : LAYOUT.cardPadding;
  const shadowColor = elevation === 'medium' ? tokens.shadowElevated : tokens.shadow;
  const shadowOpacity = elevation === 'flat' ? 0 : elevation === 'medium' ? 0.14 : 0.08;

  const cardStyle: ViewStyle = {
    backgroundColor: tokens.surfaceCard,
    borderRadius: radius.lg,
    padding: paddingValue,
    shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity,
    shadowRadius: elevation === 'medium' ? 12 : 6,
    elevation: elevation === 'medium' ? 4 : elevation === 'low' ? 2 : 0,
  };

  return (
    <View style={[cardStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

interface SectionProps {
  title?: ReactNode;
  children: ReactNode;
  testID?: string;
}

export function Section({ title, children, testID }: SectionProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[6] }} testID={testID}>
      {title ? <View style={{ marginBottom: spacing[3] }}>{title}</View> : null}
      {children}
    </View>
  );
}
