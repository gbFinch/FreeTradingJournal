import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  valueClass?: string;
  subtitle?: string;
}

export default function MetricCard({ label, value, valueClass, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={clsx('text-2xl font-bold', valueClass)}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
