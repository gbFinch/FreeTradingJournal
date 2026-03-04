use serde::Serialize;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use chrono_tz::Tz;
use std::str::FromStr;

const KEY_ALPACA_API_KEY_ID: &str = "alpaca_api_key_id";
const KEY_ALPACA_API_SECRET_KEY: &str = "alpaca_api_secret_key";
const KEY_MANUAL_TRADE_TIMEZONE: &str = "manual_trade_timezone";
const DEFAULT_MANUAL_TRADE_TIMEZONE: &str = "Europe/Amsterdam";

#[derive(Debug, Clone, Serialize)]
pub struct AlpacaKeysStatus {
    pub has_key_id: bool,
    pub has_secret_key: bool,
    pub masked_key_id: Option<String>,
}

pub struct SettingsService;

impl SettingsService {
    pub async fn get_alpaca_keys_status(pool: &SqlitePool) -> Result<AlpacaKeysStatus, String> {
        let key_id = get_setting(pool, KEY_ALPACA_API_KEY_ID).await?;
        let secret = get_setting(pool, KEY_ALPACA_API_SECRET_KEY).await?;

        Ok(AlpacaKeysStatus {
            has_key_id: key_id.as_ref().is_some_and(|v| !v.trim().is_empty()),
            has_secret_key: secret.as_ref().is_some_and(|v| !v.trim().is_empty()),
            masked_key_id: key_id.as_deref().map(mask_key_id),
        })
    }

    pub async fn save_alpaca_keys(
        pool: &SqlitePool,
        api_key_id: &str,
        api_secret_key: &str,
    ) -> Result<(), String> {
        let trimmed_key_id = api_key_id.trim();
        let trimmed_secret = api_secret_key.trim();
        if trimmed_key_id.is_empty() || trimmed_secret.is_empty() {
            return Err("API Key ID and API Secret Key are required.".to_string());
        }

        upsert_setting(pool, KEY_ALPACA_API_KEY_ID, trimmed_key_id).await?;
        upsert_setting(pool, KEY_ALPACA_API_SECRET_KEY, trimmed_secret).await?;
        Ok(())
    }

    pub async fn clear_alpaca_keys(pool: &SqlitePool) -> Result<(), String> {
        delete_setting(pool, KEY_ALPACA_API_KEY_ID).await?;
        delete_setting(pool, KEY_ALPACA_API_SECRET_KEY).await?;
        Ok(())
    }

    pub async fn get_manual_trade_timezone(pool: &SqlitePool) -> Result<String, String> {
        let value = get_setting(pool, KEY_MANUAL_TRADE_TIMEZONE).await?;
        Ok(value.unwrap_or_else(|| DEFAULT_MANUAL_TRADE_TIMEZONE.to_string()))
    }

    pub async fn save_manual_trade_timezone(pool: &SqlitePool, timezone: &str) -> Result<(), String> {
        let trimmed = timezone.trim();
        if trimmed.is_empty() {
            return Err("Manual trade timezone is required.".to_string());
        }

        Tz::from_str(trimmed).map_err(|_| format!("Invalid IANA timezone: {}", trimmed))?;
        upsert_setting(pool, KEY_MANUAL_TRADE_TIMEZONE, trimmed).await
    }
}

fn mask_key_id(value: &str) -> String {
    let len = value.chars().count();
    if len <= 8 {
        return "••••".to_string();
    }
    let prefix: String = value.chars().take(4).collect();
    let suffix: String = value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("{}••••{}", prefix, suffix)
}

async fn get_setting(pool: &SqlitePool, key: &str) -> Result<Option<String>, String> {
    let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    Ok(row.map(|r| r.get("value")))
}

async fn upsert_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to save settings: {}", e))?;
    Ok(())
}

async fn delete_setting(pool: &SqlitePool, key: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM settings WHERE key = ?")
        .bind(key)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to clear settings: {}", e))?;
    Ok(())
}
