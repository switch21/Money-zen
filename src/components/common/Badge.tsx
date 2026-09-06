/**
 * Money-zen — Composants Badge et ProgressBar.
 */
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@theme/ThemeProvider';
import { RADIUS } from '@theme/tokens';
import { Text } from './Text';

// ─── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand';

export function Badge({
  label,
  variant = 'neutral',
  testID,
}: {
  label: string;
  variant?: BadgeVariant;
  testID?: string;
}) {
  const { tokens, spacing, radius } = useTheme();
  const colorMap: Record<BadgeVariant, string> = {
    neutral: tokens.neutral,
    success: tokens.success,
    warning: tokens.warning,
    error: tokens.error,
    info: tokens.info,
    brand: tokens.brand,
  };
  const bg = colorMap[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
      ]}
      testID={testID}
    >
      <Text variant="label" color="textOnAccent">
        {label}
      </Text>
    </View>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  percent,
  variant = 'brand',
  height = 6,
  showLabel = false,
  testID,
}: {
  percent: number;
  variant?: 'brand' | 'success' | 'warning' | 'error';
  height?: number;
  showLabel?: boolean;
  testID?: string;
}) {
  const { tokens, radius } = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const colorMap = {
    brand: tokens.brand,
    success: tokens.success,
    warning: tokens.warning,
    error: tokens.error,
  };
  const fillColor = colorMap[variant];

  return (
    <View style={{ width: '100%' }} testID={testID}>
      <View
        style={{
          backgroundColor: tokens.surfaceSubtle,
          borderRadius: radius.pill,
          height,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: fillColor,
            height: '100%',
            width: `${clamped}%`,
            borderRadius: radius.pill,
          }}
        />
      </View>
      {showLabel ? (
        <View style={{ marginTop: 4 }}>
          <Text variant="caption" color="textTertiary">
            {clamped.toFixed(0)} %
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start' },
});
