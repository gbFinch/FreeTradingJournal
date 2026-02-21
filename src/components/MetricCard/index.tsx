import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}

export default function MetricCard({ label, value, valueClass, subtitle }: MetricCardProps) {
  return (
    <div className="app-panel p-4">
      <div className="mb-1 text-sm text-stone-500 dark:text-stone-400">{label}</div>
      <div className={clsx('text-2xl font-bold', valueClass)}>{value}</div>
      {subtitle && <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">{subtitle}</div>}
    </div>
  );
}
