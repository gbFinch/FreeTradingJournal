mod calculations;
mod commands;
mod models;
mod repository;
mod services;

#[cfg(test)]
mod test_utils;

use sqlx::sqlite::SqlitePool;
use tauri::Manager;

pub struct AppState {
    pub pool: SqlitePool,
    pub user_id: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            tauri::async_runtime::block_on(async move {
                // Get app data directory
                let app_data_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data directory");

                // Initialize database
                let pool = repository::init_db(app_data_dir)
                    .await
                    .expect("Failed to initialize database");

                // Ensure default user and account exist
                let (user_id, _account_id) = repository::ensure_defaults(&pool)
                    .await
                    .expect("Failed to create defaults");

                // Store state
                let state = AppState { pool, user_id };
                app_handle.manage(state);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Trade commands
            commands::get_trades,
            commands::get_trade,
            commands::create_trade,
            commands::update_trade,
            commands::delete_trade,
            // Account commands
            commands::get_accounts,
            commands::create_account,
            // Metrics commands
            commands::get_daily_performance,
            commands::get_period_metrics,
            commands::get_all_time_metrics,
            commands::get_equity_curve,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
