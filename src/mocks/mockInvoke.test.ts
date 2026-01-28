import { describe, expect, it, beforeEach } from "vitest";
import { mockInvoke } from "./mockInvoke";
import type { CreateTradeInput, TradeWithDerived, Account } from "@/types";

describe("mockInvoke", () => {
  describe("accounts", () => {
    it("get_accounts returns mock accounts", async () => {
      const accounts = await mockInvoke<Account[]>("get_accounts");
      expect(accounts).toBeInstanceOf(Array);
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0]).toHaveProperty("id");
      expect(accounts[0]).toHaveProperty("name");
    });

    it("create_account creates a new account", async () => {
      const accountsBefore = await mockInvoke<Account[]>("get_accounts");
      const countBefore = accountsBefore.length;

      const newAccount = await mockInvoke<Account>("create_account", {
        name: "Test Account",
        baseCurrency: "EUR",
      });

      expect(newAccount.name).toBe("Test Account");
      expect(newAccount.base_currency).toBe("EUR");
      expect(newAccount.id).toBeDefined();

      const accountsAfter = await mockInvoke<Account[]>("get_accounts");
      expect(accountsAfter.length).toBe(countBefore + 1);
    });
  });

  describe("trades", () => {
    it("get_trades returns trades with derived fields", async () => {
      const trades = await mockInvoke<TradeWithDerived[]>("get_trades", {});
      expect(trades).toBeInstanceOf(Array);
      expect(trades.length).toBeGreaterThan(0);

      // Check a closed trade has derived fields
      const closedTrade = trades.find(t => t.status === "closed");
      expect(closedTrade).toBeDefined();
      expect(closedTrade!.gross_pnl).not.toBeNull();
      expect(closedTrade!.net_pnl).not.toBeNull();
      expect(closedTrade!.result).toBeDefined();
    });

    it("get_trades filters by date range", async () => {
      const allTrades = await mockInvoke<TradeWithDerived[]>("get_trades", {});
      const today = new Date().toISOString().split("T")[0];

      const filteredTrades = await mockInvoke<TradeWithDerived[]>("get_trades", {
        startDate: today,
        endDate: today,
      });

      expect(filteredTrades.length).toBeLessThanOrEqual(allTrades.length);
      filteredTrades.forEach(trade => {
        expect(trade.trade_date).toBe(today);
      });
    });

    it("get_trade returns single trade by id", async () => {
      const trades = await mockInvoke<TradeWithDerived[]>("get_trades", {});
      const firstTrade = trades[0];

      const trade = await mockInvoke<TradeWithDerived | null>("get_trade", {
        id: firstTrade.id,
      });

      expect(trade).not.toBeNull();
      expect(trade!.id).toBe(firstTrade.id);
    });

    it("get_trade returns null for non-existent id", async () => {
      const trade = await mockInvoke<TradeWithDerived | null>("get_trade", {
        id: "non-existent-id",
      });
      expect(trade).toBeNull();
    });

    it("create_trade adds a new trade", async () => {
      const input: CreateTradeInput = {
        account_id: "mock-account-001",
        symbol: "TEST",
        trade_date: "2024-06-01",
        direction: "long",
        entry_price: 100,
        exit_price: 110,
        quantity: 50,
        fees: 1,
        status: "closed",
      };

      const newTrade = await mockInvoke<TradeWithDerived>("create_trade", { input });

      expect(newTrade.symbol).toBe("TEST");
      expect(newTrade.entry_price).toBe(100);
      expect(newTrade.gross_pnl).toBe(500); // (110-100) * 50
      expect(newTrade.net_pnl).toBe(499); // 500 - 1
      expect(newTrade.result).toBe("win");
    });

    it("update_trade modifies existing trade", async () => {
      const trades = await mockInvoke<TradeWithDerived[]>("get_trades", {});
      const tradeToUpdate = trades.find(t => t.status === "closed")!;

      const updated = await mockInvoke<TradeWithDerived>("update_trade", {
        id: tradeToUpdate.id,
        input: { notes: "Updated notes" },
      });

      expect(updated.notes).toBe("Updated notes");
      expect(updated.id).toBe(tradeToUpdate.id);
    });

    it("delete_trade removes trade", async () => {
      // Create a trade to delete
      const input: CreateTradeInput = {
        account_id: "mock-account-001",
        symbol: "TODELETE",
        trade_date: "2024-06-01",
        direction: "long",
        entry_price: 100,
      };
      const newTrade = await mockInvoke<TradeWithDerived>("create_trade", { input });

      // Delete it
      await mockInvoke("delete_trade", { id: newTrade.id });

      // Verify it's gone
      const deletedTrade = await mockInvoke<TradeWithDerived | null>("get_trade", {
        id: newTrade.id,
      });
      expect(deletedTrade).toBeNull();
    });
  });

  describe("metrics", () => {
    it("get_daily_performance returns aggregated daily data", async () => {
      const performance = await mockInvoke<Array<{
        date: string;
        realized_net_pnl: number;
        trade_count: number;
      }>>("get_daily_performance", {
        startDate: "2020-01-01",
        endDate: "2030-12-31",
      });

      expect(performance).toBeInstanceOf(Array);
      performance.forEach(day => {
        expect(day).toHaveProperty("date");
        expect(day).toHaveProperty("realized_net_pnl");
        expect(day).toHaveProperty("trade_count");
      });
    });

    it("get_period_metrics returns calculated metrics", async () => {
      const metrics = await mockInvoke<{
        total_net_pnl: number;
        trade_count: number;
        win_rate: number | null;
        profit_factor: number | null;
      }>("get_period_metrics", {
        startDate: "2020-01-01",
        endDate: "2030-12-31",
      });

      expect(metrics).toHaveProperty("total_net_pnl");
      expect(metrics).toHaveProperty("trade_count");
      expect(metrics).toHaveProperty("win_rate");
      expect(metrics).toHaveProperty("profit_factor");
    });

    it("get_all_time_metrics returns metrics for all trades", async () => {
      const metrics = await mockInvoke<{
        total_net_pnl: number;
        trade_count: number;
      }>("get_all_time_metrics", {});

      expect(metrics.trade_count).toBeGreaterThan(0);
    });

    it("get_equity_curve returns cumulative pnl data", async () => {
      const curve = await mockInvoke<Array<{
        date: string;
        cumulative_pnl: number;
        drawdown: number;
      }>>("get_equity_curve", {});

      expect(curve).toBeInstanceOf(Array);
      expect(curve.length).toBeGreaterThan(0);
      curve.forEach(point => {
        expect(point).toHaveProperty("date");
        expect(point).toHaveProperty("cumulative_pnl");
        expect(point).toHaveProperty("drawdown");
      });
    });
  });

  describe("error handling", () => {
    it("throws error for unknown command", async () => {
      await expect(mockInvoke("unknown_command")).rejects.toThrow(
        "Unknown command: unknown_command"
      );
    });

    it("throws error when updating non-existent trade", async () => {
      await expect(
        mockInvoke("update_trade", {
          id: "non-existent",
          input: { notes: "test" },
        })
      ).rejects.toThrow("Trade not found");
    });

    it("throws error when deleting non-existent trade", async () => {
      await expect(
        mockInvoke("delete_trade", { id: "non-existent" })
      ).rejects.toThrow("Trade not found");
    });
  });
});
