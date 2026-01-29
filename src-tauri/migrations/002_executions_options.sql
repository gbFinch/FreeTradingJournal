-- Migration 002: Trade executions and options support
-- Supports IBKR TLG import with multiple entry/exit fills and option contracts

-- Trade executions table for individual fills
CREATE TABLE IF NOT EXISTS trade_executions (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    execution_type TEXT NOT NULL CHECK (execution_type IN ('entry', 'exit')),
    execution_date DATE NOT NULL,
    execution_time TEXT,
    quantity REAL NOT NULL,       -- Always positive
    price REAL NOT NULL,
    fees REAL DEFAULT 0,
    exchange TEXT,
    broker_execution_id TEXT,     -- TLG trade_id for deduplication
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_executions_trade ON trade_executions(trade_id);
CREATE INDEX IF NOT EXISTS idx_executions_broker_id ON trade_executions(broker_execution_id);

-- Add option support fields to instruments
-- For stocks: underlying_symbol = symbol, option fields NULL
-- For options: underlying_symbol = e.g. 'AAPL', symbol = full contract like 'AAPL  250905C00240000'
ALTER TABLE instruments ADD COLUMN underlying_symbol TEXT;
ALTER TABLE instruments ADD COLUMN option_type TEXT CHECK (option_type IN ('call', 'put'));
ALTER TABLE instruments ADD COLUMN strike_price REAL;
ALTER TABLE instruments ADD COLUMN expiration_date DATE;

-- Update existing stock instruments to set underlying_symbol = symbol
UPDATE instruments SET underlying_symbol = symbol WHERE underlying_symbol IS NULL;
