import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeStore, useTradesStore } from '@/stores';
import { buildHourlyMetrics, buildTickerMetrics, buildWeekdayMetrics, formatCompactCurrency } from './utils';

type ChartMode = 'tradeCount' | 'pnl';
const MAX_TICKER_BARS = 10;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function kpiValueClass(value: number): string {
  if (value > 0) {
    return 'text-green-600 dark:text-green-400';
  }
  if (value < 0) {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-stone-900 dark:text-stone-100';
}

function SegmentToggle({
  mode,
  onChange,
  leftLabel,
  rightLabel,
}: {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="inline-flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900/70">
      <button
        type="button"
        onClick={() => onChange('tradeCount')}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
          mode === 'tradeCount'
            ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange('pnl')}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
          mode === 'pnl'
            ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

export default function Metrics() {
  const { trades, fetchTrades, isLoading, error } = useTradesStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [weekdayMode, setWeekdayMode] = useState<ChartMode>('tradeCount');
  const [hourlyMode, setHourlyMode] = useState<ChartMode>('tradeCount');

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const weekdayMetrics = useMemo(() => buildWeekdayMetrics(trades), [trades]);
  const hourlyMetrics = useMemo(() => buildHourlyMetrics(trades), [trades]);
  const tickerMetrics = useMemo(() => buildTickerMetrics(trades), [trades]);
  const topTickerMetrics = useMemo(() => {
    if (tickerMetrics.length <= MAX_TICKER_BARS) {
      return tickerMetrics;
    }

    const sortedByMagnitude = [...tickerMetrics].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
    const top = sortedByMagnitude.slice(0, MAX_TICKER_BARS);
    const remaining = sortedByMagnitude.slice(MAX_TICKER_BARS);
    const others = remaining.reduce(
      (acc, entry) => {
        acc.tradeCount += entry.tradeCount;
        acc.pnl += entry.pnl;
        return acc;
      },
      { ticker: 'Others', tradeCount: 0, pnl: 0 }
    );

    const merged = others.tradeCount > 0 ? [...top, others] : top;
    return merged.sort((a, b) => b.pnl - a.pnl);
  }, [tickerMetrics]);

  const totalTrades = trades.length;
  const totalNetPnl = useMemo(
    () => trades.reduce((sum, trade) => sum + (trade.net_pnl ?? 0), 0),
    [trades]
  );
  const winningTrades = useMemo(
    () => trades.filter((trade) => (trade.net_pnl ?? 0) > 0).length,
    [trades]
  );
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = useMemo(() => {
    const grossProfit = trades.reduce((sum, trade) => sum + ((trade.net_pnl ?? 0) > 0 ? (trade.net_pnl ?? 0) : 0), 0);
    const grossLoss = trades.reduce((sum, trade) => sum + ((trade.net_pnl ?? 0) < 0 ? Math.abs(trade.net_pnl ?? 0) : 0), 0);
    return grossLoss > 0 ? grossProfit / grossLoss : null;
  }, [trades]);
  const expectancy = totalTrades > 0 ? totalNetPnl / totalTrades : 0;

  const tooltipCursor = isDark
    ? { fill: 'rgba(17, 24, 39, 0.8)' }
    : { fill: 'rgba(148, 163, 184, 0.25)' };
  const tooltipContentStyle = isDark
    ? { backgroundColor: '#111827', border: '1px solid #374151' }
    : { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1' };
  const tooltipLabelStyle = isDark ? { color: '#F3F4F6' } : { color: '#111827' };
  const tooltipItemStyle = isDark ? { color: '#E5E7EB' } : { color: '#1F2937' };

  if (isLoading && trades.length === 0) {
    return (
      <div className="p-6 pt-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metrics</h1>
        <div className="text-stone-500 dark:text-stone-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metrics</h1>
        <div className="text-red-600 dark:text-red-400">Failed to load metrics: {error}</div>
      </div>
    );
  }

  if (!isLoading && trades.length === 0) {
    return (
      <div className="p-6 pt-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metrics</h1>
        <div className="py-16 text-center text-stone-500 dark:text-stone-400">
          <p>No trades found.</p>
          <p className="mt-2">Add trades to see weekday distribution metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metrics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <section className="app-panel p-4">
          <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">Total trades</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{totalTrades}</p>
        </section>
        <section className="app-panel p-4">
          <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">Net P&amp;L</p>
          <p className={`text-2xl font-bold ${kpiValueClass(totalNetPnl)}`}>{formatCurrency(totalNetPnl)}</p>
        </section>
        <section className="app-panel p-4">
          <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">Win rate</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{winRate.toFixed(1)}%</p>
        </section>
        <section className="app-panel p-4">
          <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">Profit factor</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {profitFactor !== null && isFinite(profitFactor) ? profitFactor.toFixed(2) : 'N/A'}
          </p>
          <p className={`text-xs mt-1 ${kpiValueClass(expectancy)}`}>Expectancy {formatCurrency(expectancy)}</p>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="app-panel p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold dark:text-stone-100">Weekday Performance</h2>
            <SegmentToggle
              mode={weekdayMode}
              onChange={setWeekdayMode}
              leftLabel="Trades"
              rightLabel="Net P&L"
            />
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayMetrics} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis
                  allowDecimals={weekdayMode === 'tradeCount' ? false : true}
                  tickFormatter={weekdayMode === 'pnl' ? formatCompactCurrency : undefined}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [
                    weekdayMode === 'pnl' ? formatCompactCurrency(value) : value,
                    weekdayMode === 'pnl' ? 'Net P&L' : 'Trades',
                  ]}
                />
                <Bar
                  dataKey={weekdayMode}
                  fill={weekdayMode === 'tradeCount' ? '#0f766e' : '#16a34a'}
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fillOpacity: 0.85, stroke: '#111827', strokeWidth: 1 } : { fillOpacity: 0.9 }}
                >
                  {weekdayMode === 'pnl' ? (
                    weekdayMetrics.map((entry) => (
                      <Cell key={entry.day} fill={entry.pnl >= 0 ? '#16a34a' : '#dc2626'} />
                    ))
                  ) : null}
                  {weekdayMode === 'tradeCount' ? (
                    <LabelList
                      dataKey="tradeCount"
                      position="top"
                      fill={isDark ? '#E5E7EB' : '#1F2937'}
                      fontSize={12}
                    />
                  ) : null}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="app-panel p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold dark:text-stone-100">Hourly Performance</h2>
            <SegmentToggle
              mode={hourlyMode}
              onChange={setHourlyMode}
              leftLabel="Trades"
              rightLabel="Net P&L"
            />
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="hourLabel" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={1} />
                <YAxis
                  allowDecimals={hourlyMode === 'tradeCount' ? false : true}
                  tickFormatter={hourlyMode === 'pnl' ? formatCompactCurrency : undefined}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [
                    hourlyMode === 'pnl' ? formatCompactCurrency(value) : value,
                    hourlyMode === 'pnl' ? 'Net P&L' : 'Trades',
                  ]}
                />
                <Bar
                  dataKey={hourlyMode}
                  radius={[4, 4, 0, 0]}
                  fill={hourlyMode === 'tradeCount' ? '#d97706' : '#16a34a'}
                  activeBar={isDark ? { fillOpacity: 0.8, stroke: '#111827', strokeWidth: 1 } : { fillOpacity: 0.9 }}
                >
                  {hourlyMode === 'pnl' ? (
                    hourlyMetrics.map((entry) => (
                      <Cell key={entry.hourLabel} fill={entry.pnl >= 0 ? '#16a34a' : '#dc2626'} />
                    ))
                  ) : null}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="app-panel p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold dark:text-stone-100">P&amp;L by Ticker</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Top {MAX_TICKER_BARS} by absolute move
            </p>
          </div>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTickerMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="ticker"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number, _name: string, props: { payload?: { tradeCount?: number } }) => [
                    formatCompactCurrency(value),
                    `Net P&L (${props.payload?.tradeCount ?? 0} trades)`,
                  ]}
                />
                <Bar
                  dataKey="pnl"
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fillOpacity: 0.8, stroke: '#111827', strokeWidth: 1 } : { fillOpacity: 0.9 }}
                >
                  {topTickerMetrics.map((entry) => (
                    <Cell key={entry.ticker} fill={entry.pnl >= 0 ? '#16a34a' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
