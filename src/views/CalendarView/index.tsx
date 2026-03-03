import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addDays,
  eachMonthOfInterval,
  endOfYear,
  format,
  parseISO,
  isValid,
  isSameMonth,
  setYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { useMetricsStore } from '@/stores';
import { getTrades } from '@/api/trades';
import type { TradeWithDerived } from '@/types';
import clsx from 'clsx';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMiniMonthGrid(month: Date) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }

  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return rows;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = searchParams.get('date');
  const monthParam = searchParams.get('month');

  const [currentDate, setCurrentDate] = useState(() => {
    if (monthParam) {
      const parsedMonth = parseISO(`${monthParam}-01`);
      if (isValid(parsedMonth)) {
        return startOfMonth(parsedMonth);
      }
    }

    if (selectedDate) {
      const parsedDate = parseISO(selectedDate);
      if (isValid(parsedDate)) {
        return startOfMonth(parsedDate);
      }
    }

    return startOfMonth(new Date());
  });
  const [dayTrades, setDayTrades] = useState<TradeWithDerived[]>([]);
  const { dailyPerformance, fetchDailyPerformance, setDateRange, isLoading } = useMetricsStore();

  useEffect(() => {
    if (!monthParam) return;
    const parsedMonth = parseISO(`${monthParam}-01`);
    if (!isValid(parsedMonth)) return;
    const normalized = startOfMonth(parsedMonth);

    if (!isSameMonth(currentDate, normalized)) {
      setCurrentDate(normalized);
    }
  }, [monthParam, currentDate]);

  useEffect(() => {
    const start = startOfYear(currentDate);
    const end = endOfYear(currentDate);
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
    const normalized = startOfMonth(date);
    setCurrentDate(normalized);
    setSearchParams({ month: format(normalized, 'yyyy-MM') });
  };

  const handleDayClick = (date: string) => {
    setSearchParams({
      month: format(startOfMonth(currentDate), 'yyyy-MM'),
      date,
    });
  };

  const handleCloseDetail = () => {
    setSearchParams({
      month: format(startOfMonth(currentDate), 'yyyy-MM'),
    });
  };

  const handlePrevYear = () => {
    const next = startOfMonth(setYear(currentDate, currentDate.getFullYear() - 1));
    setCurrentDate(next);
    setSearchParams({ month: format(next, 'yyyy-MM') });
  };

  const handleNextYear = () => {
    const next = startOfMonth(setYear(currentDate, currentDate.getFullYear() + 1));
    setCurrentDate(next);
    setSearchParams({ month: format(next, 'yyyy-MM') });
  };

  const dataMap = useMemo(
    () => new Map(dailyPerformance.map((day) => [day.date, day])),
    [dailyPerformance]
  );
  const months = useMemo(
    () => eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }),
    [currentDate]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 animate-fade-in">
      {isLoading ? (
        <div className="app-panel py-10 text-center text-stone-500 dark:text-stone-400">Loading...</div>
      ) : (
        <>
          <section className="app-panel overflow-hidden">
            <div className="border-b border-stone-200 bg-gradient-to-r from-teal-50 via-amber-50 to-stone-50 px-4 py-5 dark:border-stone-700 dark:from-teal-950/40 dark:via-stone-900 dark:to-stone-900 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Calendar</h1>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                    Scan your full year, then drill down into any trading day.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevYear}
                    aria-label="Previous year"
                    className="app-secondary-btn px-3 py-1.5 text-sm"
                  >
                    Prev
                  </button>
                  <h2 className="min-w-20 text-center text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {format(currentDate, 'yyyy')}
                  </h2>
                  <button
                    onClick={handleNextYear}
                    aria-label="Next year"
                    className="app-secondary-btn px-3 py-1.5 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:gap-5 md:p-6 xl:grid-cols-4">
              {months.map((month) => {
                const monthGrid = buildMiniMonthGrid(month);
                const isMonthSelected = isSameMonth(month, currentDate);

                return (
                  <div
                    key={format(month, 'yyyy-MM')}
                    className={clsx(
                      'app-muted-panel rounded-xl border p-3 transition-colors',
                      isMonthSelected
                        ? 'border-teal-400 shadow-[0_0_0_1px_rgba(13,148,136,0.3)]'
                        : 'border-stone-200/80 dark:border-stone-700/70'
                    )}
                  >
                    <button
                      onClick={() => handleMonthChange(month)}
                      className="mb-2 w-full text-left text-base font-semibold text-stone-800 hover:text-stone-950 dark:text-stone-200 dark:hover:text-stone-100"
                    >
                      {format(month, 'MMMM')}
                    </button>

                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {WEEKDAY_HEADERS.map((day) => (
                        <div
                          key={`${format(month, 'yyyy-MM')}-${day}`}
                          className="text-center text-[10px] font-medium text-stone-400 dark:text-stone-500"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-1">
                      {monthGrid.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-1">
                          {week.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const perf = dataMap.get(dateKey);
                            const isCurrentMonthDay = isSameMonth(day, month);
                            const isSelectedDay = selectedDate === dateKey;

                            return (
                              <button
                                key={dateKey}
                                onClick={() => {
                                  if (isCurrentMonthDay) {
                                    handleDayClick(dateKey);
                                  }
                                }}
                                disabled={!isCurrentMonthDay}
                                className={clsx(
                                  'relative h-8 rounded border text-[11px] transition-colors',
                                  isCurrentMonthDay
                                    ? 'border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
                                    : 'cursor-default border-stone-100 text-stone-300 dark:border-stone-800 dark:text-stone-600',
                                  perf && perf.trade_count > 0 && perf.realized_net_pnl > 0 && 'border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30',
                                  perf && perf.trade_count > 0 && perf.realized_net_pnl < 0 && 'border-rose-200 bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30',
                                  perf && perf.trade_count > 0 && perf.realized_net_pnl === 0 && 'border-stone-300 bg-stone-100 dark:border-stone-600 dark:bg-stone-700'
                                )}
                              >
                                <span
                                  className={clsx(
                                    'inline-flex h-5 w-5 items-center justify-center rounded-full',
                                    isSelectedDay && 'bg-teal-700 font-semibold text-white'
                                  )}
                                >
                                  {format(day, 'd')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Day Detail Sidebar */}
          {selectedDate && (
            <section className="app-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700 md:px-6">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</h2>
                <button onClick={handleCloseDetail} className="app-secondary-btn px-3 py-1.5 text-sm">Close</button>
              </div>

              <div className="p-4 md:p-6">
                {dayTrades.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400">No trades on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {dayTrades.map((trade, index) => (
                      <button
                        key={trade.id}
                        onClick={() => navigate(`/trades/${trade.id}`)}
                        className={clsx(
                          'flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors',
                          index % 2 === 0
                            ? 'border-stone-200/80 bg-white/80 dark:border-stone-700/70 dark:bg-stone-900/55'
                            : 'border-stone-200/70 bg-stone-50/55 dark:border-stone-700/60 dark:bg-stone-900/35',
                          'hover:bg-teal-50/70 hover:shadow-[inset_4px_0_0_0_rgba(13,148,136,0.45)] dark:hover:bg-teal-900/20'
                        )}
                      >
                        <div>
                          <span className="font-medium text-stone-900 dark:text-stone-100">{trade.symbol}</span>
                          <span className="ml-2 text-sm text-stone-500 dark:text-stone-400">{trade.direction.toUpperCase()}</span>
                        </div>
                        <div
                          className={clsx(
                            'font-semibold',
                            (trade.net_pnl ?? 0) > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : (trade.net_pnl ?? 0) < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-stone-500 dark:text-stone-400'
                          )}
                        >
                          ${trade.net_pnl?.toFixed(2) ?? '0.00'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
