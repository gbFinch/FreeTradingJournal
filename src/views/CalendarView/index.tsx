import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { useMetricsStore, useTradesStore } from '@/stores';
import clsx from 'clsx';
import type { DailyPerformance } from '@/types';

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  performance?: DailyPerformance;
  onClick: () => void;
}

function DayCell({ date, isCurrentMonth, performance, onClick }: DayCellProps) {
  const hasData = performance && performance.trade_count > 0;
  const pnl = performance?.realized_net_pnl ?? 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'h-24 p-2 border border-gray-200 dark:border-gray-700 text-left transition-colors',
        isCurrentMonth ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500',
        hasData && 'cursor-pointer'
      )}
    >
      <div className="text-sm font-medium dark:text-gray-200">{format(date, 'd')}</div>
      {hasData && (
        <div className="mt-1">
          <div
            className={clsx(
              'text-lg font-bold',
              pnl > 0 ? 'text-green-600 dark:text-green-400' : pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {formatCurrency(pnl)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {performance!.trade_count} trade{performance!.trade_count !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </button>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { dailyPerformance, fetchDailyPerformance, setDateRange, isLoading } = useMetricsStore();
  const { trades, fetchTrades } = useTradesStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
    fetchDailyPerformance();
  }, [currentDate, fetchDailyPerformance, setDateRange]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      fetchTrades({
        startDate: dateStr,
        endDate: dateStr,
      });
    }
  }, [selectedDate, fetchTrades]);

  const performanceMap = new Map(
    dailyPerformance.map(p => [p.date, p])
  );

  // Get days to display (including padding for week alignment)
  const calendarStart = startOfMonth(monthStart);
  const startPadding = getDay(calendarStart);
  const daysInCalendar = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days from previous month
  const paddedDays: Date[] = [];
  for (let i = startPadding - 1; i >= 0; i--) {
    paddedDays.push(new Date(monthStart.getTime() - (i + 1) * 24 * 60 * 60 * 1000));
  }

  const allDays = [...paddedDays, ...daysInCalendar];

  // Calculate monthly total
  const monthlyTotal = dailyPerformance.reduce(
    (sum, d) => sum + d.realized_net_pnl,
    0
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-200"
          >
            &larr;
          </button>
          <span className="text-lg font-medium min-w-[160px] text-center dark:text-gray-200">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-200"
          >
            &rarr;
          </button>
        </div>
        <div
          className={clsx(
            'text-xl font-bold',
            monthlyTotal > 0 ? 'text-green-600 dark:text-green-400' : monthlyTotal < 0 ? 'text-red-600 dark:text-red-400' : 'dark:text-gray-200'
          )}
        >
          {formatCurrency(monthlyTotal)}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {!isLoading && (
        <>
          {/* Calendar Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-900">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {allDays.map(day => (
                <DayCell
                  key={day.toISOString()}
                  date={day}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  performance={performanceMap.get(format(day, 'yyyy-MM-dd'))}
                  onClick={() => setSelectedDate(day)}
                />
              ))}
            </div>
          </div>

          {/* Day Detail Sidebar */}
          {selectedDate && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              {trades.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No trades on this day.</p>
              ) : (
                <div className="space-y-2">
                  {trades.map(trade => (
                    <div
                      key={trade.id}
                      className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div>
                        <span className="font-medium dark:text-gray-100">{trade.symbol}</span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          {trade.direction.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'font-bold',
                          (trade.net_pnl ?? 0) > 0
                            ? 'text-green-600 dark:text-green-400'
                            : (trade.net_pnl ?? 0) < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        ${trade.net_pnl?.toFixed(2) ?? '0.00'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
