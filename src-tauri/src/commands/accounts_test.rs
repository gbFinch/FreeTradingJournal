//! Tests for account commands

#[cfg(test)]
mod tests {
    use crate::repository::AccountRepository;
    use crate::test_utils::{create_test_db, setup_test_user_and_account};

    // ==================== GET ACCOUNTS ====================

    #[tokio::test]
    async fn test_get_accounts_empty() {
        let pool = create_test_db().await;

        // Create user without account
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        let accounts = AccountRepository::get_accounts(&pool, "test-user")
            .await
            .unwrap();

        assert!(accounts.is_empty());
    }

    #[tokio::test]
    async fn test_get_accounts_single() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let accounts = AccountRepository::get_accounts(&pool, &user_id)
            .await
            .unwrap();

        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].id, account_id);
        assert_eq!(accounts[0].name, "Test Account");
    }

    #[tokio::test]
    async fn test_get_accounts_multiple() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        // Create additional accounts
        AccountRepository::create(&pool, &user_id, "Account 2", Some("EUR"))
            .await
            .unwrap();
        AccountRepository::create(&pool, &user_id, "Account 3", None)
            .await
            .unwrap();

        let accounts = AccountRepository::get_accounts(&pool, &user_id)
            .await
            .unwrap();

        assert_eq!(accounts.len(), 3);
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

        // Verify isolation
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

    // ==================== CREATE ACCOUNT ====================

    #[tokio::test]
    async fn test_create_account_with_currency() {
        let pool = create_test_db().await;

        // Create user
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        let account = AccountRepository::create(&pool, "test-user", "Trading Account", Some("EUR"))
            .await
            .unwrap();

        assert!(!account.id.is_empty());
        assert_eq!(account.user_id, "test-user");
        assert_eq!(account.name, "Trading Account");
        assert_eq!(account.base_currency, "EUR");
    }

    #[tokio::test]
    async fn test_create_account_default_currency() {
        let pool = create_test_db().await;

        // Create user
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        let account = AccountRepository::create(&pool, "test-user", "My Account", None)
            .await
            .unwrap();

        assert_eq!(account.base_currency, "USD"); // Default
    }

    #[tokio::test]
    async fn test_create_account_unique_names() {
        let pool = create_test_db().await;
        let (user_id, _account_id) = setup_test_user_and_account(&pool).await;

        // Creating accounts with same name should work (no unique constraint on name)
        let account1 = AccountRepository::create(&pool, &user_id, "Same Name", None).await;
        let account2 = AccountRepository::create(&pool, &user_id, "Same Name", None).await;

        assert!(account1.is_ok());
        assert!(account2.is_ok());
        // They should have different IDs
        assert_ne!(account1.unwrap().id, account2.unwrap().id);
    }

    #[tokio::test]
    async fn test_create_account_empty_name() {
        let pool = create_test_db().await;

        // Create user
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        // Empty name should work (no validation in repository)
        let account = AccountRepository::create(&pool, "test-user", "", None).await;
        assert!(account.is_ok());
    }

    #[tokio::test]
    async fn test_create_account_various_currencies() {
        let pool = create_test_db().await;

        // Create user
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        // Test various currency codes
        let currencies = vec!["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"];

        for currency in currencies {
            let account = AccountRepository::create(
                &pool,
                "test-user",
                &format!("{} Account", currency),
                Some(currency),
            )
            .await
            .unwrap();

            assert_eq!(account.base_currency, currency);
        }
    }

    // ==================== ERROR HANDLING ====================

    #[tokio::test]
    async fn test_get_accounts_invalid_user() {
        let pool = create_test_db().await;

        // Should return empty list, not error
        let accounts = AccountRepository::get_accounts(&pool, "nonexistent-user")
            .await
            .unwrap();

        assert!(accounts.is_empty());
    }

    #[tokio::test]
    async fn test_create_account_invalid_user() {
        let pool = create_test_db().await;

        // Creating account for nonexistent user should fail (foreign key constraint)
        let result = AccountRepository::create(&pool, "nonexistent-user", "Test", None).await;

        assert!(result.is_err());
    }

    // ==================== COMMAND ERROR MAPPING ====================

    #[tokio::test]
    async fn test_error_message_format() {
        let pool = create_test_db().await;

        // Simulate the error mapping from the command
        let result = AccountRepository::create(&pool, "nonexistent-user", "Test", None).await;

        let error_msg = result
            .map_err(|e| format!("Failed to create account: {}", e))
            .unwrap_err();

        assert!(error_msg.starts_with("Failed to create account:"));
    }

    // ==================== INTEGRATION ====================

    #[tokio::test]
    async fn test_account_lifecycle() {
        let pool = create_test_db().await;

        // Create user
        sqlx::query("INSERT INTO users (id, email) VALUES (?, ?)")
            .bind("test-user")
            .bind("test@example.com")
            .execute(&pool)
            .await
            .unwrap();

        // 1. Initially no accounts
        let accounts = AccountRepository::get_accounts(&pool, "test-user")
            .await
            .unwrap();
        assert!(accounts.is_empty());

        // 2. Create first account
        let account1 = AccountRepository::create(&pool, "test-user", "Main Account", Some("USD"))
            .await
            .unwrap();

        // 3. Verify account exists
        let accounts = AccountRepository::get_accounts(&pool, "test-user")
            .await
            .unwrap();
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].id, account1.id);

        // 4. Create second account
        let account2 = AccountRepository::create(&pool, "test-user", "Savings", Some("EUR"))
            .await
            .unwrap();

        // 5. Verify both accounts exist
        let accounts = AccountRepository::get_accounts(&pool, "test-user")
            .await
            .unwrap();
        assert_eq!(accounts.len(), 2);

        // Verify both accounts are returned
        let ids: Vec<&str> = accounts.iter().map(|a| a.id.as_str()).collect();
        assert!(ids.contains(&account1.id.as_str()));
        assert!(ids.contains(&account2.id.as_str()));
    }
}
