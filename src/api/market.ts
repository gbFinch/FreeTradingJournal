import { invoke } from '@/mocks/invoke';
import type { Candle, CandleRequestKind, CandleTimeframe, MarketTapeQuote } from '@/types';

export async function getTradeCandles(
  tradeId: string,
  timeframe: CandleTimeframe = '5m',
  forceRefresh = false,
  candleKind: CandleRequestKind = 'primary',
): Promise<Candle[]> {
  return invoke('get_trade_candles', { tradeId, timeframe, forceRefresh, candleKind });
}

export async function getMarketTape(symbols?: string[]): Promise<MarketTapeQuote[]> {
  return invoke('get_market_tape', { symbols });
}
