import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MonthlyCalendar from './index';
import {
  formatCurrency,
  formatCurrencyCompact,
  buildMonthGrid,
  calculateWeeklySummaries,
  calculateMonthStats,
} from './utils';
import type { DailyPerformance } from '@/types';

describe('MonthlyCalendar', () => {
  const mockData: DailyPerformance[] = [
    { date: '2024-06-10', realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
    { date: '2024-06-11', realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
    { date: '2024-06-12', realized_net_pnl: 0, trade_count: 1, win_count: 0, loss_count: 0 },
    { date: '2024-06-17', realized_net_pnl: 1500, trade_count: 4, win_count: 3, loss_count: 1 },
  ];

  describe('rendering', () => {
    it('renders month label', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      expect(screen.getByText('June 2024')).toBeInTheDocument();
    });

    it('renders day headers', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('renders "This month" label only for current month', () => {
      // When viewing current month, should show "This month" label
      render(<MonthlyCalendar data={[]} month={new Date()} />);
      expect(screen.getByText('This month')).toBeInTheDocument();
    });

    it('does not render "This month" label for past months', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      expect(screen.queryByText('This month')).not.toBeInTheDocument();
    });

    it('renders monthly stats', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      // 4 trading days
      expect(screen.getByText('4 days')).toBeInTheDocument();
    });

    it('renders weekly summary sidebar by default', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      expect(screen.getByText('Week 1')).toBeInTheDocument();
    });

    it('hides weekly summary when showWeeklySummary is false', () => {
      render(
        <MonthlyCalendar
          data={mockData}
          month={new Date('2024-06-15')}
          showWeeklySummary={false}
        />
      );
      expect(screen.queryByText('Week 1')).not.toBeInTheDocument();
    });

    it('hides navigation when showNavigation is false', () => {
      render(
        <MonthlyCalendar
          data={mockData}
          month={new Date('2024-06-15')}
          showNavigation={false}
        />
      );
      expect(screen.queryByText('This month')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onMonthChange when clicking next month', () => {
      const onMonthChange = vi.fn();
      render(
        <MonthlyCalendar
          data={mockData}
          month={new Date('2024-06-15')}
          onMonthChange={onMonthChange}
        />
      );

      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);

      expect(onMonthChange).toHaveBeenCalledTimes(1);
      const calledDate = onMonthChange.mock.calls[0][0];
      expect(calledDate.getMonth()).toBe(6); // July
      expect(calledDate.getFullYear()).toBe(2024);
    });

    it('calls onMonthChange when clicking previous month', () => {
      const onMonthChange = vi.fn();
      render(
        <MonthlyCalendar
          data={mockData}
          month={new Date('2024-06-15')}
          onMonthChange={onMonthChange}
        />
      );

      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);

      expect(onMonthChange).toHaveBeenCalledTimes(1);
      const calledDate = onMonthChange.mock.calls[0][0];
      expect(calledDate.getMonth()).toBe(4); // May
      expect(calledDate.getFullYear()).toBe(2024);
    });

  });

  describe('day click', () => {
    it('calls onDayClick when clicking a day with trades', () => {
      const onDayClick = vi.fn();
      render(
        <MonthlyCalendar
          data={mockData}
          month={new Date('2024-06-15')}
          onDayClick={onDayClick}
        />
      );

      // Find the cell with $500 PnL
      const dayCell = screen.getByText('$500');
      fireEvent.click(dayCell.closest('button')!);

      expect(onDayClick).toHaveBeenCalledWith('2024-06-10');
    });
  });

  describe('color coding', () => {
    it('applies green background for positive PnL', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      const winningDay = screen.getByText('$500').closest('button');
      // Light mode uses bg-emerald-100, dark mode uses dark:bg-emerald-900
      expect(winningDay).toHaveClass('bg-emerald-100');
    });

    it('applies red background for negative PnL', () => {
      render(<MonthlyCalendar data={mockData} month={new Date('2024-06-15')} />);
      const losingDay = screen.getByText('-$200').closest('button');
      // Light mode uses bg-red-100, dark mode uses dark:bg-[#6b1c1c]
      expect(losingDay).toHaveClass('bg-red-100');
    });
  });
});

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formats small positive values', () => {
      expect(formatCurrency(500)).toBe('$500.00');
    });

    it('formats small negative values', () => {
      expect(formatCurrency(-200)).toBe('-$200.00');
    });

    it('formats large positive values with K suffix', () => {
      expect(formatCurrency(2500)).toBe('$2.50K');
    });

    it('formats large negative values with K suffix', () => {
      expect(formatCurrency(-1500)).toBe('-$1.50K');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('formats small values without decimals', () => {
      expect(formatCurrencyCompact(500)).toBe('$500');
    });

    it('formats large values with one decimal', () => {
      expect(formatCurrencyCompact(2500)).toBe('$2.5K');
    });

    it('formats negative values correctly', () => {
      expect(formatCurrencyCompact(-200)).toBe('-$200');
      expect(formatCurrencyCompact(-1500)).toBe('-$1.5K');
    });
  });

  describe('buildMonthGrid', () => {
    it('builds correct grid structure for June 2024', () => {
      const dataMap = new Map<string, DailyPerformance>();
      const grid = buildMonthGrid(new Date('2024-06-15'), dataMap);

      // June 2024 starts on Saturday, so we need padding from previous month
      // Grid should have 5 or 6 rows
      expect(grid.length).toBeGreaterThanOrEqual(5);
      expect(grid.length).toBeLessThanOrEqual(6);

      // Each row should have 7 days
      grid.forEach((week) => {
        expect(week).toHaveLength(7);
      });
    });

    it('includes performance data in grid cells', () => {
      const mockPerf: DailyPerformance = {
        date: '2024-06-10',
        realized_net_pnl: 500,
        trade_count: 3,
        win_count: 2,
        loss_count: 1,
      };
      const dataMap = new Map([['2024-06-10', mockPerf]]);
      const grid = buildMonthGrid(new Date('2024-06-15'), dataMap);

      // Find the cell for June 10
      const flatGrid = grid.flat();
      const june10 = flatGrid.find((d) => d.date === '2024-06-10');

      expect(june10).toBeDefined();
      expect(june10!.pnl).toBe(500);
      expect(june10!.tradeCount).toBe(3);
      expect(june10!.winRate).toBeCloseTo(66.67, 1);
    });

    it('marks non-current month days correctly', () => {
      const dataMap = new Map<string, DailyPerformance>();
      const grid = buildMonthGrid(new Date('2024-06-15'), dataMap);

      // First day in grid should be from May (padding)
      const firstDay = grid[0][0];
      expect(firstDay.isCurrentMonth).toBe(false);
    });
  });

  describe('calculateWeeklySummaries', () => {
    it('calculates weekly totals correctly', () => {
      const mockPerf1: DailyPerformance = {
        date: '2024-06-10',
        realized_net_pnl: 500,
        trade_count: 3,
        win_count: 2,
        loss_count: 1,
      };
      const mockPerf2: DailyPerformance = {
        date: '2024-06-11',
        realized_net_pnl: -200,
        trade_count: 2,
        win_count: 0,
        loss_count: 2,
      };
      const dataMap = new Map([
        ['2024-06-10', mockPerf1],
        ['2024-06-11', mockPerf2],
      ]);
      const grid = buildMonthGrid(new Date('2024-06-15'), dataMap);
      const summaries = calculateWeeklySummaries(grid);

      expect(summaries).toHaveLength(grid.length);

      // Find the week containing June 10-11 (week 3 - index 2, since June 1 is Saturday)
      const weekWithData = summaries.find((w) => w.tradingDays > 0);
      expect(weekWithData).toBeDefined();
      expect(weekWithData!.totalPnl).toBe(300); // 500 - 200
      expect(weekWithData!.tradingDays).toBe(2);
    });
  });

  describe('calculateMonthStats', () => {
    it('calculates total PnL correctly', () => {
      const data: DailyPerformance[] = [
        { date: '2024-06-10', realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
        { date: '2024-06-11', realized_net_pnl: -200, trade_count: 2, win_count: 0, loss_count: 2 },
        { date: '2024-06-12', realized_net_pnl: 300, trade_count: 1, win_count: 1, loss_count: 0 },
      ];

      const stats = calculateMonthStats(data);

      expect(stats.totalPnl).toBe(600); // 500 - 200 + 300
      expect(stats.tradingDays).toBe(3);
    });

    it('excludes non-trading days from count', () => {
      const data: DailyPerformance[] = [
        { date: '2024-06-10', realized_net_pnl: 500, trade_count: 3, win_count: 2, loss_count: 1 },
        { date: '2024-06-11', realized_net_pnl: 0, trade_count: 0, win_count: 0, loss_count: 0 },
      ];

      const stats = calculateMonthStats(data);

      expect(stats.tradingDays).toBe(1);
    });
  });
});
