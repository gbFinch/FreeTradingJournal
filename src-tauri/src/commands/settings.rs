use tauri::State;

use crate::services::settings_service::{AlpacaKeysStatus, SettingsService};
use crate::AppState;

#[tauri::command]
pub async fn get_alpaca_keys_status(
    state: State<'_, AppState>,
) -> Result<AlpacaKeysStatus, String> {
    SettingsService::get_alpaca_keys_status(&state.pool).await
}

#[tauri::command]
pub async fn save_alpaca_keys(
    state: State<'_, AppState>,
    api_key_id: String,
    api_secret_key: String,
) -> Result<(), String> {
    SettingsService::save_alpaca_keys(&state.pool, &api_key_id, &api_secret_key).await
}

#[tauri::command]
pub async fn clear_alpaca_keys(state: State<'_, AppState>) -> Result<(), String> {
    SettingsService::clear_alpaca_keys(&state.pool).await
}

#[tauri::command]
pub async fn get_manual_trade_timezone(state: State<'_, AppState>) -> Result<String, String> {
    SettingsService::get_manual_trade_timezone(&state.pool).await
}

#[tauri::command]
pub async fn save_manual_trade_timezone(
    state: State<'_, AppState>,
    timezone: String,
) -> Result<(), String> {
    SettingsService::save_manual_trade_timezone(&state.pool, &timezone).await
}
