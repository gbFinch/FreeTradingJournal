import { useEffect } from 'react';
import { useMetricsStore } from '@/stores';
import MetricCard from '@/components/MetricCard';
import EquityCurve from '@/components/EquityCurve';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import PeriodSelector from '@/components/PeriodSelector';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, decimals = 2): string {
  if (value === null) return 'N/A';
  if (!isFinite(value)) return 'Infinite';
  return value.toFixed(decimals);
}

export default function Dashboard() {
  const { periodMetrics, equityCurve, dailyPerformance, fetchAll, isLoading } = useMetricsStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <PeriodSelector />
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}

      {!isLoading && periodMetrics && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Total Net P&L"
              value={formatCurrency(periodMetrics.total_net_pnl)}
              valueClass={
                periodMetrics.total_net_pnl > 0
                  ? 'text-green-600'
                  : periodMetrics.total_net_pnl < 0
                  ? 'text-red-600'
                  : ''
              }
            />
            <MetricCard
              label="Trade Count"
              value={periodMetrics.trade_count.toString()}
            />
            <MetricCard
              label="Win Rate"
              value={formatPercent(periodMetrics.win_rate)}
            />
            <MetricCard
              label="Profit Factor"
              value={formatNumber(periodMetrics.profit_factor)}
            />
            <MetricCard
              label="Avg Win"
              value={periodMetrics.avg_win !== null ? formatCurrency(periodMetrics.avg_win) : 'N/A'}
              valueClass="text-green-600"
            />
            <MetricCard
              label="Avg Loss"
              value={periodMetrics.avg_loss !== null ? formatCurrency(periodMetrics.avg_loss) : 'N/A'}
              valueClass="text-red-600"
            />
            <MetricCard
              label="Expectancy"
              value={periodMetrics.expectancy !== null ? formatCurrency(periodMetrics.expectancy) : 'N/A'}
            />
            <MetricCard
              label="Max Drawdown"
              value={formatCurrency(periodMetrics.max_drawdown)}
              valueClass="text-red-600"
            />
          </div>

          {/* Win/Loss Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Wins</div>
              <div className="text-2xl font-bold text-green-600">
                {periodMetrics.win_count}
              </div>
              <div className="text-sm text-gray-400">
                Max streak: {periodMetrics.max_win_streak}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Losses</div>
              <div className="text-2xl font-bold text-red-600">
                {periodMetrics.loss_count}
              </div>
              <div className="text-sm text-gray-400">
                Max streak: {periodMetrics.max_loss_streak}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Breakeven</div>
              <div className="text-2xl font-bold text-gray-600">
                {periodMetrics.breakeven_count}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Equity Curve */}
            {equityCurve.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Equity Curve</h2>
                <EquityCurve data={equityCurve} />
              </div>
            )}

            {/* Calendar Heatmap */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Daily P&L</h2>
              <CalendarHeatmap data={dailyPerformance} />
            </div>
          </div>
        </>
      )}

      {!isLoading && !periodMetrics && (
        <div className="text-center py-16 text-gray-500">
          <p>No trades found for the selected period.</p>
          <p className="mt-2">Add some trades to see your metrics!</p>
        </div>
      )}
    </div>
  );
}
