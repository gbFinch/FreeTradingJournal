export interface TlgParseError {
  line_number: number;
  line_content: string;
  error: string;
}

export interface Execution {
  execution_type: 'entry' | 'exit';
  execution_date: string;
  execution_time: string | null;
  quantity: number;
  price: number;
  fees: number;
  exchange: string | null;
  broker_execution_id: string;
}

export interface AggregatedTrade {
  key: string;
  symbol: string;
  underlying_symbol: string;
  asset_class: 'stock' | 'option';
  option_type: 'call' | 'put' | null;
  strike_price: number | null;
  expiration_date: string | null;
  direction: 'long' | 'short';
  trade_date: string;
  entries: Execution[];
  exits: Execution[];
  status: 'open' | 'closed';
  // Derived for display
  total_quantity: number;
  avg_entry_price: number;
  avg_exit_price: number | null;
  total_fees: number;
  net_pnl: number | null;
}

export interface ImportPreview {
  trades_to_import: AggregatedTrade[];
  open_positions: AggregatedTrade[];
  duplicate_count: number;
  parse_errors: TlgParseError[];
}

export interface ImportResult {
  imported_count: number;
  skipped_duplicates: number;
  errors: string[];
}

// Group trades by underlying symbol for UI display
export interface TradeGroup {
  underlying: string;
  trades: AggregatedTrade[];
  totalPnl: number | null;
  tradeCount: number;
}

// Helper function to group trades by underlying
export function groupTradesByUnderlying(trades: AggregatedTrade[]): TradeGroup[] {
  const groups = new Map<string, AggregatedTrade[]>();

  for (const trade of trades) {
    const key = trade.underlying_symbol;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(trade);
  }

  return Array.from(groups.entries()).map(([underlying, trades]) => ({
    underlying,
    trades,
    totalPnl: trades.reduce((sum, t) => {
      if (t.net_pnl !== null) {
        return (sum ?? 0) + t.net_pnl;
      }
      return sum;
    }, null as number | null),
    tradeCount: trades.length,
  })).sort((a, b) => a.underlying.localeCompare(b.underlying));
}
