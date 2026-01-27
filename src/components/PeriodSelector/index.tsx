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
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {periods.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            periodType === value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
