use chrono::NaiveDate;
use tauri::State;
use crate::models::{DailyPerformance, EquityPoint, PeriodMetrics};
use crate::services::MetricsService;
use crate::AppState;

#[tauri::command]
pub async fn get_daily_performance(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
    account_id: Option<String>,
) -> Result<Vec<DailyPerformance>, String> {
    let start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid start date: {}", e))?;
    let end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid end date: {}", e))?;

    MetricsService::get_daily_performance(
        &state.pool,
        &state.user_id,
        account_id.as_deref(),
        start,
        end,
    )
    .await
}

#[tauri::command]
pub async fn get_period_metrics(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
    account_id: Option<String>,
) -> Result<PeriodMetrics, String> {
    let start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid start date: {}", e))?;
    let end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid end date: {}", e))?;

    MetricsService::get_period_metrics(
        &state.pool,
        &state.user_id,
        account_id.as_deref(),
        start,
        end,
    )
    .await
}

#[tauri::command]
pub async fn get_all_time_metrics(
    state: State<'_, AppState>,
    account_id: Option<String>,
) -> Result<PeriodMetrics, String> {
    MetricsService::get_all_time_metrics(
        &state.pool,
        &state.user_id,
        account_id.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn get_equity_curve(
    state: State<'_, AppState>,
    account_id: Option<String>,
) -> Result<Vec<EquityPoint>, String> {
    MetricsService::get_equity_curve(
        &state.pool,
        &state.user_id,
        account_id.as_deref(),
    )
    .await
}
