export type Direction = 'long' | 'short';
export type Status = 'open' | 'closed';
export type TradeResult = 'win' | 'loss' | 'breakeven';
export type AssetClass = 'stock' | 'option';

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  instrument_id: string;
  symbol: string;
  asset_class: AssetClass;
  trade_number: number | null;
  trade_date: string; // YYYY-MM-DD format
  direction: Direction;
  quantity: number | null;
  entry_price: number;
  exit_price: number | null;
  stop_loss_price: number | null;
  entry_time: string | null;
  exit_time: string | null;
  fees: number;
  strategy: string | null;
  notes: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface TradeWithDerived extends Trade {
  gross_pnl: number | null;
  net_pnl: number | null;
  pnl_per_share: number | null;
  risk_per_share: number | null;
  r_multiple: number | null;
  result: TradeResult | null;
}

export interface CreateTradeInput {
  account_id: string;
  symbol: string;
  asset_class?: AssetClass;
  trade_number?: number;
  trade_date: string;
  direction: Direction;
  quantity?: number;
  entry_price: number;
  exit_price?: number;
  stop_loss_price?: number;
  entry_time?: string;
  exit_time?: string;
  fees?: number;
  strategy?: string;
  notes?: string;
  status?: Status;
}

export interface UpdateTradeInput {
  account_id?: string;
  symbol?: string;
  trade_number?: number;
  trade_date?: string;
  direction?: Direction;
  quantity?: number;
  entry_price?: number;
  exit_price?: number;
  stop_loss_price?: number;
  entry_time?: string;
  exit_time?: string;
  fees?: number;
  strategy?: string;
  notes?: string;
  status?: Status;
}
