use chrono::Utc;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::models::{AssetClass, Instrument};

pub struct InstrumentRepository;

impl InstrumentRepository {
    /// Get an instrument by symbol, creating it if it doesn't exist
    pub async fn get_or_create(
        pool: &SqlitePool,
        symbol: &str,
    ) -> Result<Instrument, sqlx::Error> {
        Self::get_or_create_with_asset_class(pool, symbol, None).await
    }

    /// Get an instrument by symbol with a specific asset class, creating it if it doesn't exist
    pub async fn get_or_create_with_asset_class(
        pool: &SqlitePool,
        symbol: &str,
        asset_class: Option<AssetClass>,
    ) -> Result<Instrument, sqlx::Error> {
        // Try to find existing instrument
        if let Some(existing) = Self::get_by_symbol(pool, symbol).await? {
            if let Some(requested_asset_class) = asset_class {
                let requested = requested_asset_class.as_str();
                if existing.asset_class != requested {
                    sqlx::query("UPDATE instruments SET asset_class = ? WHERE id = ?")
                        .bind(requested)
                        .bind(&existing.id)
                        .execute(pool)
                        .await?;

                    return Self::get_by_id(pool, &existing.id)
                        .await?
                        .ok_or(sqlx::Error::RowNotFound);
                }
            }

            let instrument = existing;
            return Ok(instrument);
        }

        // Create new instrument
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        let symbol_upper = symbol.to_uppercase();
        let asset_class_str = asset_class.unwrap_or(AssetClass::Stock).as_str();

        sqlx::query(
            "INSERT INTO instruments (id, symbol, asset_class, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&symbol_upper)
        .bind(asset_class_str)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_db;

    #[tokio::test]
    async fn test_get_or_create_new_instrument() {
        let pool = create_test_db().await;

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .expect("Failed to create instrument");

        assert_eq!(instrument.symbol, "AAPL");
        assert_eq!(instrument.asset_class, "stock");
        assert!(!instrument.id.is_empty());
    }

    #[tokio::test]
    async fn test_get_or_create_existing_instrument() {
        let pool = create_test_db().await;

        // Create first
        let first = InstrumentRepository::get_or_create(&pool, "MSFT")
            .await
            .expect("Failed to create instrument");

        // Get same instrument
        let second = InstrumentRepository::get_or_create(&pool, "MSFT")
            .await
            .expect("Failed to get instrument");

        assert_eq!(first.id, second.id);
        assert_eq!(second.symbol, "MSFT");
    }

    #[tokio::test]
    async fn test_get_or_create_case_insensitive() {
        let pool = create_test_db().await;

        let lower = InstrumentRepository::get_or_create(&pool, "tsla")
            .await
            .expect("Failed to create instrument");

        let upper = InstrumentRepository::get_or_create(&pool, "TSLA")
            .await
            .expect("Failed to get instrument");

        assert_eq!(lower.id, upper.id);
        assert_eq!(lower.symbol, "TSLA"); // Should be uppercase
    }

    #[tokio::test]
    async fn test_get_by_symbol_not_found() {
        let pool = create_test_db().await;

        let result = InstrumentRepository::get_by_symbol(&pool, "NONEXISTENT")
            .await
            .expect("Query failed");

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let pool = create_test_db().await;

        let created = InstrumentRepository::get_or_create(&pool, "GOOGL")
            .await
            .expect("Failed to create instrument");

        let fetched = InstrumentRepository::get_by_id(&pool, &created.id)
            .await
            .expect("Query failed")
            .expect("Instrument not found");

        assert_eq!(created.id, fetched.id);
        assert_eq!(fetched.symbol, "GOOGL");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let pool = create_test_db().await;

        let result = InstrumentRepository::get_by_id(&pool, "nonexistent-id")
            .await
            .expect("Query failed");

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_or_create_with_asset_class_option() {
        let pool = create_test_db().await;

        let instrument = InstrumentRepository::get_or_create_with_asset_class(
            &pool,
            "AAPL240315C00150000",
            Some(AssetClass::Option),
        )
        .await
        .expect("Failed to create option instrument");

        assert_eq!(instrument.symbol, "AAPL240315C00150000");
        assert_eq!(instrument.asset_class, "option");
    }

    #[tokio::test]
    async fn test_get_or_create_with_asset_class_stock() {
        let pool = create_test_db().await;

        let instrument = InstrumentRepository::get_or_create_with_asset_class(
            &pool,
            "NVDA",
            Some(AssetClass::Stock),
        )
        .await
        .expect("Failed to create stock instrument");

        assert_eq!(instrument.symbol, "NVDA");
        assert_eq!(instrument.asset_class, "stock");
    }

    #[tokio::test]
    async fn test_get_or_create_with_asset_class_none_defaults_to_stock() {
        let pool = create_test_db().await;

        let instrument = InstrumentRepository::get_or_create_with_asset_class(
            &pool,
            "META",
            None,
        )
        .await
        .expect("Failed to create instrument");

        assert_eq!(instrument.symbol, "META");
        assert_eq!(instrument.asset_class, "stock");
    }

    #[tokio::test]
    async fn test_get_or_create_with_asset_class_updates_existing_mismatch() {
        let pool = create_test_db().await;

        let stock = InstrumentRepository::get_or_create_with_asset_class(
            &pool,
            "NVDA FEB13'26 190 PUT",
            Some(AssetClass::Stock),
        )
        .await
        .expect("Failed to create stock instrument");
        assert_eq!(stock.asset_class, "stock");

        let option = InstrumentRepository::get_or_create_with_asset_class(
            &pool,
            "NVDA FEB13'26 190 PUT",
            Some(AssetClass::Option),
        )
        .await
        .expect("Failed to update instrument class");

        assert_eq!(stock.id, option.id);
        assert_eq!(option.asset_class, "option");
    }
}
