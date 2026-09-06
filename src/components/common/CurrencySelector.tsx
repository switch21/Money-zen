/**
 * Money-zen — CurrencySelector (liste des devises activées).
 */
import { View, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

import { useTheme } from '@theme/ThemeProvider';
import type { Currency, CurrencyCode } from '@types/index';
import { listEnabledCurrencies } from '@database/repositories/currencyRepository';
import { Text } from './Text';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  testID?: string;
}

export function CurrencySelector({ value, onSelect, testID }: CurrencySelectorProps) {
  const { tokens, spacing, radius } = useTheme();
  const currencies = listEnabledCurrencies();

  return (
    <FlatList
      data={currencies}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.code}
      style={styles.list}
      contentContainerStyle={{ paddingHorizontal: 0, gap: spacing[2] }}
      renderItem={({ item }: { item: Currency }) => {
        const selected = item.code === value;
        return (
          <TouchableOpacity
            testID={`currency-${item.code}`}
            onPress={() => onSelect(item.code)}
            style={{
              paddingVertical: spacing[2],
              paddingHorizontal: spacing[4],
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: selected ? tokens.brand : tokens.border,
              backgroundColor: selected ? tokens.brandSoft : tokens.surface,
            }}
          >
            <Text variant="bodyStrong" color={selected ? 'brand' : 'textSecondary'}>
              {item.flag} {item.code}
            </Text>
          </TouchableOpacity>
        );
      }}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0, marginBottom: 8 },
});
