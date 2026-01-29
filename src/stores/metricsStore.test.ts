import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMetricsStore } from "./metricsStore";
import * as api from "@/api";
import type { DailyPerformance, PeriodMetrics, EquityPoint } from "@/types";

vi.mock("@/api");

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

describe("useMetricsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15"));

    // Reset store state
    useMetricsStore.setState({
      dailyPerformance: [],
      periodMetrics: null,
      equityCurve: [],
      dateRange: { start: "2024-06-01", end: "2024-06-30" },
      periodType: "month",
      accountId: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("has correct initial state with month period type", () => {
      const state = useMetricsStore.getState();
      expect(state.dailyPerformance).toEqual([]);
      expect(state.periodMetrics).toBeNull();
      expect(state.equityCurve).toEqual([]);
      expect(state.periodType).toBe("month");
      expect(state.accountId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchDailyPerformance", () => {
    it("fetches daily performance data", async () => {
      vi.mocked(api.getDailyPerformance).mockResolvedValue(mockDailyPerformance);

      await useMetricsStore.getState().fetchDailyPerformance();

      const state = useMetricsStore.getState();
      expect(state.dailyPerformance).toEqual(mockDailyPerformance);
      expect(state.isLoading).toBe(false);
      expect(api.getDailyPerformance).toHaveBeenCalledWith(
        "2024-06-01",
        "2024-06-30",
        undefined
      );
    });

    it("passes accountId when set", async () => {
      vi.mocked(api.getDailyPerformance).mockResolvedValue([]);
      useMetricsStore.setState({ accountId: "acc-1" });

      await useMetricsStore.getState().fetchDailyPerformance();

      expect(api.getDailyPerformance).toHaveBeenCalledWith(
        "2024-06-01",
        "2024-06-30",
        "acc-1"
      );
    });

    it("handles fetch error", async () => {
      vi.mocked(api.getDailyPerformance).mockRejectedValue(new Error("API error"));

      await useMetricsStore.getState().fetchDailyPerformance();

      expect(useMetricsStore.getState().error).toBe("Error: API error");
      expect(useMetricsStore.getState().isLoading).toBe(false);
    });
  });

  describe("fetchPeriodMetrics", () => {
    it("fetches period metrics for non-all periods", async () => {
      vi.mocked(api.getPeriodMetrics).mockResolvedValue(mockPeriodMetrics);

      await useMetricsStore.getState().fetchPeriodMetrics();

      expect(useMetricsStore.getState().periodMetrics).toEqual(mockPeriodMetrics);
      expect(api.getPeriodMetrics).toHaveBeenCalledWith(
        "2024-06-01",
        "2024-06-30",
        undefined
      );
    });

    it("fetches all-time metrics when periodType is all", async () => {
      vi.mocked(api.getAllTimeMetrics).mockResolvedValue(mockPeriodMetrics);
      useMetricsStore.setState({ periodType: "all" });

      await useMetricsStore.getState().fetchPeriodMetrics();

      expect(api.getAllTimeMetrics).toHaveBeenCalledWith(undefined);
      expect(api.getPeriodMetrics).not.toHaveBeenCalled();
    });

    it("handles fetch error", async () => {
      vi.mocked(api.getPeriodMetrics).mockRejectedValue(new Error("Metrics error"));

      await useMetricsStore.getState().fetchPeriodMetrics();

      expect(useMetricsStore.getState().error).toBe("Error: Metrics error");
    });
  });

  describe("fetchEquityCurve", () => {
    it("fetches equity curve data with date range", async () => {
      vi.mocked(api.getEquityCurve).mockResolvedValue(mockEquityCurve);

      await useMetricsStore.getState().fetchEquityCurve();

      expect(useMetricsStore.getState().equityCurve).toEqual(mockEquityCurve);
      expect(api.getEquityCurve).toHaveBeenCalledWith(
        "2024-06-01",
        "2024-06-30",
        undefined
      );
    });

    it("passes accountId when set", async () => {
      vi.mocked(api.getEquityCurve).mockResolvedValue([]);
      useMetricsStore.setState({ accountId: "acc-1" });

      await useMetricsStore.getState().fetchEquityCurve();

      expect(api.getEquityCurve).toHaveBeenCalledWith(
        "2024-06-01",
        "2024-06-30",
        "acc-1"
      );
    });

    it("handles fetch error", async () => {
      vi.mocked(api.getEquityCurve).mockRejectedValue(new Error("Curve error"));

      await useMetricsStore.getState().fetchEquityCurve();

      expect(useMetricsStore.getState().error).toBe("Error: Curve error");
    });
  });

  describe("fetchAll", () => {
    it("fetches all metrics in parallel", async () => {
      vi.mocked(api.getDailyPerformance).mockResolvedValue(mockDailyPerformance);
      vi.mocked(api.getPeriodMetrics).mockResolvedValue(mockPeriodMetrics);
      vi.mocked(api.getEquityCurve).mockResolvedValue(mockEquityCurve);

      await useMetricsStore.getState().fetchAll();

      expect(api.getDailyPerformance).toHaveBeenCalled();
      expect(api.getPeriodMetrics).toHaveBeenCalled();
      expect(api.getEquityCurve).toHaveBeenCalled();
    });
  });

  describe("setPeriodType", () => {
    it("sets month period with correct date range", () => {
      useMetricsStore.getState().setPeriodType("month");

      const state = useMetricsStore.getState();
      expect(state.periodType).toBe("month");
      expect(state.dateRange.start).toBe("2024-06-01");
      expect(state.dateRange.end).toBe("2024-06-30");
    });

    it("sets ytd period with correct date range", () => {
      useMetricsStore.getState().setPeriodType("ytd");

      const state = useMetricsStore.getState();
      expect(state.periodType).toBe("ytd");
      expect(state.dateRange.start).toBe("2024-01-01");
      expect(state.dateRange.end).toBe("2024-06-15");
    });

    it("sets all period with wide date range", () => {
      useMetricsStore.getState().setPeriodType("all");

      const state = useMetricsStore.getState();
      expect(state.periodType).toBe("all");
      expect(state.dateRange.start).toBe("2000-01-01");
      expect(state.dateRange.end).toBe("2024-06-15");
    });
  });

  describe("setDateRange", () => {
    it("sets custom date range and changes periodType to custom", () => {
      useMetricsStore.getState().setDateRange({
        start: "2024-03-01",
        end: "2024-03-31",
      });

      const state = useMetricsStore.getState();
      expect(state.dateRange.start).toBe("2024-03-01");
      expect(state.dateRange.end).toBe("2024-03-31");
      expect(state.periodType).toBe("custom");
    });
  });

  describe("setAccountId", () => {
    it("sets account id", () => {
      useMetricsStore.getState().setAccountId("acc-123");

      expect(useMetricsStore.getState().accountId).toBe("acc-123");
    });

    it("clears account id when null", () => {
      useMetricsStore.setState({ accountId: "acc-123" });

      useMetricsStore.getState().setAccountId(null);

      expect(useMetricsStore.getState().accountId).toBeNull();
    });
  });

  describe("clearError", () => {
    it("clears error state", () => {
      useMetricsStore.setState({ error: "Some error" });

      useMetricsStore.getState().clearError();

      expect(useMetricsStore.getState().error).toBeNull();
    });
  });
});
