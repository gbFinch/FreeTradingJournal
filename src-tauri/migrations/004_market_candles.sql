-- Migration 004: Market candle cache for trade chart overlays

CREATE TABLE IF NOT EXISTS market_candles (
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    candle_time INTEGER NOT NULL, -- Unix timestamp (seconds)
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL,
    source TEXT NOT NULL DEFAULT 'yahoo',
    fetched_at_epoch INTEGER NOT NULL,
    PRIMARY KEY (symbol, timeframe, candle_time)
);

CREATE INDEX IF NOT EXISTS idx_market_candles_lookup
ON market_candles(symbol, timeframe, candle_time);
