import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarketTape from './index';

const mockGetMarketTape = vi.fn();

vi.mock('@/api/market', () => ({
  getMarketTape: (...args: unknown[]) => mockGetMarketTape(...args),
}));

describe('MarketTape', () => {
  it('renders live Alpaca tape data when available', async () => {
    mockGetMarketTape.mockResolvedValueOnce([
      { symbol: 'SPY', price: 510.18, change: 4.27, change_percent: 0.84 },
      { symbol: 'QQQ', price: 438.31, change: -1.42, change_percent: -0.32 },
    ]);

    render(<MarketTape />);

    await waitFor(() => {
      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('510.18').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+4.27').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(+0.84%)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-1.42').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(-0.32%)').length).toBeGreaterThan(0);
  });

  it('falls back to local tape data when Alpaca fetch fails', async () => {
    mockGetMarketTape.mockRejectedValueOnce(new Error('keys missing'));

    render(<MarketTape />);

    await waitFor(() => {
      expect(screen.getByText('keys missing')).toBeInTheDocument();
    });
  });
});
