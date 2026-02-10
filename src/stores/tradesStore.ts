import { create } from 'zustand';
import type { TradeWithDerived, CreateTradeInput, UpdateTradeInput, TradeFilters } from '@/types';
import * as api from '@/api';

interface TradesState {
  trades: TradeWithDerived[];
  selectedTrade: TradeWithDerived | null;
  filters: TradeFilters;
  isLoading: boolean;
  error: string | null;

  fetchTrades: (filters?: TradeFilters) => Promise<void>;
  selectTrade: (id: string | null) => Promise<void>;
  createTrade: (input: CreateTradeInput) => Promise<TradeWithDerived>;
  updateTrade: (id: string, input: UpdateTradeInput) => Promise<TradeWithDerived>;
  deleteTrade: (id: string) => Promise<void>;
  deleteTrades: (ids: string[]) => Promise<void>;
  setFilters: (filters: TradeFilters) => void;
  clearError: () => void;
}

export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  selectedTrade: null,
  filters: {},
  isLoading: false,
  error: null,

  fetchTrades: async (filters?: TradeFilters) => {
    const currentFilters = filters ?? get().filters;
    set({ isLoading: true, error: null });

    try {
      const trades = await api.getTrades({
        accountId: currentFilters.accountId,
        startDate: currentFilters.startDate,
        endDate: currentFilters.endDate,
      });

      // Apply client-side filters
      let filtered = trades;
      if (currentFilters.symbol) {
        filtered = filtered.filter(t =>
          t.symbol.toLowerCase().includes(currentFilters.symbol!.toLowerCase())
        );
      }
      if (currentFilters.direction) {
        filtered = filtered.filter(t => t.direction === currentFilters.direction);
      }
      if (currentFilters.result) {
        filtered = filtered.filter(t => t.result === currentFilters.result);
      }

      set({ trades: filtered, filters: currentFilters, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  selectTrade: async (id: string | null) => {
    if (!id) {
      set({ selectedTrade: null });
      return;
    }

    try {
      const trade = await api.getTrade(id);
      set({ selectedTrade: trade });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  createTrade: async (input: CreateTradeInput) => {
    set({ isLoading: true, error: null });

    try {
      const trade = await api.createTrade(input);
      await get().fetchTrades();
      set({ isLoading: false });
      return trade;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  updateTrade: async (id: string, input: UpdateTradeInput) => {
    set({ isLoading: true, error: null });

    try {
      const trade = await api.updateTrade(id, input);
      await get().fetchTrades();
      if (get().selectedTrade?.id === id) {
        set({ selectedTrade: trade });
      }
      set({ isLoading: false });
      return trade;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteTrade: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await api.deleteTrade(id);
      await get().fetchTrades();
      if (get().selectedTrade?.id === id) {
        set({ selectedTrade: null });
      }
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteTrades: async (ids: string[]) => {
    if (ids.length === 0) return;

    set({ isLoading: true, error: null });

    try {
      await Promise.all(ids.map(id => api.deleteTrade(id)));
      await get().fetchTrades();
      const selectedTrade = get().selectedTrade;
      if (selectedTrade && ids.includes(selectedTrade.id)) {
        set({ selectedTrade: null });
      }
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  setFilters: (filters: TradeFilters) => {
    set({ filters });
  },

  clearError: () => {
    set({ error: null });
  },
}));
