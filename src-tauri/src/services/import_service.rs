use std::collections::HashMap;
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

use crate::models::Direction;
use crate::parsers::{
    parse_tlg_file, OptionDetails, OptionType, TlgAction, TlgAssetType, TlgExecution,
    TlgParseError, TlgParseResult,
};

/// An individual execution within a trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Execution {
    pub execution_type: String, // "entry" or "exit"
    pub execution_date: NaiveDate,
    pub execution_time: Option<String>,
    pub quantity: f64, // Always positive
    pub price: f64,
    pub fees: f64,
    pub exchange: Option<String>,
    pub broker_execution_id: String,
}

/// An aggregated trade ready for import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedTrade {
    pub key: String, // Unique key for selection (symbol + first entry date)
    pub symbol: String,
    pub underlying_symbol: String,
    pub asset_class: String, // "stock" or "option"
    pub option_type: Option<String>, // "call" or "put"
    pub strike_price: Option<f64>,
    pub expiration_date: Option<NaiveDate>,
    pub direction: String, // "long" or "short"
    pub trade_date: NaiveDate,
    pub entries: Vec<Execution>,
    pub exits: Vec<Execution>,
    pub status: String, // "open" or "closed"
    // Derived for display
    pub total_quantity: f64,
    pub avg_entry_price: f64,
    pub avg_exit_price: Option<f64>,
    pub total_fees: f64,
    pub net_pnl: Option<f64>,
}

impl AggregatedTrade {
    /// Calculate derived fields from entries and exits
    pub fn calculate_derived(&mut self) {
        // Calculate total quantity from entries
        self.total_quantity = self.entries.iter().map(|e| e.quantity).sum();

        // Calculate weighted average entry price
        let total_entry_value: f64 = self
            .entries
            .iter()
            .map(|e| e.quantity * e.price)
            .sum();
        self.avg_entry_price = if self.total_quantity > 0.0 {
            total_entry_value / self.total_quantity
        } else {
            0.0
        };

        // Calculate total fees
        self.total_fees = self.entries.iter().map(|e| e.fees).sum::<f64>()
            + self.exits.iter().map(|e| e.fees).sum::<f64>();

        // Calculate exit price and PnL if position is closed
        let exit_qty: f64 = self.exits.iter().map(|e| e.quantity).sum();
        if exit_qty >= self.total_quantity && !self.exits.is_empty() {
            self.status = "closed".to_string();

            let total_exit_value: f64 = self
                .exits
                .iter()
                .map(|e| e.quantity * e.price)
                .sum();
            self.avg_exit_price = Some(total_exit_value / exit_qty);

            // Calculate gross PnL
            let gross_pnl = if self.direction == "long" {
                (self.avg_exit_price.unwrap() - self.avg_entry_price) * self.total_quantity
            } else {
                (self.avg_entry_price - self.avg_exit_price.unwrap()) * self.total_quantity
            };

            // For options, multiply by contract multiplier (usually 100)
            let multiplier = if self.asset_class == "option" { 100.0 } else { 1.0 };
            let gross_pnl = gross_pnl * multiplier;

            self.net_pnl = Some(gross_pnl - self.total_fees);
        } else {
            self.status = "open".to_string();
            self.avg_exit_price = None;
            self.net_pnl = None;
        }
    }
}

/// Preview of what will be imported
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPreview {
    pub trades_to_import: Vec<AggregatedTrade>,
    pub open_positions: Vec<AggregatedTrade>,
    pub duplicate_count: i32,
    pub parse_errors: Vec<TlgParseError>,
}

/// Result of executing an import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported_count: i32,
    pub skipped_duplicates: i32,
    pub errors: Vec<String>,
}

/// Position tracker for aggregating executions into trades
struct PositionTracker {
    symbol: String,
    underlying_symbol: String,
    asset_class: TlgAssetType,
    option_details: Option<OptionDetails>,
    direction: Option<Direction>,
    entries: Vec<TlgExecution>,
    exits: Vec<TlgExecution>,
    open_quantity: f64,
}

impl PositionTracker {
    fn new(symbol: &str, underlying: &str, asset_type: TlgAssetType, option_details: Option<OptionDetails>) -> Self {
        Self {
            symbol: symbol.to_string(),
            underlying_symbol: underlying.to_string(),
            asset_class: asset_type,
            option_details,
            direction: None,
            entries: Vec::new(),
            exits: Vec::new(),
            open_quantity: 0.0,
        }
    }

    fn add_execution(&mut self, exec: TlgExecution) {
        let qty = exec.abs_quantity();

        if exec.action.is_opening() {
            // Determine direction from the opening action
            if self.direction.is_none() {
                self.direction = Some(if exec.action == TlgAction::BuyToOpen {
                    Direction::Long
                } else {
                    Direction::Short
                });
            }
            self.entries.push(exec);
            self.open_quantity += qty;
        } else {
            // Closing action
            self.exits.push(exec);
            self.open_quantity -= qty;
        }
    }

    fn is_closed(&self) -> bool {
        self.open_quantity <= 0.0001 && !self.entries.is_empty() && !self.exits.is_empty()
    }

    fn to_aggregated_trade(&self) -> AggregatedTrade {
        let entries: Vec<Execution> = self
            .entries
            .iter()
            .map(|e| Execution {
                execution_type: "entry".to_string(),
                execution_date: e.execution_date,
                execution_time: Some(e.execution_time.clone()),
                quantity: e.abs_quantity(),
                price: e.price,
                fees: e.abs_fees(),
                exchange: Some(e.exchange.clone()),
                broker_execution_id: e.broker_execution_id.clone(),
            })
            .collect();

        let exits: Vec<Execution> = self
            .exits
            .iter()
            .map(|e| Execution {
                execution_type: "exit".to_string(),
                execution_date: e.execution_date,
                execution_time: Some(e.execution_time.clone()),
                quantity: e.abs_quantity(),
                price: e.price,
                fees: e.abs_fees(),
                exchange: Some(e.exchange.clone()),
                broker_execution_id: e.broker_execution_id.clone(),
            })
            .collect();

        let trade_date = entries
            .first()
            .map(|e| e.execution_date)
            .unwrap_or(NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());

        let key = format!("{}_{}", self.symbol, trade_date);

        let (option_type, strike_price, expiration_date) = match &self.option_details {
            Some(details) => (
                Some(match details.option_type {
                    OptionType::Call => "call".to_string(),
                    OptionType::Put => "put".to_string(),
                }),
                Some(details.strike_price),
                Some(details.expiration_date),
            ),
            None => (None, None, None),
        };

        let mut trade = AggregatedTrade {
            key,
            symbol: self.symbol.clone(),
            underlying_symbol: self.underlying_symbol.clone(),
            asset_class: match self.asset_class {
                TlgAssetType::Stock => "stock".to_string(),
                TlgAssetType::Option => "option".to_string(),
            },
            option_type,
            strike_price,
            expiration_date,
            direction: match self.direction {
                Some(Direction::Long) => "long".to_string(),
                Some(Direction::Short) => "short".to_string(),
                None => "long".to_string(),
            },
            trade_date,
            entries,
            exits,
            status: "open".to_string(),
            total_quantity: 0.0,
            avg_entry_price: 0.0,
            avg_exit_price: None,
            total_fees: 0.0,
            net_pnl: None,
        };

        trade.calculate_derived();
        trade
    }
}

pub struct ImportService;

impl ImportService {
    /// Parse a TLG file and aggregate executions into trades
    pub fn parse_and_aggregate(content: &str) -> (Vec<AggregatedTrade>, Vec<AggregatedTrade>, Vec<TlgParseError>) {
        let TlgParseResult { executions, errors } = parse_tlg_file(content);

        // Group executions by symbol
        let mut trackers: HashMap<String, PositionTracker> = HashMap::new();

        // Sort executions by date and time to ensure proper FIFO matching
        let mut sorted_executions = executions;
        sorted_executions.sort_by(|a, b| {
            a.execution_date
                .cmp(&b.execution_date)
                .then_with(|| a.execution_time.cmp(&b.execution_time))
        });

        for exec in sorted_executions {
            let symbol = exec.symbol.clone();
            let underlying = exec.underlying_symbol().to_string();
            let asset_type = exec.asset_type;
            let option_details = exec.option_details.clone();

            let tracker = trackers
                .entry(symbol.clone())
                .or_insert_with(|| PositionTracker::new(&symbol, &underlying, asset_type, option_details));

            tracker.add_execution(exec);
        }

        // Separate closed trades from open positions
        let mut closed_trades = Vec::new();
        let mut open_positions = Vec::new();

        for (_, tracker) in trackers {
            let trade = tracker.to_aggregated_trade();
            if trade.status == "closed" {
                closed_trades.push(trade);
            } else {
                open_positions.push(trade);
            }
        }

        // Sort by trade date
        closed_trades.sort_by(|a, b| a.trade_date.cmp(&b.trade_date));
        open_positions.sort_by(|a, b| a.trade_date.cmp(&b.trade_date));

        (closed_trades, open_positions, errors)
    }

    /// Generate a preview of the import
    pub async fn preview_import(
        pool: &SqlitePool,
        content: &str,
    ) -> Result<ImportPreview, String> {
        let (closed_trades, open_positions, errors) = Self::parse_and_aggregate(content);

        // Check for duplicates
        let mut duplicate_count = 0;
        let mut trades_to_import = Vec::new();

        for trade in closed_trades {
            let mut has_duplicate = false;
            for entry in &trade.entries {
                if Self::execution_exists(pool, &entry.broker_execution_id).await? {
                    has_duplicate = true;
                    duplicate_count += 1;
                    break;
                }
            }
            if !has_duplicate {
                trades_to_import.push(trade);
            }
        }

        Ok(ImportPreview {
            trades_to_import,
            open_positions,
            duplicate_count,
            parse_errors: errors,
        })
    }

    /// Check if an execution already exists by broker ID
    async fn execution_exists(pool: &SqlitePool, broker_execution_id: &str) -> Result<bool, String> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM trade_executions WHERE broker_execution_id = ?)",
        )
        .bind(broker_execution_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(exists)
    }

    /// Execute the import for selected trades
    pub async fn execute_import(
        pool: &SqlitePool,
        user_id: &str,
        account_id: &str,
        trades: Vec<AggregatedTrade>,
        skip_duplicates: bool,
    ) -> Result<ImportResult, String> {
        let mut imported_count = 0;
        let mut skipped_duplicates = 0;
        let mut errors = Vec::new();

        for trade in trades {
            // Check for duplicates if requested
            if skip_duplicates {
                let mut has_duplicate = false;
                for entry in &trade.entries {
                    if Self::execution_exists(pool, &entry.broker_execution_id).await? {
                        has_duplicate = true;
                        break;
                    }
                }
                if has_duplicate {
                    skipped_duplicates += 1;
                    continue;
                }
            }

            // Import the trade
            match Self::import_single_trade(pool, user_id, account_id, &trade).await {
                Ok(_) => imported_count += 1,
                Err(e) => errors.push(format!("Failed to import {}: {}", trade.symbol, e)),
            }
        }

        Ok(ImportResult {
            imported_count,
            skipped_duplicates,
            errors,
        })
    }

    /// Import a single aggregated trade
    async fn import_single_trade(
        pool: &SqlitePool,
        user_id: &str,
        account_id: &str,
        trade: &AggregatedTrade,
    ) -> Result<String, String> {
        // Get or create instrument
        let instrument_id = Self::get_or_create_instrument(pool, trade).await?;

        // Create the trade record
        let trade_id = Self::create_trade_record(pool, user_id, account_id, &instrument_id, trade).await?;

        // Insert executions
        for entry in &trade.entries {
            Self::insert_execution(pool, &trade_id, entry).await?;
        }
        for exit in &trade.exits {
            Self::insert_execution(pool, &trade_id, exit).await?;
        }

        Ok(trade_id)
    }

    /// Get or create an instrument for the trade
    async fn get_or_create_instrument(
        pool: &SqlitePool,
        trade: &AggregatedTrade,
    ) -> Result<String, String> {
        // Check if instrument exists
        let existing: Option<String> = sqlx::query_scalar(
            "SELECT id FROM instruments WHERE symbol = ?",
        )
        .bind(&trade.symbol)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        if let Some(id) = existing {
            return Ok(id);
        }

        // Create new instrument
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO instruments (id, symbol, asset_class, underlying_symbol, option_type, strike_price, expiration_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&trade.symbol)
        .bind(&trade.asset_class)
        .bind(&trade.underlying_symbol)
        .bind(&trade.option_type)
        .bind(trade.strike_price)
        .bind(trade.expiration_date)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create instrument: {}", e))?;

        Ok(id)
    }

    /// Create the trade record in the database
    async fn create_trade_record(
        pool: &SqlitePool,
        user_id: &str,
        account_id: &str,
        instrument_id: &str,
        trade: &AggregatedTrade,
    ) -> Result<String, String> {
        let trade_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();

        // Get the entry and exit times from the first/last executions
        let entry_time = trade.entries.first().and_then(|e| e.execution_time.clone());
        let exit_time = trade.exits.last().and_then(|e| e.execution_time.clone());

        // Determine status
        let status = if trade.status == "closed" { "closed" } else { "open" };

        sqlx::query(
            r#"
            INSERT INTO trades (
                id, user_id, account_id, instrument_id,
                trade_date, direction, quantity, entry_price, exit_price,
                entry_time, exit_time, fees, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&trade_id)
        .bind(user_id)
        .bind(account_id)
        .bind(instrument_id)
        .bind(trade.trade_date)
        .bind(&trade.direction)
        .bind(trade.total_quantity)
        .bind(trade.avg_entry_price)
        .bind(trade.avg_exit_price)
        .bind(&entry_time)
        .bind(&exit_time)
        .bind(trade.total_fees)
        .bind(status)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create trade: {}", e))?;

        Ok(trade_id)
    }

    /// Insert an execution record
    async fn insert_execution(
        pool: &SqlitePool,
        trade_id: &str,
        execution: &Execution,
    ) -> Result<(), String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO trade_executions (
                id, trade_id, execution_type, execution_date, execution_time,
                quantity, price, fees, exchange, broker_execution_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(trade_id)
        .bind(&execution.execution_type)
        .bind(execution.execution_date)
        .bind(&execution.execution_time)
        .bind(execution.quantity)
        .bind(execution.price)
        .bind(execution.fees)
        .bind(&execution.exchange)
        .bind(&execution.broker_execution_id)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert execution: {}", e))?;

        Ok(())
    }

    /// Get executions for a trade
    pub async fn get_trade_executions(
        pool: &SqlitePool,
        trade_id: &str,
    ) -> Result<Vec<Execution>, String> {
        let rows = sqlx::query(
            r#"
            SELECT * FROM trade_executions
            WHERE trade_id = ?
            ORDER BY execution_date, execution_time
            "#,
        )
        .bind(trade_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(rows
            .iter()
            .map(|row| Execution {
                execution_type: row.get("execution_type"),
                execution_date: row.get("execution_date"),
                execution_time: row.get("execution_time"),
                quantity: row.get("quantity"),
                price: row.get("price"),
                fees: row.get("fees"),
                exchange: row.get("exchange"),
                broker_execution_id: row.get("broker_execution_id"),
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_and_aggregate_simple_stock_trade() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
STK_TRD|1002|AAPL|APPLE INC|DARK|SELLTOCLOSE|C|20260127|10:00:00|USD|-100.00|1.00|155.00|-15500.00|-1.00|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert_eq!(closed.len(), 1);
        assert!(open.is_empty());

        let trade = &closed[0];
        assert_eq!(trade.symbol, "AAPL");
        assert_eq!(trade.direction, "long");
        assert_eq!(trade.status, "closed");
        assert_eq!(trade.entries.len(), 1);
        assert_eq!(trade.exits.len(), 1);
        assert_eq!(trade.total_quantity, 100.0);
        assert!((trade.avg_entry_price - 150.0).abs() < 0.01);
        assert!((trade.avg_exit_price.unwrap() - 155.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_and_aggregate_scaled_out_trade() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
STK_TRD|1002|AAPL|APPLE INC|DARK|SELLTOCLOSE|C|20260127|10:00:00|USD|-60.00|1.00|155.00|-9300.00|-0.60|0.85
STK_TRD|1003|AAPL|APPLE INC|DARK|SELLTOCLOSE|C|20260127|10:30:00|USD|-40.00|1.00|160.00|-6400.00|-0.40|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert_eq!(closed.len(), 1);
        assert!(open.is_empty());

        let trade = &closed[0];
        assert_eq!(trade.entries.len(), 1);
        assert_eq!(trade.exits.len(), 2);
        assert_eq!(trade.total_quantity, 100.0);

        // Weighted avg exit: (60*155 + 40*160) / 100 = 157
        assert!((trade.avg_exit_price.unwrap() - 157.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_and_aggregate_open_position() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert!(closed.is_empty());
        assert_eq!(open.len(), 1);

        let position = &open[0];
        assert_eq!(position.symbol, "AAPL");
        assert_eq!(position.status, "open");
        assert!(position.avg_exit_price.is_none());
        assert!(position.net_pnl.is_none());
    }

    #[test]
    fn test_parse_and_aggregate_short_trade() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|SELLTOOPEN|O|20260127|09:30:00|USD|-100.00|1.00|155.00|-15500.00|-1.00|0.85
STK_TRD|1002|AAPL|APPLE INC|DARK|BUYTOCLOSE|C|20260127|10:00:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert_eq!(closed.len(), 1);
        assert!(open.is_empty());

        let trade = &closed[0];
        assert_eq!(trade.direction, "short");
        assert_eq!(trade.status, "closed");
        // Short trade: entry at 155, exit at 150 = profit
        assert!(trade.net_pnl.unwrap() > 0.0);
    }

    #[test]
    fn test_parse_and_aggregate_option_trade() {
        let content = r#"
OPTION_TRANSACTIONS
OPT_TRD|1001|AAPL  250905C00240000|AAPL 05SEP25 240 C|MEMX|BUYTOOPEN|O|20250904|09:30:00|USD|5.00|100.00|1.50|750.00|-4.00|0.85
OPT_TRD|1002|AAPL  250905C00240000|AAPL 05SEP25 240 C|MEMX|SELLTOCLOSE|C|20250904|10:00:00|USD|-5.00|100.00|2.00|-1000.00|-4.00|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert_eq!(closed.len(), 1);
        assert!(open.is_empty());

        let trade = &closed[0];
        assert_eq!(trade.asset_class, "option");
        assert_eq!(trade.underlying_symbol, "AAPL");
        assert_eq!(trade.option_type, Some("call".to_string()));
        assert!((trade.strike_price.unwrap() - 240.0).abs() < 0.01);
        assert_eq!(trade.direction, "long");

        // Option PnL: (2.00 - 1.50) * 5 * 100 = 250 gross, - 8 fees = 242 net
        assert!((trade.net_pnl.unwrap() - 242.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_and_aggregate_multiple_symbols() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
STK_TRD|1002|MSFT|MICROSOFT|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|50.00|1.00|400.00|20000.00|-1.00|0.85
STK_TRD|1003|AAPL|APPLE INC|DARK|SELLTOCLOSE|C|20260127|10:00:00|USD|-100.00|1.00|155.00|-15500.00|-1.00|0.85
STK_TRD|1004|MSFT|MICROSOFT|DARK|SELLTOCLOSE|C|20260127|10:00:00|USD|-50.00|1.00|410.00|-20500.00|-1.00|0.85
"#;

        let (closed, open, errors) = ImportService::parse_and_aggregate(content);

        assert!(errors.is_empty());
        assert_eq!(closed.len(), 2);
        assert!(open.is_empty());

        let aapl = closed.iter().find(|t| t.symbol == "AAPL").unwrap();
        let msft = closed.iter().find(|t| t.symbol == "MSFT").unwrap();

        assert_eq!(aapl.total_quantity, 100.0);
        assert_eq!(msft.total_quantity, 50.0);
    }

    #[test]
    fn test_aggregated_trade_key_uniqueness() {
        let content = r#"
STOCK_TRANSACTIONS
STK_TRD|1001|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:30:00|USD|100.00|1.00|150.00|15000.00|-1.00|0.85
STK_TRD|1002|AAPL|APPLE INC|DARK|SELLTOCLOSE|C|20260127|10:00:00|USD|-100.00|1.00|155.00|-15500.00|-1.00|0.85
"#;

        let (closed, _, _) = ImportService::parse_and_aggregate(content);
        let trade = &closed[0];

        assert!(trade.key.starts_with("AAPL_"));
        assert!(trade.key.contains("2026-01-27"));
    }
}
