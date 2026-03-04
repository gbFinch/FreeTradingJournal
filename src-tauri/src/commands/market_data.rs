use tauri::State;

use crate::services::market_data_service::{parse_candle_kind, Candle, CandleKind, MarketDataService};
use crate::AppState;

#[tauri::command]
pub async fn get_trade_candles(
    state: State<'_, AppState>,
    trade_id: String,
    timeframe: Option<String>,
    force_refresh: Option<bool>,
    candle_kind: Option<String>,
) -> Result<Vec<Candle>, String> {
    let timeframe = timeframe.unwrap_or_else(|| "5m".to_string());
    let force_refresh = force_refresh.unwrap_or(false);
    let candle_kind = match candle_kind.as_deref() {
        Some(value) => parse_candle_kind(value)?,
        None => CandleKind::Primary,
    };
    MarketDataService::get_trade_candles(
        &state.pool,
        &trade_id,
        &timeframe,
        force_refresh,
        candle_kind,
    )
    .await
}
