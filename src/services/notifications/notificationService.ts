/**
 * Money-zen — NotificationService (Phase 12).
 *
 * Spec section 31 :
 *   - Rappel de saisie (quotidien)
 *   - Budget presque atteint
 *   - Budget dépassé
 *   - Transaction récurrente imminente
 *   - Objectifs
 *   - Résumé hebdomadaire
 *
 * Toutes les notifications sont configurables.
 * Utilise expo-notifications.
 */
import * as Notifications from 'expo-notifications';

import { useSettingsStore } from '@stores/settingsStore';
import type { NotificationSettings } from '@types/index';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleReminder(): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableReminder) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Money-zen',
        body: 'N\'oubliez pas de saisir vos dépenses du jour.',
      },
      trigger: { hour: settings.reminderHour, minute: 0, repeats: true },
    });
  },

  async scheduleWeeklySummary(): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableWeeklySummary) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Money-zen — Résumé hebdomadaire',
        body: 'Consultez vos dépenses de la semaine.',
      },
      trigger: { weekday: 1, hour: 10, minute: 0, repeats: true }, // lundi matin
    });
  },

  async sendBudgetWarning(budgetName: string, percent: number): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableBudgetWarning) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Budget bientôt atteint',
        body: `${budgetName} : ${percent.toFixed(0)} % utilisé.`,
      },
      trigger: null, // immédiat
    });
  },

  async sendBudgetOver(budgetName: string, overage: string): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableBudgetOver) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Budget dépassé',
        body: `${budgetName} dépassé de ${overage}.`,
      },
      trigger: null,
    });
  },

  async sendRecurringReminder(description: string, date: string): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableRecurring) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Récurrence imminente',
        body: `${description} prévu le ${date}.`,
      },
      trigger: null,
    });
  },

  async sendGoalProgress(goalName: string, percent: number): Promise<void> {
    const settings = useSettingsStore.getState().settings.notifications;
    if (!settings.enableGoalUpdates) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Objectif en progression',
        body: `${goalName} : ${percent.toFixed(0)} % atteint.`,
      },
      trigger: null,
    });
  },

  async cancelAll(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  },

  async reScheduleAll(settings: NotificationSettings): Promise<void> {
    await this.cancelAll();
    if (settings.enableReminder) await this.scheduleReminder();
    if (settings.enableWeeklySummary) await this.scheduleWeeklySummary();
  },
};
