import type { Trade, TradeWithDerived, TradeResult } from '@/types';

export function calculateDerivedFields(trade: Trade): TradeWithDerived {
  // Can only calculate derived fields for closed trades with all required data
  if (
    trade.status !== 'closed' ||
    trade.exit_price === null ||
    trade.quantity === null
  ) {
    return {
      ...trade,
      gross_pnl: null,
      net_pnl: null,
      pnl_per_share: null,
      risk_per_share: null,
      r_multiple: null,
      result: null,
    };
  }

  // Calculate PnL per share based on direction
  const pnl_per_share =
    trade.direction === 'long'
      ? trade.exit_price - trade.entry_price
      : trade.entry_price - trade.exit_price;

  // Calculate gross and net PnL
  const gross_pnl = pnl_per_share * trade.quantity;
  const net_pnl = gross_pnl - trade.fees;

  // Calculate risk per share (only if stop_loss_price is set)
  let risk_per_share: number | null = null;
  if (trade.stop_loss_price !== null) {
    risk_per_share =
      trade.direction === 'long'
        ? trade.entry_price - trade.stop_loss_price
        : trade.stop_loss_price - trade.entry_price;
  }

  // Calculate R-multiple (only if risk is known and non-zero)
  let r_multiple: number | null = null;
  if (risk_per_share !== null && risk_per_share !== 0) {
    r_multiple = pnl_per_share / risk_per_share;
  }

  // Determine result based on net PnL
  let result: TradeResult | null = null;
  if (net_pnl > 0) {
    result = 'win';
  } else if (net_pnl < 0) {
    result = 'loss';
  } else {
    result = 'breakeven';
  }

  return {
    ...trade,
    gross_pnl,
    net_pnl,
    pnl_per_share,
    risk_per_share,
    r_multiple,
    result,
  };
}
