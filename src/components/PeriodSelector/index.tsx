import { useMetricsStore } from '@/stores';
import clsx from 'clsx';

type PeriodType = 'month' | 'ytd' | 'all';

const periods: { value: PeriodType; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
];

export default function PeriodSelector() {
  const { periodType, setPeriodType, fetchAll } = useMetricsStore();

  const handleChange = (type: PeriodType) => {
    setPeriodType(type);
    fetchAll();
  };

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      {periods.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            periodType === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
