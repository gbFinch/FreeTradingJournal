import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PeriodSelector from "./index";
import { useMetricsStore } from "@/stores";

vi.mock("@/stores", () => ({
  useMetricsStore: vi.fn(),
}));

describe("PeriodSelector", () => {
  const mockSetPeriodType = vi.fn();
  const mockFetchAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "month",
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
    });
  });

  it("renders all period options", () => {
    render(<PeriodSelector />);

    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("YTD")).toBeInTheDocument();
    expect(screen.getByText("All Time")).toBeInTheDocument();
  });

  it("highlights the active period", () => {
    render(<PeriodSelector />);

    const monthButton = screen.getByText("This Month");
    expect(monthButton).toHaveClass("bg-white");
  });

  it("calls setPeriodType and fetchAll when clicking a period", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector />);

    await user.click(screen.getByText("YTD"));

    expect(mockSetPeriodType).toHaveBeenCalledWith("ytd");
    expect(mockFetchAll).toHaveBeenCalled();
  });

  it("calls setPeriodType with 'all' when clicking All Time", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector />);

    await user.click(screen.getByText("All Time"));

    expect(mockSetPeriodType).toHaveBeenCalledWith("all");
  });

  it("shows YTD as active when periodType is ytd", () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "ytd",
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
    });

    render(<PeriodSelector />);

    const ytdButton = screen.getByText("YTD");
    expect(ytdButton).toHaveClass("bg-white");
  });
});
