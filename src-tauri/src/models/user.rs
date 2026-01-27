use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn new(id: String, email: Option<String>) -> Self {
        Self {
            id,
            email,
            created_at: Utc::now(),
        }
    }
}
