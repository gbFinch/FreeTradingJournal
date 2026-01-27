use chrono::NaiveDate;
use sqlx::sqlite::SqlitePool;
use crate::calculations::calculate_derived_fields;
use crate::models::{CreateTradeInput, Status, Trade, TradeWithDerived, UpdateTradeInput};
use crate::repository::{InstrumentRepository, TradeRepository};

pub struct TradeService;

impl TradeService {
    /// Create a new trade
    pub async fn create_trade(
        pool: &SqlitePool,
        user_id: &str,
        input: CreateTradeInput,
    ) -> Result<TradeWithDerived, String> {
        // Validate input
        Self::validate_input(&input)?;

        // Get or create instrument
        let instrument = InstrumentRepository::get_or_create(pool, &input.symbol)
            .await
            .map_err(|e| format!("Failed to get/create instrument: {}", e))?;

        // Insert trade
        let trade = TradeRepository::insert(pool, user_id, &instrument.id, &input)
            .await
            .map_err(|e| format!("Failed to create trade: {}", e))?;

        // Calculate derived fields
        Ok(Self::with_derived_fields(trade))
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

        Ok(())
    }
}
