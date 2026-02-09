import { describe, expect, it } from 'vitest';
import type { TradeWithDerived } from '@/types';
import { buildHourlyMetrics, buildTickerMetrics, buildWeekdayMetrics, HOUR_LABELS, WEEKDAY_ORDER } from './utils';

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

describe('buildWeekdayMetrics', () => {
  it('returns all weekdays in Monday-to-Sunday order', () => {
    const result = buildWeekdayMetrics([]);
    expect(result.map((d) => d.day)).toEqual([...WEEKDAY_ORDER]);
  });

  it('aggregates trade counts and pnl by weekday', () => {
    const trades = [
      makeTrade({ id: 'm1', trade_date: '2026-01-05', net_pnl: 100 }), // Monday
      makeTrade({ id: 'm2', trade_date: '2026-01-05', net_pnl: -40 }), // Monday
      makeTrade({ id: 't1', trade_date: '2026-01-06', net_pnl: 25 }), // Tuesday
      makeTrade({ id: 'w1', trade_date: '2026-01-07', net_pnl: null }), // Wednesday
    ];

    const result = buildWeekdayMetrics(trades);

    expect(result[0].tradeCount).toBe(2);
    expect(result[0].pnl).toBe(60);

    expect(result[1].tradeCount).toBe(1);
    expect(result[1].pnl).toBe(25);

    expect(result[2].tradeCount).toBe(1);
    expect(result[2].pnl).toBe(0);
  });
});

describe('buildHourlyMetrics', () => {
  it('returns all 24 hours in order', () => {
    const result = buildHourlyMetrics([]);
    expect(result).toHaveLength(24);
    expect(result.map((d) => d.hourLabel)).toEqual(HOUR_LABELS);
  });

  it('aggregates trade counts and pnl by entry hour', () => {
    const trades = [
      makeTrade({ id: 'h1', entry_time: '09:15:00', net_pnl: 50 }),
      makeTrade({ id: 'h2', entry_time: '09:55:00', net_pnl: -20 }),
      makeTrade({ id: 'h3', entry_time: '14:10:00', net_pnl: 100 }),
      makeTrade({ id: 'h4', entry_time: '14:45:00', net_pnl: null }),
      makeTrade({ id: 'h5', entry_time: null, net_pnl: 70 }),
    ];

    const result = buildHourlyMetrics(trades);

    expect(result[9].tradeCount).toBe(2);
    expect(result[9].pnl).toBe(30);

    expect(result[14].tradeCount).toBe(2);
    expect(result[14].pnl).toBe(100);

    expect(result.reduce((sum, hour) => sum + hour.tradeCount, 0)).toBe(4);
  });
});

describe('buildTickerMetrics', () => {
  it('aggregates pnl by ticker for stocks and options', () => {
    const trades = [
      makeTrade({ id: 's1', asset_class: 'stock', symbol: 'AAPL', net_pnl: 100 }),
      makeTrade({ id: 's2', asset_class: 'stock', symbol: 'AAPL', net_pnl: -25 }),
      makeTrade({ id: 'o1', asset_class: 'option', symbol: 'TSLA 2026-02-20 300 C', net_pnl: 70 }),
      makeTrade({ id: 'o2', asset_class: 'option', symbol: 'TSLA 2026-03-20 320 C', net_pnl: 30 }),
    ];

    const result = buildTickerMetrics(trades);
    const aapl = result.find((r) => r.ticker === 'AAPL');
    const tsla = result.find((r) => r.ticker === 'TSLA');

    expect(aapl).toEqual({ ticker: 'AAPL', tradeCount: 2, pnl: 75 });
    expect(tsla).toEqual({ ticker: 'TSLA', tradeCount: 2, pnl: 100 });
  });

  it('uses first word as ticker for options symbols', () => {
    const trades = [
      makeTrade({ id: 'o3', asset_class: 'option', symbol: 'QQQ   2026-01-16 500 P', net_pnl: 10 }),
      makeTrade({ id: 'o4', asset_class: 'option', symbol: 'QQQ 2026-01-23 505 C', net_pnl: -5 }),
    ];

    const result = buildTickerMetrics(trades);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ ticker: 'QQQ', tradeCount: 2, pnl: 5 });
  });
});
