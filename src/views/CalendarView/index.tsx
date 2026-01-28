import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useMetricsStore } from '@/stores';
import { getTrades } from '@/api/trades';
import type { TradeWithDerived } from '@/types';
import clsx from 'clsx';
import MonthlyCalendar from '@/components/MonthlyCalendar';

export default function CalendarView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayTrades, setDayTrades] = useState<TradeWithDerived[]>([]);
  const { dailyPerformance, fetchDailyPerformance, setDateRange, isLoading } = useMetricsStore();

  // Get selected date from URL params
  const selectedDate = searchParams.get('date');

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
      getTrades({ startDate: selectedDate, endDate: selectedDate })
        .then(setDayTrades)
        .catch(() => setDayTrades([]));
    } else {
      setDayTrades([]);
    }
  }, [selectedDate]);

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
    setSearchParams({});
  };

  const handleDayClick = (date: string) => {
    setSearchParams({ date });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
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
            selectedDate={selectedDate}
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
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              {dayTrades.length === 0 ? (
                <p className="text-gray-400">No trades on this day.</p>
              ) : (
                <div className="space-y-2">
                  {dayTrades.map(trade => (
                    <button
                      key={trade.id}
                      onClick={() => navigate(`/trades/${trade.id}`)}
                      className="w-full flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer text-left"
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
                    </button>
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
