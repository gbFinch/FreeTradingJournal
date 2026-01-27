# Metrics & Calculations Specification (v1)
Trading Journal Application

---

## 1. Purpose

This document defines **all financial metrics and calculations** used in the Trading Journal application.

Goals:
- Ensure numerical correctness and consistency
- Remove ambiguity in metric definitions
- Prevent UI- or implementation-driven interpretation of data
- Provide a single source of truth for analytics logic

All metrics defined here are **derived**, deterministic, and non-editable by users.

---

## 2. Core Principles

- All calculations are based on **closed trades only**, unless explicitly stated
- Metrics are **account-specific** by default
- All monetary values are expressed in the account base currency
- Calculations must be reproducible from raw trade data
- Open trades are excluded from realized performance metrics

---

## 3. Trade-Level Calculations

### 3.1 Gross PnL

**Definition**  
Profit or loss before fees.

**Formula**
- Long:
(exit_price - entry_price) × quantity

- Short:
(entry_price - exit_price) × quantity


**Rules**
- `exit_price` and `quantity` must exist
- If missing, Gross PnL cannot be computed

---

### 3.2 Net PnL

**Definition**  
Profit or loss after fees.

**Formula**
net_pnl = gross_pnl - fees


**Rules**
- Fees default to `0`
- Net PnL is the primary value used in all aggregations

---

### 3.3 PnL per Share

**Definition**
Profit or loss per unit traded.

**Formula**
- Long:
exit_price - entry_price

- Short:
entry_price - exit_price


---

### 3.4 Risk per Share

**Definition**
Capital risked per unit at entry.

**Formula**
abs(entry_price - stop_loss_price)


**Rules**
- Only computed if `stop_loss_price` exists and ≠ entry price
- Otherwise treated as `null`

---

### 3.5 R-Multiple

**Definition**
Normalized performance relative to defined risk.

**Formula**
r_multiple = pnl_per_share / risk_per_share


**Rules**
- Only computed if `risk_per_share > 0`
- Otherwise `r_multiple = null`

---

### 3.6 Trade Result Classification

**Definition**
Categorizes trade outcome.

**Rules**
- `win` → `net_pnl > 0`
- `loss` → `net_pnl < 0`
- `breakeven` → `net_pnl = 0`

> No tolerance band in v1; exact zero only.

---

## 4. Time-Based Attribution

### 4.1 Trade Date vs Exit Date

- All realized performance is attributed to **trade_date** (entry date)
- Exit date is ignored for aggregation purposes in v1

> This aligns with most discretionary trader reviews and simplifies calendar logic.

---

## 5. Daily Aggregations

### 5.1 Daily Net PnL

**Definition**
Sum of net PnL for all closed trades on a given day.

**Formula**
daily_net_pnl = Σ trade.net_pnl


---

### 5.2 Daily Trade Count

**Formula**
daily_trade_count = count(trades)


---

### 5.3 Daily Win / Loss Count

**Rules**
- Wins: `net_pnl > 0`
- Losses: `net_pnl < 0`
- Breakeven trades excluded from both

---

## 6. Period Aggregations (Monthly / Yearly)

### 6.1 Total Net PnL

total_net_pnl = Σ daily_net_pnl


---

### 6.2 Win Rate

**Definition**
Percentage of winning trades.

**Formula**
win_rate = win_count / (win_count + loss_count)


**Rules**
- Breakeven trades excluded
- If denominator = 0 → win_rate = null

---

### 6.3 Average Win

avg_win = mean(net_pnl of winning trades)


---

### 6.4 Average Loss

avg_loss = mean(net_pnl of losing trades)


> Avg loss is negative.

---

### 6.5 Profit Factor

**Definition**
Ratio of total profits to total losses.

**Formula**
profit_factor = sum(wins) / abs(sum(losses))


**Rules**
- If no losses → profit_factor = ∞ (or large sentinel value)
- If no wins → profit_factor = 0

---

### 6.6 Expectancy

**Definition**
Average expected PnL per trade.

**Formula**
expectancy = (win_rate × avg_win) + ((1 - win_rate) × avg_loss)


---

## 7. Drawdown Calculations

### 7.1 Equity Curve

**Definition**
Cumulative sum of net PnL over time.

**Formula**
equity[n] = Σ net_pnl up to trade n


---

### 7.2 Max Drawdown

**Definition**
Largest peak-to-trough decline in equity.

**Algorithm**
1. Track running peak equity
2. Compute drawdown at each point:
drawdown = peak - current_equity

3. Max drawdown = max(drawdown)

---

## 8. Streaks

### 8.1 Win / Loss Streaks

**Rules**
- Based on consecutive trade results
- Breakeven trades break streaks
- Separate tracking for:
- Max win streak
- Max loss streak

---

## 9. Edge Case Handling

| Case | Rule |
|----|----|
| Open trades | Excluded from all realized metrics |
| Missing fees | Treated as 0 |
| Quantity missing | Trade excluded from PnL calculations |
| Stop loss missing | R-multiple = null |
| Zero-risk trade | R-multiple = null |
| No trades in period | All metrics = null |

---

## 10. Rounding Rules

- Monetary values: round to 2 decimal places for display
- Calculations should use full precision internally
- Percentages rounded to 2 decimals

---

## 11. Validation & Testing

- All metrics must match Excel reference within ±0.01
- Unit tests required for:
- Long vs short PnL
- Fees impact
- Drawdown logic
- Edge cases listed above

---

## 12. Future Extensions (Not v1)

- Unrealized PnL
- R-based expectancy
- Risk-adjusted metrics (Sharpe, SQN)
- Intraday time-bucket analytics

---