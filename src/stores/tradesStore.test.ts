import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTradesStore } from "./tradesStore";
import * as api from "@/api";
import type { TradeWithDerived } from "@/types";

vi.mock("@/api");

const mockTrade: TradeWithDerived = {
  id: "trade-1",
  user_id: "user-1",
  account_id: "account-1",
  instrument_id: "inst-1",
  symbol: "AAPL",
  asset_class: "stock",
  trade_number: 1,
  trade_date: "2024-01-15",
  direction: "long",
  quantity: 100,
  entry_price: 150,
  exit_price: 160,
  stop_loss_price: 145,
  entry_time: "09:30:00",
  exit_time: "15:00:00",
  fees: 2,
  strategy: "momentum",
  notes: "Good setup",
  status: "closed",
  created_at: "2024-01-15T09:30:00Z",
  updated_at: "2024-01-15T15:00:00Z",
  gross_pnl: 1000,
  net_pnl: 998,
  pnl_per_share: 10,
  risk_per_share: 5,
  r_multiple: 2,
  result: "win",
};

const mockTrade2: TradeWithDerived = {
  ...mockTrade,
  id: "trade-2",
  symbol: "MSFT",
  direction: "short",
  net_pnl: -500,
  result: "loss",
};

describe("useTradesStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useTradesStore.setState({
      trades: [],
      selectedTrade: null,
      filters: {},
      isLoading: false,
      error: null,
    });
  });

  describe("initial state", () => {
    it("has correct initial state", () => {
      const state = useTradesStore.getState();
      expect(state.trades).toEqual([]);
      expect(state.selectedTrade).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchTrades", () => {
    it("fetches trades and updates state", async () => {
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade, mockTrade2]);

      await useTradesStore.getState().fetchTrades();

      const state = useTradesStore.getState();
      expect(state.trades).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(api.getTrades).toHaveBeenCalledWith({
        accountId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it("sets loading state while fetching", async () => {
      let resolvePromise: (value: TradeWithDerived[]) => void;
      vi.mocked(api.getTrades).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const fetchPromise = useTradesStore.getState().fetchTrades();
      expect(useTradesStore.getState().isLoading).toBe(true);

      resolvePromise!([mockTrade]);
      await fetchPromise;

      expect(useTradesStore.getState().isLoading).toBe(false);
    });

    it("handles fetch error", async () => {
      vi.mocked(api.getTrades).mockRejectedValue(new Error("Network error"));

      await useTradesStore.getState().fetchTrades();

      const state = useTradesStore.getState();
      expect(state.error).toBe("Error: Network error");
      expect(state.isLoading).toBe(false);
    });

    it("applies symbol filter client-side", async () => {
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade, mockTrade2]);

      await useTradesStore.getState().fetchTrades({ symbol: "AAPL" });

      const state = useTradesStore.getState();
      expect(state.trades).toHaveLength(1);
      expect(state.trades[0].symbol).toBe("AAPL");
    });

    it("applies direction filter client-side", async () => {
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade, mockTrade2]);

      await useTradesStore.getState().fetchTrades({ direction: "short" });

      const state = useTradesStore.getState();
      expect(state.trades).toHaveLength(1);
      expect(state.trades[0].direction).toBe("short");
    });

    it("applies result filter client-side", async () => {
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade, mockTrade2]);

      await useTradesStore.getState().fetchTrades({ result: "win" });

      const state = useTradesStore.getState();
      expect(state.trades).toHaveLength(1);
      expect(state.trades[0].result).toBe("win");
    });

    it("uses existing filters when none provided", async () => {
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade]);
      useTradesStore.setState({ filters: { accountId: "acc-1" } });

      await useTradesStore.getState().fetchTrades();

      expect(api.getTrades).toHaveBeenCalledWith({
        accountId: "acc-1",
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe("selectTrade", () => {
    it("fetches and selects a trade by id", async () => {
      vi.mocked(api.getTrade).mockResolvedValue(mockTrade);

      await useTradesStore.getState().selectTrade("trade-1");

      const state = useTradesStore.getState();
      expect(state.selectedTrade).toEqual(mockTrade);
      expect(api.getTrade).toHaveBeenCalledWith("trade-1");
    });

    it("clears selection when id is null", async () => {
      useTradesStore.setState({ selectedTrade: mockTrade });

      await useTradesStore.getState().selectTrade(null);

      expect(useTradesStore.getState().selectedTrade).toBeNull();
      expect(api.getTrade).not.toHaveBeenCalled();
    });

    it("handles selection error", async () => {
      vi.mocked(api.getTrade).mockRejectedValue(new Error("Not found"));

      await useTradesStore.getState().selectTrade("invalid-id");

      expect(useTradesStore.getState().error).toBe("Error: Not found");
    });
  });

  describe("createTrade", () => {
    it("creates trade and refreshes list", async () => {
      vi.mocked(api.createTrade).mockResolvedValue(mockTrade);
      vi.mocked(api.getTrades).mockResolvedValue([mockTrade]);

      const result = await useTradesStore.getState().createTrade({
        account_id: "account-1",
        symbol: "AAPL",
        trade_date: "2024-01-15",
        direction: "long",
        entry_price: 150,
      });

      expect(result).toEqual(mockTrade);
      expect(api.createTrade).toHaveBeenCalled();
      expect(api.getTrades).toHaveBeenCalled();
      expect(useTradesStore.getState().isLoading).toBe(false);
    });

    it("handles create error and rethrows", async () => {
      vi.mocked(api.createTrade).mockRejectedValue(new Error("Validation failed"));

      await expect(
        useTradesStore.getState().createTrade({
          account_id: "account-1",
          symbol: "AAPL",
          trade_date: "2024-01-15",
          direction: "long",
          entry_price: 150,
        })
      ).rejects.toThrow("Validation failed");

      expect(useTradesStore.getState().error).toBe("Error: Validation failed");
      expect(useTradesStore.getState().isLoading).toBe(false);
    });
  });

  describe("updateTrade", () => {
    it("updates trade and refreshes list", async () => {
      const updatedTrade = { ...mockTrade, symbol: "GOOGL" };
      vi.mocked(api.updateTrade).mockResolvedValue(updatedTrade);
      vi.mocked(api.getTrades).mockResolvedValue([updatedTrade]);

      const result = await useTradesStore
        .getState()
        .updateTrade("trade-1", { symbol: "GOOGL" });

      expect(result.symbol).toBe("GOOGL");
      expect(api.updateTrade).toHaveBeenCalledWith("trade-1", { symbol: "GOOGL" });
    });

    it("updates selectedTrade if it matches", async () => {
      const updatedTrade = { ...mockTrade, symbol: "GOOGL" };
      vi.mocked(api.updateTrade).mockResolvedValue(updatedTrade);
      vi.mocked(api.getTrades).mockResolvedValue([updatedTrade]);
      useTradesStore.setState({ selectedTrade: mockTrade });

      await useTradesStore.getState().updateTrade("trade-1", { symbol: "GOOGL" });

      expect(useTradesStore.getState().selectedTrade?.symbol).toBe("GOOGL");
    });

    it("handles update error and rethrows", async () => {
      vi.mocked(api.updateTrade).mockRejectedValue(new Error("Update failed"));

      await expect(
        useTradesStore.getState().updateTrade("trade-1", { symbol: "GOOGL" })
      ).rejects.toThrow("Update failed");

      expect(useTradesStore.getState().error).toBe("Error: Update failed");
    });
  });

  describe("deleteTrade", () => {
    it("deletes trade and refreshes list", async () => {
      vi.mocked(api.deleteTrade).mockResolvedValue(undefined);
      vi.mocked(api.getTrades).mockResolvedValue([]);

      await useTradesStore.getState().deleteTrade("trade-1");

      expect(api.deleteTrade).toHaveBeenCalledWith("trade-1");
      expect(api.getTrades).toHaveBeenCalled();
    });

    it("clears selectedTrade if deleted", async () => {
      vi.mocked(api.deleteTrade).mockResolvedValue(undefined);
      vi.mocked(api.getTrades).mockResolvedValue([]);
      useTradesStore.setState({ selectedTrade: mockTrade });

      await useTradesStore.getState().deleteTrade("trade-1");

      expect(useTradesStore.getState().selectedTrade).toBeNull();
    });

    it("handles delete error and rethrows", async () => {
      vi.mocked(api.deleteTrade).mockRejectedValue(new Error("Delete failed"));

      await expect(
        useTradesStore.getState().deleteTrade("trade-1")
      ).rejects.toThrow("Delete failed");

      expect(useTradesStore.getState().error).toBe("Error: Delete failed");
    });
  });

  describe("setFilters", () => {
    it("updates filters", () => {
      useTradesStore.getState().setFilters({ symbol: "AAPL", direction: "long" });

      expect(useTradesStore.getState().filters).toEqual({
        symbol: "AAPL",
        direction: "long",
      });
    });
  });

  describe("clearError", () => {
    it("clears error state", () => {
      useTradesStore.setState({ error: "Some error" });

      useTradesStore.getState().clearError();

      expect(useTradesStore.getState().error).toBeNull();
    });
  });
});
