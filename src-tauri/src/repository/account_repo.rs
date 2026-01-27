use chrono::Utc;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::models::Account;

pub struct AccountRepository;

impl AccountRepository {
    /// Get all accounts for a user
    pub async fn get_accounts(pool: &SqlitePool, user_id: &str) -> Result<Vec<Account>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC"
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.iter().map(|r| Self::row_to_account(r)).collect())
    }

    /// Get an account by ID
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Account>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM accounts WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(row.map(|r| Self::row_to_account(&r)))
    }

    /// Create a new account
    pub async fn create(
        pool: &SqlitePool,
        user_id: &str,
        name: &str,
        base_currency: Option<&str>,
    ) -> Result<Account, sqlx::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let currency = base_currency.unwrap_or("USD");
        let now = Utc::now();

        sqlx::query(
            "INSERT INTO accounts (id, user_id, name, base_currency, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(user_id)
        .bind(name)
        .bind(currency)
        .bind(now)
        .execute(pool)
        .await?;

        Self::get_by_id(pool, &id).await?.ok_or(sqlx::Error::RowNotFound)
    }

    fn row_to_account(row: &sqlx::sqlite::SqliteRow) -> Account {
        Account {
            id: row.get("id"),
            user_id: row.get("user_id"),
            name: row.get("name"),
            base_currency: row.get("base_currency"),
            created_at: row.get("created_at"),
        }
    }
}
