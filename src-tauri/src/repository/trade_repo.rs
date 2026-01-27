use chrono::{NaiveDate, Utc};
use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use crate::models::{Direction, Status, Trade, CreateTradeInput, UpdateTradeInput};

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
            SELECT t.*, i.symbol
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
            SELECT t.*, i.symbol
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
