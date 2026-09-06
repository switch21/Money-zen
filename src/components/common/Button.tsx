/**
 * Money-zen — Composant Button.
 * Variantes : primary (terracotta), secondary (ivoire), ghost, danger.
 * Respecte les zones tactiles (min 44px), pas de texte tronqué.
 */
import { Pressable, ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { TOUCH_TARGET } from '@theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  testID?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onPress,
  onLongPress,
  disabled,
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  testID,
}: ButtonProps) {
  const { tokens, spacing, radius } = useTheme();
  const isDisabled = disabled || loading;

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: tokens.brand, fg: tokens.textOnAccent, border: 'transparent' };
      case 'secondary':
        return { bg: tokens.surface, fg: tokens.brand, border: tokens.border };
      case 'ghost':
        return { bg: 'transparent', fg: tokens.brand, border: 'transparent' };
      case 'danger':
        return { bg: tokens.error, fg: tokens.textOnAccent, border: 'transparent' };
    }
  })();

  const sizeStyle = (() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 14, minHeight: TOUCH_TARGET.min };
      case 'md':
        return { paddingVertical: 12, paddingHorizontal: 20, minHeight: TOUCH_TARGET.comfortable };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 };
    }
  })();

  const styles = StyleSheet.create({
    base: {
      ...sizeStyle,
      borderRadius: radius.lg,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      borderWidth: palette.border === 'transparent' ? 0 : 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      opacity: isDisabled ? 0.5 : 1,
      alignSelf: fullWidth ? 'stretch' : 'auto',
    },
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.base, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isDisabled}
      accessibilityRole="button"
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {leftIcon ? <View style={{ marginRight: 6 }}>{leftIcon}</View> : null}
          <Text variant="bodyStrong" color={variant === 'primary' || variant === 'danger' ? 'textOnAccent' : 'brand'}>
            {children}
          </Text>
          {rightIcon ? <View style={{ marginLeft: 6 }}>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
