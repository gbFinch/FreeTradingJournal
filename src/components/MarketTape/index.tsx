import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { getMarketTape } from '@/api/market';
import type { MarketTapeQuote } from '@/types';

interface TapeItem extends MarketTapeQuote {
  tone: 'positive' | 'negative' | 'neutral';
}

const DEFAULT_SYMBOLS = [
  'SPY',
  'QQQ',
  'DIA',
  'IWM',
  'AAPL',
  'MSFT',
  'NVDA',
  'AMD',
  'AMZN',
  'META',
  'GOOGL',
  'TSLA',
  'NFLX',
  'AVGO',
];

function normalizeItems(quotes: MarketTapeQuote[]): TapeItem[] {
  return quotes.map((quote) => ({
    ...quote,
    tone: quote.change > 0 ? 'positive' : quote.change < 0 ? 'negative' : 'neutral',
  }));
}

function formatSigned(value: number, digits = 2) {
  const formatted = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return serialized;
    }
  } catch {
    // Ignore serialization errors and fall back to a generic message.
  }

  return 'Unknown market tape error.';
}

function TapeRow({ items }: { items: TapeItem[] }) {
  return (
    <div className="market-tape-track flex min-w-max shrink-0 items-baseline gap-0 pr-4">
      {items.map((item, index) => (
        <div
          key={`${item.symbol}-${index}`}
          className="market-tape-entry flex items-baseline gap-3 px-2.5 py-1.5"
        >
          <span className="market-tape-symbol font-mono text-[15px] font-semibold uppercase leading-none tracking-[0.06em]">
            {item.symbol}
          </span>
          <span className="market-tape-price font-mono text-[15px] font-semibold leading-none tabular-nums">
            {item.price.toFixed(2)}
          </span>
          <span
            className={clsx(
              'market-tape-change font-mono text-[15px] font-semibold leading-none tabular-nums tracking-tight',
              item.tone === 'positive' && 'market-tape-change-positive',
              item.tone === 'negative' && 'market-tape-change-negative',
              item.tone === 'neutral' && 'market-tape-change-neutral'
            )}
          >
            {formatSigned(item.change)}
          </span>
          <span
            className={clsx(
              'market-tape-percent font-mono text-[15px] font-semibold leading-none tabular-nums',
              item.tone === 'positive' && 'market-tape-change-positive',
              item.tone === 'negative' && 'market-tape-change-negative',
              item.tone === 'neutral' && 'market-tape-change-neutral'
            )}
          >
            ({formatSigned(item.change_percent)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MarketTape() {
  const [quotes, setQuotes] = useState<TapeItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMarketTape(DEFAULT_SYMBOLS)
      .then((response) => {
        if (!isMounted) return;
        if (response.length === 0) {
          setStatus('unavailable');
          setErrorMessage('No quote data returned from Alpaca.');
          return;
        }
        setQuotes(normalizeItems(response));
        setStatus('live');
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setQuotes([]);
        setStatus('unavailable');
        setErrorMessage(getErrorMessage(error));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const items = useMemo(() => quotes, [quotes]);

  return (
    <div className="market-tape-shell relative left-1/2 mb-6 w-screen max-w-[calc(100%+2rem)] -translate-x-1/2 overflow-hidden px-0.5 py-0.5 sm:max-w-[calc(100%+3rem)] lg:max-w-[calc(100%+4rem)]">
      <div className="market-tape-mask">
        <div className="flex min-h-[2.6rem] items-center">
          {status === 'live' && items.length > 0 ? (
            <div className="market-tape-marquee flex items-center">
              <TapeRow items={items} />
              <TapeRow items={items} />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center px-4 py-2 text-center">
              <span className="market-tape-status text-sm font-medium tracking-[0.08em] text-stone-500 dark:text-stone-400">
                {status === 'loading'
                  ? 'Loading live market tape...'
                  : errorMessage ?? 'Live market tape unavailable.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
