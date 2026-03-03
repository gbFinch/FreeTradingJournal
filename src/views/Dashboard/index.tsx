import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useMetricsStore } from '@/stores';
import { getTrades } from '@/api/trades';
import DashboardMetrics from '@/components/DashboardMetrics';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import EquityCurve from '@/components/EquityCurve';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import MonthlyPnLGrid from '@/components/MonthlyPnLGrid';
import PeriodSelector from '@/components/PeriodSelector';
import TradeDrilldownModal from '@/components/TradeDrilldownModal';
import type { TradeWithDerived } from '@/types';

interface DrilldownPeriod {
  title: string;
  startDate: string;
  endDate: string;
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

  return (
    <div className="p-6 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Dashboard</h1>
        <PeriodSelector />
      </div>

      {showSkeleton && <DashboardSkeleton />}

      {showContent && (
        <div key={transitionKey} className="animate-fade-in">
          {/* Dashboard Metrics */}
          <DashboardMetrics metrics={periodMetrics} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Equity Curve - 1/3 width */}
            {equityCurve.length > 0 && (
              <div className="app-panel flex min-h-[400px] flex-col p-4 lg:col-span-1">
                <h2 className="mb-4 text-lg font-semibold dark:text-stone-100">Equity Curve</h2>
                <div className="flex-1">
                  <EquityCurve data={equityCurve} />
                </div>
              </div>
            )}

            {/* Calendar Heatmap or Monthly Grid - 2/3 width */}
            <div className="app-panel p-4 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold dark:text-stone-100">
                {isMonthlyView ? 'Monthly P&L' : 'Daily P&L'}
              </h2>
              {isMonthlyView ? (
                <MonthlyPnLGrid data={monthlyGridData} onMonthClick={handleMonthDrilldown} />
              ) : (
                <CalendarHeatmap data={dailyPerformance} onDayClick={handleDayDrilldown} />
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !periodMetrics && (
        <div className="py-16 text-center text-stone-500 dark:text-stone-400">
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
