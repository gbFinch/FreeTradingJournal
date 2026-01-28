import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@/mocks/invoke";
import { getTrades, getTrade, createTrade, updateTrade, deleteTrade } from "./trades";
import type { TradeWithDerived, CreateTradeInput, UpdateTradeInput } from "@/types";

vi.mock("@/mocks/invoke", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
}));

const mockTrade: TradeWithDerived = {
  id: "trade-1",
  user_id: "user-1",
  account_id: "account-1",
  instrument_id: "inst-1",
  symbol: "AAPL",
  trade_number: 1,
  trade_date: "2024-01-15",
  direction: "long",
  quantity: 100,
  entry_price: 150,
  exit_price: 160,
  stop_loss_price: 145,
  entry_time: null,
  exit_time: null,
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

describe("trades API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTrades", () => {
    it("calls invoke with get_trades command", async () => {
      vi.mocked(invoke).mockResolvedValue([mockTrade]);

      await getTrades();

      expect(invoke).toHaveBeenCalledWith("get_trades", {
        accountId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it("passes filter parameters", async () => {
      vi.mocked(invoke).mockResolvedValue([mockTrade]);

      await getTrades({
        accountId: "acc-1",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(invoke).toHaveBeenCalledWith("get_trades", {
        accountId: "acc-1",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });
    });

    it("returns trades from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue([mockTrade]);

      const result = await getTrades();

      expect(result).toEqual([mockTrade]);
    });
  });

  describe("getTrade", () => {
    it("calls invoke with get_trade command and id", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTrade);

      await getTrade("trade-1");

      expect(invoke).toHaveBeenCalledWith("get_trade", { id: "trade-1" });
    });

    it("returns trade from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTrade);

      const result = await getTrade("trade-1");

      expect(result).toEqual(mockTrade);
    });

    it("returns null when trade not found", async () => {
      vi.mocked(invoke).mockResolvedValue(null);

      const result = await getTrade("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createTrade", () => {
    it("calls invoke with create_trade command and input", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTrade);

      const input: CreateTradeInput = {
        account_id: "account-1",
        symbol: "AAPL",
        trade_date: "2024-01-15",
        direction: "long",
        entry_price: 150,
      };

      await createTrade(input);

      expect(invoke).toHaveBeenCalledWith("create_trade", { input });
    });

    it("returns created trade from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTrade);

      const input: CreateTradeInput = {
        account_id: "account-1",
        symbol: "AAPL",
        trade_date: "2024-01-15",
        direction: "long",
        entry_price: 150,
      };

      const result = await createTrade(input);

      expect(result).toEqual(mockTrade);
    });
  });

  describe("updateTrade", () => {
    it("calls invoke with update_trade command, id and input", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTrade);

      const input: UpdateTradeInput = {
        symbol: "GOOGL",
        exit_price: 165,
      };

      await updateTrade("trade-1", input);

      expect(invoke).toHaveBeenCalledWith("update_trade", {
        id: "trade-1",
        input,
      });
    });

    it("returns updated trade from invoke", async () => {
      const updatedTrade = { ...mockTrade, symbol: "GOOGL" };
      vi.mocked(invoke).mockResolvedValue(updatedTrade);

      const result = await updateTrade("trade-1", { symbol: "GOOGL" });

      expect(result).toEqual(updatedTrade);
    });
  });

  describe("deleteTrade", () => {
    it("calls invoke with delete_trade command and id", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await deleteTrade("trade-1");

      expect(invoke).toHaveBeenCalledWith("delete_trade", { id: "trade-1" });
    });

    it("returns void", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const result = await deleteTrade("trade-1");

      expect(result).toBeUndefined();
    });
  });
});
