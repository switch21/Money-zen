/** Jest setup — bibliothèque de mocks communs. */
require('@testing-library/jest-native/extend-expect');

// Mock minimaliste de modules natifs Expo non disponibles en test.
jest.mock('expo-sqlite', () => {
  const inMemory: Record<string, any> = {};
  return {
    openDatabaseSync: jest.fn(() => ({
      execSync: jest.fn((sql: string) => {
        if (!inMemory[sql]) inMemory[sql] = [];
        return { rowsAffected: 0, rows: { _array: [], length: 0 } };
      }),
      runSync: jest.fn((sql: string, params: any[] = []) => {
        return { rowsAffected: 0, lastInsertRowId: 0, rows: { _array: [], length: 0 } };
      }),
      getAllSync: jest.fn(() => []),
      getFirstSync: jest.fn(() => null),
      closeSync: jest.fn(),
      withTransactionSync: jest.fn((fn: () => void) => fn()),
    })),
  };
});

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([])),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { HIGH: 'high' },
}));
