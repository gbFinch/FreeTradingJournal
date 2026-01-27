use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub base_currency: String,
    pub created_at: DateTime<Utc>,
}

impl Account {
    pub fn new(id: String, user_id: String, name: String, base_currency: Option<String>) -> Self {
        Self {
            id,
            user_id,
            name,
            base_currency: base_currency.unwrap_or_else(|| "USD".to_string()),
            created_at: Utc::now(),
        }
    }
}
