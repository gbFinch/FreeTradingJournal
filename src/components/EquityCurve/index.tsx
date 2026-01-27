import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { EquityPoint } from '@/types';
import { useThemeStore } from '@/stores';

interface EquityCurveProps {
  data: EquityPoint[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function EquityCurve({ data }: EquityCurveProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(date: string) => format(parseISO(date), 'MMM d')}
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
        />
        <YAxis
          tickFormatter={formatCurrency}
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'P&L']}
          labelFormatter={(label: string) => format(parseISO(label), 'MMM d, yyyy')}
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : 'white',
            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
            borderRadius: '8px',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
          labelStyle={{
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        />
        <ReferenceLine y={0} stroke={isDark ? '#4b5563' : '#d1d5db'} strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="cumulative_pnl"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
