//! Tests for metrics commands

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use crate::models::{CreateTradeInput, Direction, Status};
    use crate::services::{MetricsService, TradeService};
    use crate::test_utils::{create_test_db, setup_test_user_and_account};

    /// Helper to parse date strings (same logic as commands)
    fn parse_date(date_str: &str) -> Result<NaiveDate, String> {
        NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
            .map_err(|e| format!("Invalid date: {}", e))
    }

    /// Create a winning trade helper
    fn create_winning_trade(account_id: &str, date: NaiveDate, pnl: f64) -> CreateTradeInput {
        CreateTradeInput {
            account_id: account_id.to_string(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: date,
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(100.0 + pnl / 100.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        }
    }

    /// Create a losing trade helper
    fn create_losing_trade(account_id: &str, date: NaiveDate, loss: f64) -> CreateTradeInput {
        CreateTradeInput {
            account_id: account_id.to_string(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: date,
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(100.0 - loss.abs() / 100.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        }
    }

    // ==================== DATE PARSING ====================

    #[tokio::test]
    async fn test_date_parsing_valid() {
        let result = parse_date("2024-01-15");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), NaiveDate::from_ymd_opt(2024, 1, 15).unwrap());
    }

    #[tokio::test]
    async fn test_date_parsing_invalid() {
        let result = parse_date("invalid");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid date"));
    }

    #[tokio::test]
    async fn test_date_parsing_wrong_format() {
        let result = parse_date("01-15-2024");
        assert!(result.is_err());
    }

    // ==================== GET DAILY PERFORMANCE ====================

    #[tokio::test]
    async fn test_get_daily_performance_empty() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let result = MetricsService::get_daily_performance(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn test_get_daily_performance_single_day() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let input = create_winning_trade(&account_id, date, 500.0);
        TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let result = MetricsService::get_daily_performance(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].date, date);
        assert_eq!(result[0].realized_net_pnl, 500.0);
        assert_eq!(result[0].trade_count, 1);
    }

    #[tokio::test]
    async fn test_get_daily_performance_multiple_days() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades on different days
        for day in [10, 15, 20] {
            let date = NaiveDate::from_ymd_opt(2024, 1, day).unwrap();
            let input = create_winning_trade(&account_id, date, 100.0 * day as f64);
            TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        }

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let result = MetricsService::get_daily_performance(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert_eq!(result.len(), 3);
    }

    #[tokio::test]
    async fn test_get_daily_performance_with_account_filter() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create second account
        sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
            .bind("account2")
            .bind(&user_id)
            .bind("Account 2")
            .bind("USD")
            .execute(&pool)
            .await
            .unwrap();

        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();

        // Trade in first account
        let input1 = create_winning_trade(&account_id, date, 500.0);
        TradeService::create_trade(&pool, &user_id, input1).await.unwrap();

        // Trade in second account
        let input2 = create_winning_trade("account2", date, 300.0);
        TradeService::create_trade(&pool, &user_id, input2).await.unwrap();

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        // Filter by first account
        let result = MetricsService::get_daily_performance(
            &pool,
            &user_id,
            Some(&account_id),
            start,
            end,
        )
        .await
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].realized_net_pnl, 500.0);
    }

    // ==================== GET PERIOD METRICS ====================

    #[tokio::test]
    async fn test_get_period_metrics_empty() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let result = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert_eq!(result.trade_count, 0);
        assert_eq!(result.total_net_pnl, 0.0);
    }

    #[tokio::test]
    async fn test_get_period_metrics_with_trades() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create winning and losing trades
        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let win = create_winning_trade(&account_id, date, 500.0);
        let loss = create_losing_trade(&account_id, date, 200.0);

        TradeService::create_trade(&pool, &user_id, win).await.unwrap();
        TradeService::create_trade(&pool, &user_id, loss).await.unwrap();

        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();

        let result = MetricsService::get_period_metrics(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert_eq!(result.trade_count, 2);
        assert_eq!(result.win_count, 1);
        assert_eq!(result.loss_count, 1);
    }

    // ==================== GET ALL TIME METRICS ====================

    #[tokio::test]
    async fn test_get_all_time_metrics_empty() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let result = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .unwrap();

        assert_eq!(result.trade_count, 0);
    }

    #[tokio::test]
    async fn test_get_all_time_metrics_with_trades() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades across different dates
        for month in 1..=3 {
            let date = NaiveDate::from_ymd_opt(2024, month, 15).unwrap();
            let input = create_winning_trade(&account_id, date, 100.0);
            TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        }

        let result = MetricsService::get_all_time_metrics(&pool, &user_id, None)
            .await
            .unwrap();

        assert_eq!(result.trade_count, 3);
    }

    // ==================== GET EQUITY CURVE ====================

    #[tokio::test]
    async fn test_get_equity_curve_empty() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let result = MetricsService::get_equity_curve(&pool, &user_id, None)
            .await
            .unwrap();

        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn test_get_equity_curve_with_trades() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades on consecutive days
        for day in [10, 11, 12] {
            let date = NaiveDate::from_ymd_opt(2024, 1, day).unwrap();
            let input = create_winning_trade(&account_id, date, 100.0);
            TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        }

        let result = MetricsService::get_equity_curve(&pool, &user_id, None)
            .await
            .unwrap();

        assert_eq!(result.len(), 3);
        // Equity should accumulate
        assert_eq!(result[0].cumulative_pnl, 100.0);
        assert_eq!(result[1].cumulative_pnl, 200.0);
        assert_eq!(result[2].cumulative_pnl, 300.0);
    }

    #[tokio::test]
    async fn test_get_equity_curve_with_account_filter() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create second account
        sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
            .bind("account2")
            .bind(&user_id)
            .bind("Account 2")
            .bind("USD")
            .execute(&pool)
            .await
            .unwrap();

        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();

        // Trade in first account
        let input1 = create_winning_trade(&account_id, date, 500.0);
        TradeService::create_trade(&pool, &user_id, input1).await.unwrap();

        // Trade in second account
        let input2 = create_winning_trade("account2", date, 300.0);
        TradeService::create_trade(&pool, &user_id, input2).await.unwrap();

        // Get equity curve for first account only
        let result = MetricsService::get_equity_curve(&pool, &user_id, Some(&account_id))
            .await
            .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].cumulative_pnl, 500.0);
    }
}
