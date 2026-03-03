import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarView from './index';
import { useMetricsStore } from '@/stores';
import * as tradesApi from '@/api/trades';
import type { DailyPerformance, TradeWithDerived } from '@/types';

vi.mock('@/stores', () => ({
  useMetricsStore: vi.fn(),
}));

vi.mock('@/api/trades', () => ({
  getTrades: vi.fn(),
}));

const mockDailyPerformance: DailyPerformance[] = [
  { date: '2024-01-15', realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
  { date: '2024-01-16', realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
  { date: '2024-08-10', realized_net_pnl: 150, trade_count: 1, win_count: 1, loss_count: 0 },
];

const mockTrade: TradeWithDerived = {
  id: 'trade-1',
  user_id: 'user-1',
  account_id: 'account-1',
  instrument_id: 'inst-1',
  symbol: 'AAPL',
  asset_class: 'stock',
  trade_number: 1,
  trade_date: '2024-01-15',
  direction: 'long',
  quantity: 100,
  entry_price: 150,
  exit_price: 160,
  stop_loss_price: 145,
  entry_time: null,
  exit_time: null,
  fees: 2,
  strategy: 'momentum',
  notes: null,
  status: 'closed',
  created_at: '2024-01-15T09:30:00Z',
  updated_at: '2024-01-15T15:00:00Z',
  gross_pnl: 1000,
  net_pnl: 998,
  pnl_per_share: 10,
  risk_per_share: 5,
  r_multiple: 2,
  result: 'win',
};

function renderWithRouter(initialEntries = ['/calendar']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CalendarView />
    </MemoryRouter>
  );
}

describe('CalendarView', () => {
  const mockFetchDailyPerformance = vi.fn();
  const mockSetDateRange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20'));
    vi.mocked(tradesApi.getTrades).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading indicator when loading', () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: [],
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: true,
    });

    renderWithRouter();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders year layout with month mini-calendars', () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: mockDailyPerformance,
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });

    renderWithRouter();

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Scan your full year, then drill down into any trading day.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2024' })).toBeInTheDocument();
    expect(screen.getAllByText('January').length).toBeGreaterThan(0);
    expect(screen.getAllByText('December').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sun').length).toBeGreaterThan(0);
  });

  it('loads data for the full selected year', () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: mockDailyPerformance,
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });

    renderWithRouter();

    expect(mockSetDateRange).toHaveBeenCalledWith({
      start: '2024-01-01',
      end: '2024-12-31',
    });
    expect(mockFetchDailyPerformance).toHaveBeenCalled();
  });

  it('navigates between years', () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: [],
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });

    renderWithRouter();

    fireEvent.click(screen.getByLabelText('Previous year'));
    expect(screen.getByRole('heading', { name: '2023' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Next year'));
    expect(screen.getByRole('heading', { name: '2024' })).toBeInTheDocument();
  });

  it('respects month from URL params', () => {
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: [],
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });

    renderWithRouter(['/calendar?month=2023-12']);

    expect(screen.getByRole('heading', { name: '2023' })).toBeInTheDocument();
    expect(mockSetDateRange).toHaveBeenCalledWith({
      start: '2023-01-01',
      end: '2023-12-31',
    });
  });

  it('shows day detail when selected date is present', async () => {
    vi.useRealTimers();
    vi.mocked(useMetricsStore).mockReturnValue({
      dailyPerformance: mockDailyPerformance,
      fetchDailyPerformance: mockFetchDailyPerformance,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });
    vi.mocked(tradesApi.getTrades).mockResolvedValue([mockTrade]);

    renderWithRouter(['/calendar?date=2024-01-15']);

    await waitFor(() => {
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('LONG')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('January 15, 2024')).not.toBeInTheDocument();
  });
});
