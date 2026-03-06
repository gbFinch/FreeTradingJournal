use std::collections::{BTreeMap, HashMap};

use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, SecondsFormat, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

const ALPACA_DATA_BASE_URL: &str = "https://data.alpaca.markets";
const ALPACA_FETCH_LIMIT: i64 = 10_000;
const MAX_CHART_1M_BARS: i64 = 4_000;

const KEY_ALPACA_API_KEY_ID: &str = "alpaca_api_key_id";
const KEY_ALPACA_API_SECRET_KEY: &str = "alpaca_api_secret_key";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candle {
    pub time: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketTapeQuote {
    pub symbol: String,
    pub price: f64,
    pub change: f64,
    pub change_percent: f64,
}

#[derive(Debug, Clone, Copy)]
enum MarketKind {
    Stock,
    Option,
}

#[derive(Debug, Clone, Copy)]
pub enum CandleKind {
    Primary,
    Underlying,
}

pub fn parse_candle_kind(value: &str) -> Result<CandleKind, String> {
    match value {
        "primary" => Ok(CandleKind::Primary),
        "underlying" => Ok(CandleKind::Underlying),
        _ => Err(format!(
            "Unsupported candle kind: {}. Supported: primary, underlying",
            value
        )),
    }
}

struct TradeMarketContext {
    symbol: String,
    market_kind: MarketKind,
    start_ts: i64,
    end_ts: i64,
    estimated_1m_bars: i64,
}

#[derive(Debug, Deserialize)]
struct AlpacaStockBarsResponse {
    bars: Vec<AlpacaBar>,
    next_page_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AlpacaSnapshot {
    #[serde(rename = "latestTrade")]
    latest_trade: Option<AlpacaSnapshotTrade>,
    #[serde(rename = "dailyBar")]
    daily_bar: Option<AlpacaSnapshotBar>,
    #[serde(rename = "prevDailyBar")]
    prev_daily_bar: Option<AlpacaSnapshotBar>,
}

#[derive(Debug, Deserialize)]
struct AlpacaSnapshotTrade {
    #[serde(rename = "p")]
    price: f64,
}

#[derive(Debug, Deserialize)]
struct AlpacaSnapshotBar {
    #[serde(rename = "c")]
    close: f64,
}

#[derive(Debug, Deserialize)]
struct AlpacaOptionsBarsResponse {
    bars: HashMap<String, Vec<AlpacaBar>>,
    next_page_token: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct AlpacaBar {
    #[serde(rename = "t")]
    timestamp: String,
    #[serde(rename = "o")]
    open: f64,
    #[serde(rename = "h")]
    high: f64,
    #[serde(rename = "l")]
    low: f64,
    #[serde(rename = "c")]
    close: f64,
    #[serde(rename = "v")]
    volume: Option<f64>,
}

pub struct MarketDataService;

impl MarketDataService {
    pub async fn get_trade_candles(
        pool: &SqlitePool,
        trade_id: &str,
        timeframe: &str,
        force_refresh: bool,
        candle_kind: CandleKind,
    ) -> Result<Vec<Candle>, String> {
        let bucket_minutes = parse_supported_timeframe(timeframe)?;
        let context = get_trade_market_context(pool, trade_id, candle_kind).await?;
        if context.estimated_1m_bars > MAX_CHART_1M_BARS {
            return Err(format!(
                "Trade is too long for charting at 1-minute resolution ({} bars > max {}).",
                context.estimated_1m_bars, MAX_CHART_1M_BARS
            ));
        }

        let mut one_minute = get_cached_candles(
            pool,
            &context.symbol,
            "1m",
            context.start_ts,
            context.end_ts,
        )
        .await?;

        let cache_missing_window = one_minute.is_empty()
            || one_minute
                .first()
                .map(|c| c.time > context.start_ts)
                .unwrap_or(true)
            || one_minute
                .last()
                .map(|c| c.time < context.end_ts)
                .unwrap_or(true);

        if cache_missing_window || force_refresh {
            let fetched = fetch_alpaca_1m_candles(pool, &context).await?;
            if !fetched.is_empty() {
                cache_candles(
                    pool,
                    &context.symbol,
                    "1m",
                    "alpaca",
                    &fetched,
                    Utc::now().timestamp(),
                )
                .await?;
            }
            one_minute = get_cached_candles(
                pool,
                &context.symbol,
                "1m",
                context.start_ts,
                context.end_ts,
            )
            .await?;
        }

        if one_minute.is_empty() {
            let start_iso = to_iso_timestamp(context.start_ts)?;
            let end_iso = to_iso_timestamp(context.end_ts)?;
            let market = match context.market_kind {
                MarketKind::Stock => "stock",
                MarketKind::Option => "option",
            };
            return Err(format!(
                "No {} 1m candles returned for symbol {} in window {} -> {}. This is usually provider coverage/plan limitation or no trades in that range.",
                market, context.symbol, start_iso, end_iso
            ));
        }

        if bucket_minutes == 1 {
            return Ok(one_minute);
        }

        Ok(aggregate_candles(&one_minute, bucket_minutes))
    }

    pub async fn get_market_tape(
        pool: &SqlitePool,
        symbols: Option<&[String]>,
    ) -> Result<Vec<MarketTapeQuote>, String> {
        let default_symbols = vec![
            "SPY".to_string(),
            "QQQ".to_string(),
            "AAPL".to_string(),
            "NVDA".to_string(),
            "MSFT".to_string(),
            "TSLA".to_string(),
            "AMD".to_string(),
            "META".to_string(),
        ];
        let requested = symbols.unwrap_or(&default_symbols);
        let normalized = normalize_tape_symbols(requested);
        if normalized.is_empty() {
            return Ok(Vec::new());
        }

        fetch_alpaca_market_tape(pool, &normalized).await
    }
}

fn parse_supported_timeframe(timeframe: &str) -> Result<i64, String> {
    match timeframe {
        "1m" => Ok(1),
        "5m" => Ok(5),
        "15m" => Ok(15),
        _ => Err(format!(
            "Unsupported timeframe: {}. Supported: 1m, 5m, 15m",
            timeframe
        )),
    }
}

async fn get_trade_market_context(
    pool: &SqlitePool,
    trade_id: &str,
    candle_kind: CandleKind,
) -> Result<TradeMarketContext, String> {
    let trade_row = sqlx::query(
        r#"
        SELECT
          t.trade_date as trade_date,
          t.entry_time as entry_time,
          t.exit_time as exit_time,
          i.asset_class as asset_class,
          i.symbol as symbol,
          i.underlying_symbol as underlying_symbol
        FROM trades t
        JOIN instruments i ON t.instrument_id = i.id
        WHERE t.id = ?
        "#,
    )
    .bind(trade_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?
    .ok_or_else(|| "Trade not found".to_string())?;

    let symbol: String = trade_row.get("symbol");
    let asset_class: String = trade_row.get("asset_class");
    let underlying_symbol: Option<String> = trade_row.get("underlying_symbol");

    let (market_kind, market_symbol) = if asset_class == "option" {
        match candle_kind {
            CandleKind::Primary => (MarketKind::Option, normalize_option_symbol(&symbol)),
            CandleKind::Underlying => {
                let underlying = underlying_symbol
                    .as_deref()
                    .filter(|v| !v.trim().is_empty())
                    .map(sanitize_market_symbol)
                    .or_else(|| extract_underlying_symbol_from_option(&symbol))
                    .ok_or_else(|| {
                        format!(
                            "Unable to determine underlying symbol for option {}",
                            symbol
                        )
                    })?;
                (MarketKind::Stock, underlying)
            }
        }
    } else {
        (
            MarketKind::Stock,
            sanitize_market_symbol(underlying_symbol.as_deref().unwrap_or(&symbol)),
        )
    };

    let execution_rows = sqlx::query(
        r#"
        SELECT execution_date, execution_time
        FROM trade_executions
        WHERE trade_id = ?
        ORDER BY execution_date ASC, execution_time ASC
        "#,
    )
    .bind(trade_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let mut execution_times: Vec<i64> = execution_rows
        .iter()
        .filter_map(|row| {
            let date: NaiveDate = row.get("execution_date");
            let time: Option<String> = row.get("execution_time");
            parse_date_time(date, time.as_deref()).ok()
        })
        .collect();

    if execution_times.is_empty() {
        let trade_date: NaiveDate = trade_row.get("trade_date");
        let entry_time: Option<String> = trade_row.get("entry_time");
        let exit_time: Option<String> = trade_row.get("exit_time");
        if let Ok(entry_ts) = parse_date_time(trade_date, entry_time.as_deref()) {
            execution_times.push(entry_ts);
        }
        if let Ok(exit_ts) = parse_date_time(trade_date, exit_time.as_deref()) {
            execution_times.push(exit_ts);
        }
    }

    let trade_date: NaiveDate = trade_row.get("trade_date");
    let fallback_ts = parse_date_time(trade_date, Some("09:30:00"))?;
    let start_anchor = execution_times.first().copied().unwrap_or(fallback_ts);
    let end_anchor = execution_times
        .last()
        .copied()
        .unwrap_or(start_anchor + (2 * 60 * 60));
    let estimated_1m_bars = ((end_anchor - start_anchor).max(0) / 60) + 1;

    let window_buffer_seconds = 6 * 60 * 60;
    let delayed_now_ts = Utc::now().timestamp() - (20 * 60);
    let start_ts = start_anchor - window_buffer_seconds;
    let end_ts = (end_anchor + window_buffer_seconds)
        .min(delayed_now_ts)
        .max(start_ts);

    Ok(TradeMarketContext {
        symbol: market_symbol,
        market_kind,
        start_ts,
        end_ts,
        estimated_1m_bars,
    })
}

fn parse_date_time(date: NaiveDate, time: Option<&str>) -> Result<i64, String> {
    let parsed_time = time
        .and_then(parse_trade_time)
        .unwrap_or_else(|| NaiveTime::from_hms_opt(9, 30, 0).expect("valid fallback time"));
    let dt = NaiveDateTime::new(date, parsed_time);
    Ok(DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc).timestamp())
}

fn parse_trade_time(raw: &str) -> Option<NaiveTime> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    NaiveTime::parse_from_str(trimmed, "%H:%M:%S")
        .ok()
        .or_else(|| NaiveTime::parse_from_str(trimmed, "%H:%M").ok())
        .or_else(|| {
            let without_fraction = trimmed.split('.').next().unwrap_or(trimmed);
            NaiveTime::parse_from_str(without_fraction, "%H:%M:%S").ok()
        })
}

fn sanitize_market_symbol(symbol: &str) -> String {
    symbol.replace(' ', "")
}

fn normalize_tape_symbols(symbols: &[String]) -> Vec<String> {
    symbols
        .iter()
        .map(|symbol| sanitize_market_symbol(symbol).to_uppercase())
        .filter(|symbol| !symbol.is_empty())
        .collect()
}

fn extract_underlying_symbol_from_option(symbol: &str) -> Option<String> {
    let normalized_text = symbol.replace('’', "'").trim().to_uppercase();

    // Common case for manual symbols like "TSLA MAR06'26 390 PUT".
    if let Some(first_token) = normalized_text.split_whitespace().next() {
        let token_root: String = first_token
            .chars()
            .take_while(|c| c.is_ascii_alphabetic())
            .collect();
        if (1..=5).contains(&token_root.len()) {
            return Some(token_root);
        }
    }

    let compact = sanitize_market_symbol(&normalized_text);

    if is_occ_option_symbol(&compact) {
        let root: String = compact
            .chars()
            .take_while(|c| c.is_ascii_alphabetic())
            .collect();
        if (1..=5).contains(&root.len()) {
            return Some(root);
        }
    }

    if let Some(occ) = convert_ibkr_like_to_occ(&compact) {
        let root: String = occ
            .chars()
            .take_while(|c| c.is_ascii_alphabetic())
            .collect();
        if (1..=5).contains(&root.len()) {
            return Some(root);
        }
    }

    // Final fallback: take up to first 5 leading letters.
    let fallback: String = compact
        .chars()
        .take_while(|c| c.is_ascii_alphabetic())
        .take(5)
        .collect();
    if fallback.is_empty() {
        None
    } else {
        Some(fallback)
    }
}

fn normalize_option_symbol(symbol: &str) -> String {
    let cleaned = sanitize_market_symbol(symbol)
        .replace('’', "'")
        .to_uppercase();
    if is_occ_option_symbol(&cleaned) {
        return cleaned;
    }

    if let Some(converted) = convert_ibkr_like_to_occ(&cleaned) {
        return converted;
    }

    cleaned
}

fn is_occ_option_symbol(symbol: &str) -> bool {
    let bytes = symbol.as_bytes();
    let root_len = bytes.iter().take_while(|b| b.is_ascii_alphabetic()).count();
    if !(1..=5).contains(&root_len) {
        return false;
    }

    let rem = &symbol[root_len..];
    if rem.len() != 15 {
        return false;
    }

    let date_part = &rem[0..6];
    let cp = rem.as_bytes()[6] as char;
    let strike_part = &rem[7..15];

    date_part.chars().all(|c| c.is_ascii_digit())
        && (cp == 'C' || cp == 'P')
        && strike_part.chars().all(|c| c.is_ascii_digit())
}

fn convert_ibkr_like_to_occ(symbol: &str) -> Option<String> {
    let months = [
        ("JAN", "01"),
        ("FEB", "02"),
        ("MAR", "03"),
        ("APR", "04"),
        ("MAY", "05"),
        ("JUN", "06"),
        ("JUL", "07"),
        ("AUG", "08"),
        ("SEP", "09"),
        ("OCT", "10"),
        ("NOV", "11"),
        ("DEC", "12"),
    ];

    let (root, remainder) = (1..=5).find_map(|candidate_root_len| {
        if candidate_root_len >= symbol.len() {
            return None;
        }
        let root_candidate = &symbol[0..candidate_root_len];
        if !root_candidate.chars().all(|c| c.is_ascii_alphabetic()) {
            return None;
        }
        let rem = &symbol[candidate_root_len..];
        if months.iter().any(|(abbr, _)| rem.starts_with(abbr)) {
            Some((root_candidate, rem))
        } else {
            None
        }
    })?;

    let month_entry = months
        .iter()
        .find(|(abbr, _)| remainder.starts_with(abbr))?;
    let month_abbr = month_entry.0;
    let month_num = month_entry.1;

    let mut i = month_abbr.len();
    let day_start = i;
    while i < remainder.len() && remainder.as_bytes()[i].is_ascii_digit() {
        i += 1;
    }
    if i == day_start {
        return None;
    }
    let day_raw = &remainder[day_start..i];
    let day = if day_raw.len() == 1 {
        format!("0{}", day_raw)
    } else if day_raw.len() == 2 {
        day_raw.to_string()
    } else {
        return None;
    };

    if i >= remainder.len() || remainder.as_bytes()[i] != b'\'' {
        return None;
    }
    i += 1;
    if i + 2 > remainder.len() {
        return None;
    }
    let year = &remainder[i..i + 2];
    if !year.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    i += 2;

    let strike_raw;
    let right = if remainder[i..].ends_with("CALL") {
        strike_raw = &remainder[i..remainder.len() - 4];
        'C'
    } else if remainder[i..].ends_with("PUT") {
        strike_raw = &remainder[i..remainder.len() - 3];
        'P'
    } else if remainder[i..].ends_with('C') {
        strike_raw = &remainder[i..remainder.len() - 1];
        'C'
    } else if remainder[i..].ends_with('P') {
        strike_raw = &remainder[i..remainder.len() - 1];
        'P'
    } else {
        return None;
    };
    if strike_raw.is_empty() {
        return None;
    }
    let strike_value: f64 = strike_raw.parse().ok()?;
    let strike_thousandths = (strike_value * 1000.0).round() as i64;
    if strike_thousandths < 0 {
        return None;
    }
    let strike = format!("{:08}", strike_thousandths);

    Some(format!(
        "{}{}{}{}{}{}",
        root, year, month_num, day, right, strike
    ))
}

async fn get_alpaca_keys(pool: &SqlitePool) -> Result<(String, String), String> {
    let key_id = sqlx::query("SELECT value FROM settings WHERE key = ?")
        .bind(KEY_ALPACA_API_KEY_ID)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to read settings: {}", e))?
        .map(|row| row.get::<String, _>("value"))
        .unwrap_or_default();

    let secret = sqlx::query("SELECT value FROM settings WHERE key = ?")
        .bind(KEY_ALPACA_API_SECRET_KEY)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to read settings: {}", e))?
        .map(|row| row.get::<String, _>("value"))
        .unwrap_or_default();

    if key_id.trim().is_empty() || secret.trim().is_empty() {
        return Err(
            "Alpaca API keys are missing. Go to Settings and save API Key ID and Secret Key."
                .to_string(),
        );
    }

    Ok((key_id, secret))
}

fn to_iso_timestamp(ts: i64) -> Result<String, String> {
    DateTime::<Utc>::from_timestamp(ts, 0)
        .map(|d| d.to_rfc3339_opts(SecondsFormat::Secs, true))
        .ok_or_else(|| format!("Invalid timestamp: {}", ts))
}

async fn fetch_alpaca_1m_candles(
    pool: &SqlitePool,
    context: &TradeMarketContext,
) -> Result<Vec<Candle>, String> {
    let (api_key_id, api_secret_key) = get_alpaca_keys(pool).await?;
    let start_iso = to_iso_timestamp(context.start_ts)?;
    let end_iso = to_iso_timestamp(context.end_ts)?;

    let client = Client::builder()
        .user_agent("TradingJournal/0.1")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let mut all = Vec::new();
    let mut page_token: Option<String> = None;

    loop {
        let fetched = match context.market_kind {
            MarketKind::Stock => {
                fetch_alpaca_stock_page(
                    &client,
                    &api_key_id,
                    &api_secret_key,
                    &context.symbol,
                    &start_iso,
                    &end_iso,
                    page_token.as_deref(),
                )
                .await?
            }
            MarketKind::Option => {
                fetch_alpaca_option_page(
                    &client,
                    &api_key_id,
                    &api_secret_key,
                    &context.symbol,
                    &start_iso,
                    &end_iso,
                    page_token.as_deref(),
                )
                .await?
            }
        };

        all.extend(fetched.0);
        page_token = fetched.1;

        if page_token.is_none() {
            break;
        }
    }

    Ok(normalize_bars_to_candles(all))
}

async fn fetch_alpaca_market_tape(
    pool: &SqlitePool,
    symbols: &[String],
) -> Result<Vec<MarketTapeQuote>, String> {
    let (api_key_id, api_secret_key) = get_alpaca_keys(pool).await?;
    let client = Client::builder()
        .user_agent("TradingJournal/0.1")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let endpoint = format!("{}/v2/stocks/snapshots", ALPACA_DATA_BASE_URL);
    let response = client
        .get(&endpoint)
        .header("APCA-API-KEY-ID", api_key_id)
        .header("APCA-API-SECRET-KEY", api_secret_key)
        .query(&[("symbols", symbols.join(",")), ("feed", "iex".to_string())])
        .send()
        .await
        .map_err(|e| format!("Alpaca market tape request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Alpaca market tape request failed: HTTP {} {}",
            status, body
        ));
    }

    let payload: HashMap<String, AlpacaSnapshot> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Alpaca market tape response: {}", e))?;

    Ok(symbols
        .iter()
        .filter_map(|symbol| {
            let snapshot = payload.get(symbol)?;
            let previous_close = snapshot.prev_daily_bar.as_ref()?.close;
            let price = snapshot
                .latest_trade
                .as_ref()
                .map(|trade| trade.price)
                .or_else(|| snapshot.daily_bar.as_ref().map(|bar| bar.close))
                .unwrap_or(previous_close);
            let change = price - previous_close;
            let change_percent = if previous_close.abs() > f64::EPSILON {
                (change / previous_close) * 100.0
            } else {
                0.0
            };

            Some(MarketTapeQuote {
                symbol: symbol.clone(),
                price,
                change,
                change_percent,
            })
        })
        .collect())
}

async fn fetch_alpaca_stock_page(
    client: &Client,
    api_key_id: &str,
    api_secret_key: &str,
    symbol: &str,
    start_iso: &str,
    end_iso: &str,
    page_token: Option<&str>,
) -> Result<(Vec<AlpacaBar>, Option<String>), String> {
    let endpoint = format!("{}/v2/stocks/{}/bars", ALPACA_DATA_BASE_URL, symbol);

    let mut request = client
        .get(&endpoint)
        .header("APCA-API-KEY-ID", api_key_id)
        .header("APCA-API-SECRET-KEY", api_secret_key)
        .query(&[
            ("timeframe", "1Min"),
            ("start", start_iso),
            ("end", end_iso),
            ("adjustment", "raw"),
            ("feed", "iex"),
            ("limit", &ALPACA_FETCH_LIMIT.to_string()),
        ]);

    if let Some(token) = page_token {
        request = request.query(&[("page_token", token)]);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Alpaca stock request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Alpaca stock request failed: HTTP {} {}",
            status, body
        ));
    }

    let payload: AlpacaStockBarsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Alpaca stock response: {}", e))?;

    Ok((payload.bars, payload.next_page_token))
}

async fn fetch_alpaca_option_page(
    client: &Client,
    api_key_id: &str,
    api_secret_key: &str,
    symbol: &str,
    start_iso: &str,
    end_iso: &str,
    page_token: Option<&str>,
) -> Result<(Vec<AlpacaBar>, Option<String>), String> {
    let endpoint = format!("{}/v1beta1/options/bars", ALPACA_DATA_BASE_URL);

    let mut request = client
        .get(&endpoint)
        .header("APCA-API-KEY-ID", api_key_id)
        .header("APCA-API-SECRET-KEY", api_secret_key)
        .query(&[
            ("symbols", symbol),
            ("timeframe", "1Min"),
            ("start", start_iso),
            ("end", end_iso),
            ("limit", &ALPACA_FETCH_LIMIT.to_string()),
        ]);

    if let Some(token) = page_token {
        request = request.query(&[("page_token", token)]);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Alpaca option request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Alpaca option request failed: HTTP {} {}",
            status, body
        ));
    }

    let payload: AlpacaOptionsBarsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Alpaca option response: {}", e))?;

    let bars = payload
        .bars
        .get(symbol)
        .cloned()
        .or_else(|| payload.bars.values().next().cloned())
        .unwrap_or_default();

    Ok((bars, payload.next_page_token))
}

fn normalize_bars_to_candles(bars: Vec<AlpacaBar>) -> Vec<Candle> {
    let mut by_time = BTreeMap::<i64, Candle>::new();

    for bar in bars {
        let Ok(dt) = DateTime::parse_from_rfc3339(&bar.timestamp) else {
            continue;
        };
        let ts = dt.timestamp();
        by_time.insert(
            ts,
            Candle {
                time: ts,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
            },
        );
    }

    by_time.into_values().collect()
}

fn aggregate_candles(candles: &[Candle], bucket_minutes: i64) -> Vec<Candle> {
    if bucket_minutes <= 1 {
        return candles.to_vec();
    }

    let bucket_seconds = bucket_minutes * 60;
    let mut buckets = BTreeMap::<i64, Candle>::new();

    for candle in candles {
        let bucket_start = candle.time - (candle.time % bucket_seconds);

        match buckets.get_mut(&bucket_start) {
            Some(existing) => {
                existing.high = existing.high.max(candle.high);
                existing.low = existing.low.min(candle.low);
                existing.close = candle.close;
                existing.volume =
                    Some(existing.volume.unwrap_or(0.0) + candle.volume.unwrap_or(0.0));
            }
            None => {
                buckets.insert(
                    bucket_start,
                    Candle {
                        time: bucket_start,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    },
                );
            }
        }
    }

    buckets.into_values().collect()
}

async fn get_cached_candles(
    pool: &SqlitePool,
    symbol: &str,
    timeframe: &str,
    start_ts: i64,
    end_ts: i64,
) -> Result<Vec<Candle>, String> {
    let rows = sqlx::query(
        r#"
        SELECT candle_time, open, high, low, close, volume
        FROM market_candles
        WHERE symbol = ? AND timeframe = ? AND candle_time BETWEEN ? AND ?
        ORDER BY candle_time ASC
        "#,
    )
    .bind(symbol)
    .bind(timeframe)
    .bind(start_ts)
    .bind(end_ts)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(rows
        .iter()
        .map(|row| Candle {
            time: row.get("candle_time"),
            open: row.get("open"),
            high: row.get("high"),
            low: row.get("low"),
            close: row.get("close"),
            volume: row.get("volume"),
        })
        .collect())
}

async fn cache_candles(
    pool: &SqlitePool,
    symbol: &str,
    timeframe: &str,
    source: &str,
    candles: &[Candle],
    fetched_at_epoch: i64,
) -> Result<(), String> {
    if candles.is_empty() {
        return Ok(());
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Database transaction error: {}", e))?;

    for candle in candles {
        sqlx::query(
            r#"
            INSERT INTO market_candles (
                symbol, timeframe, candle_time, open, high, low, close, volume, source, fetched_at_epoch
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, timeframe, candle_time) DO UPDATE SET
                open = excluded.open,
                high = excluded.high,
                low = excluded.low,
                close = excluded.close,
                volume = excluded.volume,
                source = excluded.source,
                fetched_at_epoch = excluded.fetched_at_epoch
            "#,
        )
        .bind(symbol)
        .bind(timeframe)
        .bind(candle.time)
        .bind(candle.open)
        .bind(candle.high)
        .bind(candle.low)
        .bind(candle.close)
        .bind(candle.volume)
        .bind(source)
        .bind(fetched_at_epoch)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to cache market candles: {}", e))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Database commit error: {}", e))?;

    Ok(())
}
