/**
 * Money-zen — Écran d'inscription Supabase.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { AuthService } from '@services/sync/authService';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { MoneyZenError } from '@types/index';

export default function RegisterScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.signUp(email, password);
      Alert.alert(
        'Inscription réussie',
        'Vérifiez votre email pour confirmer votre compte, puis connectez-vous.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }],
      );
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : 'Erreur lors de l\'inscription';
      Alert.alert('Inscription échouée', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[6], flex: 1, justifyContent: 'center' }}>
      <Text variant="h2" align="center" style={{ marginBottom: spacing[6] }}>
        Créer un compte
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
          placeholder="6 caractères minimum"
          secureTextEntry
          autoCapitalize="none"
        />
        <Input
          label="Confirmer le mot de passe"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••"
          secureTextEntry
          autoCapitalize="none"
        />

        <View style={{ marginTop: spacing[4] }}>
          {loading ? (
            <ActivityIndicator size="large" color={tokens.brand} />
          ) : (
            <Button variant="primary" size="lg" fullWidth onPress={handleRegister}>
              S'inscrire
            </Button>
          )}
        </View>
      </Card>

      <View style={{ marginTop: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.replace('/auth/login')}>
          Déjà un compte ? Se connecter
        </Button>
      </View>
    </ScrollView>
  );
}
