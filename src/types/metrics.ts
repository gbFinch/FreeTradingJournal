export interface DailyPerformance {
  date: string;
  realized_net_pnl: number;
  trade_count: number;
  win_count: number;
  loss_count: number;
}

export interface PeriodMetrics {
  total_net_pnl: number;
  trade_count: number;
  win_count: number;
  loss_count: number;
  breakeven_count: number;
  win_rate: number | null;
  avg_win: number | null;
  avg_loss: number | null;
  profit_factor: number | null;
  expectancy: number | null;
  max_drawdown: number;
  max_win_streak: number;
  max_loss_streak: number;
}

export interface EquityPoint {
  date: string;
  cumulative_pnl: number;
  drawdown: number;
}

export interface MonthlyPerformance {
  yearMonth: string;      // "2024-01"
  year: number;
  month: number;
  realized_net_pnl: number;
  trade_count: number;
  win_count: number;
  loss_count: number;
}
