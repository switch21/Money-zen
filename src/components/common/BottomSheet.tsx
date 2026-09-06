/**
 * Money-zen — BottomSheet (modal mobile natif, glisse depuis le bas).
 * Spec section 41 : BottomSheet dans la liste des composants réutilisables.
 */
import { Modal, View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  height?: 'auto' | '60%' | '80%' | '90%';
}

export function BottomSheet({ visible, onClose, children, title, height = 'auto' }: BottomSheetProps) {
  const { tokens, spacing, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: spacing[4],
              paddingHorizontal: spacing[5],
              paddingBottom: spacing[6],
              maxHeight: height === '90%' ? '90%' : height === '80%' ? '80%' : height === '60%' ? '60%' : undefined,
              height: height === 'auto' ? undefined : height,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.border,
              alignSelf: 'center',
              marginBottom: spacing[4],
            }}
          />
          {title ? <View style={{ marginBottom: spacing[3] }}>{title}</View> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(40,30,20,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    width: '100%',
  } as ViewStyle,
});
