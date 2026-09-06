/**
 * Money-zen — Settings tab.
 * Spec sections 32, 47, 53, 54 : langue, thème, devise principale, sécurité, notifications, données.
 */
import { View, ScrollView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { useAppStore } from '@stores/appStore';
import { clearDemoData } from '@database/demoData';
import { Card, Section } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { t } from '@i18n/index';
import { useState } from 'react';
import { AUTO_LOCK_OPTIONS } from '@constants/index';

function SettingRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { tokens, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
      }}
      onTouchEnd={onPress}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textTertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setBaseCurrency = useSettingsStore((s) => s.setBaseCurrency);
  const setDemoMode = useSettingsStore((s) => s.setDemoMode);
  const updateSecurity = useSettingsStore((s) => s.updateSecurity);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const setDemoModeApp = useAppStore((s) => s.setDemoMode);

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16], gap: spacing[5] }}
    >
      <Text variant="h2">{t('settings.title')}</Text>

      {/* Préférences */}
      <Section title={<Text variant="title">{t('settings.preferences')}</Text>}>
        <Card padding="md">
          <SettingRow
            title={t('settings.language')}
            subtitle={t('settings.language.fr')}
            right={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant={settings.language === 'fr' ? 'primary' : 'secondary'} size="sm" onPress={() => setLanguage('fr')}>
                  FR
                </Button>
                <Button variant={settings.language === 'en' ? 'primary' : 'secondary'} size="sm" onPress={() => setLanguage('en')}>
                  EN
                </Button>
              </View>
            }
          />
          <SettingRow
            title={t('settings.theme')}
            right={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['light', 'dark', 'system'] as const).map((th) => (
                  <Button
                    key={th}
                    variant={settings.themePreference === th ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setTheme(th)}
                  >
                    {t(`settings.theme.${th}` as never)}
                  </Button>
                ))}
              </View>
            }
          />
          <SettingRow
            title={t('settings.baseCurrency')}
            right={<Text variant="bodyStrong" color="brand">{settings.baseCurrency}</Text>}
            onPress={() => router.push('/settings/currencies')}
          />
        </Card>
      </Section>

      {/* Sécurité */}
      <Section title={<Text variant="title">{t('settings.security')}</Text>}>
        <Card padding="md">
          <SettingRow
            title={t('settings.security.pin')}
            right={<Switch value={settings.security.isPinEnabled} onValueChange={(v) => updateSecurity({ isPinEnabled: v })} />}
          />
          <SettingRow
            title={t('settings.security.biometric')}
            right={
              <Switch
                value={settings.security.isBiometricEnabled}
                onValueChange={(v) => updateSecurity({ isBiometricEnabled: v })}
              />
            }
          />
          <SettingRow
            title={t('settings.security.autoLock')}
            right={
              <Text variant="caption" color="textSecondary">
                {AUTO_LOCK_OPTIONS.find((o) => o.value === settings.security.autoLockDelaySeconds)?.labelKey ?? '—'}
              </Text>
            }
          />
        </Card>
      </Section>

      {/* Notifications */}
      <Section title={<Text variant="title">{t('settings.notifications')}</Text>}>
        <Card padding="md">
          <SettingRow
            title={t('settings.notifications.reminder')}
            right={<Switch value={settings.notifications.enableReminder} onValueChange={(v) => updateNotifications({ enableReminder: v })} />}
          />
          <SettingRow
            title={t('settings.notifications.budgetWarning')}
            right={<Switch value={settings.notifications.enableBudgetWarning} onValueChange={(v) => updateNotifications({ enableBudgetWarning: v })} />}
          />
          <SettingRow
            title={t('settings.notifications.budgetOver')}
            right={<Switch value={settings.notifications.enableBudgetOver} onValueChange={(v) => updateNotifications({ enableBudgetOver: v })} />}
          />
          <SettingRow
            title={t('settings.notifications.recurring')}
            right={<Switch value={settings.notifications.enableRecurring} onValueChange={(v) => updateNotifications({ enableRecurring: v })} />}
          />
          <SettingRow
            title={t('settings.notifications.weeklySummary')}
            right={<Switch value={settings.notifications.enableWeeklySummary} onValueChange={(v) => updateNotifications({ enableWeeklySummary: v })} />}
          />
        </Card>
      </Section>

      {/* Données */}
      <Section title={<Text variant="title">{t('settings.data')}</Text>}>
        <Card padding="md">
          <SettingRow
            title={t('settings.data.export')}
            onPress={() => router.push('/settings/export')}
          />
          <SettingRow
            title={t('settings.data.demoMode')}
            right={
              <Switch
                value={isDemoMode}
                onValueChange={(v) => {
                  if (v) {
                    setDemoMode(true);
                    setDemoModeApp(true);
                  } else {
                    Alert.alert(t('settings.data.demoMode'), t('settings.data.demoMode.warning'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.confirm'),
                        style: 'destructive',
                        onPress: () => {
                          clearDemoData();
                          setDemoMode(false);
                          setDemoModeApp(false);
                        },
                      },
                    ]);
                  }
                }}
              />
            }
          />
          <SettingRow
            title={t('settings.data.clearAll')}
            onPress={() => setConfirmClear(true)}
          />
        </Card>
      </Section>

      {/* À propos */}
      <Section title={<Text variant="title">{t('settings.about')}</Text>}>
        <Card padding="md">
          <SettingRow title={t('settings.about.version')} right={<Text variant="caption" color="textTertiary">0.1.0</Text>} />
          <SettingRow title={t('settings.about.privacy')} onPress={() => router.push('/settings/privacy')} />
        </Card>
      </Section>

      <ConfirmDialog
        visible={confirmClear}
        title={t('settings.data.clearAll.confirm')}
        message={t('settings.data.clearAll.confirm.message')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmClear(false);
          // TODO: effacer toutes les données via settingsRepository.reset() + drop tables
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </ScrollView>
  );
}
