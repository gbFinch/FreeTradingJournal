-- Migration 003: Add screenshot URL to trades

ALTER TABLE trades
ADD COLUMN screenshot_url TEXT;
