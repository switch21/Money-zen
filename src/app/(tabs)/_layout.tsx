/**
 * Money-zen — Layout des tabs (5 onglets : Accueil, Transactions, Comptes, Analyse, Paramètres).
 * Spec section 8 : navigation mobile simple.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@theme/ThemeProvider';
import { LAYOUT } from '@theme/tokens';
import { t } from '@i18n/index';

export default function TabsLayout() {
  const { tokens } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.brand,
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.borderSubtle,
          height: LAYOUT.bottomTabHeight,
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tab.transactions'),
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-vertical" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t('tab.accounts'),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('tab.analytics'),
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
