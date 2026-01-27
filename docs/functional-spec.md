# Functional Specification (v1)
Trading Journal Application

---

## 1. Purpose

This document describes **what the system does and how it behaves** from a user’s perspective.

It translates:
- PRD requirements
- Data Model
- Metrics & Calculations

into **clear, testable system behavior**.

This is **not** a technical or UI design document.

---

## 2. User Roles

### 2.1 Trader (Primary User)
- Views, creates, edits, and deletes trades
- Reviews performance and metrics
- Owns all data

> v1 assumes a single user, but logic must not prevent multi-user support.

---

## 3. Global Application Behavior

### 3.1 Data Consistency
- All displayed metrics must reflect the latest trade data
- Any change to a trade triggers recalculation of dependent metrics
- Derived values are read-only

### 3.2 Date & Time Handling
- All dates are interpreted in the user’s local timezone
- Aggregations are based on `trade_date`

---

## 4. Trade Management

### 4.1 Create Trade

**Description**  
User adds a new trade manually.

**Inputs**
- Instrument
- Trade date
- Direction (long/short)
- Entry price
- Quantity (optional)
- Exit price (optional)
- Stop loss (optional)
- Fees (optional)
- Strategy (optional)
- Notes (optional)

**System Behavior**
- Validate required fields
- Persist trade
- Compute derived fields
- Update all affected aggregations

**Validation Rules**
- Entry price > 0
- Quantity > 0 if provided
- Exit price required if status = closed

---

### 4.2 Edit Trade

**Description**  
User updates an existing trade.

**System Behavior**
- Allow editing of input fields only
- Recalculate all derived values
- Recompute daily and period metrics
- Update calendar and dashboards immediately

---

### 4.3 Delete Trade

**Description**  
User removes a trade permanently.

**System Behavior**
- Confirm deletion
- Remove trade and associated links/tags
- Recalculate all dependent metrics

---

### 4.4 View Trades List

**Description**  
User views all trades in tabular form.

**Features**
- Sort by date, PnL, symbol
- Filter by:
  - Date range
  - Instrument
  - Direction
  - Result (win/loss)
  - Strategy

**Displayed Fields**
- Date
- Symbol
- Direction
- Entry / Exit
- Quantity
- Net PnL
- Result

---

### 4.5 View Trade Details

**Description**  
User views detailed information for a single trade.

**Displayed Sections**
- Core trade data
- Derived metrics (PnL, R-multiple)
- Notes
- External links
- Tags

---

## 5. Calendar View

### 5.1 Monthly Calendar

**Description**  
Visual overview of daily performance.

**System Behavior**
- Display one calendar cell per day
- Show:
  - Net PnL
  - Trade count
- Color coding:
  - Green → positive PnL
  - Red → negative PnL
  - Neutral → zero / no trades

---

### 5.2 Calendar Day Drilldown

**Description**  
User clicks a day to see trades for that date.

**System Behavior**
- Show list of trades executed on that day
- Display daily summary:
  - Total net PnL
  - Trade count
  - Wins / losses

---

## 6. Performance Dashboard

### 6.1 Period Selection

**Description**
User selects a time range.

**Options**
- Current month
- Previous month
- Custom date range
- Year-to-date
- Full history

---

### 6.2 Metrics Display

**Displayed Metrics**
- Total net PnL
- Trade count
- Win rate
- Average win
- Average loss
- Profit factor
- Expectancy
- Max drawdown

**Rules**
- Metrics update immediately on period change
- If insufficient data, show `N/A`

---

### 6.3 Equity Curve

**Description**
Visual representation of cumulative performance.

**System Behavior**
- Plot cumulative net PnL over time
- Highlight drawdown periods

---

## 7. Tagging & Categorization (Optional v1)

### 7.1 Add / Remove Tags

**Description**
User applies tags to trades.

**Rules**
- Tags are user-defined
- Multiple tags per trade allowed
- Tags usable for filtering and analysis

---

## 8. Error Handling & Empty States

### 8.1 No Trades
- Show empty calendar
- Display onboarding message

### 8.2 Invalid Data
- Highlight invalid fields
- Block save until resolved

---

## 9. Performance Requirements

- Calendar loads < 1 second for 1 year of data
- Dashboard metrics compute < 500ms for 10,000 trades
- No visible lag on trade edits

---

## 10. Audit & Transparency

- Derived values should be inspectable (formula-level transparency)
- No hidden adjustments or smoothing

---

## 11. Acceptance Criteria (High-Level)

- Daily calendar PnL matches dashboard daily totals
- Monthly totals equal sum of daily PnL
- Editing a trade updates all views consistently
- Metrics match defined formulas exactly

---

## 12. Out of Scope (v1)

- Broker integrations
- Mobile app
- Social features
- Automated trade detection

---

## 13. Next Document

👉 **Technical Design Document**
- Architecture
- Storage
- Stack decisions
- Web vs desktop

---
