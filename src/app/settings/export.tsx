/**
 * Money-zen — Settings > Export (Phase 14 UI).
 */
import { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { ExportService } from '@services/export/exportService';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { t } from '@i18n/index';
import { format } from 'date-fns';

export default function ExportSettingsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const today = format(new Date(), 'yyyy-MM');
  const [yearMonth, setYearMonth] = useState(today);
  const [busy, setBusy] = useState(false);

  const parseYearMonth = (ym: string): { year: number; month: number } => {
    const [y, m] = ym.split('-').map((s) => parseInt(s, 10));
    return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 };
  };

  const handleExportCsv = async () => {
    setBusy(true);
    try {
      const { year, month } = parseYearMonth(yearMonth);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59).toISOString();
      await ExportService.shareTransactionsCsv(start, end);
    } catch (e) {
      Alert.alert(t('error.generic'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExportPdf = async () => {
    setBusy(true);
    try {
      const { year, month } = parseYearMonth(yearMonth);
      await ExportService.shareMonthlyReportPdf(year, month);
    } catch (e) {
      Alert.alert(t('error.generic'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}>
      <View style={{ marginBottom: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          ← {t('common.back')}
        </Button>
      </View>

      <Text variant="h2" style={{ marginBottom: spacing[4] }}>
        {t('settings.data.export')}
      </Text>

      <Card padding="md" style={{ marginBottom: spacing[4] }}>
        <Text variant="body" color="textSecondary" style={{ marginBottom: spacing[2] }}>
          Période (AAAA-MM) :
        </Text>
        <Input value={yearMonth} onChangeText={setYearMonth} placeholder="2026-09" />
      </Card>

      <View style={{ gap: spacing[3] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleExportCsv} disabled={busy}>
          {busy ? <ActivityIndicator color="white" /> : 'Exporter en CSV'}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onPress={handleExportPdf} disabled={busy}>
          {busy ? <ActivityIndicator color="#B5533C" /> : 'Exporter en PDF'}
        </Button>
      </View>

      <View style={{ marginTop: spacing[6] }}>
        <Text variant="caption" color="textTertiary">
          Le CSV contient la liste détaillée des transactions. Le PDF génère un rapport mensuel lisible (patrimoine, revenus, dépenses, lignes).
        </Text>
      </View>
    </ScrollView>
  );
}
