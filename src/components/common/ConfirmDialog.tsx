/**
 * Money-zen — ConfirmDialog (modal de confirmation).
 */
import { Modal, View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
  children?: ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'danger',
  children,
}: ConfirmDialogProps) {
  const { tokens, spacing, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.surface,
              borderRadius: radius.lg,
              marginHorizontal: spacing[6],
              padding: spacing[6],
            },
          ]}
        >
          <Text variant="title" style={{ marginBottom: spacing[2] }}>
            {title}
          </Text>
          {message ? (
            <Text variant="body" color="textSecondary" style={{ marginBottom: spacing[4] }}>
              {message}
            </Text>
          ) : null}
          {children}
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
            <Button variant="secondary" onPress={onCancel} fullWidth>
              {cancelLabel}
            </Button>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} onPress={onConfirm} fullWidth>
              {confirmLabel}
            </Button>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(40,30,20,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '90%',
    maxWidth: 420,
  } as ViewStyle,
});
