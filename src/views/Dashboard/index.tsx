import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import clsx from 'clsx';
import { useMetricsStore } from '@/stores';
import { getTrades } from '@/api/trades';
import DashboardMetrics from '@/components/DashboardMetrics';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import EquityCurve from '@/components/EquityCurve';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import MarketTape from '@/components/MarketTape';
import MonthlyPnLGrid from '@/components/MonthlyPnLGrid';
import PeriodSelector from '@/components/PeriodSelector';
import TradeDrilldownModal from '@/components/TradeDrilldownModal';
import type { TradeWithDerived } from '@/types';

interface DrilldownPeriod {
  title: string;
  startDate: string;
  endDate: string;
}

interface InsightItem {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000) {
    return `${sign}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${sign}$${absValue.toFixed(2)}`;
}

function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '+';

  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }

  return `${sign}$${absValue.toFixed(0)}`;
}

function formatDateLabel(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'MMM d');
}

function getCurrentStreak(days: { realized_net_pnl: number; trade_count: number }[]): { count: number; tone: InsightItem['tone']; label: string } {
  const tradingDays = days.filter((day) => day.trade_count > 0);

  if (tradingDays.length === 0) {
    return { count: 0, tone: 'neutral', label: 'No streak' };
  }

  const reversed = [...tradingDays].reverse();
  const latest = reversed[0];

  if (latest.realized_net_pnl === 0) {
    return { count: 1, tone: 'neutral', label: 'Flat streak' };
  }

  const isPositive = latest.realized_net_pnl > 0;
  let count = 0;

  for (const day of reversed) {
    if (day.realized_net_pnl === 0) break;
    if ((day.realized_net_pnl > 0) === isPositive) {
      count += 1;
      continue;
    }
    break;
  }

  return {
    count,
    tone: isPositive ? 'positive' : 'negative',
    label: isPositive ? 'Win streak' : 'Loss streak',
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { periodMetrics, equityCurve, dailyPerformance, fetchAll, isLoading, setPeriodType, periodType, selectedMonth, accountId } = useMetricsStore();
  const currentYear = new Date().getFullYear();
  const isMonthlyView = periodType === 'all' || periodType === 'ytd';
  const [drilldown, setDrilldown] = useState<DrilldownPeriod | null>(null);
  const [drilldownTrades, setDrilldownTrades] = useState<TradeWithDerived[]>([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);

  const monthlyGridData = useMemo(() => {
    if (periodType !== 'ytd') {
      return dailyPerformance;
    }
    return dailyPerformance.filter((day) => day.date.startsWith(`${currentYear}-`));
  }, [dailyPerformance, periodType, currentYear]);

  // Track transition state for animation
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevKeyRef = useRef<string | null>(null);

  // Create unique key for each period view
  const transitionKey = periodType === 'month'
    ? `month-${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`
    : periodType;

  // Detect when period changes and trigger transition animation
  useEffect(() => {
    if (prevKeyRef.current !== null && prevKeyRef.current !== transitionKey) {
      // Period changed - start transition
      setIsTransitioning(true);
      // End transition after a brief moment to trigger animation
      const timer = setTimeout(() => setIsTransitioning(false), 50);
      return () => clearTimeout(timer);
    }
    prevKeyRef.current = transitionKey;
  }, [transitionKey]);

  useEffect(() => {
    // Reset to 'month' period when Dashboard mounts to ensure
    // "This Month" is selected (fixes stale state from CalendarView)
    setPeriodType('month');
    fetchAll();
  }, [setPeriodType, fetchAll]);

  const openDrilldown = async (period: DrilldownPeriod) => {
    setIsDrilldownLoading(true);
    try {
      const trades = await getTrades({
        accountId: accountId ?? undefined,
        startDate: period.startDate,
        endDate: period.endDate,
      });
      const sortedTrades = [...trades].sort((a, b) => b.trade_date.localeCompare(a.trade_date));
      setDrilldownTrades(sortedTrades);
      setDrilldown(period);
    } catch {
      setDrilldownTrades([]);
      setDrilldown(period);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  const handleDayDrilldown = async (date: string) => {
    const title = `Trades for ${format(new Date(`${date}T00:00:00`), 'MMMM d, yyyy')}`;
    await openDrilldown({ title, startDate: date, endDate: date });
  };

  const handleMonthDrilldown = async (year: number, month: number) => {
    const monthDate = new Date(year, month - 1, 1);
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const title = `Trades for ${format(monthDate, 'MMMM yyyy')}`;
    await openDrilldown({ title, startDate, endDate });
  };

  const handleCloseDrilldown = () => {
    setDrilldown(null);
    setDrilldownTrades([]);
  };

  // Only show skeleton on initial load (no existing data)
  const showSkeleton = isLoading && !periodMetrics;
  // Show content if we have data and not mid-transition
  const showContent = periodMetrics !== null && !isTransitioning;

  const tradingDays = useMemo(
    () => dailyPerformance.filter((day) => day.trade_count > 0),
    [dailyPerformance]
  );

  const heroPeriodLabel = useMemo(() => {
    if (periodType === 'month') {
      return format(selectedMonth, 'MMMM yyyy');
    }

    if (periodType === 'ytd') {
      return `${new Date().getFullYear()} year to date`;
    }

    return 'All time';
  }, [periodType, selectedMonth]);

  const heroSummary = useMemo(() => {
    if (!periodMetrics) return null;

    const positiveDays = tradingDays.filter((day) => day.realized_net_pnl > 0).length;
    const negativeDays = tradingDays.filter((day) => day.realized_net_pnl < 0).length;

    return `${heroPeriodLabel} closed ${periodMetrics.total_net_pnl >= 0 ? 'up' : 'down'} ${formatCurrency(periodMetrics.total_net_pnl)} across ${tradingDays.length} trading day${tradingDays.length === 1 ? '' : 's'}, with ${positiveDays} green day${positiveDays === 1 ? '' : 's'} and ${negativeDays} red day${negativeDays === 1 ? '' : 's'}.`;
  }, [heroPeriodLabel, periodMetrics, tradingDays]);

  const bestDay = useMemo(() => {
    if (tradingDays.length === 0) return null;
    return tradingDays.reduce((best, day) => (
      day.realized_net_pnl > best.realized_net_pnl ? day : best
    ));
  }, [tradingDays]);

  const worstDay = useMemo(() => {
    if (tradingDays.length === 0) return null;
    return tradingDays.reduce((worst, day) => (
      day.realized_net_pnl < worst.realized_net_pnl ? day : worst
    ));
  }, [tradingDays]);

  const streak = useMemo(() => getCurrentStreak(dailyPerformance), [dailyPerformance]);

  const dashboardInsight = useMemo(() => {
    if (!periodMetrics) return '';
    if (tradingDays.length === 0) return 'Import or add trades to unlock a fuller review surface.';

    if (periodMetrics.expectancy !== null && periodMetrics.expectancy > 0 && periodMetrics.win_rate !== null && periodMetrics.win_rate >= 0.5) {
      return 'The current setup is healthy: expectancy and win rate are both working in your favor.';
    }

    if (periodMetrics.expectancy !== null && periodMetrics.expectancy < 0) {
      return 'Expectancy is negative. Review loss clusters and setup quality before scaling size.';
    }

    if (streak.tone === 'negative' && streak.count >= 2) {
      return 'Losses are clustering late in the period. Review execution quality before the next session.';
    }

    return 'Performance is mixed. Use the chart and day grid to isolate where consistency improved or broke down.';
  }, [periodMetrics, streak, tradingDays.length]);

  const chartSummary = useMemo(() => {
    if (!periodMetrics) return [];

    const firstTradingDay = tradingDays[0]?.date ?? null;
    const lastTradingDay = tradingDays[tradingDays.length - 1]?.date ?? null;
    const tradedWeeks = new Set(tradingDays.map((day) => day.date.slice(0, 7))).size;

    return [
      {
        label: 'Coverage',
        value: firstTradingDay && lastTradingDay ? `${formatDateLabel(firstTradingDay)} to ${formatDateLabel(lastTradingDay)}` : 'N/A',
        tone: 'neutral',
      },
      {
        label: 'Active sessions',
        value: `${tradingDays.length} day${tradingDays.length === 1 ? '' : 's'}`,
        tone: 'neutral',
      },
      {
        label: 'Longest win streak',
        value: `${periodMetrics.max_win_streak} day${periodMetrics.max_win_streak === 1 ? '' : 's'}`,
        tone: 'positive',
      },
      {
        label: 'Weeks traded',
        value: `${tradedWeeks}`,
        tone: 'neutral',
      },
    ] as InsightItem[];
  }, [periodMetrics, tradingDays]);

  return (
    <div className="p-6 pt-8">
      <div className="dashboard-hero mb-6 overflow-hidden rounded-[28px] border border-stone-200/80 px-5 py-5 shadow-sm dark:border-stone-800/80 sm:px-6 sm:py-6">
        <div className="relative z-[1] flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-600 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300">
                Trader Command Center
              </span>
              <span className="rounded-full border border-emerald-200/80 bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300">
                {heroPeriodLabel}
              </span>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">Dashboard</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
                  {heroSummary ?? 'A focused trading review surface for the selected period.'}
                </p>
              </div>
            </div>
            {periodMetrics && (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="dashboard-chip">
                  <span className="dashboard-chip-label">View mode</span>
                  <span className="dashboard-chip-value">{isMonthlyView ? 'Monthly review' : 'Daily review'}</span>
                </div>
                <div className="dashboard-chip">
                  <span className="dashboard-chip-label">Active sessions</span>
                  <span className="dashboard-chip-value">{tradingDays.length}</span>
                </div>
                <div className="dashboard-chip">
                  <span className="dashboard-chip-label">Current streak</span>
                  <span className="dashboard-chip-value">{streak.count} day{streak.count === 1 ? '' : 's'}</span>
                </div>
                <div className="dashboard-chip">
                  <span className="dashboard-chip-label">Best day</span>
                  <span className="dashboard-chip-value">{bestDay ? formatDateLabel(bestDay.date) : 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex w-full max-w-xl flex-col gap-4 xl:items-end">
            <div className="w-full xl:max-w-md">
              <PeriodSelector />
            </div>

            <div className="dashboard-insight-panel w-full xl:max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Session read</p>
              <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-stone-200">
                {dashboardInsight}
              </p>
            </div>
          </div>
        </div>
      </div>

      <MarketTape />

      {showSkeleton && <DashboardSkeleton />}

      {showContent && (
        <div key={transitionKey} className="animate-fade-in">
          <DashboardMetrics metrics={periodMetrics} />

          <section className="dashboard-analysis-shell">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">Analysis deck</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">Performance story</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
                  Use the equity curve to read momentum and the review grid to isolate which sessions created the move.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
                {chartSummary.map((item) => (
                  <div key={item.label} className="dashboard-analysis-stat">
                    <span className="dashboard-analysis-stat-label">{item.label}</span>
                    <span
                      className={clsx(
                        'dashboard-analysis-stat-value',
                        item.tone === 'positive' && 'text-green-600 dark:text-green-400',
                        item.tone === 'negative' && 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {equityCurve.length > 0 && (
              <div className="app-panel dashboard-chart-panel flex min-h-[430px] flex-col p-5 lg:col-span-1">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Trend</p>
                    <h2 className="mt-1 text-xl font-semibold dark:text-stone-100">Equity Curve</h2>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                      Review the slope, pauses, and drawdown pockets for the selected period.
                    </p>
                  </div>
                  {periodMetrics && (
                    <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-3 py-2 text-right dark:border-stone-700 dark:bg-stone-800/70">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">Max drawdown</p>
                      <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(periodMetrics.max_drawdown)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="dashboard-chart-note">
                    <span className="dashboard-chart-note-label">Last close</span>
                    <span className="dashboard-chart-note-value">
                      {equityCurve.length > 0 ? formatCompactCurrency(equityCurve[equityCurve.length - 1].cumulative_pnl) : 'N/A'}
                    </span>
                  </div>
                  <div className="dashboard-chart-note">
                    <span className="dashboard-chart-note-label">Coverage</span>
                    <span className="dashboard-chart-note-value">
                      {equityCurve.length > 0 ? `${formatDateLabel(equityCurve[0].date)} to ${formatDateLabel(equityCurve[equityCurve.length - 1].date)}` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <EquityCurve data={equityCurve} />
                </div>
              </div>
            )}

            <div className="app-panel dashboard-chart-panel p-5 lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">Review grid</p>
                  <h2 className="mt-1 text-xl font-semibold dark:text-stone-100">
                    {isMonthlyView ? 'Monthly P&L' : 'Daily P&L'}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Click any active cell to open the underlying trade list and inspect what drove the result.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="dashboard-mini-note">
                    <span className="dashboard-mini-note-label">Trading days</span>
                    <span className="dashboard-mini-note-value">{tradingDays.length}</span>
                  </div>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="dashboard-chart-note">
                  <span className="dashboard-chart-note-label">Click target</span>
                  <span className="dashboard-chart-note-value">
                    {isMonthlyView ? 'Month cells' : 'Day cells'}
                  </span>
                </div>
                <div className="dashboard-chart-note">
                  <span className="dashboard-chart-note-label">Weakest day</span>
                  <span className="dashboard-chart-note-value text-red-600 dark:text-red-400">
                    {worstDay ? formatDateLabel(worstDay.date) : 'N/A'}
                  </span>
                </div>
                <div className="dashboard-chart-note">
                  <span className="dashboard-chart-note-label">Review focus</span>
                  <span className="dashboard-chart-note-value">
                    {streak.tone === 'negative' ? 'Loss cluster' : streak.tone === 'positive' ? 'Winning run' : 'Mixed tape'}
                  </span>
                </div>
              </div>
              {isMonthlyView ? (
                <MonthlyPnLGrid data={monthlyGridData} onMonthClick={handleMonthDrilldown} />
              ) : (
                <CalendarHeatmap data={dailyPerformance} onDayClick={handleDayDrilldown} />
              )}
            </div>
            </div>
          </section>
        </div>
      )}

      {!isLoading && !periodMetrics && (
        <div className="app-panel py-16 text-center text-stone-500 dark:text-stone-400">
          <p>No trades found for the selected period.</p>
          <p className="mt-2">Add some trades to see your metrics!</p>
        </div>
      )}

      <TradeDrilldownModal
        isOpen={drilldown !== null}
        title={drilldown?.title ?? ''}
        trades={drilldownTrades}
        isLoading={isDrilldownLoading}
        onClose={handleCloseDrilldown}
        onTradeClick={(tradeId) => navigate(`/trades/${tradeId}`)}
      />
    </div>
  );
}
