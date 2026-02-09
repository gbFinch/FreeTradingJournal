import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MonthlyPnLGrid from "./index";
import { aggregateDailyToMonthly, groupByYear, calculateYearTotal, formatCurrency } from "./utils";
import type { DailyPerformance } from "@/types";
import { useMetricsStore } from "@/stores/metricsStore";

vi.mock("@/stores/metricsStore", () => ({
  useMetricsStore: vi.fn(),
}));

const mockSetSelectedMonth = vi.fn();
const mockFetchAll = vi.fn();

describe("MonthlyPnLGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMetricsStore as ReturnType<typeof vi.fn>).mockReturnValue({
      setSelectedMonth: mockSetSelectedMonth,
      fetchAll: mockFetchAll,
    });
  });

  const mockData: DailyPerformance[] = [
    { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
    { date: "2024-01-16", realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
    { date: "2024-02-10", realized_net_pnl: 300, trade_count: 2, win_count: 2, loss_count: 0 },
    { date: "2023-12-20", realized_net_pnl: 150, trade_count: 1, win_count: 1, loss_count: 0 },
  ];

  describe("empty state", () => {
    it("shows empty message when no data", () => {
      render(<MonthlyPnLGrid data={[]} />);

      expect(screen.getByText("No trading data for this period")).toBeInTheDocument();
    });
  });

  describe("with data", () => {
    it("renders month column headers", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      expect(screen.getByText("Jan")).toBeInTheDocument();
      expect(screen.getByText("Feb")).toBeInTheDocument();
      expect(screen.getByText("Mar")).toBeInTheDocument();
      expect(screen.getByText("Dec")).toBeInTheDocument();
    });

    it("renders year labels", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("2023")).toBeInTheDocument();
    });

    it("renders year total header", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      expect(screen.getByText("Year Total")).toBeInTheDocument();
    });

    it("renders grand total", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      expect(screen.getByText("Grand Total:")).toBeInTheDocument();
    });

    it("displays formatted P&L for months with trades", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // January 2024: 500 - 200 = 300, February 2024: 300 (both show +$300)
      const matches = screen.getAllByText("+$300");
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it("displays trade count in cells", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // January has 5 trades total (3 + 2)
      expect(screen.getByText("5 trades")).toBeInTheDocument();
      // February has 2 trades
      expect(screen.getByText("2 trades")).toBeInTheDocument();
    });

    it("sorts years descending (most recent first)", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      const year2024 = screen.getByText("2024");
      const year2023 = screen.getByText("2023");

      // 2024 should appear before 2023 in the DOM
      expect(year2024.compareDocumentPosition(year2023) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe("month click navigation", () => {
    it("calls setSelectedMonth and fetchAll when clicking a month cell with data", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // Click on January 2024 cell (has trades)
      const janCell = screen.getByText("5 trades").closest("div");
      fireEvent.click(janCell!);

      expect(mockSetSelectedMonth).toHaveBeenCalledTimes(1);
      expect(mockFetchAll).toHaveBeenCalledTimes(1);

      // Verify the date passed is January 2024
      const calledDate = mockSetSelectedMonth.mock.calls[0][0];
      expect(calledDate.getFullYear()).toBe(2024);
      expect(calledDate.getMonth()).toBe(0); // January is 0
      expect(calledDate.getDate()).toBe(1);
    });

    it("calls setSelectedMonth and fetchAll when clicking an empty month cell", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // Find an empty cell (shows "-") - there are many of them
      const emptyCells = screen.getAllByText("-");
      fireEvent.click(emptyCells[0]);

      expect(mockSetSelectedMonth).toHaveBeenCalledTimes(1);
      expect(mockFetchAll).toHaveBeenCalledTimes(1);
    });

    it("navigates to correct month when clicking February cell", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // Click on February 2024 cell
      const febCell = screen.getByText("2 trades").closest("div");
      fireEvent.click(febCell!);

      const calledDate = mockSetSelectedMonth.mock.calls[0][0];
      expect(calledDate.getFullYear()).toBe(2024);
      expect(calledDate.getMonth()).toBe(1); // February is 1
    });

    it("navigates to correct year when clicking December 2023 cell", () => {
      render(<MonthlyPnLGrid data={mockData} />);

      // Click on December 2023 cell (has 1 trade)
      const decCell = screen.getByText("1 trade").closest("div");
      fireEvent.click(decCell!);

      const calledDate = mockSetSelectedMonth.mock.calls[0][0];
      expect(calledDate.getFullYear()).toBe(2023);
      expect(calledDate.getMonth()).toBe(11); // December is 11
    });
  });

  describe("currency formatting", () => {
    it("formats large positive values with K suffix and + sign", () => {
      const largeData: DailyPerformance[] = [
        { date: "2024-01-15", realized_net_pnl: 2500, trade_count: 5, win_count: 5, loss_count: 0 },
      ];

      render(<MonthlyPnLGrid data={largeData} />);

      const matches = screen.getAllByText("+$2.5K");
      expect(matches.length).toBeGreaterThan(0);
    });

    it("formats large negative values with K suffix", () => {
      const largeData: DailyPerformance[] = [
        { date: "2024-01-15", realized_net_pnl: -1500, trade_count: 3, win_count: 0, loss_count: 3 },
      ];

      render(<MonthlyPnLGrid data={largeData} />);

      const matches = screen.getAllByText("-$1.5K");
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});

describe("aggregateDailyToMonthly", () => {
  it("aggregates daily data into monthly data", () => {
    const dailyData: DailyPerformance[] = [
      { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
      { date: "2024-01-16", realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
      { date: "2024-02-10", realized_net_pnl: 300, trade_count: 2, win_count: 2, loss_count: 0 },
    ];

    const result = aggregateDailyToMonthly(dailyData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      realized_net_pnl: 300, // 500 - 200
      trade_count: 5,
      win_count: 2,
      loss_count: 3,
    });
    expect(result[1]).toEqual({
      yearMonth: "2024-02",
      year: 2024,
      month: 2,
      realized_net_pnl: 300,
      trade_count: 2,
      win_count: 2,
      loss_count: 0,
    });
  });

  it("returns empty array for empty input", () => {
    const result = aggregateDailyToMonthly([]);
    expect(result).toEqual([]);
  });

  it("sorts results by yearMonth ascending", () => {
    const dailyData: DailyPerformance[] = [
      { date: "2024-02-10", realized_net_pnl: 300, trade_count: 2, win_count: 2, loss_count: 0 },
      { date: "2023-12-20", realized_net_pnl: 150, trade_count: 1, win_count: 1, loss_count: 0 },
      { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
    ];

    const result = aggregateDailyToMonthly(dailyData);

    expect(result[0].yearMonth).toBe("2023-12");
    expect(result[1].yearMonth).toBe("2024-01");
    expect(result[2].yearMonth).toBe("2024-02");
  });
});

describe("groupByYear", () => {
  it("groups monthly data by year", () => {
    const monthlyData = [
      { yearMonth: "2024-01", year: 2024, month: 1, realized_net_pnl: 300, trade_count: 5, win_count: 2, loss_count: 3 },
      { yearMonth: "2024-02", year: 2024, month: 2, realized_net_pnl: 300, trade_count: 2, win_count: 2, loss_count: 0 },
      { yearMonth: "2023-12", year: 2023, month: 12, realized_net_pnl: 150, trade_count: 1, win_count: 1, loss_count: 0 },
    ];

    const result = groupByYear(monthlyData);

    expect(result.size).toBe(2);
    expect(result.get(2024)).toHaveLength(2);
    expect(result.get(2023)).toHaveLength(1);
  });

  it("returns empty map for empty input", () => {
    const result = groupByYear([]);
    expect(result.size).toBe(0);
  });
});

describe("calculateYearTotal", () => {
  it("calculates total PnL for a year", () => {
    const monthlyData = [
      { yearMonth: "2024-01", year: 2024, month: 1, realized_net_pnl: 300, trade_count: 5, win_count: 2, loss_count: 3 },
      { yearMonth: "2024-02", year: 2024, month: 2, realized_net_pnl: 300, trade_count: 2, win_count: 2, loss_count: 0 },
    ];

    const result = calculateYearTotal(monthlyData);

    expect(result).toBe(600);
  });

  it("returns 0 for empty input", () => {
    const result = calculateYearTotal([]);
    expect(result).toBe(0);
  });

  it("handles negative values correctly", () => {
    const monthlyData = [
      { yearMonth: "2024-01", year: 2024, month: 1, realized_net_pnl: 500, trade_count: 3, win_count: 3, loss_count: 0 },
      { yearMonth: "2024-02", year: 2024, month: 2, realized_net_pnl: -700, trade_count: 2, win_count: 0, loss_count: 2 },
    ];

    const result = calculateYearTotal(monthlyData);

    expect(result).toBe(-200);
  });
});

describe("formatCurrency", () => {
  it("formats positive values with + sign", () => {
    expect(formatCurrency(500)).toBe("+$500");
  });

  it("formats negative values with - sign", () => {
    expect(formatCurrency(-500)).toBe("-$500");
  });

  it("formats zero without sign", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats large positive values with K suffix", () => {
    expect(formatCurrency(2500)).toBe("+$2.5K");
  });

  it("formats large negative values with K suffix", () => {
    expect(formatCurrency(-1500)).toBe("-$1.5K");
  });

  it("rounds to nearest whole number for small values", () => {
    expect(formatCurrency(123.45)).toBe("+$123");
    expect(formatCurrency(-123.45)).toBe("-$123");
  });
});
