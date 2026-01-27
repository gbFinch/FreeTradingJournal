import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CalendarHeatmap from "./index";
import type { DailyPerformance } from "@/types";

describe("CalendarHeatmap", () => {
  const mockData: DailyPerformance[] = [
    { date: "2024-01-15", realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
    { date: "2024-01-16", realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
    { date: "2024-01-17", realized_net_pnl: 0, trade_count: 1, win_count: 0, loss_count: 0 },
  ];

  describe("empty state", () => {
    it("shows empty message when no data", () => {
      render(<CalendarHeatmap data={[]} />);

      expect(screen.getByText("No trading data for this period")).toBeInTheDocument();
    });
  });

  describe("with data", () => {
    it("renders month label", () => {
      render(<CalendarHeatmap data={mockData} />);

      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });

    it("renders day headers", () => {
      render(<CalendarHeatmap data={mockData} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("displays formatted P&L for winning days", () => {
      render(<CalendarHeatmap data={mockData} />);

      expect(screen.getByText("$500")).toBeInTheDocument();
    });

    it("displays formatted P&L for losing days", () => {
      render(<CalendarHeatmap data={mockData} />);

      // formatCurrency returns "$-200" for negative values
      expect(screen.getByText("$-200")).toBeInTheDocument();
    });

    it("displays trade count", () => {
      render(<CalendarHeatmap data={mockData} />);

      expect(screen.getByText("3t")).toBeInTheDocument();
      expect(screen.getByText("2t")).toBeInTheDocument();
    });

    it("applies green color for positive P&L", () => {
      render(<CalendarHeatmap data={mockData} />);

      const winningDay = screen.getByText("$500").closest("div");
      expect(winningDay).toHaveClass("bg-green-500");
    });

    it("applies red color for negative P&L", () => {
      render(<CalendarHeatmap data={mockData} />);

      const losingDay = screen.getByText("$-200").closest("div");
      expect(losingDay).toHaveClass("bg-red-500");
    });

    it("shows tooltip with date and P&L details", () => {
      render(<CalendarHeatmap data={mockData} />);

      const winningDay = screen.getByText("$500").closest("div");
      expect(winningDay).toHaveAttribute("title", "2024-01-15: +$500.00 (3 trades)");
    });
  });

  describe("currency formatting", () => {
    it("formats large values with K suffix", () => {
      const largeData: DailyPerformance[] = [
        { date: "2024-01-15", realized_net_pnl: 2500, trade_count: 5, win_count: 5, loss_count: 0 },
      ];

      render(<CalendarHeatmap data={largeData} />);

      expect(screen.getByText("$2.5K")).toBeInTheDocument();
    });

    it("formats negative large values with K suffix", () => {
      const largeData: DailyPerformance[] = [
        { date: "2024-01-15", realized_net_pnl: -1500, trade_count: 3, win_count: 0, loss_count: 3 },
      ];

      render(<CalendarHeatmap data={largeData} />);

      // formatCurrency returns "$-1.5K" for negative values
      expect(screen.getByText("$-1.5K")).toBeInTheDocument();
    });
  });

  describe("multiple months", () => {
    it("renders multiple months when data spans them", () => {
      const multiMonthData: DailyPerformance[] = [
        { date: "2024-01-15", realized_net_pnl: 100, trade_count: 1, win_count: 1, loss_count: 0 },
        { date: "2024-02-15", realized_net_pnl: 200, trade_count: 1, win_count: 1, loss_count: 0 },
      ];

      render(<CalendarHeatmap data={multiMonthData} />);

      expect(screen.getByText("January 2024")).toBeInTheDocument();
      expect(screen.getByText("February 2024")).toBeInTheDocument();
    });
  });
});
