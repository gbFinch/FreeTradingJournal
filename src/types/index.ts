export * from './trade';
export * from './metrics';
export * from './account';
export * from './import';

export interface DateRange {
  start: string;
  end: string;
}

export interface TradeFilters {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  symbol?: string;
  direction?: 'long' | 'short';
  result?: 'win' | 'loss' | 'breakeven';
}
