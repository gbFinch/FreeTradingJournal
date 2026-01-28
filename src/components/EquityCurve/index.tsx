import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
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

  // Convert dates to timestamps for proper time-based distribution
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      timestamp: parseISO(point.date).getTime(),
      positive_pnl: point.cumulative_pnl >= 0 ? point.cumulative_pnl : 0,
      negative_pnl: point.cumulative_pnl < 0 ? point.cumulative_pnl : 0,
    }));
  }, [data]);

  // Calculate gradient offset based on where zero line falls in the data range
  const gradientOffset = useMemo(() => {
    if (data.length === 0) return 0;
    const values = data.map((d) => d.cumulative_pnl);
    const max = Math.max(...values);
    const min = Math.min(...values);

    if (max <= 0) return 0; // All negative
    if (min >= 0) return 1; // All positive

    return max / (max - min);
  }, [data]);

  // Determine the final state for line color
  const finalPnl = data.length > 0 ? data[data.length - 1].cumulative_pnl : 0;
  const lineColor = finalPnl >= 0 ? '#22c55e' : '#ef4444';

  // Generate evenly spaced ticks
  const ticks = useMemo(() => {
    if (chartData.length < 2) return [];
    const minTime = chartData[0].timestamp;
    const maxTime = chartData[chartData.length - 1].timestamp;
    const tickCount = 5;
    const step = (maxTime - minTime) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => minTime + step * i);
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center text-gray-400">
        No data to display
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="splitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset={gradientOffset} stopColor="#22c55e" stopOpacity={0.1} />
              <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.1} />
              <stop offset={1} stopColor="#ef4444" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="redGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            horizontal={true}
            vertical={false}
            strokeDasharray="3 3"
            stroke={isDark ? '#374151' : '#e5e7eb'}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            tickFormatter={(timestamp: number) => format(new Date(timestamp), 'MMM d')}
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
            labelFormatter={(timestamp: number) => format(new Date(timestamp), 'MMM d, yyyy')}
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
          <Area
            type="monotone"
            dataKey="cumulative_pnl"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#splitGradient)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
