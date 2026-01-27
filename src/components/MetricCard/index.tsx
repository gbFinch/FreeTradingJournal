import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}

export default function MetricCard({ label, value, valueClass, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={clsx('text-2xl font-bold', valueClass)}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
