export type CandleTimeframe = '1m' | '5m' | '15m';
export type CandleRequestKind = 'primary' | 'underlying';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}
