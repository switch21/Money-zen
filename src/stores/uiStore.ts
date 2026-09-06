/**
 * Money-zen — Store UI (transient UI state : filtre période courante, modales, etc.).
 */
import { create } from 'zustand';

import type { AnalysisPeriod, TransactionType } from '@types/index';

interface UIState {
  // Filtres globaux
  currentAnalyticsPeriod: AnalysisPeriod;
  transactionListFilter: { type: TransactionType | 'all'; accountId?: string | null; categoryId?: string | null };
  // Modales
  isAddTransactionModalOpen: boolean;
  // États de chargement
  isLoading: boolean;

  setAnalyticsPeriod: (period: AnalysisPeriod) => void;
  setTransactionListFilter: (filter: Partial<UIState['transactionListFilter']>) => void;
  openAddTransactionModal: () => void;
  closeAddTransactionModal: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentAnalyticsPeriod: 'this_month',
  transactionListFilter: { type: 'all', accountId: null, categoryId: null },
  isAddTransactionModalOpen: false,
  isLoading: false,

  setAnalyticsPeriod: (period) => set({ currentAnalyticsPeriod: period }),
  setTransactionListFilter: (filter) =>
    set((state) => ({ transactionListFilter: { ...state.transactionListFilter, ...filter } })),
  openAddTransactionModal: () => set({ isAddTransactionModalOpen: true }),
  closeAddTransactionModal: () => set({ isAddTransactionModalOpen: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
