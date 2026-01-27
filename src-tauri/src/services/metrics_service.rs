use chrono::NaiveDate;
use sqlx::sqlite::SqlitePool;
use crate::calculations::{calculate_daily_metrics, calculate_equity_curve_owned, calculate_period_metrics};
use crate::models::{DailyPerformance, EquityPoint, PeriodMetrics};
use crate::services::TradeService;

pub struct MetricsService;

impl MetricsService {
    /// Get daily performance for a date range
    pub async fn get_daily_performance(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<DailyPerformance>, String> {
        let trades = TradeService::get_trades(
            pool,
            user_id,
            account_id,
            Some(start_date),
            Some(end_date),
        )
        .await?;

        Ok(calculate_daily_metrics(&trades))
    }

    /// Get period metrics for a date range
    pub async fn get_period_metrics(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<PeriodMetrics, String> {
        let trades = TradeService::get_trades(
            pool,
            user_id,
            account_id,
            Some(start_date),
            Some(end_date),
        )
        .await?;

        Ok(calculate_period_metrics(&trades))
    }

    /// Get all-time period metrics
    pub async fn get_all_time_metrics(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
    ) -> Result<PeriodMetrics, String> {
        let trades = TradeService::get_trades(pool, user_id, account_id, None, None).await?;
        Ok(calculate_period_metrics(&trades))
    }

    /// Get equity curve
    pub async fn get_equity_curve(
        pool: &SqlitePool,
        user_id: &str,
        account_id: Option<&str>,
    ) -> Result<Vec<EquityPoint>, String> {
        let mut trades = TradeService::get_trades(pool, user_id, account_id, None, None).await?;

        // Sort by date for correct equity curve
        trades.sort_by_key(|t| t.trade.trade_date);

        Ok(calculate_equity_curve_owned(&trades))
    }
}
