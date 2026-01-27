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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_db;

    async fn setup_user(pool: &SqlitePool) -> String {
        let user_id = "test-user";
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind(user_id)
            .bind("test@example.com")
            .execute(pool)
            .await
            .expect("Failed to create user");
        user_id.to_string()
    }

    #[tokio::test]
    async fn test_create_account() {
        let pool = create_test_db().await;
        let user_id = setup_user(&pool).await;

        let account = AccountRepository::create(&pool, &user_id, "Trading Account", Some("USD"))
            .await
            .expect("Failed to create account");

        assert_eq!(account.name, "Trading Account");
        assert_eq!(account.base_currency, "USD");
        assert_eq!(account.user_id, user_id);
        assert!(!account.id.is_empty());
    }

    #[tokio::test]
    async fn test_create_account_default_currency() {
        let pool = create_test_db().await;
        let user_id = setup_user(&pool).await;

        let account = AccountRepository::create(&pool, &user_id, "No Currency", None)
            .await
            .expect("Failed to create account");

        assert_eq!(account.base_currency, "USD"); // Default
    }

    #[tokio::test]
    async fn test_get_accounts_empty() {
        let pool = create_test_db().await;
        let user_id = setup_user(&pool).await;

        let accounts = AccountRepository::get_accounts(&pool, &user_id)
            .await
            .expect("Failed to get accounts");

        assert!(accounts.is_empty());
    }

    #[tokio::test]
    async fn test_get_accounts_multiple() {
        let pool = create_test_db().await;
        let user_id = setup_user(&pool).await;

        AccountRepository::create(&pool, &user_id, "Account 1", Some("USD"))
            .await
            .expect("Failed to create account 1");

        AccountRepository::create(&pool, &user_id, "Account 2", Some("EUR"))
            .await
            .expect("Failed to create account 2");

        let accounts = AccountRepository::get_accounts(&pool, &user_id)
            .await
            .expect("Failed to get accounts");

        assert_eq!(accounts.len(), 2);
    }

    #[tokio::test]
    async fn test_get_accounts_user_isolation() {
        let pool = create_test_db().await;

        // Create two users
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("user1")
            .bind("user1@example.com")
            .execute(&pool)
            .await
            .unwrap();

        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("user2")
            .bind("user2@example.com")
            .execute(&pool)
            .await
            .unwrap();

        // Create accounts for each user
        AccountRepository::create(&pool, "user1", "User1 Account", None)
            .await
            .unwrap();

        AccountRepository::create(&pool, "user2", "User2 Account", None)
            .await
            .unwrap();

        // Verify user isolation
        let user1_accounts = AccountRepository::get_accounts(&pool, "user1")
            .await
            .unwrap();
        let user2_accounts = AccountRepository::get_accounts(&pool, "user2")
            .await
            .unwrap();

        assert_eq!(user1_accounts.len(), 1);
        assert_eq!(user2_accounts.len(), 1);
        assert_eq!(user1_accounts[0].name, "User1 Account");
        assert_eq!(user2_accounts[0].name, "User2 Account");
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let pool = create_test_db().await;
        let user_id = setup_user(&pool).await;

        let created = AccountRepository::create(&pool, &user_id, "Test Account", Some("GBP"))
            .await
            .expect("Failed to create account");

        let fetched = AccountRepository::get_by_id(&pool, &created.id)
            .await
            .expect("Query failed")
            .expect("Account not found");

        assert_eq!(created.id, fetched.id);
        assert_eq!(fetched.name, "Test Account");
        assert_eq!(fetched.base_currency, "GBP");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let pool = create_test_db().await;

        let result = AccountRepository::get_by_id(&pool, "nonexistent-id")
            .await
            .expect("Query failed");

        assert!(result.is_none());
    }
}
