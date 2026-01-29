use crate::models::{Direction, DerivedFields, Trade, TradeResult, AssetClass};

/// Calculate gross PnL for a trade
/// Long: (exit_price - entry_price) × quantity × multiplier
/// Short: (entry_price - exit_price) × quantity × multiplier
/// For options, multiplier is 100 (1 contract = 100 shares)
pub fn calculate_gross_pnl(direction: Direction, entry_price: f64, exit_price: f64, quantity: f64, multiplier: f64) -> f64 {
    match direction {
        Direction::Long => (exit_price - entry_price) * quantity * multiplier,
        Direction::Short => (entry_price - exit_price) * quantity * multiplier,
    }
}

/// Calculate net PnL (gross PnL minus fees)
pub fn calculate_net_pnl(gross_pnl: f64, fees: f64) -> f64 {
    gross_pnl - fees
}

/// Calculate PnL per share
/// Long: exit_price - entry_price
/// Short: entry_price - exit_price
pub fn calculate_pnl_per_share(direction: Direction, entry_price: f64, exit_price: f64) -> f64 {
    match direction {
        Direction::Long => exit_price - entry_price,
        Direction::Short => entry_price - exit_price,
    }
}

/// Calculate risk per share
/// abs(entry_price - stop_loss_price)
/// Returns None if stop_loss equals entry_price
pub fn calculate_risk_per_share(entry_price: f64, stop_loss_price: f64) -> Option<f64> {
    let risk = (entry_price - stop_loss_price).abs();
    if risk > 0.0 {
        Some(risk)
    } else {
        None
    }
}

/// Calculate R-multiple
/// pnl_per_share / risk_per_share
/// Returns None if risk_per_share is None or zero
pub fn calculate_r_multiple(pnl_per_share: f64, risk_per_share: Option<f64>) -> Option<f64> {
    risk_per_share.filter(|&r| r > 0.0).map(|r| pnl_per_share / r)
}

/// Classify trade result based on net PnL
/// win: net_pnl > 0
/// loss: net_pnl < 0
/// breakeven: net_pnl = 0 (exact zero)
pub fn classify_result(net_pnl: f64) -> TradeResult {
    if net_pnl > 0.0 {
        TradeResult::Win
    } else if net_pnl < 0.0 {
        TradeResult::Loss
    } else {
        TradeResult::Breakeven
    }
}

/// Calculate all derived fields for a trade
pub fn calculate_derived_fields(trade: &Trade) -> DerivedFields {
    // Get the multiplier based on asset class (100 for options, 1 for stocks)
    let multiplier = trade.asset_class.multiplier();

    // Check if we have required data for PnL calculation
    let (gross_pnl, net_pnl, pnl_per_share) = match (trade.exit_price, trade.quantity) {
        (Some(exit), Some(qty)) => {
            let gross = calculate_gross_pnl(trade.direction, trade.entry_price, exit, qty, multiplier);
            let net = calculate_net_pnl(gross, trade.fees);
            let pps = calculate_pnl_per_share(trade.direction, trade.entry_price, exit);
            (Some(gross), Some(net), Some(pps))
        }
        _ => (None, None, None),
    };

    // Calculate risk per share if stop loss is set
    let risk_per_share = trade.stop_loss_price
        .and_then(|sl| calculate_risk_per_share(trade.entry_price, sl));

    // Calculate R-multiple if we have both pnl_per_share and risk_per_share
    let r_multiple = pnl_per_share
        .and_then(|pps| calculate_r_multiple(pps, risk_per_share));

    // Classify result if we have net PnL
    let result = net_pnl.map(classify_result);

    DerivedFields {
        gross_pnl,
        net_pnl,
        pnl_per_share,
        risk_per_share,
        r_multiple,
        result,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gross_pnl_long_win() {
        let pnl = calculate_gross_pnl(Direction::Long, 100.0, 110.0, 10.0, 1.0);
        assert!((pnl - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_gross_pnl_long_loss() {
        let pnl = calculate_gross_pnl(Direction::Long, 100.0, 90.0, 10.0, 1.0);
        assert!((pnl - (-100.0)).abs() < 0.01);
    }

    #[test]
    fn test_gross_pnl_short_win() {
        let pnl = calculate_gross_pnl(Direction::Short, 100.0, 90.0, 10.0, 1.0);
        assert!((pnl - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_gross_pnl_short_loss() {
        let pnl = calculate_gross_pnl(Direction::Short, 100.0, 110.0, 10.0, 1.0);
        assert!((pnl - (-100.0)).abs() < 0.01);
    }

    #[test]
    fn test_gross_pnl_option_with_multiplier() {
        // Option trade: 5 contracts, entry $1.50, exit $2.00
        // PnL = (2.00 - 1.50) * 5 * 100 = 250
        let pnl = calculate_gross_pnl(Direction::Long, 1.50, 2.00, 5.0, 100.0);
        assert!((pnl - 250.0).abs() < 0.01);
    }

    #[test]
    fn test_net_pnl() {
        let net = calculate_net_pnl(100.0, 10.0);
        assert!((net - 90.0).abs() < 0.01);
    }

    #[test]
    fn test_pnl_per_share_long() {
        let pps = calculate_pnl_per_share(Direction::Long, 100.0, 110.0);
        assert!((pps - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_pnl_per_share_short() {
        let pps = calculate_pnl_per_share(Direction::Short, 100.0, 90.0);
        assert!((pps - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_risk_per_share() {
        let risk = calculate_risk_per_share(100.0, 95.0);
        assert!(risk.is_some());
        assert!((risk.unwrap() - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_risk_per_share_zero() {
        let risk = calculate_risk_per_share(100.0, 100.0);
        assert!(risk.is_none());
    }

    #[test]
    fn test_r_multiple() {
        let r = calculate_r_multiple(10.0, Some(5.0));
        assert!(r.is_some());
        assert!((r.unwrap() - 2.0).abs() < 0.01);
    }

    #[test]
    fn test_r_multiple_no_risk() {
        let r = calculate_r_multiple(10.0, None);
        assert!(r.is_none());
    }

    #[test]
    fn test_classify_result_win() {
        assert_eq!(classify_result(100.0), TradeResult::Win);
    }

    #[test]
    fn test_classify_result_loss() {
        assert_eq!(classify_result(-100.0), TradeResult::Loss);
    }

    #[test]
    fn test_classify_result_breakeven() {
        assert_eq!(classify_result(0.0), TradeResult::Breakeven);
    }
}
