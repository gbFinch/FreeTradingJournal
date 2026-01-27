import { invoke } from '@tauri-apps/api/core';
import type { DailyPerformance, PeriodMetrics, EquityPoint } from '@/types';

export async function getDailyPerformance(
  startDate: string,
  endDate: string,
  accountId?: string
): Promise<DailyPerformance[]> {
  return invoke('get_daily_performance', { startDate, endDate, accountId });
}

export async function getPeriodMetrics(
  startDate: string,
  endDate: string,
  accountId?: string
): Promise<PeriodMetrics> {
  return invoke('get_period_metrics', { startDate, endDate, accountId });
}

export async function getAllTimeMetrics(accountId?: string): Promise<PeriodMetrics> {
  return invoke('get_all_time_metrics', { accountId });
}

export async function getEquityCurve(accountId?: string): Promise<EquityPoint[]> {
  return invoke('get_equity_curve', { accountId });
}
