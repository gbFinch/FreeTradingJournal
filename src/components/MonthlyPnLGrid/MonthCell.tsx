import clsx from 'clsx';
import type { MonthlyPerformance } from '@/types';
import { formatCurrency } from './utils';

interface MonthCellProps {
  data: MonthlyPerformance | null;
}

export default function MonthCell({ data }: MonthCellProps) {
  if (!data || data.trade_count === 0) {
    // Empty or no trades
    return (
      <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center border border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
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
        'h-14 rounded flex flex-col items-center justify-center p-1 border transition-all cursor-pointer hover:opacity-90',
        isPositive && 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-600',
        isNegative && 'bg-red-100 dark:bg-[#6b1c1c] border-red-300 dark:border-red-700',
        !isPositive && !isNegative && 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
      )}
      title={`${data.trade_count} trades | W: ${data.win_count} L: ${data.loss_count}${winRate ? ` | ${winRate}% win rate` : ''}`}
    >
      <span className={clsx(
        'text-sm font-bold',
        isPositive && 'text-emerald-700 dark:text-emerald-300',
        isNegative && 'text-red-700 dark:text-red-300',
        !isPositive && !isNegative && 'text-gray-600 dark:text-gray-300'
      )}>
        {formatCurrency(pnl)}
      </span>
      <span className="text-[10px] text-gray-600 dark:text-gray-300">
        {data.trade_count} trade{data.trade_count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
