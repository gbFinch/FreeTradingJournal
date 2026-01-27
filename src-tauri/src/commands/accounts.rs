use tauri::State;
use crate::models::Account;
use crate::repository::AccountRepository;
use crate::AppState;

#[tauri::command]
pub async fn get_accounts(
    state: State<'_, AppState>,
) -> Result<Vec<Account>, String> {
    AccountRepository::get_accounts(&state.pool, &state.user_id)
        .await
        .map_err(|e| format!("Failed to get accounts: {}", e))
}

#[tauri::command]
pub async fn create_account(
    state: State<'_, AppState>,
    name: String,
    base_currency: Option<String>,
) -> Result<Account, String> {
    AccountRepository::create(
        &state.pool,
        &state.user_id,
        &name,
        base_currency.as_deref(),
    )
    .await
    .map_err(|e| format!("Failed to create account: {}", e))
}
