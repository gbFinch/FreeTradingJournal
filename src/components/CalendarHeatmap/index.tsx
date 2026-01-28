import { useMemo } from 'react';
import { format, parseISO, getMonth, getYear, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import clsx from 'clsx';
import type { DailyPerformance } from '@/types';

interface CalendarHeatmapProps {
  data: DailyPerformance[];
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
  if (!hasData) return 'bg-gray-800 border-gray-700';
  if (pnl > 0) return 'bg-emerald-900 border-emerald-600';
  if (pnl < 0) return 'bg-[#6b1c1c] border-red-700';
  return 'bg-gray-700 border-gray-600'; // breakeven
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

export default function CalendarHeatmap({ data }: CalendarHeatmapProps) {
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
    <div className="space-y-6">
      {monthsData.map(month => (
        <div key={month.key} className="bg-gray-900 rounded-lg p-3">
          {/* Month header with stats */}
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-gray-300 truncate">{month.label}</h3>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
                  month.monthStats.totalPnl > 0
                    ? 'bg-green-600/20 text-green-400'
                    : month.monthStats.totalPnl < 0
                    ? 'bg-red-600/20 text-red-400'
                    : 'bg-gray-700 text-gray-300'
                )}
              >
                {formatCurrency(month.monthStats.totalPnl)}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                {month.monthStats.tradingDays} day{month.monthStats.tradingDays !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Day headers */}
          <div className="pr-0 sm:pr-24">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-xs text-gray-400 text-center py-1 truncate">
                  <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                  <span className="sm:hidden">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar rows with weekly summaries */}
          <div className="flex flex-col gap-1">
            {month.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-2">
                {/* Week row */}
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={day.isEmpty ? `empty-${weekIndex}-${dayIdx}` : day.date}
                      className={clsx(
                        '@container relative h-16 min-w-0 p-1.5 rounded-md transition-all border overflow-hidden',
                        day.isEmpty
                          ? 'bg-transparent border-transparent'
                          : getDayColorClasses(day.pnl, day.tradeCount > 0),
                        !day.isEmpty && 'text-gray-100',
                        !day.isEmpty && day.tradeCount > 0 && 'hover:opacity-90 cursor-pointer'
                      )}
                      title={day.isEmpty ? '' : `${day.date}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)} (${day.tradeCount} trades)`}
                    >
                      {/* Date number - top right, hidden when very small */}
                      {!day.isEmpty && (
                        <span className={clsx(
                          'absolute top-1 right-1.5 text-xs hidden @min-[50px]:block',
                          day.tradeCount === 0 && 'text-gray-500'
                        )}>
                          {parseISO(day.date).getDate()}
                        </span>
                      )}

                      {/* Trade data - centered, hidden when too small */}
                      {!day.isEmpty && day.tradeCount > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 hidden @min-[45px]:flex">
                          <span className="text-sm font-bold truncate max-w-full px-0.5">{formatCurrency(day.pnl)}</span>
                          <span className="text-[10px] text-white/90 hidden @min-[65px]:block">
                            {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                          </span>
                          {day.winRate !== null && (
                            <span className="text-[10px] text-white/80 hidden @min-[65px]:block">{day.winRate.toFixed(0)}%</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Weekly summary - hidden on small screens */}
                <div className="w-20 flex-shrink-0 hidden sm:block">
                  <WeekSummaryCell summary={month.weeklySummaries[weekIndex]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekSummaryCell({ summary }: { summary: WeeklySummary }) {
  return (
    <div
      className={clsx(
        '@container h-16 bg-gray-800 rounded-md p-1.5 flex flex-col justify-center border border-gray-700 overflow-hidden',
        summary.tradingDays === 0 && 'opacity-50'
      )}
    >
      <div className="text-[10px] text-gray-400 mb-0.5 truncate hidden @min-[50px]:block">Week {summary.weekNumber}</div>
      {summary.tradingDays > 0 ? (
        <>
          <div
            className={clsx(
              'font-semibold text-xs truncate hidden @min-[40px]:block',
              summary.totalPnl > 0
                ? 'text-green-400'
                : summary.totalPnl < 0
                ? 'text-red-400'
                : 'text-gray-300'
            )}
          >
            {formatCurrency(summary.totalPnl)}
          </div>
          <div className="text-[10px] text-gray-500 truncate hidden @min-[60px]:block">
            {summary.tradingDays} day{summary.tradingDays !== 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div className="text-[10px] text-gray-600 truncate hidden @min-[50px]:block">No trades</div>
      )}
    </div>
  );
}
