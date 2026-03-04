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
