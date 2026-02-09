import { useEffect, useState, useRef } from 'react';
import { useMetricsStore } from '@/stores';
import DashboardMetrics from '@/components/DashboardMetrics';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import EquityCurve from '@/components/EquityCurve';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import MonthlyPnLGrid from '@/components/MonthlyPnLGrid';
import PeriodSelector from '@/components/PeriodSelector';

export default function Dashboard() {
  const { periodMetrics, equityCurve, dailyPerformance, fetchAll, isLoading, setPeriodType, periodType, selectedMonth } = useMetricsStore();

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

  // Only show skeleton on initial load (no existing data)
  const showSkeleton = isLoading && !periodMetrics;
  // Show content if we have data and not mid-transition
  const showContent = periodMetrics !== null && !isTransitioning;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col min-h-[400px] lg:col-span-1">
                <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Equity Curve</h2>
                <div className="flex-1">
                  <EquityCurve data={equityCurve} />
                </div>
              </div>
            )}

            {/* Calendar Heatmap or Monthly Grid - 2/3 width */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:col-span-2">
              <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">
                {periodType === 'all' ? 'Monthly P&L' : 'Daily P&L'}
              </h2>
              {periodType === 'all' ? (
                <MonthlyPnLGrid data={dailyPerformance} />
              ) : (
                <CalendarHeatmap data={dailyPerformance} />
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !periodMetrics && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p>No trades found for the selected period.</p>
          <p className="mt-2">Add some trades to see your metrics!</p>
        </div>
      )}
    </div>
  );
}
