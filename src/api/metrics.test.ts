import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@/mocks/invoke";
import {
  getDailyPerformance,
  getPeriodMetrics,
  getAllTimeMetrics,
  getEquityCurve,
} from "./metrics";
import type { DailyPerformance, PeriodMetrics, EquityPoint } from "@/types";

vi.mock("@/mocks/invoke", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
}));

const mockDailyPerformance: DailyPerformance[] = [
  { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
  { date: "2024-01-16", realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
];

const mockPeriodMetrics: PeriodMetrics = {
  total_net_pnl: 5000,
  trade_count: 50,
  win_count: 30,
  loss_count: 18,
  breakeven_count: 2,
  win_rate: 0.625,
  avg_win: 250,
  avg_loss: -150,
  profit_factor: 2.78,
  expectancy: 100,
  max_drawdown: -1000,
  max_win_streak: 5,
  max_loss_streak: 3,
};

const mockEquityCurve: EquityPoint[] = [
  { date: "2024-01-15", cumulative_pnl: 500, drawdown: 0 },
  { date: "2024-01-16", cumulative_pnl: 300, drawdown: -200 },
];

describe("metrics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDailyPerformance", () => {
    it("calls invoke with get_daily_performance command and dates", async () => {
      vi.mocked(invoke).mockResolvedValue(mockDailyPerformance);

      await getDailyPerformance("2024-01-01", "2024-01-31");

      expect(invoke).toHaveBeenCalledWith("get_daily_performance", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        accountId: undefined,
      });
    });

    it("passes accountId when provided", async () => {
      vi.mocked(invoke).mockResolvedValue(mockDailyPerformance);

      await getDailyPerformance("2024-01-01", "2024-01-31", "acc-1");

      expect(invoke).toHaveBeenCalledWith("get_daily_performance", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        accountId: "acc-1",
      });
    });

    it("returns daily performance from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockDailyPerformance);

      const result = await getDailyPerformance("2024-01-01", "2024-01-31");

      expect(result).toEqual(mockDailyPerformance);
    });
  });

  describe("getPeriodMetrics", () => {
    it("calls invoke with get_period_metrics command and dates", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      await getPeriodMetrics("2024-01-01", "2024-01-31");

      expect(invoke).toHaveBeenCalledWith("get_period_metrics", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        accountId: undefined,
      });
    });

    it("passes accountId when provided", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      await getPeriodMetrics("2024-01-01", "2024-01-31", "acc-1");

      expect(invoke).toHaveBeenCalledWith("get_period_metrics", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        accountId: "acc-1",
      });
    });

    it("returns period metrics from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      const result = await getPeriodMetrics("2024-01-01", "2024-01-31");

      expect(result).toEqual(mockPeriodMetrics);
    });
  });

  describe("getAllTimeMetrics", () => {
    it("calls invoke with get_all_time_metrics command", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      await getAllTimeMetrics();

      expect(invoke).toHaveBeenCalledWith("get_all_time_metrics", {
        accountId: undefined,
      });
    });

    it("passes accountId when provided", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      await getAllTimeMetrics("acc-1");

      expect(invoke).toHaveBeenCalledWith("get_all_time_metrics", {
        accountId: "acc-1",
      });
    });

    it("returns all time metrics from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPeriodMetrics);

      const result = await getAllTimeMetrics();

      expect(result).toEqual(mockPeriodMetrics);
    });
  });

  describe("getEquityCurve", () => {
    it("calls invoke with get_equity_curve command", async () => {
      vi.mocked(invoke).mockResolvedValue(mockEquityCurve);

      await getEquityCurve();

      expect(invoke).toHaveBeenCalledWith("get_equity_curve", {
        accountId: undefined,
      });
    });

    it("passes accountId when provided", async () => {
      vi.mocked(invoke).mockResolvedValue(mockEquityCurve);

      await getEquityCurve("acc-1");

      expect(invoke).toHaveBeenCalledWith("get_equity_curve", {
        accountId: "acc-1",
      });
    });

    it("returns equity curve from invoke", async () => {
      vi.mocked(invoke).mockResolvedValue(mockEquityCurve);

      const result = await getEquityCurve();

      expect(result).toEqual(mockEquityCurve);
    });
  });
});
