use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// Daily performance aggregation for calendar view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyPerformance {
    pub date: NaiveDate,
    pub realized_net_pnl: f64,
    pub trade_count: i32,
    pub win_count: i32,
    pub loss_count: i32,
}

/// Period metrics for dashboard analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodMetrics {
    pub total_net_pnl: f64,
    pub trade_count: i32,
    pub win_count: i32,
    pub loss_count: i32,
    pub breakeven_count: i32,
    pub win_rate: Option<f64>,
    pub avg_win: Option<f64>,
    pub avg_loss: Option<f64>,
    pub profit_factor: Option<f64>,
    pub expectancy: Option<f64>,
    pub max_drawdown: f64,
    pub max_win_streak: i32,
    pub max_loss_streak: i32,
}

impl Default for PeriodMetrics {
    fn default() -> Self {
        Self {
            total_net_pnl: 0.0,
            trade_count: 0,
            win_count: 0,
            loss_count: 0,
            breakeven_count: 0,
            win_rate: None,
            avg_win: None,
            avg_loss: None,
            profit_factor: None,
            expectancy: None,
            max_drawdown: 0.0,
            max_win_streak: 0,
            max_loss_streak: 0,
        }
    }
}

/// Point on the equity curve
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquityPoint {
    pub date: NaiveDate,
    pub cumulative_pnl: f64,
    pub drawdown: f64,
}
