use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

/// Trade direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Long,
    Short,
}

impl Direction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Direction::Long => "long",
            Direction::Short => "short",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "long" => Some(Direction::Long),
            "short" => Some(Direction::Short),
            _ => None,
        }
    }
}

/// Trade status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Open,
    Closed,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Open => "open",
            Status::Closed => "closed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "open" => Some(Status::Open),
            "closed" => Some(Status::Closed),
            _ => None,
        }
    }
}

/// Trade result classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TradeResult {
    Win,
    Loss,
    Breakeven,
}

/// Asset class for the trade
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AssetClass {
    Stock,
    Option,
}

impl AssetClass {
    pub fn as_str(&self) -> &'static str {
        match self {
            AssetClass::Stock => "stock",
            AssetClass::Option => "option",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "stock" => Some(AssetClass::Stock),
            "option" => Some(AssetClass::Option),
            _ => None,
        }
    }

    /// Returns the contract multiplier for this asset class
    pub fn multiplier(&self) -> f64 {
        match self {
            AssetClass::Stock => 1.0,
            AssetClass::Option => 100.0,
        }
    }
}

/// Exit execution for partial exits (input)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExitExecution {
    pub id: Option<String>,
    pub exit_date: NaiveDate,
    pub exit_time: Option<String>,
    pub quantity: f64,
    pub price: f64,
    pub fees: Option<f64>,
}

/// Stored trade execution (from database)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeExecutionRecord {
    pub id: String,
    pub trade_id: String,
    pub execution_type: String,
    pub execution_date: NaiveDate,
    pub execution_time: Option<String>,
    pub quantity: f64,
    pub price: f64,
    pub fees: f64,
}

/// Core trade entity with input fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: String,
    pub user_id: String,
    pub account_id: String,
    pub instrument_id: String,
    pub symbol: String, // Denormalized for convenience
    pub asset_class: AssetClass, // From instrument
    pub trade_number: Option<i32>,
    pub trade_date: NaiveDate,
    pub direction: Direction,
    pub quantity: Option<f64>,
    pub entry_price: f64,
    pub exit_price: Option<f64>,
    pub stop_loss_price: Option<f64>,
    pub entry_time: Option<String>,
    pub exit_time: Option<String>,
    pub fees: f64,
    pub strategy: Option<String>,
    pub notes: Option<String>,
    pub status: Status,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Derived fields computed from trade data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DerivedFields {
    pub gross_pnl: Option<f64>,
    pub net_pnl: Option<f64>,
    pub pnl_per_share: Option<f64>,
    pub risk_per_share: Option<f64>,
    pub r_multiple: Option<f64>,
    pub result: Option<TradeResult>,
}

/// Trade with computed derived fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeWithDerived {
    #[serde(flatten)]
    pub trade: Trade,
    pub gross_pnl: Option<f64>,
    pub net_pnl: Option<f64>,
    pub pnl_per_share: Option<f64>,
    pub risk_per_share: Option<f64>,
    pub r_multiple: Option<f64>,
    pub result: Option<TradeResult>,
}

impl TradeWithDerived {
    pub fn from_trade(trade: Trade, derived: DerivedFields) -> Self {
        Self {
            trade,
            gross_pnl: derived.gross_pnl,
            net_pnl: derived.net_pnl,
            pnl_per_share: derived.pnl_per_share,
            risk_per_share: derived.risk_per_share,
            r_multiple: derived.r_multiple,
            result: derived.result,
        }
    }
}

/// Input for creating a new trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTradeInput {
    pub account_id: String,
    pub symbol: String,
    pub asset_class: Option<AssetClass>,
    pub trade_number: Option<i32>,
    pub trade_date: NaiveDate,
    pub direction: Direction,
    pub quantity: Option<f64>,
    pub entry_price: f64,
    pub exit_price: Option<f64>,
    pub stop_loss_price: Option<f64>,
    pub entry_time: Option<String>,
    pub exit_time: Option<String>,
    pub fees: Option<f64>,
    pub strategy: Option<String>,
    pub notes: Option<String>,
    pub status: Option<Status>,
    pub exits: Option<Vec<ExitExecution>>,
}

/// Input for updating an existing trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTradeInput {
    pub account_id: Option<String>,
    pub symbol: Option<String>,
    pub trade_number: Option<i32>,
    pub trade_date: Option<NaiveDate>,
    pub direction: Option<Direction>,
    pub quantity: Option<f64>,
    pub entry_price: Option<f64>,
    pub exit_price: Option<f64>,
    pub stop_loss_price: Option<f64>,
    pub entry_time: Option<String>,
    pub exit_time: Option<String>,
    pub fees: Option<f64>,
    pub strategy: Option<String>,
    pub notes: Option<String>,
    pub status: Option<Status>,
}
