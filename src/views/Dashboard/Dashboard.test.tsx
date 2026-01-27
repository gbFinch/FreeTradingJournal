import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./index";
import { useMetricsStore } from "@/stores";
import type { PeriodMetrics, EquityPoint, DailyPerformance } from "@/types";

vi.mock("@/stores", () => ({
  useMetricsStore: vi.fn(),
}));

vi.mock("@/components/PeriodSelector", () => ({
  default: () => <div data-testid="period-selector">PeriodSelector</div>,
}));

vi.mock("@/components/EquityCurve", () => ({
  default: ({ data }: { data: EquityPoint[] }) => (
    <div data-testid="equity-curve" data-points={data.length}>EquityCurve</div>
  ),
}));

vi.mock("@/components/CalendarHeatmap", () => ({
  default: ({ data }: { data: DailyPerformance[] }) => (
    <div data-testid="calendar-heatmap" data-points={data.length}>CalendarHeatmap</div>
  ),
}));

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
  { date: "2024-01-16", cumulative_pnl: 800, drawdown: 0 },
];

const mockDailyPerformance: DailyPerformance[] = [
  { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
];

describe("Dashboard", () => {
  const mockFetchAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading indicator when loading", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: null,
        equityCurve: [],
        dailyPerformance: [],
        fetchAll: mockFetchAll,
        isLoading: true,
      });

      render(<Dashboard />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when no metrics", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: null,
        equityCurve: [],
        dailyPerformance: [],
        fetchAll: mockFetchAll,
        isLoading: false,
      });

      render(<Dashboard />);

      expect(screen.getByText("No trades found for the selected period.")).toBeInTheDocument();
      expect(screen.getByText("Add some trades to see your metrics!")).toBeInTheDocument();
    });
  });

  describe("with data", () => {
    beforeEach(() => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: mockPeriodMetrics,
        equityCurve: mockEquityCurve,
        dailyPerformance: mockDailyPerformance,
        fetchAll: mockFetchAll,
        isLoading: false,
      });
    });

    it("renders page title", () => {
      render(<Dashboard />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("renders period selector", () => {
      render(<Dashboard />);

      expect(screen.getByTestId("period-selector")).toBeInTheDocument();
    });

    it("calls fetchAll on mount", () => {
      render(<Dashboard />);

      expect(mockFetchAll).toHaveBeenCalled();
    });

    it("displays total P&L metric", () => {
      render(<Dashboard />);

      expect(screen.getByText("Total Net P&L")).toBeInTheDocument();
      expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    });

    it("displays trade count", () => {
      render(<Dashboard />);

      expect(screen.getByText("Trade Count")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("displays win rate", () => {
      render(<Dashboard />);

      expect(screen.getByText("Win Rate")).toBeInTheDocument();
      expect(screen.getByText("62.5%")).toBeInTheDocument();
    });

    it("displays profit factor", () => {
      render(<Dashboard />);

      expect(screen.getByText("Profit Factor")).toBeInTheDocument();
      expect(screen.getByText("2.78")).toBeInTheDocument();
    });

    it("displays avg win and loss", () => {
      render(<Dashboard />);

      expect(screen.getByText("Avg Win")).toBeInTheDocument();
      expect(screen.getByText("$250.00")).toBeInTheDocument();
      expect(screen.getByText("Avg Loss")).toBeInTheDocument();
      expect(screen.getByText("-$150.00")).toBeInTheDocument();
    });

    it("displays win/loss/breakeven counts", () => {
      render(<Dashboard />);

      expect(screen.getByText("Wins")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("Losses")).toBeInTheDocument();
      expect(screen.getByText("18")).toBeInTheDocument();
      expect(screen.getByText("Breakeven")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays max streaks", () => {
      render(<Dashboard />);

      expect(screen.getByText("Max streak: 5")).toBeInTheDocument();
      expect(screen.getByText("Max streak: 3")).toBeInTheDocument();
    });

    it("renders equity curve", () => {
      render(<Dashboard />);

      expect(screen.getByText("Equity Curve")).toBeInTheDocument();
      expect(screen.getByTestId("equity-curve")).toBeInTheDocument();
    });

    it("renders calendar heatmap", () => {
      render(<Dashboard />);

      expect(screen.getByText("Daily P&L")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-heatmap")).toBeInTheDocument();
    });
  });

  describe("P&L coloring", () => {
    it("applies green color for positive P&L", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: { ...mockPeriodMetrics, total_net_pnl: 1000 },
        equityCurve: [],
        dailyPerformance: [],
        fetchAll: mockFetchAll,
        isLoading: false,
      });

      render(<Dashboard />);

      const pnlValue = screen.getByText("$1,000.00");
      expect(pnlValue).toHaveClass("text-green-600");
    });

    it("applies red color for negative P&L", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: { ...mockPeriodMetrics, total_net_pnl: -500 },
        equityCurve: [],
        dailyPerformance: [],
        fetchAll: mockFetchAll,
        isLoading: false,
      });

      render(<Dashboard />);

      const pnlValue = screen.getByText("-$500.00");
      expect(pnlValue).toHaveClass("text-red-600");
    });
  });

  describe("null value handling", () => {
    it("displays N/A for null win rate", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        periodMetrics: { ...mockPeriodMetrics, win_rate: null },
        equityCurve: [],
        dailyPerformance: [],
        fetchAll: mockFetchAll,
        isLoading: false,
      });

      render(<Dashboard />);

      const winRateCard = screen.getByText("Win Rate").closest("div");
      expect(winRateCard?.parentElement).toHaveTextContent("N/A");
    });
  });
});
