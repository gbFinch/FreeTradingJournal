//! Test utilities for setting up in-memory database and test fixtures

use chrono::NaiveDate;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

use crate::models::{CreateTradeInput, Direction, Status};

/// Create an in-memory SQLite database for testing
pub async fn create_test_db() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("Failed to create test database");

    // Run migrations
    let migration_sql = include_str!("../migrations/001_initial_schema.sql");
    sqlx::raw_sql(migration_sql)
        .execute(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

/// Create test user and account, returning their IDs
pub async fn setup_test_user_and_account(pool: &SqlitePool) -> (String, String) {
    let user_id = "test-user";
    let account_id = "test-account";

    sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
        .bind(user_id)
        .bind("test@example.com")
        .execute(pool)
        .await
        .expect("Failed to create test user");

    sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
        .bind(account_id)
        .bind(user_id)
        .bind("Test Account")
        .bind("USD")
        .execute(pool)
        .await
        .expect("Failed to create test account");

    (user_id.to_string(), account_id.to_string())
}

/// Create a valid trade input for testing
pub fn create_test_trade_input(account_id: &str, symbol: &str) -> CreateTradeInput {
    CreateTradeInput {
        account_id: account_id.to_string(),
        symbol: symbol.to_string(),
        trade_number: Some(1),
        trade_date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
        direction: Direction::Long,
        quantity: Some(100.0),
        entry_price: 150.0,
        exit_price: Some(155.0),
        stop_loss_price: Some(145.0),
        entry_time: Some("09:30".to_string()),
        exit_time: Some("10:45".to_string()),
        fees: Some(10.0),
        strategy: Some("momentum".to_string()),
        notes: Some("Test trade".to_string()),
        status: Some(Status::Closed),
    }
}

/// Create a losing long trade input
pub fn create_losing_long_trade(
    account_id: &str,
    symbol: &str,
    date: NaiveDate,
    entry: f64,
    exit: f64,
    qty: f64,
) -> CreateTradeInput {
    CreateTradeInput {
        account_id: account_id.to_string(),
        symbol: symbol.to_string(),
        trade_number: None,
        trade_date: date,
        direction: Direction::Long,
        quantity: Some(qty),
        entry_price: entry,
        exit_price: Some(exit),
        stop_loss_price: None,
        entry_time: None,
        exit_time: None,
        fees: Some(0.0),
        strategy: None,
        notes: None,
        status: Some(Status::Closed),
    }
}

/// Create an open trade input (no exit price)
pub fn create_open_trade(
    account_id: &str,
    symbol: &str,
    date: NaiveDate,
    entry: f64,
    qty: f64,
) -> CreateTradeInput {
    CreateTradeInput {
        account_id: account_id.to_string(),
        symbol: symbol.to_string(),
        trade_number: None,
        trade_date: date,
        direction: Direction::Long,
        quantity: Some(qty),
        entry_price: entry,
        exit_price: None,
        stop_loss_price: None,
        entry_time: None,
        exit_time: None,
        fees: None,
        strategy: None,
        notes: None,
        status: Some(Status::Open),
    }
}
