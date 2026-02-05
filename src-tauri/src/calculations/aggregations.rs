use std::collections::HashMap;
use chrono::NaiveDate;
use crate::models::{DailyPerformance, EquityPoint, PeriodMetrics, TradeResult, TradeWithDerived};

/// Calculate daily performance metrics from a list of trades
pub fn calculate_daily_metrics(trades: &[TradeWithDerived]) -> Vec<DailyPerformance> {
    let mut daily_map: HashMap<NaiveDate, DailyPerformance> = HashMap::new();

    for trade in trades {
        // Only include closed trades with net_pnl
        if let Some(net_pnl) = trade.net_pnl {
            let date = trade.trade.trade_date;
            let entry = daily_map.entry(date).or_insert_with(|| DailyPerformance {
                date,
                realized_net_pnl: 0.0,
                trade_count: 0,
                win_count: 0,
                loss_count: 0,
            });

            entry.realized_net_pnl += net_pnl;
            entry.trade_count += 1;

            if let Some(result) = trade.result {
                match result {
                    TradeResult::Win => entry.win_count += 1,
                    TradeResult::Loss => entry.loss_count += 1,
                    TradeResult::Breakeven => {} // Excluded from win/loss counts
                }
            }
        }
    }

    let mut result: Vec<DailyPerformance> = daily_map.into_values().collect();
    result.sort_by_key(|d| d.date);
    result
}

/// Calculate period metrics from a list of trades
pub fn calculate_period_metrics(trades: &[TradeWithDerived]) -> PeriodMetrics {
    if trades.is_empty() {
        return PeriodMetrics::default();
    }

    let mut total_net_pnl = 0.0;
    let mut win_count = 0;
    let mut loss_count = 0;
    let mut breakeven_count = 0;
    let mut total_wins = 0.0;
    let mut total_losses = 0.0;

    // Track streaks
    let mut current_win_streak = 0;
    let mut current_loss_streak = 0;
    let mut max_win_streak = 0;
    let mut max_loss_streak = 0;

    // Sort trades by date for streak calculation
    let mut sorted_trades: Vec<&TradeWithDerived> = trades.iter().collect();
    sorted_trades.sort_by_key(|t| t.trade.trade_date);

    for trade in &sorted_trades {
        if let Some(net_pnl) = trade.net_pnl {
            total_net_pnl += net_pnl;

            match trade.result {
                Some(TradeResult::Win) => {
                    win_count += 1;
                    total_wins += net_pnl;
                    current_win_streak += 1;
                    current_loss_streak = 0;
                    max_win_streak = max_win_streak.max(current_win_streak);
                }
                Some(TradeResult::Loss) => {
                    loss_count += 1;
                    total_losses += net_pnl; // This is negative
                    current_loss_streak += 1;
                    current_win_streak = 0;
                    max_loss_streak = max_loss_streak.max(current_loss_streak);
                }
                Some(TradeResult::Breakeven) => {
                    breakeven_count += 1;
                    // Breakeven trades break streaks
                    current_win_streak = 0;
                    current_loss_streak = 0;
                }
                None => {}
            }
        }
    }

    let trade_count = win_count + loss_count + breakeven_count;
    let decisive_count = win_count + loss_count;

    // Win rate (excluding breakeven)
    let win_rate = if decisive_count > 0 {
        Some(win_count as f64 / decisive_count as f64)
    } else {
        None
    };

    // Average win
    let avg_win = if win_count > 0 {
        Some(total_wins / win_count as f64)
    } else {
        None
    };

    // Average loss (negative value)
    let avg_loss = if loss_count > 0 {
        Some(total_losses / loss_count as f64)
    } else {
        None
    };

    // Profit factor = sum(wins) / abs(sum(losses))
    let profit_factor = if total_losses < 0.0 {
        Some(total_wins / total_losses.abs())
    } else if total_wins > 0.0 {
        Some(f64::INFINITY) // No losses but have wins
    } else {
        None
    };

    // Expectancy = (win_rate × avg_win) + ((1 - win_rate) × avg_loss)
    let expectancy = match (win_rate, avg_win, avg_loss) {
        (Some(wr), Some(aw), Some(al)) => {
            Some((wr * aw) + ((1.0 - wr) * al))
        }
        _ => None,
    };

    // Calculate max drawdown from equity curve
    let equity_curve = calculate_equity_curve(&sorted_trades);
    let max_drawdown = equity_curve
        .iter()
        .map(|p| p.drawdown)
        .fold(0.0, f64::max);

    PeriodMetrics {
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
    }
}

/// Calculate equity curve from a list of trades (aggregated by day)
pub fn calculate_equity_curve(trades: &[&TradeWithDerived]) -> Vec<EquityPoint> {
    // First, aggregate PnL by date
    let mut daily_pnl: HashMap<NaiveDate, f64> = HashMap::new();

    for trade in trades {
        if let Some(net_pnl) = trade.net_pnl {
            *daily_pnl.entry(trade.trade.trade_date).or_insert(0.0) += net_pnl;
        }
    }

    // Sort dates and build curve with one point per day
    let mut dates: Vec<NaiveDate> = daily_pnl.keys().copied().collect();
    dates.sort();

    let mut curve = Vec::new();
    let mut cumulative_pnl: f64 = 0.0;
    let mut peak: f64 = 0.0;

    for date in dates {
        cumulative_pnl += daily_pnl[&date];
        peak = peak.max(cumulative_pnl);
        let drawdown = peak - cumulative_pnl;

        curve.push(EquityPoint {
            date,
            cumulative_pnl,
            drawdown,
        });
    }

    curve
}

/// Calculate equity curve from owned trades
pub fn calculate_equity_curve_owned(trades: &[TradeWithDerived]) -> Vec<EquityPoint> {
    let refs: Vec<&TradeWithDerived> = trades.iter().collect();
    calculate_equity_curve(&refs)
}

/// Calculate max drawdown from equity curve
pub fn calculate_max_drawdown(equity_curve: &[EquityPoint]) -> f64 {
    equity_curve
        .iter()
        .map(|p| p.drawdown)
        .fold(0.0, f64::max)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AssetClass, Direction, Status, Trade};
    use chrono::{NaiveDate, Utc};

    fn create_test_trade(net_pnl: f64, result: TradeResult, date: NaiveDate) -> TradeWithDerived {
        let trade = Trade {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: "user1".to_string(),
            account_id: "account1".to_string(),
            instrument_id: "inst1".to_string(),
            symbol: "AAPL".to_string(),
            asset_class: AssetClass::Stock,
            trade_number: None,
            trade_date: date,
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(if net_pnl >= 0.0 { 101.0 } else { 99.0 }),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: 0.0,
            strategy: None,
            notes: None,
            status: Status::Closed,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        TradeWithDerived {
            trade,
            gross_pnl: Some(net_pnl),
            net_pnl: Some(net_pnl),
            pnl_per_share: None,
            risk_per_share: None,
            r_multiple: None,
            result: Some(result),
        }
    }

    #[test]
    fn test_win_rate_calculation() {
        let trades = vec![
            create_test_trade(100.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(50.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
            create_test_trade(-75.0, TradeResult::Loss, NaiveDate::from_ymd_opt(2024, 1, 3).unwrap()),
            create_test_trade(0.0, TradeResult::Breakeven, NaiveDate::from_ymd_opt(2024, 1, 4).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);

        // Win rate should be 2/3 (excluding breakeven)
        assert!(metrics.win_rate.is_some());
        assert!((metrics.win_rate.unwrap() - (2.0 / 3.0)).abs() < 0.01);
    }

    #[test]
    fn test_profit_factor() {
        let trades = vec![
            create_test_trade(200.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(-100.0, TradeResult::Loss, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);

        // Profit factor should be 200/100 = 2.0
        assert!(metrics.profit_factor.is_some());
        assert!((metrics.profit_factor.unwrap() - 2.0).abs() < 0.01);
    }

    #[test]
    fn test_profit_factor_no_losses() {
        let trades = vec![
            create_test_trade(100.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(50.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);

        // Profit factor should be infinity when no losses
        assert!(metrics.profit_factor.is_some());
        assert!(metrics.profit_factor.unwrap().is_infinite());
    }

    #[test]
    fn test_max_drawdown() {
        let trades = vec![
            create_test_trade(100.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(-150.0, TradeResult::Loss, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
            create_test_trade(50.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 3).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);

        // Peak was 100, then went to -50, then 0
        // Max drawdown is 100 - (-50) = 150
        assert!((metrics.max_drawdown - 150.0).abs() < 0.01);
    }

    #[test]
    fn test_win_streak() {
        let trades = vec![
            create_test_trade(100.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(50.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
            create_test_trade(75.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 3).unwrap()),
            create_test_trade(-100.0, TradeResult::Loss, NaiveDate::from_ymd_opt(2024, 1, 4).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);
        assert_eq!(metrics.max_win_streak, 3);
    }

    #[test]
    fn test_expectancy() {
        let trades = vec![
            create_test_trade(200.0, TradeResult::Win, NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            create_test_trade(-100.0, TradeResult::Loss, NaiveDate::from_ymd_opt(2024, 1, 2).unwrap()),
        ];

        let metrics = calculate_period_metrics(&trades);

        // win_rate = 0.5, avg_win = 200, avg_loss = -100
        // expectancy = (0.5 * 200) + (0.5 * -100) = 100 - 50 = 50
        assert!(metrics.expectancy.is_some());
        assert!((metrics.expectancy.unwrap() - 50.0).abs() < 0.01);
    }
}
