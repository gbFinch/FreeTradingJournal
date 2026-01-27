-- Initial database schema for Trading Journal
-- Migration 001

-- Users table (supports future multi-user)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trading accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    base_currency TEXT DEFAULT 'USD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tradable instruments
CREATE TABLE IF NOT EXISTS instruments (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    asset_class TEXT DEFAULT 'stock',
    exchange TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Core trades table
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    instrument_id TEXT NOT NULL REFERENCES instruments(id),
    trade_number INTEGER,
    trade_date DATE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    quantity REAL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    stop_loss_price REAL,
    entry_time TEXT,
    exit_time TEXT,
    fees REAL DEFAULT 0,
    strategy TEXT,
    notes TEXT,
    status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags for trade categorization
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trade_tags (
    trade_id TEXT REFERENCES trades(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

-- External links
CREATE TABLE IF NOT EXISTS trade_links (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('tradingview', 'reference', 'other')),
    url TEXT NOT NULL,
    label TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_instrument ON trades(instrument_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
