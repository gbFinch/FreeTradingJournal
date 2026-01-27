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
  LineChart: ({ children, data }: { children: React.ReactNode; data: EquityPoint[] }) => (
    <div data-testid="line-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
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

      expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
    });
  });

  describe("with data", () => {
    it("renders the chart container", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("renders the line chart with correct data points", () => {
      render(<EquityCurve data={mockData} />);

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-points", "3");
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

    it("renders the line", () => {
      render(<EquityCurve data={mockData} />);

      expect(screen.getByTestId("line")).toBeInTheDocument();
    });
  });

  describe("theme support", () => {
    it("uses light theme by default", () => {
      vi.mocked(useThemeStore).mockReturnValue({ theme: "light" });

      render(<EquityCurve data={mockData} />);

      // Component renders without errors with light theme
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("supports dark theme", () => {
      vi.mocked(useThemeStore).mockReturnValue({ theme: "dark" });

      render(<EquityCurve data={mockData} />);

      // Component renders without errors with dark theme
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });
});
