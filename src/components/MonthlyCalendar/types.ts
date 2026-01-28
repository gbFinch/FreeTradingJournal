import type { DailyPerformance } from '@/types';

export interface DayCellData {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  pnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number | null;
}

export interface WeeklySummary {
  weekNumber: number;
  totalPnl: number;
  tradingDays: number;
}

export interface MonthStats {
  totalPnl: number;
  tradingDays: number;
}

export interface MonthlyCalendarProps {
  data: DailyPerformance[];
  month?: Date;
  onMonthChange?: (date: Date) => void;
  showNavigation?: boolean;
  showWeeklySummary?: boolean;
  onDayClick?: (date: string) => void;
}
