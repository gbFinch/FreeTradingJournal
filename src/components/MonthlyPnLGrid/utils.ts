import type { DailyPerformance, MonthlyPerformance } from '@/types';

/**
 * Aggregates daily performance data into monthly performance data.
 * Uses Map for O(n) aggregation.
 */
export function aggregateDailyToMonthly(dailyData: DailyPerformance[]): MonthlyPerformance[] {
  const monthlyMap = new Map<string, MonthlyPerformance>();

  for (const day of dailyData) {
    // Extract year and month from date string "YYYY-MM-DD"
    const yearMonth = day.date.substring(0, 7); // "YYYY-MM"
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const existing = monthlyMap.get(yearMonth);
    if (existing) {
      existing.realized_net_pnl += day.realized_net_pnl;
      existing.trade_count += day.trade_count;
      existing.win_count += day.win_count;
      existing.loss_count += day.loss_count;
    } else {
      monthlyMap.set(yearMonth, {
        yearMonth,
        year,
        month,
        realized_net_pnl: day.realized_net_pnl,
        trade_count: day.trade_count,
        win_count: day.win_count,
        loss_count: day.loss_count,
      });
    }
  }

  // Sort by yearMonth ascending
  return Array.from(monthlyMap.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

/**
 * Groups monthly performance data by year.
 */
export function groupByYear(monthlyData: MonthlyPerformance[]): Map<number, MonthlyPerformance[]> {
  const yearMap = new Map<number, MonthlyPerformance[]>();

  for (const month of monthlyData) {
    const existing = yearMap.get(month.year);
    if (existing) {
      existing.push(month);
    } else {
      yearMap.set(month.year, [month]);
    }
  }

  return yearMap;
}

/**
 * Calculates the year total PnL from monthly data.
 */
export function calculateYearTotal(monthlyData: MonthlyPerformance[]): number {
  return monthlyData.reduce((sum, m) => sum + m.realized_net_pnl, 0);
}

/**
 * Formats currency value with K suffix for large numbers.
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

/**
 * Month names for column headers.
 */
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
