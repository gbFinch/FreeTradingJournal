import { useEffect } from 'react';
import { useMetricsStore } from '@/stores';
import DashboardMetrics from '@/components/DashboardMetrics';
import EquityCurve from '@/components/EquityCurve';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import PeriodSelector from '@/components/PeriodSelector';

export default function Dashboard() {
  const { periodMetrics, equityCurve, dailyPerformance, fetchAll, isLoading } = useMetricsStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <PeriodSelector />
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {!isLoading && periodMetrics && (
        <>
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

            {/* Calendar Heatmap - 2/3 width */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:col-span-2">
              <h2 className="text-lg font-semibold dark:text-gray-100 mb-4">Daily P&L</h2>
              <CalendarHeatmap data={dailyPerformance} />
            </div>
          </div>
        </>
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
