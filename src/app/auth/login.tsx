/**
 * Money-zen — Écran de login Supabase.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { AuthService } from '@services/sync/authService';
import { isSupabaseEnabled } from '@services/sync/supabaseClient';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { MoneyZenError } from '@types/index';
import { t } from '@i18n/index';

export default function LoginScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.signIn(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : t('error.generic');
      Alert.alert('Connexion échouée', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseEnabled()) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
        <Card padding="lg">
          <Text variant="title" style={{ marginBottom: spacing[2] }}>
            Cloud non configuré
          </Text>
          <Text variant="body" color="textSecondary">
            Supabase n'est pas activé. Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env, puis relancez l'app.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[6], flex: 1, justifyContent: 'center' }}>
      <Text variant="h2" align="center" style={{ marginBottom: spacing[2] }}>
        Connexion
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={{ marginBottom: spacing[6] }}>
        Synchronisez vos données Money-zen dans le cloud.
      </Text>

      <Card padding="lg" elevation="medium">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          secureTextEntry
          autoCapitalize="none"
        />

        <View style={{ marginTop: spacing[4] }}>
          {loading ? (
            <ActivityIndicator size="large" color={tokens.brand} />
          ) : (
            <Button variant="primary" size="lg" fullWidth onPress={handleLogin}>
              Se connecter
            </Button>
          )}
        </View>

        <View style={{ marginTop: spacing[4], alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onPress={() => router.push('/auth/register')}>
            Pas de compte ? S'inscrire
          </Button>
        </View>
      </Card>

      <View style={{ marginTop: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.replace('/(tabs)')}>
          Continuer sans compte (local uniquement)
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
