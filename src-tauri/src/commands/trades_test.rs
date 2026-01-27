//! Tests for trade commands

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use crate::models::{CreateTradeInput, Direction, Status, UpdateTradeInput};
    use crate::services::TradeService;
    use crate::test_utils::{create_test_db, setup_test_user_and_account, create_test_trade_input};

    /// Helper to simulate the date parsing logic from commands
    fn parse_date(date_str: Option<String>) -> Option<NaiveDate> {
        date_str.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
    }

    // ==================== GET TRADES ====================

    #[tokio::test]
    async fn test_get_trades_no_filters() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create some trades
        let input = create_test_trade_input(&account_id, "AAPL");
        TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        let trades = TradeService::get_all_trades(&pool, &user_id, None, None, None)
            .await
            .unwrap();

        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].trade.symbol, "AAPL");
    }

    #[tokio::test]
    async fn test_get_trades_with_account_filter() {
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

        // Create trades in both accounts
        let input1 = create_test_trade_input(&account_id, "AAPL");
        TradeService::create_trade(&pool, &user_id, input1).await.unwrap();

        let mut input2 = create_test_trade_input("account2", "MSFT");
        input2.trade_number = Some(2);
        TradeService::create_trade(&pool, &user_id, input2).await.unwrap();

        // Filter by first account
        let trades = TradeService::get_all_trades(&pool, &user_id, Some(&account_id), None, None)
            .await
            .unwrap();

        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].trade.account_id, account_id);
    }

    #[tokio::test]
    async fn test_get_trades_with_date_filters() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trades on different dates
        for (i, day) in [5, 10, 15, 20, 25].iter().enumerate() {
            let mut input = create_test_trade_input(&account_id, "AAPL");
            input.trade_date = NaiveDate::from_ymd_opt(2024, 1, *day).unwrap();
            input.trade_number = Some(i as i32 + 1);
            TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        }

        // Test date parsing
        let start = parse_date(Some("2024-01-10".to_string()));
        let end = parse_date(Some("2024-01-20".to_string()));

        assert_eq!(start, Some(NaiveDate::from_ymd_opt(2024, 1, 10).unwrap()));
        assert_eq!(end, Some(NaiveDate::from_ymd_opt(2024, 1, 20).unwrap()));

        // Filter by date range
        let trades = TradeService::get_all_trades(&pool, &user_id, None, start, end)
            .await
            .unwrap();

        assert_eq!(trades.len(), 3); // Days 10, 15, 20
    }

    #[tokio::test]
    async fn test_get_trades_invalid_date_parsing() {
        // Invalid dates should silently return None (not filter)
        let invalid = parse_date(Some("not-a-date".to_string()));
        assert!(invalid.is_none());

        let invalid_format = parse_date(Some("01-15-2024".to_string())); // Wrong format
        assert!(invalid_format.is_none());

        let empty = parse_date(None);
        assert!(empty.is_none());
    }

    #[tokio::test]
    async fn test_get_trades_empty_result() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let trades = TradeService::get_all_trades(&pool, &user_id, None, None, None)
            .await
            .unwrap();

        assert!(trades.is_empty());
    }

    // ==================== GET TRADE ====================

    #[tokio::test]
    async fn test_get_trade_exists() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        let fetched = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .unwrap();

        assert!(fetched.is_some());
        let trade = fetched.unwrap();
        assert_eq!(trade.trade.id, created.trade.id);
        assert_eq!(trade.trade.symbol, "AAPL");
    }

    #[tokio::test]
    async fn test_get_trade_not_found() {
        let pool = create_test_db().await;
        let (_user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let result = TradeService::get_trade(&pool, "nonexistent-id")
            .await
            .unwrap();

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_trade_returns_derived_fields() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create a winning long trade
        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            trade_number: Some(1),
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(110.0), // +10 per share
            stop_loss_price: Some(95.0), // Risk of 5 per share
            entry_time: None,
            exit_time: None,
            fees: Some(10.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        let fetched = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .unwrap()
            .unwrap();

        // Verify derived fields (directly on TradeWithDerived)
        assert_eq!(fetched.gross_pnl, Some(1000.0)); // 100 * 10
        assert_eq!(fetched.net_pnl, Some(990.0)); // 1000 - 10 fees
        assert_eq!(fetched.pnl_per_share, Some(10.0));
        assert_eq!(fetched.risk_per_share, Some(5.0));
        assert_eq!(fetched.r_multiple, Some(2.0)); // 10 / 5
    }

    // ==================== CREATE TRADE ====================

    #[tokio::test]
    async fn test_create_trade_success() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let result = TradeService::create_trade(&pool, &user_id, input).await;

        assert!(result.is_ok());
        let created = result.unwrap();
        assert_eq!(created.trade.symbol, "AAPL");
        assert_eq!(created.trade.direction, Direction::Long);
    }

    #[tokio::test]
    async fn test_create_trade_validation_error() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Invalid: entry_price is 0
        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 0.0, // Invalid
            exit_price: Some(110.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Entry price must be greater than 0"));
    }

    #[tokio::test]
    async fn test_create_trade_negative_fees_error() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(110.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(-5.0), // Invalid
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Fees cannot be negative"));
    }

    #[tokio::test]
    async fn test_create_trade_negative_quantity_error() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(-100.0), // Invalid
            entry_price: 100.0,
            exit_price: Some(110.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Quantity must be greater than 0"));
    }

    #[tokio::test]
    async fn test_create_trade_creates_instrument() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create trade with new symbol
        let input = create_test_trade_input(&account_id, "NEWSTOCK");
        TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        // Verify instrument was created (case-insensitive)
        let input2 = create_test_trade_input(&account_id, "newstock");
        let result = TradeService::create_trade(&pool, &user_id, input2).await;
        assert!(result.is_ok());
    }

    // ==================== UPDATE TRADE ====================

    #[tokio::test]
    async fn test_update_trade_success() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: Some(200.0),
            entry_price: None,
            exit_price: Some(160.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: Some("swing".to_string()),
            notes: None,
            status: None,
        };

        let updated = TradeService::update_trade(&pool, &created.trade.id, update)
            .await
            .unwrap();

        assert_eq!(updated.trade.quantity, Some(200.0));
        assert_eq!(updated.trade.exit_price, Some(160.0));
        assert_eq!(updated.trade.strategy, Some("swing".to_string()));
    }

    #[tokio::test]
    async fn test_update_trade_not_found() {
        let pool = create_test_db().await;
        let (_user_id, _account_id) = setup_test_user_and_account(&pool).await;

        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: Some(200.0),
            entry_price: None,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
        };

        let result = TradeService::update_trade(&pool, "nonexistent-id", update).await;
        assert!(result.is_err());
        // Error message is "Failed to update trade: ..." wrapping the underlying error
        assert!(result.unwrap_err().contains("Failed to update trade"));
    }

    #[tokio::test]
    async fn test_update_trade_allows_zero_entry_price() {
        // Note: Unlike create_trade, update_trade does not validate input
        // This test documents the current behavior
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        // Update with zero entry price - currently allowed (no validation on update)
        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: Some(0.0),
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
        };

        // This succeeds because update_trade doesn't validate
        let result = TradeService::update_trade(&pool, &created.trade.id, update).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().trade.entry_price, 0.0);
    }

    #[tokio::test]
    async fn test_update_trade_change_symbol() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        let update = UpdateTradeInput {
            account_id: None,
            symbol: Some("GOOGL".to_string()),
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: None,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
        };

        let updated = TradeService::update_trade(&pool, &created.trade.id, update)
            .await
            .unwrap();

        assert_eq!(updated.trade.symbol, "GOOGL");
    }

    #[tokio::test]
    async fn test_update_trade_recalculates_derived() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create a trade
        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            trade_number: Some(1),
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(110.0),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(10.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        assert_eq!(created.net_pnl, Some(990.0)); // (110-100)*100 - 10

        // Update exit price
        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: None,
            exit_price: Some(120.0), // Now +20 per share
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
        };

        let updated = TradeService::update_trade(&pool, &created.trade.id, update)
            .await
            .unwrap();

        assert_eq!(updated.gross_pnl, Some(2000.0)); // (120-100)*100
        assert_eq!(updated.net_pnl, Some(1990.0)); // 2000 - 10 fees
    }

    // ==================== DELETE TRADE ====================

    #[tokio::test]
    async fn test_delete_trade_success() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();

        // Delete trade
        let result = TradeService::delete_trade(&pool, &created.trade.id).await;
        assert!(result.is_ok());

        // Verify deleted
        let fetched = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .unwrap();
        assert!(fetched.is_none());
    }

    #[tokio::test]
    async fn test_delete_trade_not_found() {
        let pool = create_test_db().await;
        let (_user_id, _account_id) = setup_test_user_and_account(&pool).await;

        // Deleting nonexistent trade should succeed (no error)
        let result = TradeService::delete_trade(&pool, "nonexistent-id").await;
        assert!(result.is_ok());
    }

    // ==================== DATE PARSING EDGE CASES ====================

    #[tokio::test]
    async fn test_date_parsing_valid_formats() {
        // Standard format
        let valid = parse_date(Some("2024-01-15".to_string()));
        assert_eq!(valid, Some(NaiveDate::from_ymd_opt(2024, 1, 15).unwrap()));

        // End of month
        let end_month = parse_date(Some("2024-01-31".to_string()));
        assert_eq!(end_month, Some(NaiveDate::from_ymd_opt(2024, 1, 31).unwrap()));

        // Leap year
        let leap = parse_date(Some("2024-02-29".to_string()));
        assert_eq!(leap, Some(NaiveDate::from_ymd_opt(2024, 2, 29).unwrap()));
    }

    #[tokio::test]
    async fn test_date_parsing_invalid_formats() {
        // Invalid date (Feb 30)
        let invalid = parse_date(Some("2024-02-30".to_string()));
        assert!(invalid.is_none());

        // Wrong format (MM-DD-YYYY)
        let wrong_format = parse_date(Some("01-15-2024".to_string()));
        assert!(wrong_format.is_none());

        // Empty string
        let empty = parse_date(Some("".to_string()));
        assert!(empty.is_none());

        // Random text
        let text = parse_date(Some("hello".to_string()));
        assert!(text.is_none());
    }

    // ==================== INTEGRATION: FULL WORKFLOW ====================

    #[tokio::test]
    async fn test_full_trade_lifecycle() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // 1. Create trade
        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input).await.unwrap();
        assert_eq!(created.trade.symbol, "AAPL");

        // 2. Get trade
        let fetched = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(fetched.trade.id, created.trade.id);

        // 3. Update trade
        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: None,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: Some("updated strategy".to_string()),
            notes: None,
            status: None,
        };
        let updated = TradeService::update_trade(&pool, &created.trade.id, update)
            .await
            .unwrap();
        assert_eq!(updated.trade.strategy, Some("updated strategy".to_string()));

        // 4. List trades (should show 1)
        let trades = TradeService::get_all_trades(&pool, &user_id, None, None, None)
            .await
            .unwrap();
        assert_eq!(trades.len(), 1);

        // 5. Delete trade
        TradeService::delete_trade(&pool, &created.trade.id).await.unwrap();

        // 6. Verify deleted
        let fetched_after = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .unwrap();
        assert!(fetched_after.is_none());

        // 7. List should be empty
        let trades_after = TradeService::get_all_trades(&pool, &user_id, None, None, None)
            .await
            .unwrap();
        assert!(trades_after.is_empty());
    }
}
