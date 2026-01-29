use chrono::NaiveDate;
use sqlx::sqlite::SqlitePool;
use crate::calculations::{calculate_daily_metrics, calculate_equity_curve_owned, calculate_period_metrics};
use crate::models::{DailyPerformance, EquityPoint, PeriodMetrics};
use crate::services::TradeService;

pub struct MetricsService;

impl MetricsService {
    /// Get daily performance for a date range
    pub async fn get_daily_performance(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<DailyPerformance>, String> {
        let trades = TradeService::get_trades(
            pool,
            user_id,
            account_id,
            Some(start_date),
            Some(end_date),
        )
        .await?;

        Ok(calculate_daily_metrics(&trades))
    }

    /// Get period metrics for a date range
    pub async fn get_period_metrics(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<PeriodMetrics, String> {
        let trades = TradeService::get_trades(
            pool,
            user_id,
            account_id,
            Some(start_date),
            Some(end_date),
        )
        .await?;

        Ok(calculate_period_metrics(&trades))
    }

    /// Get all-time period metrics
    pub async fn get_all_time_metrics(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
    ) -> Result<PeriodMetrics, String> {
        let trades = TradeService::get_trades(pool, user_id, account_id, None, None).await?;
        Ok(calculate_period_metrics(&trades))
    }

    /// Get equity curve
    pub async fn get_equity_curve(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
    ) -> Result<Vec<EquityPoint>, String> {
        let mut trades = TradeService::get_trades(pool, user_id, account_id, None, None).await?;

        // Sort by date for correct equity curve
        trades.sort_by_key(|t| t.trade.trade_date);

        Ok(calculate_equity_curve_owned(&trades))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{CreateTradeInput, Direction, Status};
    use crate::services::TradeService;
    use crate::test_utils::{create_test_db, setup_test_user_and_account};

    fn create_trade_input(
        account_id: &str,
        date: NaiveDate,
        entry: f64,
        exit: f64,
        qty: f64,
        fees: f64,
    ) -> CreateTradeInput {
        CreateTradeInput {
            account_id: account_id.to_string(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: date,
            direction: Direction::Long,
            quantity: Some(qty),
            entry_price: entry,
            exit_price: Some(exit),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(fees),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        }
    }

    #[tokio::test]
    async fn test_daily_performance_single_day() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();

        // Create two winning trades on same day
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(&account_id, date, 100.0, 110.0, 100.0, 0.0), // +1000
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(&account_id, date, 100.0, 105.0, 100.0, 0.0), // +500
        )
        .await
        .unwrap();

        let daily = MetricsService::get_daily_performance(&pool, &user_id, None, date, date)
            .await
            .expect("Failed to get daily performance");

        assert_eq!(daily.len(), 1);
        assert_eq!(daily[0].date, date);
        assert!((daily[0].realized_net_pnl - 1500.0).abs() < 0.01);
        assert_eq!(daily[0].trade_count, 2);
        assert_eq!(daily[0].win_count, 2);
        assert_eq!(daily[0].loss_count, 0);
    }

    #[tokio::test]
    async fn test_daily_performance_multiple_days() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let day1 = NaiveDate::from_ymd_opt(2024, 1, 10).unwrap();
        let day2 = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let day3 = NaiveDate::from_ymd_opt(2024, 1, 20).unwrap();

        // Day 1: winning trade
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(&account_id, day1, 100.0, 110.0, 100.0, 0.0),
        )
        .await
        .unwrap();

        // Day 2: losing trade
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(&account_id, day2, 100.0, 90.0, 100.0, 0.0),
        )
        .await
        .unwrap();

        // Day 3: winning trade
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(&account_id, day3, 100.0, 105.0, 100.0, 0.0),
        )
        .await
        .unwrap();

        let daily = MetricsService::get_daily_performance(&pool, &user_id, None, day1, day3)
            .await
            .expect("Failed to get daily performance");

        assert_eq!(daily.len(), 3);
        // Results should be sorted by date
        assert_eq!(daily[0].date, day1);
        assert_eq!(daily[1].date, day2);
        assert_eq!(daily[2].date, day3);
    }

    #[tokio::test]
    async fn test_period_metrics_win_rate() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        // Create 3 wins and 1 loss
        for i in 1..=3 {
            TradeService::create_trade(
                &pool,
                &user_id,
                create_trade_input(
                    &account_id,
                    NaiveDate::from_ymd_opt(2024, 1, i).unwrap(),
                    100.0,
                    110.0,
                    100.0,
                    0.0,
                ),
            )
            .await
            .unwrap();
        }

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 4).unwrap(),
                100.0,
                90.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        let metrics = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .expect("Failed to get metrics");

        assert_eq!(metrics.win_count, 3);
        assert_eq!(metrics.loss_count, 1);
        assert!(metrics.win_rate.is_some());
        assert!((metrics.win_rate.unwrap() - 0.75).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_period_metrics_profit_factor() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        // Win: +2000
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                100.0,
                120.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        // Loss: -1000
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                100.0,
                90.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        let metrics = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .expect("Failed to get metrics");

        // Profit factor = 2000 / 1000 = 2.0
        assert!(metrics.profit_factor.is_some());
        assert!((metrics.profit_factor.unwrap() - 2.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_period_metrics_expectancy() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        // 2 wins of +100 each
        for i in 1..=2 {
            TradeService::create_trade(
                &pool,
                &user_id,
                create_trade_input(
                    &account_id,
                    NaiveDate::from_ymd_opt(2024, 1, i).unwrap(),
                    100.0,
                    101.0,
                    100.0,
                    0.0,
                ),
            )
            .await
            .unwrap();
        }

        // 2 losses of -50 each
        for i in 3..=4 {
            TradeService::create_trade(
                &pool,
                &user_id,
                create_trade_input(
                    &account_id,
                    NaiveDate::from_ymd_opt(2024, 1, i).unwrap(),
                    100.0,
                    99.5,
                    100.0,
                    0.0,
                ),
            )
            .await
            .unwrap();
        }

        let metrics = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .expect("Failed to get metrics");

        // win_rate = 0.5, avg_win = 100, avg_loss = -50
        // expectancy = (0.5 * 100) + (0.5 * -50) = 50 - 25 = 25
        assert!(metrics.expectancy.is_some());
        assert!((metrics.expectancy.unwrap() - 25.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_all_time_metrics() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades across different months
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
                100.0,
                110.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 6, 15).unwrap(),
                100.0,
                105.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        let metrics = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .expect("Failed to get metrics");

        assert_eq!(metrics.trade_count, 2);
        // +1000 + +500 = +1500
        assert!((metrics.total_net_pnl - 1500.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_equity_curve() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades in order: +1000, -500, +200
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                100.0,
                110.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                100.0,
                95.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(),
                100.0,
                102.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        let curve = MetricsService::get_equity_curve(&pool, &user_id, None)
            .await
            .expect("Failed to get equity curve");

        assert_eq!(curve.len(), 3);

        // Point 1: cumulative = 1000, peak = 1000, drawdown = 0
        assert!((curve[0].cumulative_pnl - 1000.0).abs() < 0.01);
        assert!((curve[0].drawdown - 0.0).abs() < 0.01);

        // Point 2: cumulative = 500, peak = 1000, drawdown = 500
        assert!((curve[1].cumulative_pnl - 500.0).abs() < 0.01);
        assert!((curve[1].drawdown - 500.0).abs() < 0.01);

        // Point 3: cumulative = 700, peak = 1000, drawdown = 300
        assert!((curve[2].cumulative_pnl - 700.0).abs() < 0.01);
        assert!((curve[2].drawdown - 300.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_max_drawdown() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades: +1000, -800, -500 (cumulative: 1000, 200, -300)
        // Peak stays at 1000
        // Drawdowns: 0, 800, 1300
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                100.0,
                110.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                100.0,
                92.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(),
                100.0,
                95.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        let metrics = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .expect("Failed to get metrics");

        assert!((metrics.max_drawdown - 1300.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_metrics_excludes_open_trades() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create closed trade
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                100.0,
                110.0,
                100.0,
                0.0,
            ),
        )
        .await
        .unwrap();

        // Create open trade (should be excluded)
        let open_input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: Some(Status::Open),
            exits: None,
        };
        TradeService::create_trade(&pool, &user_id, open_input)
            .await
            .unwrap();

        let metrics = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .expect("Failed to get metrics");

        // Should only count the closed trade
        assert_eq!(metrics.trade_count, 1);
        assert!((metrics.total_net_pnl - 1000.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_empty_metrics() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let metrics = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .expect("Failed to get metrics");

        assert_eq!(metrics.trade_count, 0);
        assert_eq!(metrics.total_net_pnl, 0.0);
        assert!(metrics.win_rate.is_none());
        assert!(metrics.profit_factor.is_none());
        assert!(metrics.expectancy.is_none());
    }

    #[tokio::test]
    async fn test_metrics_with_fees() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trade with fees: gross = +1000, fees = 50, net = 950
        TradeService::create_trade(
            &pool,
            &user_id,
            create_trade_input(
                &account_id,
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                100.0,
                110.0,
                100.0,
                50.0,
            ),
        )
        .await
        .unwrap();

        let metrics = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .expect("Failed to get metrics");

        assert!((metrics.total_net_pnl - 950.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_win_loss_streaks() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create: W, W, W, L, L (max win streak = 3, max loss streak = 2)
        let trades_data = [(1, true), (2, true), (3, true), (4, false), (5, false)];
        for (day, is_win) in trades_data.iter() {
            let exit = if *is_win { 110.0 } else { 90.0 };
            TradeService::create_trade(
                &pool,
                &user_id,
                create_trade_input(
                    &account_id,
                    NaiveDate::from_ymd_opt(2024, 1, *day).unwrap(),
                    100.0,
                    exit,
                    100.0,
                    0.0,
                ),
            )
            .await
            .unwrap();
        }

        let metrics = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .expect("Failed to get metrics");

        assert_eq!(metrics.max_win_streak, 3);
        assert_eq!(metrics.max_loss_streak, 2);
    }
}
