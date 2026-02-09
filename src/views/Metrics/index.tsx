import { useEffect, useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeStore, useTradesStore } from '@/stores';
import { buildHourlyMetrics, buildTickerMetrics, buildWeekdayMetrics, formatCompactCurrency } from './utils';

export default function Metrics() {
  const { trades, fetchTrades, isLoading, error } = useTradesStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const weekdayMetrics = useMemo(() => buildWeekdayMetrics(trades), [trades]);
  const hourlyMetrics = useMemo(() => buildHourlyMetrics(trades), [trades]);
  const tickerMetrics = useMemo(() => buildTickerMetrics(trades), [trades]);
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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Metrics</h1>
        <div className="text-gray-500 dark:text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Metrics</h1>
        <div className="text-red-600 dark:text-red-400">Failed to load metrics: {error}</div>
      </div>
    );
  }

  if (!isLoading && trades.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Metrics</h1>
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p>No trades found.</p>
          <p className="mt-2">Add trades to see weekday distribution metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Metrics</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">
            Daily Trade Distribution
          </h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayMetrics} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [value, 'Trades']}
                />
                <Bar
                  dataKey="tradeCount"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fill: '#1D4ED8' } : { fill: '#1E40AF' }}
                >
                  <LabelList
                    dataKey="tradeCount"
                    position="top"
                    fill={isDark ? '#E5E7EB' : '#1F2937'}
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">PNL by Day of the week</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [formatCompactCurrency(value), 'Net P&L']}
                />
                <Bar
                  dataKey="pnl"
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fillOpacity: 0.8, stroke: '#111827', strokeWidth: 1 } : { fillOpacity: 0.9 }}
                >
                  {weekdayMetrics.map((entry) => (
                    <Cell key={entry.day} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Hourly Trade Distribution</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMetrics} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="hourLabel" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [value, 'Trades']}
                />
                <Bar
                  dataKey="tradeCount"
                  fill="#7C3AED"
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fill: '#6D28D9' } : { fill: '#5B21B6' }}
                >
                  <LabelList
                    dataKey="tradeCount"
                    position="top"
                    fill={isDark ? '#E5E7EB' : '#1F2937'}
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Pnl Per hour</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="hourLabel" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={1} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  cursor={tooltipCursor}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: number) => [formatCompactCurrency(value), 'Net P&L']}
                />
                <Bar
                  dataKey="pnl"
                  radius={[4, 4, 0, 0]}
                  activeBar={isDark ? { fillOpacity: 0.8, stroke: '#111827', strokeWidth: 1 } : { fillOpacity: 0.9 }}
                >
                  {hourlyMetrics.map((entry) => (
                    <Cell key={entry.hourLabel} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Pnl per Ticker</h2>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tickerMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
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
                  {tickerMetrics.map((entry) => (
                    <Cell key={entry.ticker} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
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
