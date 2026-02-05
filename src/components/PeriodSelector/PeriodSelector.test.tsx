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
  const mockGoToPrevMonth = vi.fn();
  const mockGoToNextMonth = vi.fn();
  const testDate = new Date(2025, 1, 15); // February 2025

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "month",
      selectedMonth: testDate,
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
      goToPrevMonth: mockGoToPrevMonth,
      goToNextMonth: mockGoToNextMonth,
    });
  });

  it("renders month selector with navigation arrows", () => {
    render(<PeriodSelector />);

    expect(screen.getByText("Feb 2025")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  it("renders YTD and All Time period options", () => {
    render(<PeriodSelector />);

    expect(screen.getByText("YTD")).toBeInTheDocument();
    expect(screen.getByText("All Time")).toBeInTheDocument();
  });

  it("highlights the month button when periodType is month", () => {
    render(<PeriodSelector />);

    const monthButton = screen.getByText("Feb 2025");
    expect(monthButton).toHaveClass("bg-white");
  });

  it("calls goToPrevMonth and fetchAll when clicking previous arrow", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector />);

    await user.click(screen.getByLabelText("Previous month"));

    expect(mockGoToPrevMonth).toHaveBeenCalled();
    expect(mockFetchAll).toHaveBeenCalled();
  });

  it("calls goToNextMonth and fetchAll when clicking next arrow", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector />);

    await user.click(screen.getByLabelText("Next month"));

    expect(mockGoToNextMonth).toHaveBeenCalled();
    expect(mockFetchAll).toHaveBeenCalled();
  });

  it("calls setPeriodType and fetchAll when clicking YTD", async () => {
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
    expect(mockFetchAll).toHaveBeenCalled();
  });

  it("shows YTD as active when periodType is ytd", () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "ytd",
      selectedMonth: testDate,
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
      goToPrevMonth: mockGoToPrevMonth,
      goToNextMonth: mockGoToNextMonth,
    });

    render(<PeriodSelector />);

    const ytdButton = screen.getByText("YTD");
    expect(ytdButton).toHaveClass("bg-white");
  });

  it("shows (current) indicator when viewing current month", () => {
    const currentMonth = new Date();
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "month",
      selectedMonth: currentMonth,
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
      goToPrevMonth: mockGoToPrevMonth,
      goToNextMonth: mockGoToNextMonth,
    });

    render(<PeriodSelector />);

    expect(screen.getByText("(current)")).toBeInTheDocument();
  });

  it("does not show (current) indicator when viewing past month", () => {
    const pastMonth = new Date(2024, 5, 15); // June 2024
    vi.mocked(useMetricsStore).mockReturnValue({
      periodType: "month",
      selectedMonth: pastMonth,
      setPeriodType: mockSetPeriodType,
      fetchAll: mockFetchAll,
      goToPrevMonth: mockGoToPrevMonth,
      goToNextMonth: mockGoToNextMonth,
    });

    render(<PeriodSelector />);

    expect(screen.queryByText("(current)")).not.toBeInTheDocument();
  });
});
