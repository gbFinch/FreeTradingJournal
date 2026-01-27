import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAccountsStore, useThemeStore, useTradesStore, useMetricsStore } from "@/stores";

vi.mock("@/stores", () => ({
  useAccountsStore: vi.fn(),
  useThemeStore: vi.fn(),
  useTradesStore: vi.fn(),
  useMetricsStore: vi.fn(),
}));

vi.mock("@/views/Dashboard", () => ({
  default: () => <div data-testid="dashboard-view">Dashboard View</div>,
}));

vi.mock("@/views/CalendarView", () => ({
  default: () => <div data-testid="calendar-view">Calendar View</div>,
}));

vi.mock("@/views/TradeList", () => ({
  default: () => <div data-testid="tradelist-view">TradeList View</div>,
}));

vi.mock("@/views/TradeDetail", () => ({
  default: () => <div data-testid="tradedetail-view">TradeDetail View</div>,
}));

vi.mock("@/components/TradeForm", () => ({
  default: () => <div data-testid="trade-form">Trade Form</div>,
}));

// Helper to render App with custom initial route
function renderWithRouter(initialRoute = "/") {
  // We need to render without BrowserRouter since App includes it
  // Instead, we'll test the components that App renders
  return render(<App />);
}

describe("App", () => {
  const mockFetchAccounts = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockFetchTrades = vi.fn();
  const mockFetchMetrics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccountsStore).mockReturnValue({
      fetchAccounts: mockFetchAccounts,
      accounts: [{ id: "acc-1", name: "Test Account" }],
      selectedAccountId: "acc-1",
    });
    vi.mocked(useThemeStore).mockReturnValue({
      theme: "light",
      toggleTheme: mockToggleTheme,
    });
    vi.mocked(useTradesStore).mockReturnValue({
      fetchTrades: mockFetchTrades,
    });
    vi.mocked(useMetricsStore).mockReturnValue({
      fetchAll: mockFetchMetrics,
    });
  });

  describe("layout", () => {
    it("renders the app title", () => {
      renderWithRouter();

      expect(screen.getByText("Trading Journal")).toBeInTheDocument();
    });

    it("renders version number", () => {
      renderWithRouter();

      expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    });

    it("calls fetchAccounts on mount", () => {
      renderWithRouter();

      expect(mockFetchAccounts).toHaveBeenCalled();
    });
  });

  describe("navigation", () => {
    it("renders Dashboard nav link", () => {
      renderWithRouter();

      expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    });

    it("renders Calendar nav link", () => {
      renderWithRouter();

      expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    });

    it("renders Trades nav link", () => {
      renderWithRouter();

      expect(screen.getByRole("link", { name: "Trades" })).toBeInTheDocument();
    });

    it("Dashboard link points to /", () => {
      renderWithRouter();

      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("href", "/");
    });

    it("Calendar link points to /calendar", () => {
      renderWithRouter();

      const link = screen.getByRole("link", { name: "Calendar" });
      expect(link).toHaveAttribute("href", "/calendar");
    });

    it("Trades link points to /trades", () => {
      renderWithRouter();

      const link = screen.getByRole("link", { name: "Trades" });
      expect(link).toHaveAttribute("href", "/trades");
    });
  });

  describe("routing", () => {
    it("renders Dashboard view on / route", () => {
      renderWithRouter();

      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    });

    it("renders Calendar view when navigating to /calendar", () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole("link", { name: "Calendar" }));

      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    it("renders TradeList view when navigating to /trades", () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole("link", { name: "Trades" }));

      expect(screen.getByTestId("tradelist-view")).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("renders theme toggle button", () => {
      renderWithRouter();

      const button = screen.getByTitle("Switch to dark mode");
      expect(button).toBeInTheDocument();
    });

    it("shows sun icon in dark mode", () => {
      vi.mocked(useThemeStore).mockReturnValue({
        theme: "dark",
        toggleTheme: mockToggleTheme,
      });

      renderWithRouter();

      expect(screen.getByTitle("Switch to light mode")).toBeInTheDocument();
    });

    it("calls toggleTheme when clicked", () => {
      renderWithRouter();

      const button = screen.getByTitle("Switch to dark mode");
      fireEvent.click(button);

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });

  describe("add trade button", () => {
    it("renders Add Trade button in sidebar", () => {
      renderWithRouter();

      expect(screen.getByRole("button", { name: /add trade/i })).toBeInTheDocument();
    });

    it("opens trade form modal when Add Trade is clicked", () => {
      renderWithRouter();

      const addButton = screen.getByRole("button", { name: /add trade/i });
      fireEvent.click(addButton);

      expect(screen.getByText("New Trade")).toBeInTheDocument();
      expect(screen.getByTestId("trade-form")).toBeInTheDocument();
    });

    it("closes modal when X button is clicked", () => {
      renderWithRouter();

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /add trade/i }));
      expect(screen.getByTestId("trade-form")).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText("×"));
      expect(screen.queryByTestId("trade-form")).not.toBeInTheDocument();
    });
  });

  describe("active nav state", () => {
    it("navigated link becomes active", () => {
      renderWithRouter();

      // Navigate to Calendar
      fireEvent.click(screen.getByRole("link", { name: "Calendar" }));
      expect(screen.getByRole("link", { name: "Calendar" })).toHaveClass("bg-blue-600");

      // Navigate to Trades
      fireEvent.click(screen.getByRole("link", { name: "Trades" }));
      expect(screen.getByRole("link", { name: "Trades" })).toHaveClass("bg-blue-600");

      // Navigate back to Dashboard
      fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass("bg-blue-600");
    });

    it("inactive links have default styling", () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole("link", { name: "Calendar" }));

      // Dashboard and Trades should have inactive styling
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass("text-gray-300");
      expect(screen.getByRole("link", { name: "Trades" })).toHaveClass("text-gray-300");
    });
  });
});
