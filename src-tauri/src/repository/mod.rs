pub mod trade_repo;
pub mod account_repo;
pub mod instrument_repo;

use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;

pub use trade_repo::TradeRepository;
pub use account_repo::AccountRepository;
pub use instrument_repo::InstrumentRepository;

/// Initialize the database connection pool
pub async fn init_db(app_data_dir: PathBuf) -> Result<SqlitePool, sqlx::Error> {
    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir).ok();

    let db_path = app_data_dir.join("trades.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Run database migrations
async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Read and execute the migration SQL
    let migration_sql = include_str!("../../migrations/001_initial_schema.sql");

    sqlx::raw_sql(migration_sql)
        .execute(pool)
        .await?;

    Ok(())
}

/// Create default user and account if they don't exist
pub async fn ensure_defaults(pool: &SqlitePool) -> Result<(String, String), sqlx::Error> {
    let default_user_id = "default-user";
    let default_account_id = "default-account";

    // Check if default user exists
    let user_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)"
    )
    .bind(default_user_id)
    .fetch_one(pool)
    .await?;

    if !user_exists {
        sqlx::query(
            "INSERT INTO users (id, email) VALUES (?, ?)"
        )
        .bind(default_user_id)
        .bind("local@user")
        .execute(pool)
        .await?;
    }

    // Check if default account exists
    let account_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM accounts WHERE id = ?)"
    )
    .bind(default_account_id)
    .fetch_one(pool)
    .await?;

    if !account_exists {
        sqlx::query(
            "INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)"
        )
        .bind(default_account_id)
        .bind(default_user_id)
        .bind("Main Account")
        .bind("USD")
        .execute(pool)
        .await?;
    }

    Ok((default_user_id.to_string(), default_account_id.to_string()))
}
