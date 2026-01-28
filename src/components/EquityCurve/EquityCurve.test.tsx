import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EquityCurve from "./index";
import { useThemeStore } from "@/stores";
import type { EquityPoint } from "@/types";

vi.mock("@/stores", () => ({
  useThemeStore: vi.fn(),
}));

// Mock Recharts components since they don't render well in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="area-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Area: ({ stroke }: { stroke: string }) => <div data-testid="area" data-stroke={stroke} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

describe("EquityCurve", () => {
  const mockData: EquityPoint[] = [
    { date: "2024-01-15", cumulative_pnl: 500, drawdown: 0 },
    { date: "2024-01-16", cumulative_pnl: 300, drawdown: -200 },
    { date: "2024-01-17", cumulative_pnl: 800, drawdown: 0 },
  ];

  beforeEach(() => {
    vi.mocked(useThemeStore).mockReturnValue({ theme: "light" });
  });

  describe("empty state", () => {
    it("shows empty message when no data", () => {
      render(<EquityCurve data={[]} />);

      expect(screen.getByText("No data to display")).toBeInTheDocument();
    });

    it("does not render chart when no data", () => {
      render(<EquityCurve data={[]} />);

      expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
    });
  });

  describe("with data", () => {
    it("renders the chart container", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("renders the area chart with correct data points", () => {
      render(<EquityCurve data={mockData} />);

      const chart = screen.getByTestId("area-chart");
      expect(chart).toHaveAttribute("data-points", "3");
    });

    it("renders cartesian grid for value reference", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    });

    it("renders chart axes", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("renders tooltip", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    });

    it("renders reference line at zero", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("reference-line")).toBeInTheDocument();
    });

    it("renders the area with gradient fill", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("area")).toBeInTheDocument();
    });
  });

  describe("theme support", () => {
    it("uses light theme by default", () => {
      vi.mocked(useThemeStore).mockReturnValue({ theme: "light" });

      render(<EquityCurve data={mockData} />);

      // Component renders without errors with light theme
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });

    it("supports dark theme", () => {
      vi.mocked(useThemeStore).mockReturnValue({ theme: "dark" });

      render(<EquityCurve data={mockData} />);

      // Component renders without errors with dark theme
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });
  });

  describe("gradient coloring", () => {
    it("uses green stroke color when final PnL is positive", () => {
      const positiveData: EquityPoint[] = [
        { date: "2024-01-15", cumulative_pnl: 100, drawdown: 0 },
        { date: "2024-01-16", cumulative_pnl: 500, drawdown: 0 },
      ];

      render(<EquityCurve data={positiveData} />);

      const area = screen.getByTestId("area");
      expect(area).toHaveAttribute("data-stroke", "#22c55e");
    });

    it("uses red stroke color when final PnL is negative", () => {
      const negativeData: EquityPoint[] = [
        { date: "2024-01-15", cumulative_pnl: 100, drawdown: 0 },
        { date: "2024-01-16", cumulative_pnl: -200, drawdown: -300 },
      ];

      render(<EquityCurve data={negativeData} />);

      const area = screen.getByTestId("area");
      expect(area).toHaveAttribute("data-stroke", "#ef4444");
    });
  });
});
