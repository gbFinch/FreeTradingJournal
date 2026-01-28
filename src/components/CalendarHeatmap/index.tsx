import { useMemo } from 'react';
import { format, parseISO, getMonth, getYear, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import type { DailyPerformance } from '@/types';

interface CalendarHeatmapProps {
  data: DailyPerformance[];
}

interface DayCell {
  date: string;
  pnl: number;
  tradeCount: number;
  isEmpty: boolean;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getDayColor(pnl: number): string {
  if (pnl > 0) return 'bg-green-500';
  if (pnl < 0) return 'bg-red-500';
  return 'bg-gray-400'; // breakeven
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
        days.push({ date: '', pnl: 0, tradeCount: 0, isEmpty: true });
      }

      // Add actual days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dataMap.get(dateStr);

        days.push({
          date: dateStr,
          pnl: dayData?.realized_net_pnl ?? 0,
          tradeCount: dayData?.trade_count ?? 0,
          isEmpty: false,
        });
      }

      return {
        key: monthKey,
        label: format(firstDay, 'MMMM yyyy'),
        days,
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
        <div key={month.key}>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{month.label}</h3>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {month.days.map((day, idx) => (
              <div
                key={day.isEmpty ? `empty-${idx}` : day.date}
                className={`
                  aspect-square rounded-sm relative flex flex-col items-center justify-center
                  text-xs transition-all
                  ${day.isEmpty
                    ? 'bg-transparent'
                    : day.tradeCount === 0
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : `${getDayColor(day.pnl)} text-white cursor-pointer hover:opacity-80`
                  }
                `}
                title={day.isEmpty ? '' : `${day.date}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)} (${day.tradeCount} trades)`}
              >
                {!day.isEmpty && (
                  <span className={`absolute top-0.5 left-1 text-[10px] ${day.tradeCount > 0 ? 'opacity-75' : 'text-gray-400 dark:text-gray-500'}`}>
                    {parseISO(day.date).getDate()}
                  </span>
                )}
                {!day.isEmpty && day.tradeCount > 0 && (
                  <>
                    <span className="font-medium">{formatCurrency(day.pnl)}</span>
                    <span className="text-[10px] opacity-75">{day.tradeCount}t</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
