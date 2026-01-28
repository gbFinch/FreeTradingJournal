import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameMonth,
  addDays,
  subDays,
} from 'date-fns';
import type { DailyPerformance } from '@/types';
import type { DayCellData, WeeklySummary, MonthStats } from './types';

export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  }
  return `${sign}$${absValue.toFixed(2)}`;
}

export function formatCurrencyCompact(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

export function buildMonthGrid(
  month: Date,
  dataMap: Map<string, DailyPerformance>
): DayCellData[][] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDayOfWeek = getDay(monthStart);

  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days from previous month
  const paddingDays: Date[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    paddingDays.push(subDays(monthStart, i + 1));
  }

  // Combine padding and month days
  const allDays = [...paddingDays, ...daysInMonth];

  // Add trailing days to complete the last week
  const remainingDays = 7 - (allDays.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      allDays.push(addDays(monthEnd, i));
    }
  }

  // Build grid (6 rows max)
  const grid: DayCellData[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    const week = allDays.slice(i, i + 7).map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const performance = dataMap.get(dateStr);
      const winCount = performance?.win_count ?? 0;
      const lossCount = performance?.loss_count ?? 0;
      const totalDecisive = winCount + lossCount;

      return {
        date: dateStr,
        dayNumber: day.getDate(),
        isCurrentMonth: isSameMonth(day, month),
        pnl: performance?.realized_net_pnl ?? 0,
        tradeCount: performance?.trade_count ?? 0,
        winCount,
        lossCount,
        winRate: totalDecisive > 0 ? (winCount / totalDecisive) * 100 : null,
      };
    });
    grid.push(week);
  }

  return grid;
}

export function calculateWeeklySummaries(grid: DayCellData[][]): WeeklySummary[] {
  return grid.map((week, index) => {
    const tradingDays = week.filter(
      (day) => day.isCurrentMonth && day.tradeCount > 0
    );

    return {
      weekNumber: index + 1,
      totalPnl: tradingDays.reduce((sum, day) => sum + day.pnl, 0),
      tradingDays: tradingDays.length,
    };
  });
}

export function calculateMonthStats(data: DailyPerformance[]): MonthStats {
  const tradingDays = data.filter((d) => d.trade_count > 0);

  return {
    totalPnl: tradingDays.reduce((sum, d) => sum + d.realized_net_pnl, 0),
    tradingDays: tradingDays.length,
  };
}
