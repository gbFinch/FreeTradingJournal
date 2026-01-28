import { describe, expect, it } from "vitest";
import { calculateDerivedFields } from "./calculations";
import type { Trade } from "@/types";

const baseTrade: Trade = {
  id: "trade-1",
  user_id: "user-1",
  account_id: "account-1",
  instrument_id: "AAPL",
  symbol: "AAPL",
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
  notes: "Test trade",
  status: "closed",
  created_at: "2024-01-15T09:30:00Z",
  updated_at: "2024-01-15T15:00:00Z",
};

describe("calculateDerivedFields", () => {
  describe("long trades", () => {
    it("calculates gross_pnl correctly for winning long trade", () => {
      const result = calculateDerivedFields(baseTrade);
      // (160 - 150) * 100 = 1000
      expect(result.gross_pnl).toBe(1000);
    });

    it("calculates net_pnl correctly", () => {
      const result = calculateDerivedFields(baseTrade);
      // 1000 - 2 = 998
      expect(result.net_pnl).toBe(998);
    });

    it("calculates pnl_per_share correctly", () => {
      const result = calculateDerivedFields(baseTrade);
      // 160 - 150 = 10
      expect(result.pnl_per_share).toBe(10);
    });

    it("calculates risk_per_share correctly", () => {
      const result = calculateDerivedFields(baseTrade);
      // 150 - 145 = 5
      expect(result.risk_per_share).toBe(5);
    });

    it("calculates r_multiple correctly", () => {
      const result = calculateDerivedFields(baseTrade);
      // 10 / 5 = 2
      expect(result.r_multiple).toBe(2);
    });

    it("returns result as win for positive net_pnl", () => {
      const result = calculateDerivedFields(baseTrade);
      expect(result.result).toBe("win");
    });

    it("returns result as loss for negative net_pnl", () => {
      const losingTrade: Trade = {
        ...baseTrade,
        exit_price: 140,
      };
      const result = calculateDerivedFields(losingTrade);
      expect(result.result).toBe("loss");
      expect(result.net_pnl).toBe(-1002); // (-10 * 100) - 2
    });

    it("returns result as breakeven for zero net_pnl", () => {
      const breakevenTrade: Trade = {
        ...baseTrade,
        entry_price: 100,
        exit_price: 100, // No price movement
        fees: 0, // No fees
      };
      const result = calculateDerivedFields(breakevenTrade);
      expect(result.net_pnl).toBe(0);
      expect(result.result).toBe("breakeven");
    });
  });

  describe("short trades", () => {
    const shortTrade: Trade = {
      ...baseTrade,
      direction: "short",
      entry_price: 160,
      exit_price: 150,
      stop_loss_price: 165,
    };

    it("calculates gross_pnl correctly for winning short trade", () => {
      const result = calculateDerivedFields(shortTrade);
      // (160 - 150) * 100 = 1000
      expect(result.gross_pnl).toBe(1000);
    });

    it("calculates pnl_per_share correctly for short", () => {
      const result = calculateDerivedFields(shortTrade);
      // 160 - 150 = 10
      expect(result.pnl_per_share).toBe(10);
    });

    it("calculates risk_per_share correctly for short", () => {
      const result = calculateDerivedFields(shortTrade);
      // 165 - 160 = 5
      expect(result.risk_per_share).toBe(5);
    });

    it("returns loss for losing short trade", () => {
      const losingShort: Trade = {
        ...shortTrade,
        exit_price: 170,
      };
      const result = calculateDerivedFields(losingShort);
      expect(result.result).toBe("loss");
      expect(result.gross_pnl).toBe(-1000);
    });
  });

  describe("edge cases", () => {
    it("returns null fields for open trades", () => {
      const openTrade: Trade = {
        ...baseTrade,
        status: "open",
        exit_price: null,
      };
      const result = calculateDerivedFields(openTrade);
      expect(result.gross_pnl).toBeNull();
      expect(result.net_pnl).toBeNull();
      expect(result.r_multiple).toBeNull();
      expect(result.result).toBeNull();
    });

    it("returns null fields when exit_price is null", () => {
      const noExitTrade: Trade = {
        ...baseTrade,
        exit_price: null,
      };
      const result = calculateDerivedFields(noExitTrade);
      expect(result.gross_pnl).toBeNull();
      expect(result.net_pnl).toBeNull();
    });

    it("returns null fields when quantity is null", () => {
      const noQuantityTrade: Trade = {
        ...baseTrade,
        quantity: null,
      };
      const result = calculateDerivedFields(noQuantityTrade);
      expect(result.gross_pnl).toBeNull();
      expect(result.net_pnl).toBeNull();
    });

    it("returns null risk_per_share when stop_loss_price is null", () => {
      const noStopTrade: Trade = {
        ...baseTrade,
        stop_loss_price: null,
      };
      const result = calculateDerivedFields(noStopTrade);
      expect(result.risk_per_share).toBeNull();
      expect(result.r_multiple).toBeNull();
      // But pnl fields should still be calculated
      expect(result.gross_pnl).toBe(1000);
      expect(result.net_pnl).toBe(998);
    });

    it("returns null r_multiple when risk_per_share is zero", () => {
      const zeroRiskTrade: Trade = {
        ...baseTrade,
        stop_loss_price: 150, // Same as entry, zero risk
      };
      const result = calculateDerivedFields(zeroRiskTrade);
      expect(result.risk_per_share).toBe(0);
      expect(result.r_multiple).toBeNull();
    });
  });
});
