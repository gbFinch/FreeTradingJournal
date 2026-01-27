use chrono::Utc;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::models::Instrument;

pub struct InstrumentRepository;

impl InstrumentRepository {
    /// Get an instrument by symbol, creating it if it doesn't exist
    pub async fn get_or_create(
        pool: &SqlitePool,
        symbol: &str,
    ) -> Result<Instrument, sqlx::Error> {
        // Try to find existing instrument
        if let Some(instrument) = Self::get_by_symbol(pool, symbol).await? {
            return Ok(instrument);
        }

        // Create new instrument
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        let symbol_upper = symbol.to_uppercase();

        sqlx::query(
            "INSERT INTO instruments (id, symbol, asset_class, created_at) VALUES (?, ?, 'stock', ?)"
        )
        .bind(&id)
        .bind(&symbol_upper)
        .bind(now)
        .execute(pool)
        .await?;

        Self::get_by_id(pool, &id).await?.ok_or(sqlx::Error::RowNotFound)
    }

    /// Get an instrument by symbol
    pub async fn get_by_symbol(pool: &SqlitePool, symbol: &str) -> Result<Option<Instrument>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM instruments WHERE symbol = ?")
            .bind(symbol.to_uppercase())
            .fetch_optional(pool)
            .await?;

        Ok(row.map(|r| Self::row_to_instrument(&r)))
    }

    /// Get an instrument by ID
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Instrument>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM instruments WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(row.map(|r| Self::row_to_instrument(&r)))
    }

    fn row_to_instrument(row: &sqlx::sqlite::SqliteRow) -> Instrument {
        Instrument {
            id: row.get("id"),
            symbol: row.get("symbol"),
            asset_class: row.get("asset_class"),
            exchange: row.get("exchange"),
            created_at: row.get("created_at"),
        }
    }
}
