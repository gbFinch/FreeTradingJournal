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
