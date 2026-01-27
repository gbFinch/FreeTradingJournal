use chrono::NaiveDate;
use tauri::State;
use crate::models::{CreateTradeInput, TradeWithDerived, UpdateTradeInput};
use crate::services::TradeService;
use crate::AppState;

#[tauri::command]
pub async fn get_trades(
    state: State<'_, AppState>,
    account_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<TradeWithDerived>, String> {
    let start = start_date
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
    let end = end_date
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    TradeService::get_all_trades(
        &state.pool,
        &state.user_id,
        account_id.as_deref(),
        start,
        end,
    )
    .await
}

#[tauri::command]
pub async fn get_trade(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<TradeWithDerived>, String> {
    TradeService::get_trade(&state.pool, &id).await
}

#[tauri::command]
pub async fn create_trade(
    state: State<'_, AppState>,
    input: CreateTradeInput,
) -> Result<TradeWithDerived, String> {
    TradeService::create_trade(&state.pool, &state.user_id, input).await
}

#[tauri::command]
pub async fn update_trade(
    state: State<'_, AppState>,
    id: String,
    input: UpdateTradeInput,
) -> Result<TradeWithDerived, String> {
    TradeService::update_trade(&state.pool, &id, input).await
}

#[tauri::command]
pub async fn delete_trade(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    TradeService::delete_trade(&state.pool, &id).await
}
