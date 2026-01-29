import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TradeForm from "./index";
import { useTradesStore } from "@/stores";
import type { TradeWithDerived } from "@/types";

vi.mock("@/stores", () => ({
  useTradesStore: vi.fn(),
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

describe("TradeForm", () => {
  const mockCreateTrade = vi.fn();
  const mockUpdateTrade = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTradesStore).mockReturnValue({
      createTrade: mockCreateTrade,
      updateTrade: mockUpdateTrade,
      isLoading: false,
    });
  });

  describe("create mode", () => {
    it("renders all form fields", () => {
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText("AAPL")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("100")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("150.00")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("148.00")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Breakout")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Trade notes...")).toBeInTheDocument();
      // Custom Select components - check default values are shown
      expect(screen.getByText("Long")).toBeInTheDocument();
      // Status is now auto-computed (shown as Open initially since no exits)
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("(auto)")).toBeInTheDocument();
      // Exits section
      expect(screen.getByText("Exits")).toBeInTheDocument();
      expect(screen.getByText("+ Add Exit")).toBeInTheDocument();
      expect(screen.getByText("No exits added (position is open)")).toBeInTheDocument();
    });

    it("shows Create Trade button", () => {
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Create Trade")).toBeInTheDocument();
    });

    it("converts symbol to uppercase", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const symbolInput = screen.getByPlaceholderText("AAPL");
      await user.type(symbolInput, "aapl");

      expect(symbolInput).toHaveValue("AAPL");
    });

    it("submits form with correct data", async () => {
      const user = userEvent.setup();
      mockCreateTrade.mockResolvedValue(mockTrade);

      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByPlaceholderText("AAPL"), "AAPL");
      await user.type(screen.getByPlaceholderText("150.00"), "150");
      await user.click(screen.getByText("Create Trade"));

      expect(mockCreateTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: "acc-1",
          symbol: "AAPL",
          entry_price: 150,
          direction: "long",
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText("Cancel"));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("displays error message on submission failure", async () => {
      const user = userEvent.setup();
      mockCreateTrade.mockRejectedValue(new Error("Validation failed"));

      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByPlaceholderText("AAPL"), "AAPL");
      await user.type(screen.getByPlaceholderText("150.00"), "150");
      await user.click(screen.getByText("Create Trade"));

      expect(await screen.findByText(/validation failed/i)).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("edit mode", () => {
    it("pre-fills form with trade data", () => {
      render(
        <TradeForm
          trade={mockTrade}
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByDisplayValue("AAPL")).toBeInTheDocument();
      expect(screen.getByDisplayValue("150")).toBeInTheDocument();
      // Quantity appears twice (entry qty and exit qty are both 100)
      expect(screen.getAllByDisplayValue("100")).toHaveLength(2);
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("momentum")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Good setup")).toBeInTheDocument();
      // Exit is pre-populated in the exits section
      expect(screen.getByDisplayValue("160")).toBeInTheDocument();
    });

    it("shows Update Trade button", () => {
      render(
        <TradeForm
          trade={mockTrade}
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Update Trade")).toBeInTheDocument();
    });

    it("calls updateTrade on submit", async () => {
      const user = userEvent.setup();
      mockUpdateTrade.mockResolvedValue(mockTrade);

      render(
        <TradeForm
          trade={mockTrade}
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const symbolInput = screen.getByDisplayValue("AAPL");
      await user.clear(symbolInput);
      await user.type(symbolInput, "GOOGL");
      await user.click(screen.getByText("Update Trade"));

      expect(mockUpdateTrade).toHaveBeenCalledWith(
        "trade-1",
        expect.objectContaining({
          symbol: "GOOGL",
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows Saving... when loading", () => {
      vi.mocked(useTradesStore).mockReturnValue({
        createTrade: mockCreateTrade,
        updateTrade: mockUpdateTrade,
        isLoading: true,
      });

      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("disables buttons when loading", () => {
      vi.mocked(useTradesStore).mockReturnValue({
        createTrade: mockCreateTrade,
        updateTrade: mockUpdateTrade,
        isLoading: true,
      });

      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Cancel")).toBeDisabled();
      expect(screen.getByText("Saving...")).toBeDisabled();
    });
  });

  describe("direction selection", () => {
    it("allows selecting short direction", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Click on Direction dropdown to open it
      await user.click(screen.getByText("Long"));
      // Select Short option
      await user.click(screen.getByText("Short"));

      // Verify Short is now selected
      expect(screen.getByText("Short")).toBeInTheDocument();
    });
  });

  describe("exits section", () => {
    it("adds exit when Add Exit button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText("+ Add Exit"));

      // Should show exit input fields
      expect(screen.getByPlaceholderText("50")).toBeInTheDocument(); // Qty placeholder
      expect(screen.getByPlaceholderText("155.00")).toBeInTheDocument(); // Price placeholder
      // Should no longer show "No exits added" message
      expect(screen.queryByText("No exits added (position is open)")).not.toBeInTheDocument();
    });

    it("auto-calculates status as closed when fully exited", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Enter quantity
      await user.type(screen.getByPlaceholderText("100"), "100");

      // Add exit
      await user.click(screen.getByText("+ Add Exit"));
      await user.type(screen.getByPlaceholderText("50"), "100"); // Exit all 100
      await user.type(screen.getByPlaceholderText("155.00"), "155");

      // Status should show as Closed
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("shows warning when exit quantity exceeds entry", async () => {
      const user = userEvent.setup();
      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Enter quantity
      await user.type(screen.getByPlaceholderText("100"), "50");

      // Add exit with more shares than entry
      await user.click(screen.getByText("+ Add Exit"));
      await user.type(screen.getByPlaceholderText("50"), "100"); // 100 > 50 entry
      await user.type(screen.getByPlaceholderText("155.00"), "155");

      // Should show warning
      expect(screen.getByText(/exit quantity.*exceeds entry quantity/i)).toBeInTheDocument();
    });

    it("submits trade with exits", async () => {
      const user = userEvent.setup();
      mockCreateTrade.mockResolvedValue(mockTrade);

      render(
        <TradeForm
          defaultAccountId="acc-1"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Fill in basic fields
      await user.type(screen.getByPlaceholderText("AAPL"), "TSLA");
      await user.type(screen.getByPlaceholderText("100"), "100");
      await user.type(screen.getByPlaceholderText("150.00"), "200");

      // Add exit
      await user.click(screen.getByText("+ Add Exit"));
      await user.type(screen.getByPlaceholderText("50"), "100");
      await user.type(screen.getByPlaceholderText("155.00"), "220");

      await user.click(screen.getByText("Create Trade"));

      expect(mockCreateTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "TSLA",
          entry_price: 200,
          quantity: 100,
          exits: expect.arrayContaining([
            expect.objectContaining({
              quantity: 100,
              price: 220,
            }),
          ]),
        })
      );
    });
  });
});
