import type { TradeWithDerived } from '@/types';

export const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface WeekdayMetrics {
  day: (typeof WEEKDAY_ORDER)[number];
  tradeCount: number;
  pnl: number;
}

export interface HourlyMetrics {
  hour: number;
  hourLabel: string;
  tradeCount: number;
  pnl: number;
}

export interface TickerMetrics {
  ticker: string;
  tradeCount: number;
  pnl: number;
}

export const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`);

function getMondayFirstWeekdayIndex(tradeDate: string): number {
  const date = new Date(`${tradeDate}T00:00:00`);
  const sundayFirstDay = date.getDay();
  return (sundayFirstDay + 6) % 7;
}

function parseHour(entryTime: string | null): number | null {
  if (!entryTime) {
    return null;
  }

  const hourPart = entryTime.split(':')[0];
  const hour = Number.parseInt(hourPart, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    return null;
  }
  return hour;
}

function extractTicker(symbol: string, assetClass: TradeWithDerived['asset_class']): string {
  const trimmed = symbol.trim();
  if (!trimmed) {
    return 'UNKNOWN';
  }

  if (assetClass === 'option') {
    const [underlying] = trimmed.split(/\s+/);
    return underlying || 'UNKNOWN';
  }

  return trimmed;
}

export function buildWeekdayMetrics(trades: TradeWithDerived[]): WeekdayMetrics[] {
  const metrics = WEEKDAY_ORDER.map((day) => ({ day, tradeCount: 0, pnl: 0 }));

  for (const trade of trades) {
    const dayIndex = getMondayFirstWeekdayIndex(trade.trade_date);
    metrics[dayIndex].tradeCount += 1;

    if (trade.net_pnl !== null) {
      metrics[dayIndex].pnl += trade.net_pnl;
    }
  }

  return metrics;
}

export function buildHourlyMetrics(trades: TradeWithDerived[]): HourlyMetrics[] {
  const metrics = HOUR_LABELS.map((hourLabel, hour) => ({
    hour,
    hourLabel,
    tradeCount: 0,
    pnl: 0,
  }));

  for (const trade of trades) {
    const hour = parseHour(trade.entry_time);
    if (hour === null) {
      continue;
    }

    metrics[hour].tradeCount += 1;
    if (trade.net_pnl !== null) {
      metrics[hour].pnl += trade.net_pnl;
    }
  }

  return metrics;
}

export function buildTickerMetrics(trades: TradeWithDerived[]): TickerMetrics[] {
  const tickerMap = new Map<string, TickerMetrics>();

  for (const trade of trades) {
    const ticker = extractTicker(trade.symbol, trade.asset_class);
    const existing = tickerMap.get(ticker) ?? { ticker, tradeCount: 0, pnl: 0 };
    existing.tradeCount += 1;
    if (trade.net_pnl !== null) {
      existing.pnl += trade.net_pnl;
    }
    tickerMap.set(ticker, existing);
  }

  return Array.from(tickerMap.values()).sort((a, b) => {
    if (b.pnl !== a.pnl) {
      return b.pnl - a.pnl;
    }
    return a.ticker.localeCompare(b.ticker);
  });
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
  }).format(value);
}
