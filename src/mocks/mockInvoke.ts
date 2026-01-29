import type {
  Account,
  Trade,
  TradeWithDerived,
  CreateTradeInput,
  UpdateTradeInput,
  DailyPerformance,
  PeriodMetrics,
  EquityPoint,
} from '@/types';
import { mockAccounts, mockTrades } from './mockData';
import { calculateDerivedFields } from './calculations';

// In-memory store (resets on page reload)
let accounts: Account[] = [...mockAccounts];
let trades: Trade[] = [...mockTrades];

// Helper to generate UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to get current timestamp
function now(): string {
  return new Date().toISOString();
}

// ========== Account Commands ==========

function getAccounts(): Account[] {
  return accounts;
}

function createAccount(name: string, baseCurrency?: string): Account {
  const account: Account = {
    id: generateId(),
    user_id: 'mock-user-001',
    name,
    base_currency: baseCurrency || 'USD',
    created_at: now(),
  };
  accounts.push(account);
  return account;
}

// ========== Trade Commands ==========

function getTrades(params?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}): TradeWithDerived[] {
  let filtered = trades;

  if (params?.accountId) {
    filtered = filtered.filter((t) => t.account_id === params.accountId);
  }

  if (params?.startDate) {
    filtered = filtered.filter((t) => t.trade_date >= params.startDate!);
  }

  if (params?.endDate) {
    filtered = filtered.filter((t) => t.trade_date <= params.endDate!);
  }

  // Sort by date descending (most recent first)
  const sorted = [...filtered].sort((a, b) =>
    b.trade_date.localeCompare(a.trade_date) ||
    b.created_at.localeCompare(a.created_at)
  );

  return sorted.map(calculateDerivedFields);
}

function getTrade(id: string): TradeWithDerived | null {
  const trade = trades.find((t) => t.id === id);
  return trade ? calculateDerivedFields(trade) : null;
}

function createTrade(input: CreateTradeInput): TradeWithDerived {
  const trade: Trade = {
    id: generateId(),
    user_id: 'mock-user-001',
    account_id: input.account_id,
    instrument_id: input.symbol,
    symbol: input.symbol,
    asset_class: 'stock', // Default to stock for manually created trades
    trade_number: input.trade_number ?? null,
    trade_date: input.trade_date,
    direction: input.direction,
    quantity: input.quantity ?? null,
    entry_price: input.entry_price,
    exit_price: input.exit_price ?? null,
    stop_loss_price: input.stop_loss_price ?? null,
    entry_time: input.entry_time ?? null,
    exit_time: input.exit_time ?? null,
    fees: input.fees ?? 0,
    strategy: input.strategy ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'open',
    created_at: now(),
    updated_at: now(),
  };
  trades.push(trade);
  return calculateDerivedFields(trade);
}

function updateTrade(id: string, input: UpdateTradeInput): TradeWithDerived {
  const index = trades.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Trade not found: ${id}`);
  }

  const existing = trades[index];
  const updated: Trade = {
    ...existing,
    account_id: input.account_id ?? existing.account_id,
    symbol: input.symbol ?? existing.symbol,
    instrument_id: input.symbol ?? existing.instrument_id,
    trade_number: input.trade_number ?? existing.trade_number,
    trade_date: input.trade_date ?? existing.trade_date,
    direction: input.direction ?? existing.direction,
    quantity: input.quantity ?? existing.quantity,
    entry_price: input.entry_price ?? existing.entry_price,
    exit_price: input.exit_price ?? existing.exit_price,
    stop_loss_price: input.stop_loss_price ?? existing.stop_loss_price,
    entry_time: input.entry_time ?? existing.entry_time,
    exit_time: input.exit_time ?? existing.exit_time,
    fees: input.fees ?? existing.fees,
    strategy: input.strategy ?? existing.strategy,
    notes: input.notes ?? existing.notes,
    status: input.status ?? existing.status,
    updated_at: now(),
  };

  trades[index] = updated;
  return calculateDerivedFields(updated);
}

function deleteTrade(id: string): void {
  const index = trades.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Trade not found: ${id}`);
  }
  trades.splice(index, 1);
}

// ========== Metrics Commands ==========

function getDailyPerformance(
  startDate: string,
  endDate: string,
  accountId?: string
): DailyPerformance[] {
  const tradesWithDerived = getTrades({ accountId, startDate, endDate });

  // Group by date
  const byDate = new Map<string, TradeWithDerived[]>();
  for (const trade of tradesWithDerived) {
    if (trade.status !== 'closed') continue;
    const existing = byDate.get(trade.trade_date) || [];
    existing.push(trade);
    byDate.set(trade.trade_date, existing);
  }

  // Aggregate each day
  const results: DailyPerformance[] = [];
  for (const [date, dayTrades] of byDate) {
    let realized_net_pnl = 0;
    let win_count = 0;
    let loss_count = 0;

    for (const trade of dayTrades) {
      if (trade.net_pnl !== null) {
        realized_net_pnl += trade.net_pnl;
      }
      if (trade.result === 'win') win_count++;
      if (trade.result === 'loss') loss_count++;
    }

    results.push({
      date,
      realized_net_pnl,
      trade_count: dayTrades.length,
      win_count,
      loss_count,
    });
  }

  // Sort by date
  return results.sort((a, b) => a.date.localeCompare(b.date));
}

function getPeriodMetrics(
  startDate: string,
  endDate: string,
  accountId?: string
): PeriodMetrics {
  const tradesWithDerived = getTrades({ accountId, startDate, endDate });
  return calculatePeriodMetrics(tradesWithDerived);
}

function getAllTimeMetrics(accountId?: string): PeriodMetrics {
  const tradesWithDerived = getTrades({ accountId });
  return calculatePeriodMetrics(tradesWithDerived);
}

function calculatePeriodMetrics(tradesWithDerived: TradeWithDerived[]): PeriodMetrics {
  const closedTrades = tradesWithDerived.filter(
    (t) => t.status === 'closed' && t.net_pnl !== null
  );

  let total_net_pnl = 0;
  let win_count = 0;
  let loss_count = 0;
  let breakeven_count = 0;
  let total_wins = 0;
  let total_losses = 0;
  let peak = 0;
  let max_drawdown = 0;
  let cumulative = 0;

  // Sort by date for streak and drawdown calculations
  const sorted = [...closedTrades].sort((a, b) =>
    a.trade_date.localeCompare(b.trade_date)
  );

  let current_win_streak = 0;
  let current_loss_streak = 0;
  let max_win_streak = 0;
  let max_loss_streak = 0;

  for (const trade of sorted) {
    const pnl = trade.net_pnl!;
    total_net_pnl += pnl;
    cumulative += pnl;

    // Update peak and drawdown
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > max_drawdown) {
      max_drawdown = drawdown;
    }

    // Count results and streaks
    if (trade.result === 'win') {
      win_count++;
      total_wins += pnl;
      current_win_streak++;
      current_loss_streak = 0;
      if (current_win_streak > max_win_streak) {
        max_win_streak = current_win_streak;
      }
    } else if (trade.result === 'loss') {
      loss_count++;
      total_losses += pnl;
      current_loss_streak++;
      current_win_streak = 0;
      if (current_loss_streak > max_loss_streak) {
        max_loss_streak = current_loss_streak;
      }
    } else {
      breakeven_count++;
      // Breakeven doesn't reset streaks
    }
  }

  const trade_count = closedTrades.length;
  const decisiveTrades = win_count + loss_count;

  // Calculate win rate (excluding breakeven)
  const win_rate = decisiveTrades > 0 ? win_count / decisiveTrades : null;

  // Calculate averages
  const avg_win = win_count > 0 ? total_wins / win_count : null;
  const avg_loss = loss_count > 0 ? total_losses / loss_count : null;

  // Calculate profit factor: sum(wins) / abs(sum(losses))
  const profit_factor =
    total_losses !== 0 ? Math.abs(total_wins / total_losses) : null;

  // Calculate expectancy: (win_rate × avg_win) + ((1 - win_rate) × avg_loss)
  let expectancy: number | null = null;
  if (win_rate !== null && avg_win !== null && avg_loss !== null) {
    expectancy = win_rate * avg_win + (1 - win_rate) * avg_loss;
  }

  return {
    total_net_pnl,
    trade_count,
    win_count,
    loss_count,
    breakeven_count,
    win_rate,
    avg_win,
    avg_loss,
    profit_factor,
    expectancy,
    max_drawdown,
    max_win_streak,
    max_loss_streak,
  };
}

function getEquityCurve(accountId?: string): EquityPoint[] {
  const tradesWithDerived = getTrades({ accountId });
  const closedTrades = tradesWithDerived.filter(
    (t) => t.status === 'closed' && t.net_pnl !== null
  );

  // Group by date
  const byDate = new Map<string, number>();
  for (const trade of closedTrades) {
    const existing = byDate.get(trade.trade_date) || 0;
    byDate.set(trade.trade_date, existing + trade.net_pnl!);
  }

  // Sort dates
  const dates = Array.from(byDate.keys()).sort();

  // Calculate cumulative PnL and drawdown
  const results: EquityPoint[] = [];
  let cumulative = 0;
  let peak = 0;

  for (const date of dates) {
    cumulative += byDate.get(date)!;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;

    results.push({
      date,
      cumulative_pnl: cumulative,
      drawdown,
    });
  }

  return results;
}

// ========== Mock Invoke Handler ==========

type InvokeArgs = Record<string, unknown>;

export async function mockInvoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  switch (cmd) {
    // Accounts
    case 'get_accounts':
      return getAccounts() as T;
    case 'create_account':
      return createAccount(
        args?.name as string,
        args?.baseCurrency as string | undefined
      ) as T;

    // Trades
    case 'get_trades':
      return getTrades({
        accountId: args?.accountId as string | undefined,
        startDate: args?.startDate as string | undefined,
        endDate: args?.endDate as string | undefined,
      }) as T;
    case 'get_trade':
      return getTrade(args?.id as string) as T;
    case 'create_trade':
      return createTrade(args?.input as CreateTradeInput) as T;
    case 'update_trade':
      return updateTrade(
        args?.id as string,
        args?.input as UpdateTradeInput
      ) as T;
    case 'delete_trade':
      deleteTrade(args?.id as string);
      return undefined as T;
    case 'get_trade_executions':
      // Mock trades don't have executions stored, return empty array
      return [] as T;

    // Metrics
    case 'get_daily_performance':
      return getDailyPerformance(
        args?.startDate as string,
        args?.endDate as string,
        args?.accountId as string | undefined
      ) as T;
    case 'get_period_metrics':
      return getPeriodMetrics(
        args?.startDate as string,
        args?.endDate as string,
        args?.accountId as string | undefined
      ) as T;
    case 'get_all_time_metrics':
      return getAllTimeMetrics(args?.accountId as string | undefined) as T;
    case 'get_equity_curve':
      return getEquityCurve(args?.accountId as string | undefined) as T;

    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}
