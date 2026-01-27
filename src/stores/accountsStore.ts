import { create } from 'zustand';
import type { Account } from '@/types';
import * as api from '@/api';

interface AccountsState {
  accounts: Account[];
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchAccounts: () => Promise<void>;
  createAccount: (name: string, baseCurrency?: string) => Promise<Account>;
  setSelectedAccount: (id: string | null) => void;
  clearError: () => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  selectedAccountId: null,
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null });

    try {
      const accounts = await api.getAccounts();
      set({ accounts, isLoading: false });

      // Auto-select first account if none selected
      if (!get().selectedAccountId && accounts.length > 0) {
        set({ selectedAccountId: accounts[0].id });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createAccount: async (name: string, baseCurrency?: string) => {
    set({ isLoading: true, error: null });

    try {
      const account = await api.createAccount(name, baseCurrency);
      await get().fetchAccounts();
      set({ isLoading: false });
      return account;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  setSelectedAccount: (id: string | null) => {
    set({ selectedAccountId: id });
  },

  clearError: () => {
    set({ error: null });
  },
}));
