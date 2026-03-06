import { useMemo } from 'react';
import { format, parseISO, getMonth, getYear, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import clsx from 'clsx';
import type { DailyPerformance } from '@/types';

interface CalendarHeatmapProps {
  data: DailyPerformance[];
  onDayClick?: (date: string) => void;
}

interface DayCell {
  date: string;
  pnl: number;
  tradeCount: number;
  isEmpty: boolean;
  winRate: number | null;
}

interface WeeklySummary {
  weekNumber: number;
  totalPnl: number;
  tradingDays: number;
}

interface MonthStats {
  totalPnl: number;
  tradingDays: number;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

function getDayColorClasses(pnl: number, hasData: boolean): string {
  if (!hasData) return 'bg-stone-100/80 dark:bg-stone-800/70 border-stone-200/80 dark:border-stone-700/80';
  if (pnl > 0) return 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]';
  if (pnl < 0) return 'bg-red-100 dark:bg-[#6b1c1c] border-red-300 dark:border-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]';
  return 'bg-stone-200 dark:bg-gray-700 border-stone-300 dark:border-gray-600'; // breakeven
}

function chunkIntoWeeks(days: DayCell[]): DayCell[][] {
  const weeks: DayCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  // Pad last week if needed
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek && lastWeek.length < 7) {
    lastWeek.push({ date: '', pnl: 0, tradeCount: 0, isEmpty: true, winRate: null });
  }
  return weeks;
}

function calculateWeeklySummaries(weeks: DayCell[][]): WeeklySummary[] {
  return weeks.map((week, index) => {
    const tradingDays = week.filter(day => !day.isEmpty && day.tradeCount > 0);
    return {
      weekNumber: index + 1,
      totalPnl: tradingDays.reduce((sum, day) => sum + day.pnl, 0),
      tradingDays: tradingDays.length,
    };
  });
}

function calculateMonthStats(days: DayCell[]): MonthStats {
  const tradingDays = days.filter(day => !day.isEmpty && day.tradeCount > 0);
  return {
    totalPnl: tradingDays.reduce((sum, day) => sum + day.pnl, 0),
    tradingDays: tradingDays.length,
  };
}

export default function CalendarHeatmap({ data, onDayClick }: CalendarHeatmapProps) {
  const monthsData = useMemo(() => {
    // Create lookup map for quick access
    const dataMap = new Map(data.map(d => [d.date, d]));

    // Get unique months from data
    const months = new Set<string>();
    data.forEach(d => {
      const date = parseISO(d.date);
      months.add(`${getYear(date)}-${String(getMonth(date) + 1).padStart(2, '0')}`);
    });

    // If no data, show current month
    if (months.size === 0) {
      const now = new Date();
      months.add(`${getYear(now)}-${String(getMonth(now) + 1).padStart(2, '0')}`);
    }

    // Sort months and take last 2 for display
    const sortedMonths = Array.from(months).sort().slice(-2);

    // Build calendar data for each month
    const monthsData = sortedMonths.map(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const daysInMonth = getDaysInMonth(firstDay);
      const startDayOfWeek = getDay(startOfMonth(firstDay));

      const days: DayCell[] = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ date: '', pnl: 0, tradeCount: 0, isEmpty: true, winRate: null });
      }

      // Add actual days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dataMap.get(dateStr);
        const winCount = dayData?.win_count ?? 0;
        const lossCount = dayData?.loss_count ?? 0;
        const totalDecisive = winCount + lossCount;

        days.push({
          date: dateStr,
          pnl: dayData?.realized_net_pnl ?? 0,
          tradeCount: dayData?.trade_count ?? 0,
          isEmpty: false,
          winRate: totalDecisive > 0 ? (winCount / totalDecisive) * 100 : null,
        });
      }

      const weeks = chunkIntoWeeks(days);
      const weeklySummaries = calculateWeeklySummaries(weeks);
      const monthStats = calculateMonthStats(days);

      return {
        key: monthKey,
        label: format(firstDay, 'MMMM yyyy'),
        weeks,
        weeklySummaries,
        monthStats,
      };
    });

    return monthsData;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No trading data for this period
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {monthsData.map(month => (
        <section
          key={month.key}
          className="rounded-[24px] border border-stone-200/80 bg-gradient-to-br from-white/90 via-stone-50/90 to-stone-100/70 p-4 shadow-sm dark:border-stone-700/80 dark:from-stone-900/90 dark:via-stone-900/84 dark:to-slate-950/70"
        >
          <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Month review</p>
              <h3 className="mt-1 text-base font-semibold text-stone-800 dark:text-stone-200 truncate">{month.label}</h3>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap',
                  month.monthStats.totalPnl > 0
                    ? 'border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-600/20 text-green-700 dark:text-green-400'
                    : month.monthStats.totalPnl < 0
                    ? 'border-red-200 bg-red-100 dark:border-red-700 dark:bg-red-600/20 text-red-700 dark:text-red-400'
                    : 'border-stone-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                )}
              >
                {formatCurrency(month.monthStats.totalPnl)}
              </span>
              <span className="hidden whitespace-nowrap rounded-full border border-stone-200/80 bg-white/70 px-3 py-1 text-xs text-gray-500 dark:border-stone-700 dark:bg-stone-800/70 dark:text-gray-400 sm:inline">
                {month.monthStats.tradingDays} day{month.monthStats.tradingDays !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="pr-0 sm:pr-24">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="truncate py-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                  <span className="sm:hidden">{day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {month.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-2">
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={day.isEmpty ? `empty-${weekIndex}-${dayIdx}` : day.date}
                      className={clsx(
                        '@container calendar-day-cell relative h-[80px] min-w-0 overflow-hidden rounded-[16px] border p-2 transition-all',
                        day.isEmpty
                          ? 'bg-transparent border-transparent'
                          : getDayColorClasses(day.pnl, day.tradeCount > 0),
                        !day.isEmpty && 'text-gray-800 dark:text-gray-100',
                        !day.isEmpty && day.tradeCount > 0 && 'calendar-day-cell-active cursor-pointer hover:-translate-y-[1px] hover:shadow-md'
                      )}
                      title={day.isEmpty ? '' : `${day.date}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)} (${day.tradeCount} trades)`}
                      onClick={!day.isEmpty && day.tradeCount > 0 && onDayClick ? () => onDayClick(day.date) : undefined}
                    >
                      {!day.isEmpty && (
                        <span className={clsx(
                          'absolute right-2 top-1.5 hidden text-[11px] font-medium @min-[50px]:block',
                          day.tradeCount === 0 && 'text-gray-400 dark:text-gray-500',
                          day.tradeCount > 0 && 'text-stone-500 dark:text-white/70'
                        )}>
                          {parseISO(day.date).getDate()}
                        </span>
                      )}

                      {!day.isEmpty && day.tradeCount > 0 && (
                        <div className="absolute inset-0 hidden flex-col justify-center px-2 pb-2 pt-4 @min-[45px]:flex">
                          <span className="max-w-full truncate px-0.5 text-center text-[17px] font-bold tracking-tight">
                            {formatCurrency(day.pnl)}
                          </span>
                          <div className="mt-2 flex items-center justify-center gap-1.5">
                            <span className="hidden text-[10px] text-gray-600 dark:text-white/90 @min-[65px]:block">
                              {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                            </span>
                            {day.winRate !== null && (
                              <span className="hidden rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 dark:bg-black/20 dark:text-white/80 @min-[65px]:block">
                                {day.winRate.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="w-20 flex-shrink-0 hidden sm:block">
                  <WeekSummaryCell summary={month.weeklySummaries[weekIndex]} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WeekSummaryCell({ summary }: { summary: WeeklySummary }) {
  return (
    <div
      className={clsx(
        '@container flex h-[80px] flex-col justify-center overflow-hidden rounded-[16px] border border-stone-200/80 bg-white/80 p-2 dark:border-stone-700/80 dark:bg-stone-800/80',
        summary.tradingDays === 0 && 'opacity-50'
      )}
    >
      <div className="mb-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 @min-[50px]:block">Week {summary.weekNumber}</div>
      {summary.tradingDays > 0 ? (
        <>
          <div
            className={clsx(
              'hidden truncate text-xs font-semibold tracking-tight @min-[40px]:block',
              summary.totalPnl > 0
                ? 'text-green-600 dark:text-green-400'
                : summary.totalPnl < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-300'
            )}
          >
            {formatCurrency(summary.totalPnl)}
          </div>
          <div className="hidden truncate text-[10px] text-gray-400 dark:text-gray-500 @min-[60px]:block">
            {summary.tradingDays} day{summary.tradingDays !== 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div className="hidden truncate text-[10px] text-gray-400 dark:text-gray-600 @min-[50px]:block">No trades</div>
      )}
    </div>
  );
}
