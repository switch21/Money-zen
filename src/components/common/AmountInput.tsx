/**
 * Money-zen — AmountInput (saisie de montant avec clavier numérique).
 * Spec section 13 : écran d'ajout extrêmement rapide, clavier numérique adapté.
 */
import { useState, useEffect, useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

import { useTheme } from '@theme/ThemeProvider';
import { fromMinor, toMinor } from '@utils/money';
import type { CurrencyCode, MoneyMinor } from '@types/index';
import { findCurrencyByCode } from '@constants/currencies';
import { Text } from './Text';

interface AmountInputProps {
  value: MoneyMinor;
  currencyCode: CurrencyCode;
  onChange: (minor: MoneyMinor) => void;
  placeholder?: string;
  testID?: string;
}

export function AmountInput({ value, currencyCode, onChange, placeholder = '0', testID }: AmountInputProps) {
  const { tokens, fontSize, fontWeight, spacing, radius } = useTheme();
  const currency = findCurrencyByCode(currencyCode);
  const decimals = currency?.decimals ?? 0;

  // Le texte affiché est le montant "lisible" (ex. "25000" pour XAF, "25.50" pour EUR).
  const [text, setText] = useState<string>(() => (value > 0 ? fromMinor(value, currencyCode).toString() : ''));

  // Resync si value change extérieurement.
  useEffect(() => {
    if (value === 0) {
      setText('');
    } else {
      const current = text.length > 0 ? toMinor(parseFloat(text.replace(',', '.')), currencyCode) : 0;
      if (current !== value) {
        setText(fromMinor(value, currencyCode).toString());
      }
    }
  }, [value, currencyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const symbol = currency?.symbol ?? currencyCode;
  const symbolBefore = currency?.symbolPosition === 'before';

  const handleTextChange = (input: string) => {
    // Nettoie : ne garde que chiffres et un séparateur décimal.
    const cleaned = input.replace(/[^\d.,]/g, '');
    setText(cleaned);
    if (cleaned.length === 0) {
      onChange(0);
      return;
    }
    try {
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        onChange(toMinor(parsed, currencyCode));
      }
    } catch {
      // ignore
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.surface,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: tokens.border,
        paddingHorizontal: spacing[4],
        minHeight: 64,
      }}
      testID={testID}
    >
      {symbolBefore ? (
        <Text variant="amountLarge" color="brand" style={{ marginRight: spacing[2] }}>
          {symbol}
        </Text>
      ) : null}
      <TextInput
        style={{
          flex: 1,
          fontSize: fontSize['3xl'],
          fontWeight: fontWeight.bold,
          color: tokens.textPrimary,
          paddingVertical: 8,
          fontVariant: ['tabular-nums'],
        }}
        value={text}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.textTertiary}
        keyboardType="decimal-pad"
        returnKeyType="done"
        selectionColor={tokens.brand}
      />
      {!symbolBefore ? (
        <Text variant="amount" color="textSecondary" style={{ marginLeft: spacing[2] }}>
          {symbol}
        </Text>
      ) : null}
    </View>
  );
}
