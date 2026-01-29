import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TradeList from "./index";
import { useTradesStore, useAccountsStore, useImportStore } from "@/stores";
import type { TradeWithDerived } from "@/types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/stores", () => ({
  useTradesStore: vi.fn(),
  useAccountsStore: vi.fn(),
  useImportStore: vi.fn(),
}));

vi.mock("@/components/TradeForm", () => ({
  default: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="trade-form">
      <button onClick={onSuccess}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("@/components/ImportDialog", () => ({
  default: () => <div data-testid="import-dialog" />,
}));

const mockTrade: TradeWithDerived = {
  id: "trade-1",
  user_id: "user-1",
  account_id: "account-1",
  instrument_id: "inst-1",
  symbol: "AAPL",
  asset_class: "stock",
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
  notes: "Good setup",
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

const mockTrade2: TradeWithDerived = {
  ...mockTrade,
  id: "trade-2",
  symbol: "MSFT",
  direction: "short",
  net_pnl: -500,
  result: "loss",
};

describe("TradeList", () => {
  const mockFetchTrades = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccountsStore).mockReturnValue({
      accounts: [{ id: "acc-1", user_id: "user-1", name: "Main", base_currency: "USD", created_at: "" }],
      selectedAccountId: "acc-1",
    });
    vi.mocked(useImportStore).mockReturnValue({
      openDialog: vi.fn(),
    });
  });

  describe("loading state", () => {
    it("shows loading indicator when loading", () => {
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
        isLoading: true,
      });

      render(<TradeList />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when no trades", () => {
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
        isLoading: false,
      });

      render(<TradeList />);

      expect(screen.getByText("No trades found.")).toBeInTheDocument();
      expect(screen.getByText('Click "New Trade" to add your first trade!')).toBeInTheDocument();
    });
  });

  describe("with trades", () => {
    beforeEach(() => {
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [mockTrade, mockTrade2],
        fetchTrades: mockFetchTrades,
        isLoading: false,
      });
    });

    it("renders page title", () => {
      render(<TradeList />);

      expect(screen.getByText("Trades")).toBeInTheDocument();
    });

    it("renders New Trade button", () => {
      render(<TradeList />);

      expect(screen.getByText("+ New Trade")).toBeInTheDocument();
    });

    it("calls fetchTrades on mount", () => {
      render(<TradeList />);

      expect(mockFetchTrades).toHaveBeenCalled();
    });

    it("renders trade table headers", () => {
      render(<TradeList />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Symbol")).toBeInTheDocument();
      expect(screen.getByText("Direction")).toBeInTheDocument();
      expect(screen.getByText("Entry")).toBeInTheDocument();
      expect(screen.getByText("Exit")).toBeInTheDocument();
      expect(screen.getByText("Qty")).toBeInTheDocument();
      expect(screen.getByText("Net P&L")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    it("displays trade symbols", () => {
      render(<TradeList />);

      expect(screen.getByText("AAPL")).toBeInTheDocument();
      expect(screen.getByText("MSFT")).toBeInTheDocument();
    });

    it("displays trade directions", () => {
      render(<TradeList />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
      expect(screen.getByText("SHORT")).toBeInTheDocument();
    });

    it("displays trade results", () => {
      render(<TradeList />);

      expect(screen.getByText("WIN")).toBeInTheDocument();
      expect(screen.getByText("LOSS")).toBeInTheDocument();
    });

    it("displays formatted P&L values", () => {
      render(<TradeList />);

      expect(screen.getByText("$998.00")).toBeInTheDocument();
      expect(screen.getByText("-$500.00")).toBeInTheDocument();
    });

    it("navigates to trade detail on row click", async () => {
      const user = userEvent.setup();
      render(<TradeList />);

      const row = screen.getByText("AAPL").closest("tr");
      await user.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith("/trades/trade-1");
    });
  });

  describe("new trade form", () => {
    beforeEach(() => {
      vi.mocked(useTradesStore).mockReturnValue({
        trades: [],
        fetchTrades: mockFetchTrades,
        isLoading: false,
      });
    });

    it("opens form modal when New Trade clicked", async () => {
      const user = userEvent.setup();
      render(<TradeList />);

      await user.click(screen.getByText("+ New Trade"));

      expect(screen.getByText("New Trade", { selector: "h2" })).toBeInTheDocument();
      expect(screen.getByTestId("trade-form")).toBeInTheDocument();
    });

    it("closes form modal on cancel", async () => {
      const user = userEvent.setup();
      render(<TradeList />);

      await user.click(screen.getByText("+ New Trade"));
      await user.click(screen.getByText("Cancel"));

      expect(screen.queryByTestId("trade-form")).not.toBeInTheDocument();
    });

    it("closes form and refreshes on success", async () => {
      const user = userEvent.setup();
      render(<TradeList />);

      await user.click(screen.getByText("+ New Trade"));
      await user.click(screen.getByText("Submit"));

      expect(screen.queryByTestId("trade-form")).not.toBeInTheDocument();
      expect(mockFetchTrades).toHaveBeenCalledTimes(2); // Once on mount, once on success
    });
  });
});
