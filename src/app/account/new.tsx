/**
 * Money-zen — Création de compte (Phase 3).
 */
import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { createAccount } from '@database/repositories/accountRepository';
import { listEnabledCurrencies } from '@database/repositories/currencyRepository';
import { toMinor } from '@utils/money';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { MoneyZenError } from '@types/index';
import type { AccountType, MobileMoneyProvider } from '@types/index';
import { t } from '@i18n/index';

const ACCOUNT_TYPES: Array<{ type: AccountType; labelKey: string; icon: string }> = [
  { type: 'cash', labelKey: 'account.type.cash', icon: '💵' },
  { type: 'bank', labelKey: 'account.type.bank', icon: '🏦' },
  { type: 'mobile_money', labelKey: 'account.type.mobile_money', icon: '📱' },
  { type: 'savings', labelKey: 'account.type.savings', icon: '🐷' },
  { type: 'card', labelKey: 'account.type.card', icon: '💳' },
  { type: 'crypto', labelKey: 'account.type.crypto', icon: '₿' },
  { type: 'wallet', labelKey: 'account.type.wallet', icon: '👛' },
  { type: 'other', labelKey: 'account.type.other', icon: '📦' },
];

const MOBILE_PROVIDERS: Array<{ key: MobileMoneyProvider; label: string }> = [
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'mtn_momo', label: 'MTN MoMo' },
  { key: 'moov_money', label: 'Moov Money' },
  { key: 'wave', label: 'Wave' },
  { key: 'other', label: 'Autre' },
];

export default function CreateAccountScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);

  const currencies = listEnabledCurrencies();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState(baseCurrency);
  const [balanceText, setBalanceText] = useState('');
  const [icon, setIcon] = useState('💵');
  const [color, setColor] = useState('#C97048');
  const [mobileProvider, setMobileProvider] = useState<MobileMoneyProvider | null>(null);

  const handleSave = () => {
    try {
      if (!name.trim()) {
        Alert.alert('Erreur', t('account.error.name.required'));
        return;
      }
      const balance = balanceText ? toMinor(parseFloat(balanceText.replace(',', '.')), currency) : 0;
      if (type === 'mobile_money' && !mobileProvider) {
        Alert.alert('Erreur', 'Sélectionnez un opérateur Mobile Money.');
        return;
      }
      createAccount({
        name,
        type,
        currency,
        initialBalanceMinor: balance,
        icon,
        color,
        mobileMoneyProvider: type === 'mobile_money' ? mobileProvider ?? undefined : undefined,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : t('error.save');
      Alert.alert(t('error.save'), msg);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}>
      <Text variant="h2" style={{ marginBottom: spacing[4] }}>
        {t('account.add')}
      </Text>

      <Input label={t('account.name')} value={name} onChangeText={setName} placeholder="ex. Espèces" />

      <Text variant="label" style={{ marginTop: spacing[2], marginBottom: spacing[2] }}>
        {t('account.type')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {ACCOUNT_TYPES.map((ty) => (
          <Button key={ty.type} variant={type === ty.type ? 'primary' : 'secondary'} size="sm" onPress={() => { setType(ty.type); setIcon(ty.icon); }}>
            {ty.icon} {t(ty.labelKey as never)}
          </Button>
        ))}
      </View>

      {type === 'mobile_money' ? (
        <>
          <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
            Opérateur
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {MOBILE_PROVIDERS.map((p) => (
              <Button key={p.key} variant={mobileProvider === p.key ? 'primary' : 'secondary'} size="sm" onPress={() => setMobileProvider(p.key)}>
                {p.label}
              </Button>
            ))}
          </View>
        </>
      ) : null}

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('account.currency')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {currencies.map((c) => (
          <Button key={c.code} variant={currency === c.code ? 'primary' : 'secondary'} size="sm" onPress={() => setCurrency(c.code)}>
            {c.flag} {c.code}
          </Button>
        ))}
      </View>

      <View style={{ marginTop: spacing[4] }}>
        <Input label={t('account.initialBalance')} value={balanceText} onChangeText={setBalanceText} placeholder="0" keyboardType="decimal-pad" helper={`Devise : ${currency}`} />
      </View>

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('account.color')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['#C97048', '#7B8DC9', '#5C8B73', '#A67C52', '#D08B5C', '#B8907D', '#7DA68C', '#9B9489'].map((c) => (
          <View
            key={c}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c,
              borderWidth: color === c ? 3 : 0,
              borderColor: tokens.brand,
            }}
            onTouchEnd={() => setColor(c)}
          />
        ))}
      </View>

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
      </View>
    </ScrollView>
  );
}
