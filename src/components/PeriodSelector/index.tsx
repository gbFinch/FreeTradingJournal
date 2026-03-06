import { useMetricsStore } from '@/stores';
import { format, isSameMonth } from 'date-fns';
import clsx from 'clsx';

type PeriodType = 'month' | 'ytd' | 'all';

export default function PeriodSelector() {
  const {
    periodType,
    selectedMonth,
    setPeriodType,
    goToPrevMonth,
    goToNextMonth,
    fetchAll,
  } = useMetricsStore();

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type);
    fetchAll();
  };

  const handlePrevMonth = () => {
    goToPrevMonth();
    fetchAll();
  };

  const handleNextMonth = () => {
    goToNextMonth();
    fetchAll();
  };

  return (
    <div className="dashboard-period-selector flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/72 p-3 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/72 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevMonth}
          className="rounded-xl p-2 text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700"
          aria-label="Previous month"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={() => handlePeriodChange('month')}
          className={clsx(
            'min-w-[130px] rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            periodType === 'month'
              ? 'bg-white text-stone-950 shadow-sm dark:bg-stone-100 dark:text-stone-950'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          )}
        >
          {format(selectedMonth, 'MMM yyyy')}
          {isCurrentMonth && periodType === 'month' && (
            <span className="ml-1.5 text-xs text-stone-300 dark:text-stone-600">(current)</span>
          )}
        </button>
        <button
          onClick={handleNextMonth}
          className="rounded-xl p-2 text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700"
          aria-label="Next month"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className="hidden h-6 w-px bg-stone-300 dark:bg-stone-600 sm:block" />

      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
        <button
          onClick={() => handlePeriodChange('ytd')}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            periodType === 'ytd'
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          )}
        >
          YTD
        </button>
        <button
          onClick={() => handlePeriodChange('all')}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            periodType === 'all'
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          )}
        >
          All Time
        </button>
      </div>
    </div>
  );
}
