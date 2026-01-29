use std::fs;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::services::import_service::{
    AggregatedTrade, ImportPreview, ImportResult, ImportService,
};
use crate::AppState;

/// Open a file picker dialog to select a TLG file
#[tauri::command]
pub async fn select_tlg_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_handle = app
        .dialog()
        .file()
        .add_filter("TLG Files", &["tlg"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_handle {
        Some(path) => {
            // FilePath can be converted to PathBuf for file system access
            let path_buf = path.into_path().map_err(|e| format!("Invalid path: {}", e))?;
            Ok(Some(path_buf.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Preview importing a TLG file
#[tauri::command]
pub async fn preview_tlg_import(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<ImportPreview, String> {
    // Read the file
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Generate preview
    ImportService::preview_import(&state.pool, &content).await
}

/// Execute the import for selected trades
#[tauri::command]
pub async fn execute_tlg_import(
    state: State<'_, AppState>,
    account_id: String,
    trades: Vec<AggregatedTrade>,
    skip_duplicates: bool,
) -> Result<ImportResult, String> {
    ImportService::execute_import(
        &state.pool,
        &state.user_id,
        &account_id,
        trades,
        skip_duplicates,
    )
    .await
}

/// Get executions for a specific trade
#[tauri::command]
pub async fn get_trade_executions(
    state: State<'_, AppState>,
    trade_id: String,
) -> Result<Vec<crate::services::import_service::Execution>, String> {
    ImportService::get_trade_executions(&state.pool, &trade_id).await
}
