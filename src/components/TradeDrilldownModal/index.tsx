import { useMemo } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { TradeWithDerived } from '@/types';

interface TradeDrilldownModalProps {
  isOpen: boolean;
  title: string;
  trades: TradeWithDerived[];
  isLoading: boolean;
  onClose: () => void;
  onTradeClick: (tradeId: string) => void;
}

interface DrilldownMetrics {
  tradeCount: number;
  totalNetPnl: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  expectancy: number | null;
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatTradeTime(time: string | null): string {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${minutes ?? '00'} ${suffix}`;
}

function formatDuration(trade: TradeWithDerived): string {
  if (!trade.entry_time || !trade.exit_time) return '-';
  const entry = new Date(`${trade.trade_date}T${trade.entry_time}`);
  let exit = new Date(`${trade.trade_date}T${trade.exit_time}`);

  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) {
    return '-';
  }

  if (exit < entry) {
    exit = new Date(exit.getTime() + 24 * 60 * 60 * 1000);
  }

  const diffMinutes = Math.round((exit.getTime() - entry.getTime()) / (1000 * 60));
  if (diffMinutes < 0) return '-';

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function calculateMetrics(trades: TradeWithDerived[]): DrilldownMetrics {
  const closedTrades = trades.filter((trade) => trade.status === 'closed' && trade.net_pnl !== null);

  const netValues = closedTrades.map((trade) => trade.net_pnl as number);
  const wins = netValues.filter((value) => value > 0);
  const losses = netValues.filter((value) => value < 0);
  const breakevens = netValues.filter((value) => value === 0);

  const tradeCount = closedTrades.length;
  const winCount = wins.length;
  const lossCount = losses.length;
  const breakevenCount = breakevens.length;
  const totalNetPnl = netValues.reduce((sum, value) => sum + value, 0);

  const decisiveTrades = winCount + lossCount;
  const winRate = decisiveTrades > 0 ? winCount / decisiveTrades : null;

  const totalWins = wins.reduce((sum, value) => sum + value, 0);
  const totalLosses = losses.reduce((sum, value) => sum + value, 0);
  const avgWin = winCount > 0 ? totalWins / winCount : null;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : null;

  const profitFactor =
    totalLosses === 0
      ? totalWins > 0
        ? Infinity
        : null
      : totalWins / Math.abs(totalLosses);

  const expectancy =
    winRate !== null && avgWin !== null && avgLoss !== null
      ? winRate * avgWin + (1 - winRate) * avgLoss
      : null;

  return {
    tradeCount,
    totalNetPnl,
    winCount,
    lossCount,
    breakevenCount,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
  };
}

export default function TradeDrilldownModal({
  isOpen,
  title,
  trades,
  isLoading,
  onClose,
  onTradeClick,
}: TradeDrilldownModalProps) {
  const metrics = useMemo(() => calculateMetrics(trades), [trades]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] animate-modal-backdrop-in">
      <div className="app-panel animate-modal-pop-in flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border border-stone-200/90 shadow-2xl dark:border-stone-700/80">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-900/70">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">Click a row to open trade details</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label="Close trade details"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid gap-3 border-b border-stone-200 bg-stone-50/30 p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-stone-700 dark:bg-stone-900/30">
          <MetricCell label="Trades" value={String(metrics.tradeCount)} />
          <MetricCell
            label="Net P&L"
            value={formatCurrency(metrics.totalNetPnl)}
            valueClass={
              metrics.totalNetPnl > 0
                ? 'text-green-600 dark:text-green-400'
                : metrics.totalNetPnl < 0
                ? 'text-red-600 dark:text-red-400'
                : ''
            }
          />
          <MetricCell
            label="Win Rate"
            value={metrics.winRate !== null ? `${(metrics.winRate * 100).toFixed(1)}%` : 'N/A'}
          />
          <MetricCell
            label="Profit Factor"
            value={
              metrics.profitFactor === null
                ? 'N/A'
                : Number.isFinite(metrics.profitFactor)
                ? metrics.profitFactor.toFixed(2)
                : '∞'
            }
          />
          <MetricCell label="Expectancy" value={formatCurrency(metrics.expectancy)} />
          <MetricCell label="Wins" value={String(metrics.winCount)} />
          <MetricCell label="Losses" value={String(metrics.lossCount)} />
          <MetricCell label="Breakeven" value={String(metrics.breakevenCount)} />
          <MetricCell label="Avg Win" value={formatCurrency(metrics.avgWin)} />
          <MetricCell label="Avg Loss" value={formatCurrency(metrics.avgLoss)} />
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 text-center text-stone-500 dark:text-stone-400">Loading trades...</div>
          ) : trades.length === 0 ? (
            <div className="p-6 text-center text-stone-500 dark:text-stone-400">No trades found for this period.</div>
          ) : (
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-700">
              <thead className="sticky top-0 z-10 bg-stone-100/95 backdrop-blur dark:bg-stone-900/95">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Entry Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Direction</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Entry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Exit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Net P&L</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white/70 dark:divide-stone-700 dark:bg-stone-900/50">
                {trades.map((trade, index) => (
                  <tr
                    key={trade.id}
                    onClick={() => onTradeClick(trade.id)}
                    className={clsx(
                      'cursor-pointer transition-colors hover:bg-amber-50/70 dark:hover:bg-stone-800/80',
                      index % 2 === 0 ? 'bg-white/60 dark:bg-stone-900/40' : 'bg-stone-50/60 dark:bg-stone-900/60'
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {format(new Date(trade.trade_date), 'MMM d, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                      {formatTradeTime(trade.entry_time)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                      {formatDuration(trade)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{trade.symbol}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm uppercase">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          trade.direction === 'long'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        )}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{formatCurrency(trade.entry_price)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      {trade.exit_price !== null ? formatCurrency(trade.exit_price) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{trade.quantity?.toFixed(0) ?? '-'}</td>
                    <td
                      className={clsx(
                        'whitespace-nowrap px-4 py-3 text-right text-sm font-medium',
                        (trade.net_pnl ?? 0) > 0
                          ? 'text-green-600 dark:text-green-400'
                          : (trade.net_pnl ?? 0) < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-stone-500 dark:text-stone-400'
                      )}
                    >
                      {formatCurrency(trade.net_pnl)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm capitalize">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          trade.result === 'win' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                          trade.result === 'loss' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
                          (trade.result === 'breakeven' || trade.result === null) && 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
                        )}
                      >
                        {trade.result ?? 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCellProps {
  label: string;
  value: string;
  valueClass?: string;
}

function MetricCell({ label, value, valueClass }: MetricCellProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-800/70">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</div>
        <div className={clsx('text-base font-semibold text-stone-900 dark:text-stone-100', valueClass)}>{value}</div>
      </div>
    </div>
  );
}
