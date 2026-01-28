import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useMetricsStore, useTradesStore } from '@/stores';
import clsx from 'clsx';
import MonthlyCalendar from '@/components/MonthlyCalendar';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { dailyPerformance, fetchDailyPerformance, setDateRange, isLoading } = useMetricsStore();
  const { trades, fetchTrades } = useTradesStore();

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
      fetchTrades({
        startDate: selectedDate,
        endDate: selectedDate,
      });
    }
  }, [selectedDate, fetchTrades]);

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(null);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Calendar</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          <MonthlyCalendar
            data={dailyPerformance}
            month={currentDate}
            onMonthChange={handleMonthChange}
            onDayClick={handleDayClick}
          />

          {/* Day Detail Sidebar */}
          {selectedDate && (
            <div className="mt-6 bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                </h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              {trades.length === 0 ? (
                <p className="text-gray-400">No trades on this day.</p>
              ) : (
                <div className="space-y-2">
                  {trades.map(trade => (
                    <div
                      key={trade.id}
                      className="flex justify-between items-center p-2 bg-gray-700 rounded"
                    >
                      <div>
                        <span className="font-medium text-gray-100">{trade.symbol}</span>
                        <span className="ml-2 text-sm text-gray-400">
                          {trade.direction.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'font-bold',
                          (trade.net_pnl ?? 0) > 0
                            ? 'text-green-400'
                            : (trade.net_pnl ?? 0) < 0
                            ? 'text-red-400'
                            : 'text-gray-400'
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
