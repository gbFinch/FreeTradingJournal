# Product Requirements Document (PRD)
## Trading Journal Application (MVP Scope)

---

## 1. Overview

### 1.1 Product Name
Trading Journal (working name)

### 1.2 Purpose
Build a personal trading journal application that replaces Excel-based journaling by:
- Automating PnL calculations
- Visualizing performance over time (calendar, charts)
- Providing actionable trading metrics (daily, monthly, yearly)

The product is intentionally limited in scope for v1.

### 1.3 Target Release
v1 (MVP)

---

## 2. Problem Statement

Active traders often journal trades in Excel, which results in:
- Manual calculations
- High risk of formula errors
- Poor visualization of daily performance
- No structured analytics for consistency, expectancy, or drawdowns

Existing solutions (e.g., other journaling tools) are feature-rich but complex and overkill for solo traders or learners.

---

## 3. Target Users

### Primary User
- Retail trader
- Trades frequently (daily / weekly)
- Uses Excel or CSV to track trades
- Focused on performance improvement

### Secondary User (Future)
- Small prop traders
- Trading coaches

---

## 4. Goals & Success Metrics

### 4.1 Product Goals
- Replace Excel as the primary journaling tool
- Make trade performance review frictionless
- Provide clear daily and monthly performance insights

### 4.2 Success Metrics
- User can import a full month of trades in < 1 minute
- Daily PnL calendar renders correctly 100% of the time
- Monthly metrics match Excel calculations within ±0.1%

---

## 5. Non-Goals (Out of Scope for v1)

- Direct broker integrations
- Real-time market data
- Social sharing or leaderboards
- Mobile app
- Automated strategy evaluation

---

## 6. Core User Flows

### 6.1 Import Trades
1. User uploads Excel / CSV file
2. System validates required fields
3. Trades are stored and normalized
4. User sees confirmation summary

### 6.2 Review Daily Performance
1. User opens calendar view
2. Selects a trading day
3. Sees daily PnL and trade list
4. Clicks trade to view details

### 6.3 Analyze Performance
1. User selects date range (monthly / yearly)
2. System calculates metrics
3. Results displayed in dashboard

---

## 7. Feature Scope

### 7.1 Must-Have (v1)

#### Trade Management
- Import trades from Excel / CSV
- Add trade manually
- View all trades in a table
- View individual trade details

#### Calendar View
- Daily realized PnL displayed on calendar
- Color-coded days (green/red/neutral)
- Click day to see trades

#### Metrics & Analytics
- Total PnL
- Win rate
- Average win / loss
- Profit factor
- Max drawdown
- Weekly, Monthly and yearly aggregation

#### Trade View
- Side
- Size
- Gross P/L
- MAE/MFE
- Profit target
- Stop loss

---

### 7.2 Nice-to-Have (v2+)

- Trade tagging
- Screenshot attachments
- Strategy-level analytics
- Risk-to-reward metrics
- Equity curve visualization

---

## 8. Data Requirements

### 8.1 Required Trade Fields
- Instrument (symbol)
- Trade date
- Entry price
- Exit price
- Quantity
- Direction (long/short)
- Fees / commissions
- Realized PnL

### 8.2 Derived Fields
- Holding time
- R-multiple
- Trade result (win/loss/breakeven)

---

## 9. Functional Requirements

### Import
- Support `.xlsx` and `.csv`
- Column mapping UI
- Validation errors shown clearly

### Calculations
- Calculations must be deterministic
- Metrics recalculated on every import
- No manual user edits to computed values

### Performance
- Load calendar view in < 1 second for 1 year of data
- Handle at least 10,000 trades without degradation

---

## 10. UX & UI Requirements

- Clean, minimal, data-first UI
- No trading jargon hidden behind icons
- Dark mode (optional)
- Desktop-first design

---

## 11. Security & Data Storage

- Data stored locally or per-user database
- No external data sharing
- User retains full ownership of trade data

---

## 12. Risks & Open Questions

### Risks
- Incorrect PnL due to edge cases (partial fills, scaling)
- Excel column inconsistencies
- Overengineering too early

### Open Questions
- Support for options/futures in v1?
- Multiple accounts support?
- Local-only vs cloud sync?

---

## 13. Product Positioning

Comparable products:
- desktop and web-based trading journals

This product intentionally prioritizes:
- Simplicity
- Transparency
- Personal analytics over social features

---

## 14. Future Roadmap (High-Level)

- Broker integrations
- Strategy backtesting support
- Mobile companion app
- Cloud sync and backups

---
