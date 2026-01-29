use chrono::NaiveDate;
use sqlx::sqlite::SqlitePool;
use crate::calculations::calculate_derived_fields;
use crate::models::{CreateTradeInput, ExitExecution, Status, Trade, TradeWithDerived, UpdateTradeInput};
use crate::repository::{InstrumentRepository, TradeRepository};

pub struct TradeService;

impl TradeService {
    /// Create a new trade
    pub async fn create_trade(
        pool: &SqlitePool,
        user_id: &str,
        input: CreateTradeInput,
    ) -> Result<TradeWithDerived, String> {
        // Validate input (including exits)
        Self::validate_input(&input)?;

        // Process exits if provided
        let (aggregated_exit_price, aggregated_exit_time, aggregated_fees, computed_status) =
            Self::process_exits(&input)?;

        // Build modified input with aggregated values
        let mut processed_input = input.clone();
        if let Some(exit_price) = aggregated_exit_price {
            processed_input.exit_price = Some(exit_price);
        }
        if let Some(exit_time) = aggregated_exit_time {
            processed_input.exit_time = Some(exit_time);
        }
        if let Some(exit_fees) = aggregated_fees {
            // Add exit fees to existing fees
            let base_fees = processed_input.fees.unwrap_or(0.0);
            processed_input.fees = Some(base_fees + exit_fees);
        }
        if let Some(status) = computed_status {
            processed_input.status = Some(status);
        }

        // Get or create instrument with asset class
        let instrument = InstrumentRepository::get_or_create_with_asset_class(
            pool,
            &processed_input.symbol,
            processed_input.asset_class,
        )
        .await
        .map_err(|e| format!("Failed to get/create instrument: {}", e))?;

        // Insert trade
        let trade = TradeRepository::insert(pool, user_id, &instrument.id, &processed_input)
            .await
            .map_err(|e| format!("Failed to create trade: {}", e))?;

        // Insert exit executions if provided
        if let Some(ref exits) = input.exits {
            for exit in exits {
                Self::insert_exit_execution(pool, &trade.id, exit)
                    .await
                    .map_err(|e| format!("Failed to insert exit execution: {}", e))?;
            }
        }

        // Calculate derived fields
        Ok(Self::with_derived_fields(trade))
    }

    /// Process exits to calculate aggregated values
    fn process_exits(input: &CreateTradeInput) -> Result<(Option<f64>, Option<String>, Option<f64>, Option<Status>), String> {
        let exits = match &input.exits {
            Some(exits) if !exits.is_empty() => exits,
            _ => return Ok((None, None, None, None)),
        };

        let entry_qty = input.quantity.unwrap_or(0.0);
        let total_exit_qty: f64 = exits.iter().map(|e| e.quantity).sum();

        // Validate exit quantity doesn't exceed entry quantity
        if entry_qty > 0.0 && total_exit_qty > entry_qty {
            return Err(format!(
                "Total exit quantity ({}) cannot exceed entry quantity ({})",
                total_exit_qty, entry_qty
            ));
        }

        // Calculate weighted average exit price
        let weighted_sum: f64 = exits.iter().map(|e| e.price * e.quantity).sum();
        let avg_exit_price = if total_exit_qty > 0.0 {
            weighted_sum / total_exit_qty
        } else {
            0.0
        };

        // Get latest exit time for the trade's exit_time field
        let latest_exit_time = exits.iter()
            .filter_map(|e| e.exit_time.as_ref())
            .max()
            .cloned();

        // Sum all exit fees
        let total_exit_fees: f64 = exits.iter()
            .filter_map(|e| e.fees)
            .sum();

        // Determine status: closed if fully exited, open otherwise
        let status = if entry_qty > 0.0 && (total_exit_qty - entry_qty).abs() < 0.0001 {
            Some(Status::Closed)
        } else if total_exit_qty > 0.0 && total_exit_qty < entry_qty {
            Some(Status::Open)
        } else {
            None
        };

        Ok((
            Some(avg_exit_price),
            latest_exit_time,
            if total_exit_fees > 0.0 { Some(total_exit_fees) } else { None },
            status,
        ))
    }

    /// Insert an exit execution into the database
    async fn insert_exit_execution(
        pool: &SqlitePool,
        trade_id: &str,
        exit: &ExitExecution,
    ) -> Result<(), sqlx::Error> {
        let id = uuid::Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO trade_executions (
                id, trade_id, execution_type, execution_date, execution_time,
                quantity, price, fees
            ) VALUES (?, ?, 'exit', ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(trade_id)
        .bind(exit.exit_date)
        .bind(&exit.exit_time)
        .bind(exit.quantity)
        .bind(exit.price)
        .bind(exit.fees.unwrap_or(0.0))
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Get a trade by ID with derived fields
    pub async fn get_trade(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<Option<TradeWithDerived>, String> {
        let trade = TradeRepository::get_by_id(pool, id)
            .await
            .map_err(|e| format!("Failed to get trade: {}", e))?;

        Ok(trade.map(Self::with_derived_fields))
    }

    /// Get trades with optional filters
    pub async fn get_trades(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<TradeWithDerived>, String> {
        // Only get closed trades for metrics
        let trades = TradeRepository::get_trades(
            pool,
            user_id,
            account_id,
            start_date,
            end_date,
            Some(Status::Closed),
        )
        .await
        .map_err(|e| format!("Failed to get trades: {}", e))?;

        Ok(trades.into_iter().map(Self::with_derived_fields).collect())
    }

    /// Get all trades including open ones
    pub async fn get_all_trades(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<TradeWithDerived>, String> {
        let trades = TradeRepository::get_trades(
            pool,
            user_id,
            account_id,
            start_date,
            end_date,
            None,
        )
        .await
        .map_err(|e| format!("Failed to get trades: {}", e))?;

        Ok(trades.into_iter().map(Self::with_derived_fields).collect())
    }

    /// Update a trade
    pub async fn update_trade(
        pool: &SqlitePool,
        id: &str,
        input: UpdateTradeInput,
    ) -> Result<TradeWithDerived, String> {
        // Get new instrument ID if symbol changed
        let instrument_id = if let Some(ref symbol) = input.symbol {
            let instrument = InstrumentRepository::get_or_create(pool, symbol)
                .await
                .map_err(|e| format!("Failed to get/create instrument: {}", e))?;
            Some(instrument.id)
        } else {
            None
        };

        let trade = TradeRepository::update(pool, id, instrument_id.as_deref(), &input)
            .await
            .map_err(|e| format!("Failed to update trade: {}", e))?;

        Ok(Self::with_derived_fields(trade))
    }

    /// Delete a trade
    pub async fn delete_trade(pool: &SqlitePool, id: &str) -> Result<(), String> {
        TradeRepository::delete(pool, id)
            .await
            .map_err(|e| format!("Failed to delete trade: {}", e))
    }

    /// Add derived fields to a trade
    fn with_derived_fields(trade: Trade) -> TradeWithDerived {
        let derived = calculate_derived_fields(&trade);
        TradeWithDerived::from_trade(trade, derived)
    }

    /// Validate trade input
    fn validate_input(input: &CreateTradeInput) -> Result<(), String> {
        if input.entry_price <= 0.0 {
            return Err("Entry price must be greater than 0".to_string());
        }

        if let Some(qty) = input.quantity {
            if qty <= 0.0 {
                return Err("Quantity must be greater than 0".to_string());
            }
        }

        if let Some(exit) = input.exit_price {
            if exit <= 0.0 {
                return Err("Exit price must be greater than 0".to_string());
            }
        }

        if let Some(sl) = input.stop_loss_price {
            if sl <= 0.0 {
                return Err("Stop loss price must be greater than 0".to_string());
            }
        }

        if let Some(fees) = input.fees {
            if fees < 0.0 {
                return Err("Fees cannot be negative".to_string());
            }
        }

        // Validate exits if provided
        if let Some(ref exits) = input.exits {
            for (i, exit) in exits.iter().enumerate() {
                if exit.quantity <= 0.0 {
                    return Err(format!("Exit {} quantity must be greater than 0", i + 1));
                }
                if exit.price <= 0.0 {
                    return Err(format!("Exit {} price must be greater than 0", i + 1));
                }
                if let Some(fees) = exit.fees {
                    if fees < 0.0 {
                        return Err(format!("Exit {} fees cannot be negative", i + 1));
                    }
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Direction;

    fn valid_input() -> CreateTradeInput {
        CreateTradeInput {
            account_id: "acc1".to_string(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: Some(1),
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 150.0,
            exit_price: Some(155.0),
            stop_loss_price: Some(145.0),
            entry_time: None,
            exit_time: None,
            fees: Some(10.0),
            strategy: Some("momentum".to_string()),
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        }
    }

    #[test]
    fn test_validate_input_valid() {
        let input = valid_input();
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_zero_entry_price() {
        let mut input = valid_input();
        input.entry_price = 0.0;
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Entry price must be greater than 0");
    }

    #[test]
    fn test_validate_input_negative_entry_price() {
        let mut input = valid_input();
        input.entry_price = -10.0;
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Entry price must be greater than 0");
    }

    #[test]
    fn test_validate_input_zero_quantity() {
        let mut input = valid_input();
        input.quantity = Some(0.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Quantity must be greater than 0");
    }

    #[test]
    fn test_validate_input_negative_quantity() {
        let mut input = valid_input();
        input.quantity = Some(-50.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Quantity must be greater than 0");
    }

    #[test]
    fn test_validate_input_none_quantity_ok() {
        let mut input = valid_input();
        input.quantity = None;
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_zero_exit_price() {
        let mut input = valid_input();
        input.exit_price = Some(0.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Exit price must be greater than 0");
    }

    #[test]
    fn test_validate_input_negative_exit_price() {
        let mut input = valid_input();
        input.exit_price = Some(-100.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Exit price must be greater than 0");
    }

    #[test]
    fn test_validate_input_none_exit_price_ok() {
        let mut input = valid_input();
        input.exit_price = None;
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_zero_stop_loss() {
        let mut input = valid_input();
        input.stop_loss_price = Some(0.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Stop loss price must be greater than 0");
    }

    #[test]
    fn test_validate_input_negative_stop_loss() {
        let mut input = valid_input();
        input.stop_loss_price = Some(-5.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Stop loss price must be greater than 0");
    }

    #[test]
    fn test_validate_input_none_stop_loss_ok() {
        let mut input = valid_input();
        input.stop_loss_price = None;
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_negative_fees() {
        let mut input = valid_input();
        input.fees = Some(-1.0);
        let result = TradeService::validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Fees cannot be negative");
    }

    #[test]
    fn test_validate_input_zero_fees_ok() {
        let mut input = valid_input();
        input.fees = Some(0.0);
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_none_fees_ok() {
        let mut input = valid_input();
        input.fees = None;
        assert!(TradeService::validate_input(&input).is_ok());
    }

    #[test]
    fn test_validate_input_minimal_valid() {
        let input = CreateTradeInput {
            account_id: "acc1".to_string(),
            symbol: "TSLA".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 6, 1).unwrap(),
            direction: Direction::Short,
            quantity: None,
            entry_price: 200.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
            exits: None,
        };
        assert!(TradeService::validate_input(&input).is_ok());
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::models::{Direction, TradeResult};
    use crate::test_utils::{
        create_test_db, setup_test_user_and_account, create_test_trade_input,
        create_losing_long_trade, create_open_trade,
    };

    #[tokio::test]
    async fn test_create_trade_full_flow() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        assert!(!trade.trade.id.is_empty());
        assert_eq!(trade.trade.symbol, "AAPL");
        assert_eq!(trade.trade.entry_price, 150.0);
        assert_eq!(trade.trade.exit_price, Some(155.0));

        // Verify derived fields are calculated
        // Long: (155 - 150) * 100 = 500 gross
        assert!(trade.gross_pnl.is_some());
        assert!((trade.gross_pnl.unwrap() - 500.0).abs() < 0.01);

        // Net: 500 - 10 = 490
        assert!(trade.net_pnl.is_some());
        assert!((trade.net_pnl.unwrap() - 490.0).abs() < 0.01);

        // Result should be Win
        assert_eq!(trade.result, Some(TradeResult::Win));
    }

    #[tokio::test]
    async fn test_create_trade_with_derived_r_multiple() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "MSFT".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(110.0),  // +10 per share
            stop_loss_price: Some(95.0), // -5 risk per share
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // PnL per share: 110 - 100 = 10
        assert_eq!(trade.pnl_per_share, Some(10.0));

        // Risk per share: |100 - 95| = 5
        assert_eq!(trade.risk_per_share, Some(5.0));

        // R-multiple: 10 / 5 = 2.0
        assert!(trade.r_multiple.is_some());
        assert!((trade.r_multiple.unwrap() - 2.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_create_short_trade_winning() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "TSLA".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Short,
            quantity: Some(50.0),
            entry_price: 200.0,
            exit_price: Some(180.0), // Short wins when price goes down
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Short PnL: (200 - 180) * 50 = 1000
        assert!((trade.gross_pnl.unwrap() - 1000.0).abs() < 0.01);
        assert_eq!(trade.result, Some(TradeResult::Win));
    }

    #[tokio::test]
    async fn test_create_losing_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_losing_long_trade(
            &account_id,
            "NVDA",
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            100.0,  // entry
            90.0,   // exit (loss)
            100.0,  // qty
        );

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Long loss: (90 - 100) * 100 = -1000
        assert!((trade.gross_pnl.unwrap() - (-1000.0)).abs() < 0.01);
        assert_eq!(trade.result, Some(TradeResult::Loss));
    }

    #[tokio::test]
    async fn test_create_breakeven_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "META".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: Some(100.0), // Same as entry
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        assert_eq!(trade.gross_pnl, Some(0.0));
        assert_eq!(trade.net_pnl, Some(0.0));
        assert_eq!(trade.result, Some(TradeResult::Breakeven));
    }

    #[tokio::test]
    async fn test_create_option_trade_with_multiplier() {
        use crate::models::AssetClass;

        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create an option trade: 5 contracts, entry $1.50, exit $2.00
        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL240315C00150000".to_string(),
            asset_class: Some(AssetClass::Option),
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(5.0), // 5 contracts
            entry_price: 1.50,
            exit_price: Some(2.00),
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(8.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
            exits: None,
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create option trade");

        // Option PnL with 100x multiplier:
        // Gross: (2.00 - 1.50) * 5 * 100 = 250
        assert!((trade.gross_pnl.unwrap() - 250.0).abs() < 0.01);
        // Net: 250 - 8 = 242
        assert!((trade.net_pnl.unwrap() - 242.0).abs() < 0.01);
        assert_eq!(trade.result, Some(TradeResult::Win));
        assert_eq!(trade.trade.asset_class, AssetClass::Option);
    }

    #[tokio::test]
    async fn test_get_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let created = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        let fetched = TradeService::get_trade(&pool, &created.trade.id)
            .await
            .expect("Failed to get trade")
            .expect("Trade not found");

        assert_eq!(created.trade.id, fetched.trade.id);
        assert_eq!(fetched.trade.symbol, "AAPL");
        // Derived fields should be calculated
        assert!(fetched.gross_pnl.is_some());
        assert!(fetched.net_pnl.is_some());
    }

    #[tokio::test]
    async fn test_get_trades_excludes_open() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create closed trade
        let closed_input = create_test_trade_input(&account_id, "AAPL");
        TradeService::create_trade(&pool, &user_id, closed_input)
            .await
            .unwrap();

        // Create open trade
        let open_input = create_open_trade(
            &account_id,
            "MSFT",
            NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
            100.0,
            50.0,
        );
        TradeService::create_trade(&pool, &user_id, open_input)
            .await
            .unwrap();

        // get_trades should only return closed trades
        let trades = TradeService::get_trades(&pool, &user_id, None, None, None)
            .await
            .expect("Failed to get trades");

        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].trade.symbol, "AAPL");
    }

    #[tokio::test]
    async fn test_get_all_trades_includes_open() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create closed trade
        let closed_input = create_test_trade_input(&account_id, "AAPL");
        TradeService::create_trade(&pool, &user_id, closed_input)
            .await
            .unwrap();

        // Create open trade
        let open_input = create_open_trade(
            &account_id,
            "MSFT",
            NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
            100.0,
            50.0,
        );
        TradeService::create_trade(&pool, &user_id, open_input)
            .await
            .unwrap();

        // get_all_trades should return both
        let trades = TradeService::get_all_trades(&pool, &user_id, None, None, None)
            .await
            .expect("Failed to get trades");

        assert_eq!(trades.len(), 2);
    }

    #[tokio::test]
    async fn test_update_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        let update = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: None,
            exit_price: Some(160.0), // Changed from 155.0
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: Some("Updated notes".to_string()),
            status: None,
        };

        let updated = TradeService::update_trade(&pool, &trade.trade.id, update)
            .await
            .expect("Failed to update trade");

        assert_eq!(updated.trade.exit_price, Some(160.0));
        assert_eq!(updated.trade.notes, Some("Updated notes".to_string()));

        // Derived fields should be recalculated
        // Long: (160 - 150) * 100 = 1000 gross
        assert!((updated.gross_pnl.unwrap() - 1000.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_update_trade_change_symbol() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

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

        let updated = TradeService::update_trade(&pool, &trade.trade.id, update)
            .await
            .expect("Failed to update trade");

        assert_eq!(updated.trade.symbol, "GOOGL");
    }

    #[tokio::test]
    async fn test_delete_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Delete trade
        TradeService::delete_trade(&pool, &trade.trade.id)
            .await
            .expect("Failed to delete trade");

        // Verify trade is gone
        let result = TradeService::get_trade(&pool, &trade.trade.id)
            .await
            .expect("Query failed");

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_create_trade_validation_error() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let mut input = create_test_trade_input(&account_id, "AAPL");
        input.entry_price = -10.0; // Invalid

        let result = TradeService::create_trade(&pool, &user_id, input).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Entry price must be greater than 0"));
    }

    #[tokio::test]
    async fn test_instrument_created_uppercase() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let mut input = create_test_trade_input(&account_id, "aapl"); // lowercase
        input.symbol = "aapl".to_string();

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        assert_eq!(trade.trade.symbol, "AAPL"); // Should be uppercase
    }

    #[tokio::test]
    async fn test_open_trade_no_pnl() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = create_open_trade(
            &account_id,
            "AAPL",
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            150.0,
            100.0,
        );

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Open trade should have no PnL (no exit price)
        assert!(trade.gross_pnl.is_none());
        assert!(trade.net_pnl.is_none());
        assert!(trade.result.is_none());
    }

    // ==================== PARTIAL EXITS TESTS ====================

    #[tokio::test]
    async fn test_create_trade_with_single_exit() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AAPL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: None, // Will be set by exits
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(5.0), // Entry fees
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![ExitExecution {
                id: None,
                exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                exit_time: Some("10:30".to_string()),
                quantity: 100.0,
                price: 110.0,
                fees: Some(5.0),
            }]),
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Exit price should be the single exit's price
        assert_eq!(trade.trade.exit_price, Some(110.0));
        // Status should be closed (fully exited)
        assert_eq!(trade.trade.status, Status::Closed);
        // Fees should include both entry and exit fees
        assert_eq!(trade.trade.fees, 10.0);
        // Gross PnL: (110 - 100) * 100 = 1000
        assert!((trade.gross_pnl.unwrap() - 1000.0).abs() < 0.01);
        // Net PnL: 1000 - 10 = 990
        assert!((trade.net_pnl.unwrap() - 990.0).abs() < 0.01);
        assert_eq!(trade.result, Some(TradeResult::Win));
    }

    #[tokio::test]
    async fn test_create_trade_with_multiple_exits_weighted_avg() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "MSFT".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(0.0),
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![
                ExitExecution {
                    id: None,
                    exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                    exit_time: None,
                    quantity: 60.0,  // 60 shares at $110
                    price: 110.0,
                    fees: None,
                },
                ExitExecution {
                    id: None,
                    exit_date: NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(),
                    exit_time: None,
                    quantity: 40.0,  // 40 shares at $115
                    price: 115.0,
                    fees: None,
                },
            ]),
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Weighted average: (60*110 + 40*115) / 100 = (6600 + 4600) / 100 = 112
        assert!((trade.trade.exit_price.unwrap() - 112.0).abs() < 0.01);
        // Status should be closed (100 out of 100 exited)
        assert_eq!(trade.trade.status, Status::Closed);
        // Gross PnL: (112 - 100) * 100 = 1200
        assert!((trade.gross_pnl.unwrap() - 1200.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_create_trade_partial_exit_remains_open() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "TSLA".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 200.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![ExitExecution {
                id: None,
                exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                exit_time: None,
                quantity: 50.0,  // Only 50 out of 100
                price: 210.0,
                fees: None,
            }]),
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Status should be open (50 out of 100 exited)
        assert_eq!(trade.trade.status, Status::Open);
        assert_eq!(trade.trade.exit_price, Some(210.0));
    }

    #[tokio::test]
    async fn test_create_trade_exits_exceed_quantity_error() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "NVDA".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 500.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![ExitExecution {
                id: None,
                exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                exit_time: None,
                quantity: 150.0,  // 150 exceeds entry quantity of 100
                price: 510.0,
                fees: None,
            }]),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("exit quantity"));
    }

    #[tokio::test]
    async fn test_create_trade_exit_validation_zero_quantity() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "AMD".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 150.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![ExitExecution {
                id: None,
                exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                exit_time: None,
                quantity: 0.0,  // Invalid
                price: 155.0,
                fees: None,
            }]),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Exit 1 quantity must be greater than 0"));
    }

    #[tokio::test]
    async fn test_create_trade_exit_validation_zero_price() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "META".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 300.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![ExitExecution {
                id: None,
                exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                exit_time: None,
                quantity: 100.0,
                price: 0.0,  // Invalid
                fees: None,
            }]),
        };

        let result = TradeService::create_trade(&pool, &user_id, input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Exit 1 price must be greater than 0"));
    }

    #[tokio::test]
    async fn test_create_trade_exit_fees_aggregated() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "GOOGL".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            direction: Direction::Long,
            quantity: Some(100.0),
            entry_price: 100.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(5.0), // Entry fees
            strategy: None,
            notes: None,
            status: None,
            exits: Some(vec![
                ExitExecution {
                    id: None,
                    exit_date: NaiveDate::from_ymd_opt(2024, 1, 2).unwrap(),
                    exit_time: None,
                    quantity: 50.0,
                    price: 110.0,
                    fees: Some(2.0),
                },
                ExitExecution {
                    id: None,
                    exit_date: NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(),
                    exit_time: None,
                    quantity: 50.0,
                    price: 110.0,
                    fees: Some(3.0),
                },
            ]),
        };

        let trade = TradeService::create_trade(&pool, &user_id, input)
            .await
            .expect("Failed to create trade");

        // Total fees: 5 (entry) + 2 + 3 (exits) = 10
        assert_eq!(trade.trade.fees, 10.0);
        // Gross PnL: (110 - 100) * 100 = 1000
        assert!((trade.gross_pnl.unwrap() - 1000.0).abs() < 0.01);
        // Net PnL: 1000 - 10 = 990
        assert!((trade.net_pnl.unwrap() - 990.0).abs() < 0.01);
    }
}
