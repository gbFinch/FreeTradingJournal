use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// TLG trade action types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TlgAction {
    BuyToOpen,
    SellToClose,
    SellToOpen,
    BuyToClose,
}

impl TlgAction {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "BUYTOOPEN" => Some(TlgAction::BuyToOpen),
            "SELLTOCLOSE" => Some(TlgAction::SellToClose),
            "SELLTOOPEN" => Some(TlgAction::SellToOpen),
            "BUYTOCLOSE" => Some(TlgAction::BuyToClose),
            _ => None,
        }
    }

    /// Returns true if this action opens a position
    pub fn is_opening(&self) -> bool {
        matches!(self, TlgAction::BuyToOpen | TlgAction::SellToOpen)
    }

    /// Returns true if this action closes a position
    pub fn is_closing(&self) -> bool {
        matches!(self, TlgAction::SellToClose | TlgAction::BuyToClose)
    }

    /// Returns true if this is a buy action (long entry or short exit)
    pub fn is_buy(&self) -> bool {
        matches!(self, TlgAction::BuyToOpen | TlgAction::BuyToClose)
    }
}

/// Asset type in TLG file
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TlgAssetType {
    Stock,
    Option,
}

/// Option contract details parsed from OCC symbol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptionDetails {
    pub underlying: String,
    pub expiration_date: NaiveDate,
    pub option_type: OptionType,
    pub strike_price: f64,
}

/// Option type (call or put)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OptionType {
    Call,
    Put,
}

/// A parsed execution from a TLG file line
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlgExecution {
    pub broker_execution_id: String,
    pub symbol: String,
    pub name: String,
    pub exchange: String,
    pub action: TlgAction,
    pub execution_date: NaiveDate,
    pub execution_time: String,
    pub currency: String,
    pub quantity: f64, // Positive for buys, negative for sells
    pub multiplier: f64,
    pub price: f64,
    pub total: f64,
    pub fees: f64, // Stored as negative in TLG
    pub fx_rate: Option<f64>,
    pub asset_type: TlgAssetType,
    pub option_details: Option<OptionDetails>,
}

impl TlgExecution {
    /// Returns the absolute quantity (always positive)
    pub fn abs_quantity(&self) -> f64 {
        self.quantity.abs()
    }

    /// Returns the absolute fees (TLG stores as negative)
    pub fn abs_fees(&self) -> f64 {
        self.fees.abs()
    }

    /// Returns the underlying symbol (for stocks: symbol, for options: underlying)
    pub fn underlying_symbol(&self) -> &str {
        match &self.option_details {
            Some(details) => &details.underlying,
            None => &self.symbol,
        }
    }
}

/// Parse error with line information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlgParseError {
    pub line_number: usize,
    pub line_content: String,
    pub error: String,
}

/// Result of parsing a TLG file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlgParseResult {
    pub executions: Vec<TlgExecution>,
    pub errors: Vec<TlgParseError>,
}

/// Parse an entire TLG file content
pub fn parse_tlg_file(content: &str) -> TlgParseResult {
    let mut executions = Vec::new();
    let mut errors = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        let line_number = line_idx + 1;
        let line = line.trim();

        if line.is_empty() {
            continue;
        }

        // Check for transaction lines
        if line.starts_with("STK_TRD|") {
            match parse_stock_transaction(line) {
                Ok(execution) => executions.push(execution),
                Err(e) => errors.push(TlgParseError {
                    line_number,
                    line_content: line.to_string(),
                    error: e,
                }),
            }
        } else if line.starts_with("OPT_TRD|") {
            match parse_option_transaction(line) {
                Ok(execution) => executions.push(execution),
                Err(e) => errors.push(TlgParseError {
                    line_number,
                    line_content: line.to_string(),
                    error: e,
                }),
            }
        }
        // Other lines (headers, account info, etc.) are ignored
    }

    TlgParseResult { executions, errors }
}

/// Parse a stock transaction line
/// Format: STK_TRD|trade_id|symbol|name|exchange|action|flags|date|time|currency|quantity|multiplier|price|total|fees|fx_rate
fn parse_stock_transaction(line: &str) -> Result<TlgExecution, String> {
    let fields: Vec<&str> = line.split('|').collect();

    if fields.len() < 16 {
        return Err(format!(
            "Invalid stock transaction: expected 16 fields, got {}",
            fields.len()
        ));
    }

    let broker_execution_id = fields[1].to_string();
    let symbol = fields[2].to_string();
    let name = fields[3].to_string();
    let exchange = fields[4].to_string();

    let action = TlgAction::from_str(fields[5])
        .ok_or_else(|| format!("Unknown action: {}", fields[5]))?;

    // fields[6] is flags - we don't need them for now

    let execution_date = parse_date(fields[7])?;
    let execution_time = fields[8].to_string();
    let currency = fields[9].to_string();

    let quantity = fields[10]
        .parse::<f64>()
        .map_err(|_| format!("Invalid quantity: {}", fields[10]))?;

    let multiplier = fields[11]
        .parse::<f64>()
        .map_err(|_| format!("Invalid multiplier: {}", fields[11]))?;

    let price = fields[12]
        .parse::<f64>()
        .map_err(|_| format!("Invalid price: {}", fields[12]))?;

    let total = fields[13]
        .parse::<f64>()
        .map_err(|_| format!("Invalid total: {}", fields[13]))?;

    let fees = fields[14]
        .parse::<f64>()
        .map_err(|_| format!("Invalid fees: {}", fields[14]))?;

    let fx_rate = if fields.len() > 15 && !fields[15].is_empty() {
        fields[15].parse::<f64>().ok()
    } else {
        None
    };

    Ok(TlgExecution {
        broker_execution_id,
        symbol,
        name,
        exchange,
        action,
        execution_date,
        execution_time,
        currency,
        quantity,
        multiplier,
        price,
        total,
        fees,
        fx_rate,
        asset_type: TlgAssetType::Stock,
        option_details: None,
    })
}

/// Parse an option transaction line
/// Format: OPT_TRD|trade_id|contract_symbol|name|exchange|action|flags|date|time|currency|quantity|multiplier|price|total|fees|fx_rate
fn parse_option_transaction(line: &str) -> Result<TlgExecution, String> {
    let fields: Vec<&str> = line.split('|').collect();

    if fields.len() < 16 {
        return Err(format!(
            "Invalid option transaction: expected 16 fields, got {}",
            fields.len()
        ));
    }

    let broker_execution_id = fields[1].to_string();
    let contract_symbol = fields[2].to_string();
    let name = fields[3].to_string();
    let exchange = fields[4].to_string();

    let action = TlgAction::from_str(fields[5])
        .ok_or_else(|| format!("Unknown action: {}", fields[5]))?;

    // fields[6] is flags - we don't need them for now

    let execution_date = parse_date(fields[7])?;
    let execution_time = fields[8].to_string();
    let currency = fields[9].to_string();

    let quantity = fields[10]
        .parse::<f64>()
        .map_err(|_| format!("Invalid quantity: {}", fields[10]))?;

    let multiplier = fields[11]
        .parse::<f64>()
        .map_err(|_| format!("Invalid multiplier: {}", fields[11]))?;

    let price = fields[12]
        .parse::<f64>()
        .map_err(|_| format!("Invalid price: {}", fields[12]))?;

    let total = fields[13]
        .parse::<f64>()
        .map_err(|_| format!("Invalid total: {}", fields[13]))?;

    let fees = fields[14]
        .parse::<f64>()
        .map_err(|_| format!("Invalid fees: {}", fields[14]))?;

    let fx_rate = if fields.len() > 15 && !fields[15].is_empty() {
        fields[15].parse::<f64>().ok()
    } else {
        None
    };

    // Parse option details from contract symbol
    let option_details = parse_option_symbol(&contract_symbol)?;

    Ok(TlgExecution {
        broker_execution_id,
        symbol: contract_symbol,
        name,
        exchange,
        action,
        execution_date,
        execution_time,
        currency,
        quantity,
        multiplier,
        price,
        total,
        fees,
        fx_rate,
        asset_type: TlgAssetType::Option,
        option_details: Some(option_details),
    })
}

/// Parse a date in YYYYMMDD format
fn parse_date(s: &str) -> Result<NaiveDate, String> {
    if s.len() != 8 {
        return Err(format!("Invalid date format: {}", s));
    }

    let year = s[0..4]
        .parse::<i32>()
        .map_err(|_| format!("Invalid year in date: {}", s))?;
    let month = s[4..6]
        .parse::<u32>()
        .map_err(|_| format!("Invalid month in date: {}", s))?;
    let day = s[6..8]
        .parse::<u32>()
        .map_err(|_| format!("Invalid day in date: {}", s))?;

    NaiveDate::from_ymd_opt(year, month, day)
        .ok_or_else(|| format!("Invalid date: {}", s))
}

/// Parse an OCC option symbol to extract contract details
/// Format: AAPL  250905C00240000
///         │     │     ││
///         │     │     │└── Strike price * 1000 (240000 = $240.00)
///         │     │     └─── Option type: C=Call, P=Put
///         │     └───────── Expiration: YYMMDD (250905 = Sep 5, 2025)
///         └─────────────── Underlying symbol (padded to 6 chars)
pub fn parse_option_symbol(contract: &str) -> Result<OptionDetails, String> {
    // Remove any extra whitespace
    let contract = contract.trim();

    if contract.len() < 15 {
        return Err(format!(
            "Invalid option contract symbol: {} (too short)",
            contract
        ));
    }

    // Find the position where the date/strike info starts
    // The underlying symbol is padded with spaces to 6 characters
    // But some symbols might be longer, so we look for the pattern

    // Try to find the date portion (YYMMDD followed by C or P)
    let mut underlying_end = 0;
    let mut date_start = 0;

    for i in 0..contract.len() {
        if i + 7 <= contract.len() {
            let potential_date = &contract[i..i + 6];
            let potential_type = contract.chars().nth(i + 6);

            // Check if this looks like a date followed by C or P
            if potential_date.chars().all(|c| c.is_ascii_digit())
                && matches!(potential_type, Some('C') | Some('P'))
            {
                underlying_end = i;
                date_start = i;
                break;
            }
        }
    }

    if underlying_end == 0 {
        return Err(format!(
            "Could not find date portion in option symbol: {}",
            contract
        ));
    }

    let underlying = contract[..underlying_end].trim().to_string();

    if underlying.is_empty() {
        return Err(format!(
            "Empty underlying symbol in option contract: {}",
            contract
        ));
    }

    // Parse expiration date (YYMMDD)
    let date_str = &contract[date_start..date_start + 6];
    let year = date_str[0..2]
        .parse::<i32>()
        .map_err(|_| format!("Invalid year in option date: {}", date_str))?;
    let month = date_str[2..4]
        .parse::<u32>()
        .map_err(|_| format!("Invalid month in option date: {}", date_str))?;
    let day = date_str[4..6]
        .parse::<u32>()
        .map_err(|_| format!("Invalid day in option date: {}", date_str))?;

    // Convert 2-digit year to 4-digit (assumes 2000s)
    let full_year = 2000 + year;

    let expiration_date = NaiveDate::from_ymd_opt(full_year, month, day)
        .ok_or_else(|| format!("Invalid expiration date: {}", date_str))?;

    // Parse option type
    let type_char = contract.chars().nth(date_start + 6).unwrap();
    let option_type = match type_char {
        'C' => OptionType::Call,
        'P' => OptionType::Put,
        _ => return Err(format!("Invalid option type: {}", type_char)),
    };

    // Parse strike price (stored as price * 1000)
    let strike_str = &contract[date_start + 7..];
    let strike_raw = strike_str
        .parse::<f64>()
        .map_err(|_| format!("Invalid strike price: {}", strike_str))?;
    let strike_price = strike_raw / 1000.0;

    Ok(OptionDetails {
        underlying,
        expiration_date,
        option_type,
        strike_price,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_date() {
        let date = parse_date("20260127").unwrap();
        assert_eq!(date, NaiveDate::from_ymd_opt(2026, 1, 27).unwrap());
    }

    #[test]
    fn test_parse_date_invalid() {
        assert!(parse_date("2026012").is_err()); // Too short
        assert!(parse_date("20261327").is_err()); // Invalid month
    }

    #[test]
    fn test_parse_option_symbol() {
        let details = parse_option_symbol("AAPL  250905C00240000").unwrap();
        assert_eq!(details.underlying, "AAPL");
        assert_eq!(
            details.expiration_date,
            NaiveDate::from_ymd_opt(2025, 9, 5).unwrap()
        );
        assert_eq!(details.option_type, OptionType::Call);
        assert_eq!(details.strike_price, 240.0);
    }

    #[test]
    fn test_parse_option_symbol_put() {
        let details = parse_option_symbol("AMD   251017P00145000").unwrap();
        assert_eq!(details.underlying, "AMD");
        assert_eq!(
            details.expiration_date,
            NaiveDate::from_ymd_opt(2025, 10, 17).unwrap()
        );
        assert_eq!(details.option_type, OptionType::Put);
        assert_eq!(details.strike_price, 145.0);
    }

    #[test]
    fn test_parse_stock_transaction() {
        let line = "STK_TRD|1055305319|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:38:25|USD|100.00|1.00|260.595|26059.50|-1.00|0.83654";
        let exec = parse_stock_transaction(line).unwrap();

        assert_eq!(exec.broker_execution_id, "1055305319");
        assert_eq!(exec.symbol, "AAPL");
        assert_eq!(exec.action, TlgAction::BuyToOpen);
        assert_eq!(
            exec.execution_date,
            NaiveDate::from_ymd_opt(2026, 1, 27).unwrap()
        );
        assert_eq!(exec.execution_time, "09:38:25");
        assert_eq!(exec.quantity, 100.0);
        assert_eq!(exec.price, 260.595);
        assert_eq!(exec.fees, -1.00);
        assert_eq!(exec.asset_type, TlgAssetType::Stock);
        assert!(exec.option_details.is_none());
    }

    #[test]
    fn test_parse_stock_transaction_sell() {
        let line = "STK_TRD|1055344297|AAPL|APPLE INC|IBKRATS|SELLTOCLOSE|C|20260127|09:49:27|USD|-70.00|1.00|260.925|-18264.75|-1.01365|0.83654";
        let exec = parse_stock_transaction(line).unwrap();

        assert_eq!(exec.action, TlgAction::SellToClose);
        assert_eq!(exec.quantity, -70.0);
        assert_eq!(exec.abs_quantity(), 70.0);
    }

    #[test]
    fn test_parse_option_transaction() {
        let line = "OPT_TRD|931660771|AAPL  250905C00240000|AAPL 05SEP25 240 C|MEMX,MIAX|BUYTOOPEN|O|20250904|09:49:58|USD|5.00|100.00|1.45|725.00|-3.96325|0.85835";
        let exec = parse_option_transaction(line).unwrap();

        assert_eq!(exec.broker_execution_id, "931660771");
        assert_eq!(exec.symbol, "AAPL  250905C00240000");
        assert_eq!(exec.action, TlgAction::BuyToOpen);
        assert_eq!(exec.quantity, 5.0);
        assert_eq!(exec.multiplier, 100.0);
        assert_eq!(exec.price, 1.45);
        assert_eq!(exec.asset_type, TlgAssetType::Option);

        let details = exec.option_details.unwrap();
        assert_eq!(details.underlying, "AAPL");
        assert_eq!(
            details.expiration_date,
            NaiveDate::from_ymd_opt(2025, 9, 5).unwrap()
        );
        assert_eq!(details.option_type, OptionType::Call);
        assert_eq!(details.strike_price, 240.0);
    }

    #[test]
    fn test_tlg_action_is_opening() {
        assert!(TlgAction::BuyToOpen.is_opening());
        assert!(TlgAction::SellToOpen.is_opening());
        assert!(!TlgAction::SellToClose.is_opening());
        assert!(!TlgAction::BuyToClose.is_opening());
    }

    #[test]
    fn test_tlg_action_is_closing() {
        assert!(!TlgAction::BuyToOpen.is_closing());
        assert!(!TlgAction::SellToOpen.is_closing());
        assert!(TlgAction::SellToClose.is_closing());
        assert!(TlgAction::BuyToClose.is_closing());
    }

    #[test]
    fn test_parse_tlg_file() {
        let content = r#"ACCOUNT_INFORMATION
ACT_INF|U6498184|Test User|Individual|Address

STOCK_TRANSACTIONS
STK_TRD|1055305319|AAPL|APPLE INC|DARK|BUYTOOPEN|O|20260127|09:38:25|USD|100.00|1.00|260.595|26059.50|-1.00|0.83654
STK_TRD|1055344297|AAPL|APPLE INC|IBKRATS|SELLTOCLOSE|C|20260127|09:49:27|USD|-70.00|1.00|260.925|-18264.75|-1.01365|0.83654

OPTION_TRANSACTIONS
OPT_TRD|931660771|AAPL  250905C00240000|AAPL 05SEP25 240 C|MEMX,MIAX|BUYTOOPEN|O|20250904|09:49:58|USD|5.00|100.00|1.45|725.00|-3.96325|0.85835
"#;

        let result = parse_tlg_file(content);

        assert_eq!(result.executions.len(), 3);
        assert!(result.errors.is_empty());

        // First execution is stock buy
        assert_eq!(result.executions[0].symbol, "AAPL");
        assert_eq!(result.executions[0].asset_type, TlgAssetType::Stock);

        // Third execution is option
        assert_eq!(result.executions[2].asset_type, TlgAssetType::Option);
    }
}
