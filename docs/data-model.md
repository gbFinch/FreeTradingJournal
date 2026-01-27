# Data Model Specification (v1)
Trading Journal Application

---

## 1. Scope & Assumptions (v1)

- The application is a **personal trading journal**.
- **One Trade = one completed position** (single entry, single exit).
- No scaling in/out or partial fills in v1.
- All performance metrics are **derived**, not manually edited.
- Multi-user support is optional; data model should not block it.

---

## 2. Core Entities

### 2.1 User
Represents an application user.

**Fields**
- `id` (UUID, PK)
- `email` (string, optional)
- `created_at` (datetime)

---

### 2.2 Account
Logical trading account (e.g. Main, Paper, Prop).

**Fields**
- `id` (UUID, PK)
- `user_id` (UUID, FK → User.id)
- `name` (string)
- `base_currency` (string, default: `USD`)
- `created_at` (datetime)

---

### 2.3 Instrument
Tradable asset.

**Fields**
- `id` (UUID, PK)
- `symbol` (string, unique)
- `asset_class` (enum: `stock`)  
- `exchange` (string, optional)
- `created_at` (datetime)

---

### 2.4 Trade
Primary domain entity representing a completed trade.

#### Input Fields
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `account_id` (UUID, FK)
- `instrument_id` (UUID, FK)
- `trade_number` (integer, optional)
- `trade_date` (date)
- `direction` (enum: `long`, `short`)
- `quantity` (decimal, optional)
- `entry_price` (decimal)
- `stop_loss_price` (decimal, optional)
- `entry_time` (time/datetime, optional)
- `exit_price` (decimal, optional)
- `exit_time` (time/datetime, optional)
- `fees` (decimal, default: 0)
- `strategy` (string, optional)
- `notes` (text, optional)
- `status` (enum: `closed`, `open`)
- `created_at` (datetime)
- `updated_at` (datetime)

#### Derived Fields (Computed)
- `gross_pnl`  
  - Long: `(exit_price - entry_price) * quantity`  
  - Short: `(entry_price - exit_price) * quantity`
- `net_pnl` = `gross_pnl - fees`
- `pnl_per_share`
- `risk_per_share` = `abs(entry_price - stop_loss_price)`
- `r_multiple` = `pnl_per_share / risk_per_share`
- `holding_minutes`
- `result` (enum: `win`, `loss`, `breakeven`)

> Derived fields are **not user-editable** and should be recalculated whenever trade inputs change.

---

### 2.5 TradeLink
External references related to a trade.

**Fields**
- `id` (UUID, PK)
- `trade_id` (UUID, FK → Trade.id)
- `type` (enum: `tradingview`, `reference`, `other`)
- `url` (string)
- `label` (string, optional)

---

### 2.6 Tag (Optional)
Lightweight categorization for trades.

**Tag**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `name` (string)

**TradeTag**
- `trade_id` (UUID, FK)
- `tag_id` (UUID, FK)

---

## 3. Aggregated / Computed Models

### 3.1 DailyPerformance
Used for calendar-based PnL visualization.

**Key**
- `user_id + date (+ account_id optional)`

**Fields**
- `user_id`
- `account_id` (optional)
- `date`
- `realized_net_pnl`
- `trade_count`
- `win_count`
- `loss_count`

> This can be implemented as a database view or computed query.

---

### 3.2 PeriodPerformance
Used for monthly and yearly analytics.

**Fields**
- `period_start`
- `period_end`
- `total_net_pnl`
- `trade_count`
- `win_rate`
- `avg_win`
- `avg_loss`
- `profit_factor`
- `expectancy`

---

## 4. Data Integrity Rules

- `entry_price > 0`
- `quantity > 0` if provided
- If `status = closed`, trade must have:
  - sufficient data to compute PnL, or
  - a resolved `net_pnl`
- Derived fields must never be directly edited
- Deleting a trade updates all dependent aggregates

---

## 5. Future Extensions (Not in v1)

- `Execution` entity for partial fills and scaling
- Support for options and futures
- Unrealized PnL tracking
- Multiple exits per trade
- Equity curve snapshots

---

## 6. Design Principles

- Trades are the **single source of truth**
- Aggregations are **always derived**
- Correctness > feature count
- Data model must support future complexity without breaking v1

---
