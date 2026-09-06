/**
 * Money-zen — États UI (Loading, Empty, Error, Offline).
 * Spec section 43 : chaque écran doit gérer ces états proprement.
 */
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';

interface StateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  cta?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ icon, title, message, cta, testID }: StateProps) {
  const { tokens, spacing } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing[10] }]} testID={testID}>
      {icon ? <View style={{ marginBottom: spacing[4] }}>{icon}</View> : null}
      <Text variant="title" align="center" style={{ marginBottom: spacing[2] }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" align="center" style={{ paddingHorizontal: spacing[8] }}>
          {message}
        </Text>
      ) : null}
      {cta ? (
        <View style={{ marginTop: spacing[6] }}>
          <Button variant="primary" onPress={cta.onPress}>
            {cta.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ label, testID }: { label?: string; testID?: string }) {
  const { tokens, spacing } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing[12] }]} testID={testID}>
      <ActivityIndicator size="large" color={tokens.brand} />
      {label ? (
        <Text variant="body" color="textSecondary" align="center" style={{ marginTop: spacing[4] }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ title, message, cta, testID }: StateProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing[10] }]} testID={testID}>
      <Text variant="title" color="error" align="center" style={{ marginBottom: spacing[2] }}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={{ paddingHorizontal: spacing[8] }}>
        {message}
      </Text>
      {cta ? (
        <View style={{ marginTop: spacing[6] }}>
          <Button variant="secondary" onPress={cta.onPress}>
            {cta.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export function OfflineBanner({ lastSyncedAt }: { lastSyncedAt?: string | null }) {
  const { tokens, spacing, radius } = useTheme();
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: tokens.warning,
          borderRadius: radius.md,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
        },
      ]}
    >
      <Text variant="caption" color="textPrimary" align="center">
        {lastSyncedAt
          ? `Mode hors connexion — dernière synchro : ${lastSyncedAt}`
          : 'Mode hors connexion — données locales'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  banner: { margin: 12, alignSelf: 'center' },
});
