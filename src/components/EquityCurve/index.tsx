import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { EquityPoint } from '@/types';

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
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis
          tickFormatter={formatCurrency}
          stroke="#9ca3af"
          fontSize={12}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'P&L']}
          labelFormatter={(label: string) => format(parseISO(label), 'MMM d, yyyy')}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
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
