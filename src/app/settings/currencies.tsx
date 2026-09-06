/**
 * Money-zen — Settings > Currencies management (activation des devises).
 */
import { View, ScrollView, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listAllCurrencies, enableCurrency } from '@database/repositories/currencyRepository';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { t } from '@i18n/index';

export default function CurrenciesSettingsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const setBaseCurrency = useSettingsStore((s) => s.setBaseCurrency);
  const currencies = listAllCurrencies();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}>
      <View style={{ flexDirection: 'row', marginBottom: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          ← {t('common.back')}
        </Button>
      </View>
      <Text variant="h2" style={{ marginBottom: spacing[4] }}>
        {t('settings.baseCurrency')}
      </Text>

      <Card padding="md" style={{ marginBottom: spacing[4] }}>
        <Text variant="body" color="textSecondary">
          Devise principale actuelle :
        </Text>
        <Text variant="title" color="brand" style={{ marginTop: 4 }}>
          {baseCurrency}
        </Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
          Toutes les agrégations sont affichées dans cette devise.
        </Text>
      </Card>

      <Text variant="title" style={{ marginBottom: spacing[2] }}>
        Devises disponibles
      </Text>
      <Card padding="md">
        {currencies.map((c) => (
          <View
            key={c.code}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.borderSubtle }}
          >
            <Text variant="title" style={{ marginRight: 12 }}>
              {c.flag}
            </Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="bodyStrong">{c.code}</Text>
                {c.code === baseCurrency ? <Badge label="Principale" variant="brand" /> : null}
              </View>
              <Text variant="caption" color="textTertiary">
                {c.name} · {c.symbol}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {c.isEnabled && c.code !== baseCurrency ? (
                <Button variant="ghost" size="sm" onPress={() => setBaseCurrency(c.code)}>
                  Définir principale
                </Button>
              ) : null}
              <Switch
                value={c.isEnabled}
                onValueChange={(v) => enableCurrency(c.code, v)}
                disabled={c.code === baseCurrency}
              />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
