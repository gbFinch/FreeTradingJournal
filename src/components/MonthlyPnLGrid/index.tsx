import { useMemo, useCallback } from 'react';
import clsx from 'clsx';
import type { DailyPerformance } from '@/types';
import { useMetricsStore } from '@/stores/metricsStore';
import MonthCell from './MonthCell';
import { aggregateDailyToMonthly, groupByYear, calculateYearTotal, formatCurrency, MONTH_NAMES } from './utils';

interface MonthlyPnLGridProps {
  data: DailyPerformance[];
}

export default function MonthlyPnLGrid({ data }: MonthlyPnLGridProps) {
  const { setSelectedMonth, fetchAll } = useMetricsStore();

  const handleMonthClick = useCallback((year: number, month: number) => {
    // Create a date for the first day of the selected month
    const selectedDate = new Date(year, month - 1, 1);
    setSelectedMonth(selectedDate);
    fetchAll();
  }, [setSelectedMonth, fetchAll]);

  const { yearlyData, grandTotal, years } = useMemo(() => {
    const monthlyData = aggregateDailyToMonthly(data);
    const yearMap = groupByYear(monthlyData);

    // Sort years descending (most recent first)
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    // Calculate grand total
    const grandTotal = monthlyData.reduce((sum, m) => sum + m.realized_net_pnl, 0);

    return {
      yearlyData: yearMap,
      grandTotal,
      years: sortedYears,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No trading data for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        {/* Header row */}
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-2 w-16">Year</th>
            {MONTH_NAMES.map((month) => (
              <th key={month} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 px-1 min-w-[60px]">
                {month}
              </th>
            ))}
            <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pl-2 min-w-[80px]">Year Total</th>
          </tr>
        </thead>

        <tbody>
          {years.map((year) => {
            const monthsData = yearlyData.get(year) || [];
            const yearTotal = calculateYearTotal(monthsData);
            const isYearPositive = yearTotal > 0;
            const isYearNegative = yearTotal < 0;

            // Create a map for quick lookup by month
            const monthMap = new Map(monthsData.map(m => [m.month, m]));

            return (
              <tr key={year}>
                {/* Year label */}
                <td className="text-sm font-semibold text-gray-700 dark:text-gray-300 pr-2 py-1 align-middle">
                  {year}
                </td>

                {/* Month cells */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <td key={month} className="px-1 py-1">
                    <MonthCell
                      data={monthMap.get(month) || null}
                      onClick={() => handleMonthClick(year, month)}
                    />
                  </td>
                ))}

                {/* Year total */}
                <td className="pl-2 py-1">
                  <div
                    className={clsx(
                      'h-14 rounded flex flex-col items-center justify-center p-1 border',
                      isYearPositive && 'bg-emerald-200 dark:bg-emerald-800 border-emerald-400 dark:border-emerald-500',
                      isYearNegative && 'bg-red-200 dark:bg-red-800 border-red-400 dark:border-red-500',
                      !isYearPositive && !isYearNegative && 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <span className={clsx(
                      'text-sm font-bold',
                      isYearPositive && 'text-emerald-800 dark:text-emerald-200',
                      isYearNegative && 'text-red-800 dark:text-red-200',
                      !isYearPositive && !isYearNegative && 'text-gray-600 dark:text-gray-300'
                    )}>
                      {formatCurrency(yearTotal)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Grand total footer */}
        <tfoot>
          <tr>
            <td colSpan={13} className="pt-3">
              <div className="flex justify-end">
                <div
                  className={clsx(
                    'px-4 py-2 rounded-lg border',
                    grandTotal > 0 && 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-600',
                    grandTotal < 0 && 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-600',
                    grandTotal === 0 && 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  )}
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Grand Total:</span>
                  <span className={clsx(
                    'text-lg font-bold',
                    grandTotal > 0 && 'text-emerald-700 dark:text-emerald-300',
                    grandTotal < 0 && 'text-red-700 dark:text-red-300',
                    grandTotal === 0 && 'text-gray-600 dark:text-gray-300'
                  )}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
