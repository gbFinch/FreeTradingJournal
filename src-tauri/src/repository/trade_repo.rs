use chrono::{NaiveDate, Utc};
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::models::{Direction, Status, Trade, CreateTradeInput, UpdateTradeInput, AssetClass};

pub struct TradeRepository;

impl TradeRepository {
    /// Insert a new trade
    pub async fn insert(
        pool: &SqlitePool,
        user_id: &str,
        instrument_id: &str,
        input: &CreateTradeInput,
    ) -> Result<Trade, sqlx::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        let status = input.status.unwrap_or(Status::Closed);
        let fees = input.fees.unwrap_or(0.0);

        sqlx::query(
            r#"
            INSERT INTO trades (
                id, user_id, account_id, instrument_id, trade_number,
                trade_date, direction, quantity, entry_price, exit_price,
                stop_loss_price, entry_time, exit_time, fees, strategy,
                notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(user_id)
        .bind(&input.account_id)
        .bind(instrument_id)
        .bind(input.trade_number)
        .bind(input.trade_date)
        .bind(input.direction.as_str())
        .bind(input.quantity)
        .bind(input.entry_price)
        .bind(input.exit_price)
        .bind(input.stop_loss_price)
        .bind(&input.entry_time)
        .bind(&input.exit_time)
        .bind(fees)
        .bind(&input.strategy)
        .bind(&input.notes)
        .bind(status.as_str())
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        // Fetch the inserted trade
        Self::get_by_id(pool, &id).await?.ok_or_else(|| {
            sqlx::Error::RowNotFound
        })
    }

    /// Get a trade by ID
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Trade>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT t.*, i.symbol, i.asset_class
            FROM trades t
            JOIN instruments i ON t.instrument_id = i.id
            WHERE t.id = ?
            "#
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| Self::row_to_trade(&r)))
    }

    /// Get trades with optional filters
    pub async fn get_trades(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
        status_filter: Option<Status>,
    ) -> Result<Vec<Trade>, sqlx::Error> {
        let mut query = String::from(
            r#"
            SELECT t.*, i.symbol, i.asset_class
            FROM trades t
            JOIN instruments i ON t.instrument_id = i.id
            WHERE t.user_id = ?
            "#
        );

        if account_id.is_some() {
            query.push_str(" AND t.account_id = ?");
        }
        if start_date.is_some() {
            query.push_str(" AND t.trade_date >= ?");
        }
        if end_date.is_some() {
            query.push_str(" AND t.trade_date <= ?");
        }
        if status_filter.is_some() {
            query.push_str(" AND t.status = ?");
        }

        query.push_str(" ORDER BY t.trade_date DESC, t.created_at DESC");

        let mut q = sqlx::query(&query).bind(user_id);

        if let Some(acc) = account_id {
            q = q.bind(acc);
        }
        if let Some(start) = start_date {
            q = q.bind(start);
        }
        if let Some(end) = end_date {
            q = q.bind(end);
        }
        if let Some(status) = status_filter {
            q = q.bind(status.as_str());
        }

        let rows = q.fetch_all(pool).await?;
        Ok(rows.iter().map(|r| Self::row_to_trade(r)).collect())
    }

    /// Update a trade
    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        instrument_id: Option<&str>,
        input: &UpdateTradeInput,
    ) -> Result<Trade, sqlx::Error> {
        let now = Utc::now();
        let existing = Self::get_by_id(pool, id).await?.ok_or(sqlx::Error::RowNotFound)?;

        let account_id = input.account_id.as_ref().unwrap_or(&existing.account_id);
        let trade_number = input.trade_number.or(existing.trade_number);
        let trade_date = input.trade_date.unwrap_or(existing.trade_date);
        let direction = input.direction.unwrap_or(existing.direction);
        let quantity = input.quantity.or(existing.quantity);
        let entry_price = input.entry_price.unwrap_or(existing.entry_price);
        let exit_price = input.exit_price.or(existing.exit_price);
        let stop_loss_price = input.stop_loss_price.or(existing.stop_loss_price);
        let entry_time = input.entry_time.clone().or(existing.entry_time);
        let exit_time = input.exit_time.clone().or(existing.exit_time);
        let fees = input.fees.unwrap_or(existing.fees);
        let strategy = input.strategy.clone().or(existing.strategy);
        let notes = input.notes.clone().or(existing.notes);
        let status = input.status.unwrap_or(existing.status);
        let final_instrument_id = instrument_id.unwrap_or(&existing.instrument_id);

        sqlx::query(
            r#"
            UPDATE trades SET
                account_id = ?,
                instrument_id = ?,
                trade_number = ?,
                trade_date = ?,
                direction = ?,
                quantity = ?,
                entry_price = ?,
                exit_price = ?,
                stop_loss_price = ?,
                entry_time = ?,
                exit_time = ?,
                fees = ?,
                strategy = ?,
                notes = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(account_id)
        .bind(final_instrument_id)
        .bind(trade_number)
        .bind(trade_date)
        .bind(direction.as_str())
        .bind(quantity)
        .bind(entry_price)
        .bind(exit_price)
        .bind(stop_loss_price)
        .bind(&entry_time)
        .bind(&exit_time)
        .bind(fees)
        .bind(&strategy)
        .bind(&notes)
        .bind(status.as_str())
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        Self::get_by_id(pool, id).await?.ok_or(sqlx::Error::RowNotFound)
    }

    /// Delete a trade
    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM trades WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;
        Ok(())
    }

    /// Convert a database row to Trade struct
    fn row_to_trade(row: &sqlx::sqlite::SqliteRow) -> Trade {
        Trade {
            id: row.get("id"),
            user_id: row.get("user_id"),
            account_id: row.get("account_id"),
            instrument_id: row.get("instrument_id"),
            symbol: row.get("symbol"),
            asset_class: row.get::<Option<&str>, _>("asset_class")
                .and_then(AssetClass::from_str)
                .unwrap_or(AssetClass::Stock),
            trade_number: row.get("trade_number"),
            trade_date: row.get("trade_date"),
            direction: Direction::from_str(row.get::<&str, _>("direction")).unwrap_or(Direction::Long),
            quantity: row.get("quantity"),
            entry_price: row.get("entry_price"),
            exit_price: row.get("exit_price"),
            stop_loss_price: row.get("stop_loss_price"),
            entry_time: row.get("entry_time"),
            exit_time: row.get("exit_time"),
            fees: row.get::<f64, _>("fees"),
            strategy: row.get("strategy"),
            notes: row.get("notes"),
            status: Status::from_str(row.get::<&str, _>("status")).unwrap_or(Status::Closed),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use crate::repository::InstrumentRepository;
    use crate::test_utils::{create_test_db, setup_test_user_and_account, create_test_trade_input};

    #[tokio::test]
    async fn test_insert_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .expect("Failed to create instrument");

        let input = create_test_trade_input(&account_id, "AAPL");

        let trade = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .expect("Failed to insert trade");

        assert!(!trade.id.is_empty());
        assert_eq!(trade.user_id, user_id);
        assert_eq!(trade.account_id, account_id);
        assert_eq!(trade.symbol, "AAPL");
        assert_eq!(trade.direction, Direction::Long);
        assert_eq!(trade.entry_price, 150.0);
        assert_eq!(trade.exit_price, Some(155.0));
        assert_eq!(trade.quantity, Some(100.0));
        assert_eq!(trade.fees, 10.0);
        assert_eq!(trade.status, Status::Closed);
    }

    #[tokio::test]
    async fn test_insert_trade_defaults() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "MSFT")
            .await
            .expect("Failed to create instrument");

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "MSFT".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 3, 1).unwrap(),
            direction: Direction::Short,
            quantity: None,
            entry_price: 400.0,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None, // Should default to Closed
        };

        let trade = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .expect("Failed to insert trade");

        assert_eq!(trade.fees, 0.0); // Default
        assert_eq!(trade.status, Status::Closed); // Default
        assert!(trade.quantity.is_none());
        assert!(trade.exit_price.is_none());
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "GOOGL")
            .await
            .unwrap();

        let input = create_test_trade_input(&account_id, "GOOGL");
        let inserted = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .unwrap();

        let fetched = TradeRepository::get_by_id(&pool, &inserted.id)
            .await
            .expect("Query failed")
            .expect("Trade not found");

        assert_eq!(inserted.id, fetched.id);
        assert_eq!(fetched.symbol, "GOOGL");
    }

    #[tokio::test]
    async fn test_get_by_id_not_found() {
        let pool = create_test_db().await;

        let result = TradeRepository::get_by_id(&pool, "nonexistent-id")
            .await
            .expect("Query failed");

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_trades_all() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "TSLA")
            .await
            .unwrap();

        // Insert multiple trades
        for i in 1..=3 {
            let mut input = create_test_trade_input(&account_id, "TSLA");
            input.trade_number = Some(i);
            input.trade_date = NaiveDate::from_ymd_opt(2024, 1, i as u32).unwrap();
            TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
                .await
                .unwrap();
        }

        let trades = TradeRepository::get_trades(&pool, &user_id, None, None, None, None)
            .await
            .expect("Failed to get trades");

        assert_eq!(trades.len(), 3);
    }

    #[tokio::test]
    async fn test_get_trades_filter_by_account() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        // Create second account
        sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
            .bind("account2")
            .bind(&user_id)
            .bind("Account 2")
            .bind("USD")
            .execute(&pool)
            .await
            .unwrap();

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .unwrap();

        // Insert trades in both accounts
        let mut input1 = create_test_trade_input(&account_id, "AAPL");
        input1.trade_number = Some(1);
        TradeRepository::insert(&pool, &user_id, &instrument.id, &input1)
            .await
            .unwrap();

        let mut input2 = create_test_trade_input("account2", "AAPL");
        input2.trade_number = Some(2);
        TradeRepository::insert(&pool, &user_id, &instrument.id, &input2)
            .await
            .unwrap();

        // Filter by first account
        let trades = TradeRepository::get_trades(&pool, &user_id, Some(&account_id), None, None, None)
            .await
            .expect("Failed to get trades");

        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].account_id, account_id);
    }

    #[tokio::test]
    async fn test_get_trades_filter_by_date_range() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "NVDA")
            .await
            .unwrap();

        // Insert trades on different dates
        for day in [5, 10, 15, 20, 25] {
            let mut input = create_test_trade_input(&account_id, "NVDA");
            input.trade_date = NaiveDate::from_ymd_opt(2024, 1, day).unwrap();
            input.trade_number = Some(day as i32);
            TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
                .await
                .unwrap();
        }

        // Filter by date range (10-20)
        let start = NaiveDate::from_ymd_opt(2024, 1, 10).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 20).unwrap();

        let trades = TradeRepository::get_trades(&pool, &user_id, None, Some(start), Some(end), None)
            .await
            .expect("Failed to get trades");

        assert_eq!(trades.len(), 3); // Days 10, 15, 20
    }

    #[tokio::test]
    async fn test_get_trades_filter_by_status() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "AMD")
            .await
            .unwrap();

        // Insert closed trade
        let mut closed_input = create_test_trade_input(&account_id, "AMD");
        closed_input.status = Some(Status::Closed);
        TradeRepository::insert(&pool, &user_id, &instrument.id, &closed_input)
            .await
            .unwrap();

        // Insert open trade
        let mut open_input = create_test_trade_input(&account_id, "AMD");
        open_input.status = Some(Status::Open);
        open_input.exit_price = None;
        TradeRepository::insert(&pool, &user_id, &instrument.id, &open_input)
            .await
            .unwrap();

        // Filter by closed status
        let closed_trades = TradeRepository::get_trades(&pool, &user_id, None, None, None, Some(Status::Closed))
            .await
            .expect("Failed to get trades");

        assert_eq!(closed_trades.len(), 1);
        assert_eq!(closed_trades[0].status, Status::Closed);

        // Filter by open status
        let open_trades = TradeRepository::get_trades(&pool, &user_id, None, None, None, Some(Status::Open))
            .await
            .expect("Failed to get trades");

        assert_eq!(open_trades.len(), 1);
        assert_eq!(open_trades[0].status, Status::Open);
    }

    #[tokio::test]
    async fn test_get_trades_ordering() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "META")
            .await
            .unwrap();

        // Insert in non-chronological order
        for day in [15, 5, 25, 10, 20] {
            let mut input = create_test_trade_input(&account_id, "META");
            input.trade_date = NaiveDate::from_ymd_opt(2024, 1, day).unwrap();
            input.trade_number = Some(day as i32);
            TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
                .await
                .unwrap();
        }

        let trades = TradeRepository::get_trades(&pool, &user_id, None, None, None, None)
            .await
            .expect("Failed to get trades");

        // Should be ordered by date DESC
        assert_eq!(trades[0].trade_date.day(), 25);
        assert_eq!(trades[1].trade_date.day(), 20);
        assert_eq!(trades[2].trade_date.day(), 15);
        assert_eq!(trades[3].trade_date.day(), 10);
        assert_eq!(trades[4].trade_date.day(), 5);
    }

    #[tokio::test]
    async fn test_update_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .unwrap();

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .unwrap();

        // Update trade
        let update_input = UpdateTradeInput {
            account_id: None,
            symbol: None,
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: Some(200.0), // Changed
            entry_price: None,
            exit_price: Some(160.0), // Changed
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: Some(15.0), // Changed
            strategy: Some("swing".to_string()), // Changed
            notes: None,
            status: None,
        };

        let updated = TradeRepository::update(&pool, &trade.id, None, &update_input)
            .await
            .expect("Failed to update trade");

        assert_eq!(updated.quantity, Some(200.0));
        assert_eq!(updated.exit_price, Some(160.0));
        assert_eq!(updated.fees, 15.0);
        assert_eq!(updated.strategy, Some("swing".to_string()));
        // Unchanged fields should remain the same
        assert_eq!(updated.entry_price, 150.0);
        assert_eq!(updated.direction, Direction::Long);
    }

    #[tokio::test]
    async fn test_update_trade_change_instrument() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument1 = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .unwrap();
        let instrument2 = InstrumentRepository::get_or_create(&pool, "GOOGL")
            .await
            .unwrap();

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeRepository::insert(&pool, &user_id, &instrument1.id, &input)
            .await
            .unwrap();

        let update_input = UpdateTradeInput {
            account_id: None,
            symbol: Some("GOOGL".to_string()),
            trade_number: None,
            trade_date: None,
            direction: None,
            quantity: None,
            entry_price: None,
            exit_price: None,
            stop_loss_price: None,
            entry_time: None,
            exit_time: None,
            fees: None,
            strategy: None,
            notes: None,
            status: None,
        };

        let updated = TradeRepository::update(&pool, &trade.id, Some(&instrument2.id), &update_input)
            .await
            .expect("Failed to update trade");

        assert_eq!(updated.instrument_id, instrument2.id);
        assert_eq!(updated.symbol, "GOOGL");
    }

    #[tokio::test]
    async fn test_delete_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .unwrap();

        let input = create_test_trade_input(&account_id, "AAPL");
        let trade = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .unwrap();

        // Verify trade exists
        assert!(TradeRepository::get_by_id(&pool, &trade.id).await.unwrap().is_some());

        // Delete trade
        TradeRepository::delete(&pool, &trade.id)
            .await
            .expect("Failed to delete trade");

        // Verify trade is deleted
        assert!(TradeRepository::get_by_id(&pool, &trade.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_get_trades_user_isolation() {
        let pool = create_test_db().await;

        // Create two users with accounts
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

        sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
            .bind("acc1")
            .bind("user1")
            .bind("User1 Account")
            .bind("USD")
            .execute(&pool)
            .await
            .unwrap();

        sqlx::query("INSERT INTO accounts (id, user_id, name, base_currency) VALUES (?, ?, ?, ?)")
            .bind("acc2")
            .bind("user2")
            .bind("User2 Account")
            .bind("USD")
            .execute(&pool)
            .await
            .unwrap();

        let instrument = InstrumentRepository::get_or_create(&pool, "AAPL")
            .await
            .unwrap();

        // Insert trades for each user
        let mut input1 = create_test_trade_input("acc1", "AAPL");
        input1.trade_number = Some(1);
        TradeRepository::insert(&pool, "user1", &instrument.id, &input1)
            .await
            .unwrap();

        let mut input2 = create_test_trade_input("acc2", "AAPL");
        input2.trade_number = Some(2);
        TradeRepository::insert(&pool, "user2", &instrument.id, &input2)
            .await
            .unwrap();

        // Verify user isolation
        let user1_trades = TradeRepository::get_trades(&pool, "user1", None, None, None, None)
            .await
            .unwrap();
        let user2_trades = TradeRepository::get_trades(&pool, "user2", None, None, None, None)
            .await
            .unwrap();

        assert_eq!(user1_trades.len(), 1);
        assert_eq!(user2_trades.len(), 1);
        assert_eq!(user1_trades[0].trade_number, Some(1));
        assert_eq!(user2_trades[0].trade_number, Some(2));
    }

    #[tokio::test]
    async fn test_short_trade() {
        let pool = create_test_db().await;
        let (user_id, account_id) = setup_test_user_and_account(&pool).await;

        let instrument = InstrumentRepository::get_or_create(&pool, "TSLA")
            .await
            .unwrap();

        let input = CreateTradeInput {
            account_id: account_id.clone(),
            symbol: "TSLA".to_string(),
            asset_class: None,
            trade_number: None,
            trade_date: NaiveDate::from_ymd_opt(2024, 2, 1).unwrap(),
            direction: Direction::Short,
            quantity: Some(50.0),
            entry_price: 200.0,
            exit_price: Some(180.0),
            stop_loss_price: Some(210.0),
            entry_time: None,
            exit_time: None,
            fees: Some(5.0),
            strategy: None,
            notes: None,
            status: Some(Status::Closed),
        };

        let trade = TradeRepository::insert(&pool, &user_id, &instrument.id, &input)
            .await
            .expect("Failed to insert short trade");

        assert_eq!(trade.direction, Direction::Short);
        assert_eq!(trade.entry_price, 200.0);
        assert_eq!(trade.exit_price, Some(180.0));
    }
}
