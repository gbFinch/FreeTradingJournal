import { create } from 'zustand';
import { format, startOfMonth, endOfMonth, startOfYear, addMonths, subMonths } from 'date-fns';
import type { DailyPerformance, PeriodMetrics, EquityPoint, DateRange } from '@/types';
import * as api from '@/api';

type PeriodType = 'month' | 'ytd' | 'all' | 'custom';

interface MetricsState {
  dailyPerformance: DailyPerformance[];
  periodMetrics: PeriodMetrics | null;
  equityCurve: EquityPoint[];
  dateRange: DateRange;
  periodType: PeriodType;
  selectedMonth: Date;
  accountId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchDailyPerformance: () => Promise<void>;
  fetchPeriodMetrics: () => Promise<void>;
  fetchEquityCurve: () => Promise<void>;
  fetchAll: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
  setPeriodType: (type: PeriodType) => void;
  setSelectedMonth: (month: Date) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  setAccountId: (id: string | null) => void;
  clearError: () => void;
}

function getDateRangeForPeriod(type: PeriodType, selectedMonth: Date): DateRange {
  const today = new Date();

  switch (type) {
    case 'month':
      return {
        start: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
      };
    case 'ytd':
      return {
        start: format(startOfYear(today), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    case 'all':
      return {
        start: '2000-01-01',
        end: format(today, 'yyyy-MM-dd'),
      };
    default:
      return {
        start: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
      };
  }
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  dailyPerformance: [],
  periodMetrics: null,
  equityCurve: [],
  dateRange: getDateRangeForPeriod('month', new Date()),
  periodType: 'month',
  selectedMonth: new Date(),
  accountId: null,
  isLoading: false,
  error: null,

  fetchDailyPerformance: async () => {
    const { dateRange, accountId } = get();
    set({ isLoading: true, error: null });

    try {
      const data = await api.getDailyPerformance(
        dateRange.start,
        dateRange.end,
        accountId ?? undefined
      );
      set({ dailyPerformance: data, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  fetchPeriodMetrics: async () => {
    const { dateRange, accountId, periodType } = get();
    set({ isLoading: true, error: null });

    try {
      let data: PeriodMetrics;
      if (periodType === 'all') {
        data = await api.getAllTimeMetrics(accountId ?? undefined);
      } else {
        data = await api.getPeriodMetrics(
          dateRange.start,
          dateRange.end,
          accountId ?? undefined
        );
      }
      set({ periodMetrics: data, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  fetchEquityCurve: async () => {
    const { dateRange, accountId } = get();
    set({ isLoading: true, error: null });

    try {
      const data = await api.getEquityCurve(
        dateRange.start,
        dateRange.end,
        accountId ?? undefined
      );
      set({ equityCurve: data, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  fetchAll: async () => {
    const { fetchDailyPerformance, fetchPeriodMetrics, fetchEquityCurve } = get();
    await Promise.all([
      fetchDailyPerformance(),
      fetchPeriodMetrics(),
      fetchEquityCurve(),
    ]);
  },

  setDateRange: (range: DateRange) => {
    set({ dateRange: range, periodType: 'custom' });
  },

  setPeriodType: (type: PeriodType) => {
    const { selectedMonth } = get();
    // When switching to month view, reset to current month
    const month = type === 'month' ? new Date() : selectedMonth;
    const dateRange = getDateRangeForPeriod(type, month);
    set({ periodType: type, dateRange, selectedMonth: month });
  },

  setSelectedMonth: (month: Date) => {
    const dateRange = getDateRangeForPeriod('month', month);
    set({ selectedMonth: month, periodType: 'month', dateRange });
  },

  goToPrevMonth: () => {
    const { selectedMonth } = get();
    const newMonth = subMonths(selectedMonth, 1);
    const dateRange = getDateRangeForPeriod('month', newMonth);
    set({ selectedMonth: newMonth, periodType: 'month', dateRange });
  },

  goToNextMonth: () => {
    const { selectedMonth } = get();
    const newMonth = addMonths(selectedMonth, 1);
    const dateRange = getDateRangeForPeriod('month', newMonth);
    set({ selectedMonth: newMonth, periodType: 'month', dateRange });
  },

  setAccountId: (id: string | null) => {
    set({ accountId: id });
  },

  clearError: () => {
    set({ error: null });
  },
}));
