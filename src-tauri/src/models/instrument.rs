use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instrument {
    pub id: String,
    pub symbol: String,
    pub asset_class: String,
    pub exchange: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl Instrument {
    pub fn new(id: String, symbol: String, exchange: Option<String>) -> Self {
        Self {
            id,
            symbol,
            asset_class: "stock".to_string(),
            exchange,
            created_at: Utc::now(),
        }
    }
}
