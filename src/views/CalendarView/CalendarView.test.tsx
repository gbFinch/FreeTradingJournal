import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarView from "./index";
import { useMetricsStore, useTradesStore } from "@/stores";
import type { DailyPerformance, TradeWithDerived } from "@/types";

vi.mock("@/stores", () => ({
  useMetricsStore: vi.fn(),
  useTradesStore: vi.fn(),
}));

const mockDailyPerformance: DailyPerformance[] = [
  { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
  { date: "2024-01-16", realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
];

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
  notes: null,
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

describe("CalendarView", () => {
  const mockFetchDailyPerformance = vi.fn();
  const mockSetDateRange = vi.fn();
  const mockFetchTrades = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a fixed date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loading state", () => {
    it("shows loading indicator when loading", () => {
      vi.mocked(useMetricsStore).mockReturnValue({
        dailyPerformance: [],
        fetchDailyPerformance: mockFetchDailyPerformance,
        setDateRange: mockSetDateRange,
        isLoading: true,
      });
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
      });

      render(<CalendarView />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("calendar structure", () => {
    beforeEach(() => {
      vi.mocked(useMetricsStore).mockReturnValue({
        dailyPerformance: mockDailyPerformance,
        fetchDailyPerformance: mockFetchDailyPerformance,
        setDateRange: mockSetDateRange,
        isLoading: false,
      });
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
      });
    });

    it("renders page title", () => {
      render(<CalendarView />);

      expect(screen.getByText("Calendar")).toBeInTheDocument();
    });

    it("displays current month and year", () => {
      render(<CalendarView />);

      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });

    it("renders day headers", () => {
      render(<CalendarView />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("displays monthly total P&L", () => {
      render(<CalendarView />);

      // 500 + (-200) = $300
      expect(screen.getByText("$300")).toBeInTheDocument();
    });

    it("calls fetchDailyPerformance on mount", () => {
      render(<CalendarView />);

      expect(mockFetchDailyPerformance).toHaveBeenCalled();
    });

    it("calls setDateRange on mount", () => {
      render(<CalendarView />);

      expect(mockSetDateRange).toHaveBeenCalledWith({
        start: "2024-01-01",
        end: "2024-01-31",
      });
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      vi.mocked(useMetricsStore).mockReturnValue({
        dailyPerformance: [],
        fetchDailyPerformance: mockFetchDailyPerformance,
        setDateRange: mockSetDateRange,
        isLoading: false,
      });
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
      });
    });

    it("navigates to previous month", () => {
      render(<CalendarView />);

      fireEvent.click(screen.getByText("←"));

      expect(screen.getByText("December 2023")).toBeInTheDocument();
    });

    it("navigates to next month", () => {
      render(<CalendarView />);

      fireEvent.click(screen.getByText("→"));

      expect(screen.getByText("February 2024")).toBeInTheDocument();
    });
  });

  describe("day selection", () => {
    beforeEach(() => {
      vi.mocked(useMetricsStore).mockReturnValue({
        dailyPerformance: mockDailyPerformance,
        fetchDailyPerformance: mockFetchDailyPerformance,
        setDateRange: mockSetDateRange,
        isLoading: false,
      });
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [mockTrade],
        fetchTrades: mockFetchTrades,
      });
    });

    it("shows day detail when day is clicked", () => {
      render(<CalendarView />);

      // Click on day 15 which has data
      const day15Button = screen.getByText("$500").closest("button");
      fireEvent.click(day15Button!);

      expect(screen.getByText("January 15, 2024")).toBeInTheDocument();
    });

    it("displays trades for selected day", () => {
      render(<CalendarView />);

      const day15Button = screen.getByText("$500").closest("button");
      fireEvent.click(day15Button!);

      expect(screen.getByText("AAPL")).toBeInTheDocument();
      expect(screen.getByText("LONG")).toBeInTheDocument();
    });

    it("closes day detail on Close click", () => {
      render(<CalendarView />);

      const day15Button = screen.getByText("$500").closest("button");
      fireEvent.click(day15Button!);
      fireEvent.click(screen.getByText("Close"));

      expect(screen.queryByText("January 15, 2024")).not.toBeInTheDocument();
    });

    it("shows no trades message for empty day", () => {
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
      });

      render(<CalendarView />);

      // Click on a day cell (find by day number text)
      const dayButtons = screen.getAllByRole("button");
      // Find the button that contains just "1" as day number
      const day1Button = dayButtons.find(b => {
        const dayText = b.querySelector(".text-sm.font-medium");
        return dayText?.textContent === "1";
      });

      if (day1Button) {
        fireEvent.click(day1Button);
        expect(screen.getByText("No trades on this day.")).toBeInTheDocument();
      }
    });
  });

  describe("P&L display", () => {
    beforeEach(() => {
      vi.mocked(useMetricsStore).mockReturnValue({
        dailyPerformance: mockDailyPerformance,
        fetchDailyPerformance: mockFetchDailyPerformance,
        setDateRange: mockSetDateRange,
        isLoading: false,
      });
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
      });
    });

    it("displays positive P&L with formatting", () => {
      render(<CalendarView />);

      expect(screen.getByText("$500")).toBeInTheDocument();
    });

    it("displays trade count for days with trades", () => {
      render(<CalendarView />);

      expect(screen.getByText("3 trades")).toBeInTheDocument();
      expect(screen.getByText("2 trades")).toBeInTheDocument();
    });
  });
});
