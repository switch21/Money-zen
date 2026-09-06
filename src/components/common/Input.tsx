/**
 * Money-zen — Composant Input (champ de saisie).
 * Style éditorial : bordure sable, fond ivoire, label optionnel au-dessus.
 */
import { useState } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';

import { useTheme } from '@theme/ThemeProvider';
import { RADIUS, TOUCH_TARGET } from '@theme/tokens';
import { Text } from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  helper?: string | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: object;
  testID?: string;
}

export function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  containerStyle,
  testID,
  ...rest
}: InputProps) {
  const { tokens, fontSize, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const styles = StyleSheet.create({
    container: { marginBottom: spacing[4] },
    label: { marginBottom: spacing[2], paddingHorizontal: spacing[1] },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: focused ? tokens.brand : error ? tokens.error : tokens.border,
      paddingHorizontal: spacing[4],
      minHeight: TOUCH_TARGET.comfortable,
    },
    input: {
      flex: 1,
      fontSize: fontSize.md,
      color: tokens.textPrimary,
      paddingVertical: 12,
      paddingHorizontal: leftIcon ? spacing[2] : 0,
    },
    icon: { marginHorizontal: spacing[1] },
    helper: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
    error: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.label}>
          <Text variant="label" color={error ? 'error' : 'textSecondary'}>
            {label}
          </Text>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor={tokens.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          testID={testID}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <View style={styles.error}>
          <Text variant="caption" color="error">
            {error}
          </Text>
        </View>
      ) : helper ? (
        <View style={styles.helper}>
          <Text variant="caption" color="textTertiary">
            {helper}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
