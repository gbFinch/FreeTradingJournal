import { create } from 'zustand';
import type { ImportPreview, ImportResult } from '@/types';
import * as api from '@/api';

interface ImportState {
  // Dialog state
  isOpen: boolean;
  step: 'select' | 'preview' | 'importing' | 'complete';

  // File state
  filePath: string | null;

  // Preview state
  preview: ImportPreview | null;
  selectedTradeKeys: Set<string>;

  // Result state
  result: ImportResult | null;

  // Loading/error state
  isLoading: boolean;
  error: string | null;

  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  selectFile: () => Promise<void>;
  loadPreview: () => Promise<void>;
  toggleTradeSelection: (tradeKey: string) => void;
  selectAllTrades: () => void;
  deselectAllTrades: () => void;
  executeImport: (accountId: string, skipDuplicates?: boolean) => Promise<ImportResult>;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  step: 'select' as const,
  filePath: null,
  preview: null,
  selectedTradeKeys: new Set<string>(),
  result: null,
  isLoading: false,
  error: null,
};

export const useImportStore = create<ImportState>((set, get) => ({
  ...initialState,

  openDialog: () => {
    set({ ...initialState, isOpen: true });
  },

  closeDialog: () => {
    set({ isOpen: false });
  },

  selectFile: async () => {
    set({ isLoading: true, error: null });

    try {
      const filePath = await api.selectTlgFile();

      if (filePath) {
        set({ filePath, isLoading: false });
        // Automatically load preview after selecting file
        await get().loadPreview();
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadPreview: async () => {
    const { filePath } = get();
    if (!filePath) {
      set({ error: 'No file selected' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const preview = await api.previewTlgImport(filePath);

      // Auto-select all trades to import
      const selectedKeys = new Set(preview.trades_to_import.map(t => t.key));

      set({
        preview,
        selectedTradeKeys: selectedKeys,
        step: 'preview',
        isLoading: false,
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  toggleTradeSelection: (tradeKey: string) => {
    const { selectedTradeKeys } = get();
    const newSelected = new Set(selectedTradeKeys);

    if (newSelected.has(tradeKey)) {
      newSelected.delete(tradeKey);
    } else {
      newSelected.add(tradeKey);
    }

    set({ selectedTradeKeys: newSelected });
  },

  selectAllTrades: () => {
    const { preview } = get();
    if (!preview) return;

    const allKeys = new Set(preview.trades_to_import.map(t => t.key));
    set({ selectedTradeKeys: allKeys });
  },

  deselectAllTrades: () => {
    set({ selectedTradeKeys: new Set() });
  },

  executeImport: async (accountId: string, skipDuplicates = true) => {
    const { preview, selectedTradeKeys } = get();
    if (!preview) {
      throw new Error('No preview loaded');
    }

    // Filter to only selected trades
    const selectedTrades = preview.trades_to_import.filter(t =>
      selectedTradeKeys.has(t.key)
    );

    if (selectedTrades.length === 0) {
      throw new Error('No trades selected');
    }

    set({ step: 'importing', isLoading: true, error: null });

    try {
      const result = await api.executeTlgImport(accountId, selectedTrades, skipDuplicates);

      set({
        result,
        step: 'complete',
        isLoading: false,
      });

      return result;
    } catch (error) {
      set({ error: String(error), isLoading: false, step: 'preview' });
      throw error;
    }
  },

  reset: () => {
    set(initialState);
  },
}));

// Selectors for derived state
export const useSelectedTradeCount = () => useImportStore(state => state.selectedTradeKeys.size);

export const useTradesToImportCount = () => useImportStore(
  state => state.preview?.trades_to_import.length ?? 0
);

export const useOpenPositionsCount = () => useImportStore(
  state => state.preview?.open_positions.length ?? 0
);

export const useParseErrorCount = () => useImportStore(
  state => state.preview?.parse_errors.length ?? 0
);

export const useSelectedTrades = () => useImportStore(state => {
  const { preview, selectedTradeKeys } = state;
  if (!preview) return [];
  return preview.trades_to_import.filter(t => selectedTradeKeys.has(t.key));
});
