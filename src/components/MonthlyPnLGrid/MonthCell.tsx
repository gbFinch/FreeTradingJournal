import clsx from 'clsx';
import type { MonthlyPerformance } from '@/types';
import { formatCurrency } from './utils';

interface MonthCellProps {
  data: MonthlyPerformance | null;
  onClick?: () => void;
}

export default function MonthCell({ data, onClick }: MonthCellProps) {
  if (!data || data.trade_count === 0) {
    return (
      <div
        className="flex h-[74px] cursor-pointer items-center justify-center rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-100 text-center transition-all hover:-translate-y-[1px] hover:bg-stone-100 dark:border-stone-700/80 dark:from-stone-800 dark:to-stone-900 dark:hover:bg-stone-700/80"
        onClick={onClick}
      >
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">-</span>
      </div>
    );
  }

  const pnl = data.realized_net_pnl;
  const isPositive = pnl > 0;
  const isNegative = pnl < 0;

  // Calculate win rate for tooltip
  const totalDecisive = data.win_count + data.loss_count;
  const winRate = totalDecisive > 0 ? ((data.win_count / totalDecisive) * 100).toFixed(0) : null;

  return (
    <div
      className={clsx(
        'flex h-[74px] cursor-pointer flex-col justify-between rounded-2xl border p-2 text-left transition-all hover:-translate-y-[1px] hover:shadow-md',
        isPositive && 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600',
        isNegative && 'bg-red-100 dark:bg-[#6b1c1c] border-red-300 dark:border-red-700',
        !isPositive && !isNegative && 'bg-stone-200 dark:bg-gray-700 border-stone-300 dark:border-gray-600'
      )}
      title={`${data.trade_count} trades | W: ${data.win_count} L: ${data.loss_count}${winRate ? ` | ${winRate}% win rate` : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={clsx(
          'text-sm font-bold tracking-tight',
          isPositive && 'text-emerald-700 dark:text-emerald-300',
          isNegative && 'text-red-700 dark:text-red-300',
          !isPositive && !isNegative && 'text-gray-600 dark:text-gray-300'
        )}>
          {formatCurrency(pnl)}
        </span>
        {winRate && (
          <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-black/20 dark:text-stone-200">
            {winRate}%
          </span>
        )}
      </div>
      <span className="text-[10px] text-gray-600 dark:text-gray-300">
        {data.trade_count} trade{data.trade_count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
