import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { PeriodMetrics } from '@/types';

interface DashboardMetricsProps {
  metrics: PeriodMetrics;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000) {
    return `${sign}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sign}$${absValue.toFixed(2)}`;
}

// Icon: Dollar sign for P&L
function DollarIcon() {
  return (
    <svg className="h-4 w-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Icon: Chart/scale for profit factor
function ScaleIcon() {
  return (
    <svg className="h-4 w-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

// Icon: Percentage/target for win rate
function TargetIcon() {
  return (
    <svg className="h-4 w-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// Icon: Trending up/down for avg win/loss
function TrendIcon() {
  return (
    <svg className="h-4 w-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

// Icon: Calculator for expectancy
function CalculatorIcon() {
  return (
    <svg className="h-4 w-4 text-stone-500 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function MetricIconShell({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <span
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-xl border',
        tone === 'positive' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50',
        tone === 'negative' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50',
        tone === 'neutral' && 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/70'
      )}
    >
      {children}
    </span>
  );
}

function DonutChart({ winPercent, lossPercent }: { winPercent: number; lossPercent: number }) {
  const size = 52;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const winDash = (winPercent / 100) * circumference;
  const lossDash = (lossPercent / 100) * circumference;

  return (
    <div className="relative flex h-[52px] w-[52px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-stone-200 dark:stroke-stone-700" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeDasharray={`${lossDash} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${winDash} ${circumference}`}
          strokeDashoffset={-lossDash}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
        W/L
      </span>
    </div>
  );
}

function GaugeChart({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const circumference = Math.PI * 28;
  const fillAmount = (clamped / 100) * circumference;

  return (
    <div className="relative flex h-[42px] w-[82px] items-end justify-center">
      <svg width={82} height={42} viewBox="0 0 82 42">
        <path d="M 13 34 A 28 28 0 0 1 69 34" fill="none" className="stroke-stone-200 dark:stroke-stone-700" strokeWidth={7} strokeLinecap="round" />
        <path
          d="M 13 34 A 28 28 0 0 1 69 34"
          fill="none"
          stroke="#14b8a6"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${fillAmount} ${circumference}`}
        />
      </svg>
      <span className="absolute bottom-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
        Win
      </span>
    </div>
  );
}

function WinLossBar({ avgWin, avgLoss }: { avgWin: number; avgLoss: number }) {
  const total = avgWin + Math.abs(avgLoss);
  const winPercent = total > 0 ? (avgWin / total) * 100 : 50;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="overflow-hidden rounded-full bg-stone-200 p-1 dark:bg-stone-700">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-white/60 dark:bg-black/10">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${winPercent}%` }} />
          <div className="h-full bg-gradient-to-r from-red-500 to-rose-500" style={{ width: `${100 - winPercent}%` }} />
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-semibold">
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">${avgWin.toFixed(0)}</span>
        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-950/60 dark:text-red-300">-${Math.abs(avgLoss).toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const winRate = metrics.win_rate !== null ? metrics.win_rate * 100 : 0;
  const totalTrades = metrics.win_count + metrics.loss_count + metrics.breakeven_count;
  const winPercent = totalTrades > 0 ? (metrics.win_count / totalTrades) * 100 : 0;
  const lossPercent = totalTrades > 0 ? (metrics.loss_count / totalTrades) * 100 : 0;

  const avgWinLossRatio = metrics.avg_win !== null && metrics.avg_loss !== null && metrics.avg_loss !== 0
    ? Math.abs(metrics.avg_win / metrics.avg_loss)
    : null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12">
      <div className="app-panel dashboard-card dashboard-card-primary dashboard-card-kpi px-5 py-4 md:col-span-3 xl:col-span-4">
        <header className="mb-2 flex items-start gap-3">
          <MetricIconShell tone={metrics.total_net_pnl >= 0 ? 'positive' : 'negative'}>
            <DollarIcon />
          </MetricIconShell>
          <span className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Net P&L</span>
            </div>
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">Primary outcome for the selected period.</span>
          </span>
          <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[11px] text-stone-500 dark:border-stone-700 dark:text-stone-400">
            <span>{metrics.trade_count}</span>
            <span className="ml-1">trades</span>
          </span>
        </header>
        <div className="flex min-h-[60px] items-center">
          <span className={clsx(
            'text-3xl font-bold tracking-tight',
            metrics.total_net_pnl > 0 ? 'text-green-600 dark:text-green-400' : metrics.total_net_pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'
          )}>
            {formatCurrency(metrics.total_net_pnl)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="rounded-full bg-white/70 px-2 py-1 dark:bg-stone-800/80">{metrics.win_count} wins</span>
          <span className="rounded-full bg-white/70 px-2 py-1 dark:bg-stone-800/80">{metrics.loss_count} losses</span>
          <span className="rounded-full bg-white/70 px-2 py-1 dark:bg-stone-800/80">{metrics.breakeven_count} flat</span>
        </div>
      </div>

      <div className="app-panel dashboard-card dashboard-card-kpi px-4 py-4 md:col-span-3 xl:col-span-2">
        <header className="mb-2 flex items-start gap-3">
          <MetricIconShell>
            <ScaleIcon />
          </MetricIconShell>
          <span className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Profit factor</span>
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">Quality of gains versus losses.</span>
          </span>
        </header>
        <div className="flex min-h-[60px] items-center justify-between gap-4">
          <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {metrics.profit_factor !== null && isFinite(metrics.profit_factor)
              ? metrics.profit_factor.toFixed(2)
              : 'N/A'}
          </span>
          <DonutChart winPercent={winPercent} lossPercent={lossPercent} />
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Gross profit divided by gross loss.</p>
      </div>

      <div className="app-panel dashboard-card dashboard-card-kpi px-4 py-4 md:col-span-3 xl:col-span-2">
        <header className="mb-2 flex items-start gap-3">
          <MetricIconShell>
            <TargetIcon />
          </MetricIconShell>
          <span className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Trade win %</span>
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">Decisive outcomes won.</span>
          </span>
        </header>
        <div className="flex min-h-[60px] items-center justify-between gap-4">
          <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {winRate.toFixed(2)}%
          </span>
          <div className="flex flex-col items-center">
            <GaugeChart percent={winRate} />
            <div className="flex items-center gap-2 text-[10px] -mt-1">
              <span className="text-red-600 dark:text-red-400">{metrics.loss_count}</span>
              <span className="text-stone-400 dark:text-stone-500">{metrics.breakeven_count}</span>
              <span className="text-green-600 dark:text-green-400">{metrics.win_count}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Win consistency across closed outcomes.</p>
      </div>

      <div className="app-panel dashboard-card dashboard-card-kpi px-4 py-4 md:col-span-3 xl:col-span-2">
        <header className="mb-2 flex items-start gap-3">
          <MetricIconShell>
            <TrendIcon />
          </MetricIconShell>
          <span className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Avg win/loss trade</span>
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">Reward versus damage per trade.</span>
          </span>
        </header>
        <div className="flex min-h-[60px] items-center gap-3">
          <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {avgWinLossRatio !== null ? avgWinLossRatio.toFixed(2) : 'N/A'}
          </span>
          <div className="flex-1">
            {metrics.avg_win !== null && metrics.avg_loss !== null && (
              <WinLossBar avgWin={metrics.avg_win} avgLoss={metrics.avg_loss} />
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Average gain to average loss ratio.</p>
      </div>

      <div className="app-panel dashboard-card dashboard-card-kpi px-4 py-4 md:col-span-3 xl:col-span-2">
        <header className="mb-2 flex items-start gap-3">
          <MetricIconShell tone={metrics.expectancy !== null && metrics.expectancy < 0 ? 'negative' : metrics.expectancy !== null && metrics.expectancy > 0 ? 'positive' : 'neutral'}>
            <CalculatorIcon />
          </MetricIconShell>
          <span className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Trade expectancy</span>
            <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">Expected edge each trade contributes.</span>
          </span>
        </header>
        <div className="flex min-h-[60px] items-center">
          <span className={clsx(
            'text-2xl font-bold',
            metrics.expectancy !== null && metrics.expectancy > 0
              ? 'text-green-600 dark:text-green-400'
              : metrics.expectancy !== null && metrics.expectancy < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-stone-600 dark:text-stone-300'
          )}>
            {metrics.expectancy !== null ? formatCurrency(metrics.expectancy) : 'N/A'}
          </span>
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Expected value per trade based on the current mix of wins and losses.</p>
      </div>
    </div>
  );
}
