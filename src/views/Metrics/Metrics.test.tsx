import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Metrics from './index';
import { useThemeStore, useTradesStore } from '@/stores';
import type { TradeWithDerived } from '@/types';

vi.mock('@/stores', () => ({
  useTradesStore: vi.fn(),
  useThemeStore: vi.fn(),
}));

function makeTrade(overrides: Partial<TradeWithDerived>): TradeWithDerived {
  return {
    id: 't-1',
    user_id: 'u-1',
    account_id: 'a-1',
    instrument_id: 'AAPL',
    symbol: 'AAPL',
    asset_class: 'stock',
    trade_number: 1,
    trade_date: '2026-01-05',
    direction: 'long',
    quantity: 10,
    entry_price: 100,
    exit_price: 110,
    stop_loss_price: 95,
    entry_time: '09:30:00',
    exit_time: '10:00:00',
    fees: 1,
    strategy: null,
    notes: null,
    status: 'closed',
    created_at: '2026-01-05',
    updated_at: '2026-01-05',
    gross_pnl: 100,
    net_pnl: 99,
    pnl_per_share: 9.9,
    risk_per_share: 5,
    r_multiple: 1.98,
    result: 'win',
    ...overrides,
  };
}

describe('Metrics', () => {
  const mockFetchTrades = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useThemeStore).mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    });
  });

  it('calls fetchTrades on mount', () => {
    vi.mocked(useTradesStore).mockReturnValue({
      trades: [makeTrade({})],
      fetchTrades: mockFetchTrades,
      isLoading: false,
      error: null,
    });

    render(<Metrics />);

    expect(mockFetchTrades).toHaveBeenCalledTimes(1);
  });

  it('renders requested chart titles', () => {
    vi.mocked(useTradesStore).mockReturnValue({
      trades: [makeTrade({})],
      fetchTrades: mockFetchTrades,
      isLoading: false,
      error: null,
    });

    render(<Metrics />);

    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Daily Trade Distribution')).toBeInTheDocument();
    expect(screen.getByText('PNL by Day of the week')).toBeInTheDocument();
    expect(screen.getByText('Hourly Trade Distribution')).toBeInTheDocument();
    expect(screen.getByText('Pnl Per hour')).toBeInTheDocument();
    expect(screen.getByText('Pnl per Ticker')).toBeInTheDocument();
  });

  it('shows empty state when there are no trades', () => {
    vi.mocked(useTradesStore).mockReturnValue({
      trades: [],
      fetchTrades: mockFetchTrades,
      isLoading: false,
      error: null,
    });

    render(<Metrics />);

    expect(screen.getByText('No trades found.')).toBeInTheDocument();
  });
});
