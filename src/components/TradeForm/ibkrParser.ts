import type { AssetClass, Direction } from '@/types';

type IbkrAction = 'BOT' | 'SLD';

interface ParsedIbkrLine {
  sortTime: string;
  time: string;
  symbol: string;
  action: IbkrAction;
  quantity: number;
  price: number;
  fees: number;
}

export interface ParsedIbkrTradeDraft {
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  entryFees: number;
  exits: Array<{
    exit_time: string;
    quantity: number;
    price: number;
    fees: number;
  }>;
}

const LINE_RE =
  /^\s*(?:[+-]\s+)?(\d{1,2}:\d{2}:\d{2})\s+(.+?)\s+(BOT|SLD)\s+(-?[\d,]+(?:\.\d+)?)\s+(-?[\d,]+(?:\.\d+)?)\s+(-?[\d,]+(?:\.\d+)?)(?:\s+(-?[\d,]+(?:\.\d+)?))?\s*$/i;

function toNumber(input: string): number {
  return parseFloat(input.replace(/,/g, ''));
}

function normalizeTime(timeWithSeconds: string): string {
  const [hour, minute] = timeWithSeconds.split(':');
  return `${hour.padStart(2, '0')}:${minute}`;
}

function normalizeSortTime(timeWithSeconds: string): string {
  const [hour, minute, second] = timeWithSeconds.split(':');
  return `${hour.padStart(2, '0')}:${minute}:${second}`;
}

function parseLine(line: string): ParsedIbkrLine {
  const match = line.match(LINE_RE);
  if (!match) {
    throw new Error(`Could not parse IBKR line: ${line}`);
  }

  const [, time, symbol, action, qtyRaw, priceRaw, feesRaw] = match;
  const quantity = toNumber(qtyRaw);
  const price = toNumber(priceRaw);
  const fees = Math.abs(toNumber(feesRaw));

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity in IBKR line: ${line}`);
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price in IBKR line: ${line}`);
  }
  if (!Number.isFinite(fees) || fees < 0) {
    throw new Error(`Invalid fees in IBKR line: ${line}`);
  }

  return {
    sortTime: normalizeSortTime(time),
    time: normalizeTime(time),
    symbol: symbol.trim(),
    action: action.toUpperCase() as IbkrAction,
    quantity,
    price,
    fees,
  };
}

function detectAssetClass(symbol: string): AssetClass {
  return /\b(CALL|PUT)\b/i.test(symbol) ? 'option' : 'stock';
}

export function parseIbkrPaste(text: string): ParsedIbkrTradeDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('Paste IBKR rows to parse.');
  }

  const parsed = lines.map(parseLine);

  const symbol = parsed[0].symbol;
  const hasMultipleSymbols = parsed.some((line) => line.symbol !== symbol);
  if (hasMultipleSymbols) {
    throw new Error('IBKR paste contains multiple symbols. Paste one trade at a time.');
  }

  const earliestExecution = [...parsed].sort((a, b) => a.sortTime.localeCompare(b.sortTime))[0];
  const direction: Direction = earliestExecution.action === 'BOT' ? 'long' : 'short';
  const entryAction: IbkrAction = direction === 'long' ? 'BOT' : 'SLD';
  const exitAction: IbkrAction = direction === 'long' ? 'SLD' : 'BOT';

  const entries = parsed.filter((line) => line.action === entryAction);
  const exits = parsed.filter((line) => line.action === exitAction);

  if (entries.length === 0) {
    throw new Error('No entry rows found in IBKR paste.');
  }

  const quantity = entries.reduce((sum, row) => sum + row.quantity, 0);
  const weightedEntry = entries.reduce((sum, row) => sum + row.quantity * row.price, 0);
  const entryPrice = weightedEntry / quantity;
  const entryFees = entries.reduce((sum, row) => sum + row.fees, 0);

  return {
    symbol,
    assetClass: detectAssetClass(symbol),
    direction,
    quantity,
    entryPrice,
    entryFees,
    exits: exits.map((row) => ({
      exit_time: row.time,
      quantity: row.quantity,
      price: row.price,
      fees: row.fees,
    })),
  };
}
