# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trading Journal Application - A personal trading journal to replace Excel-based trade journaling. Inspired by other journaling tools but intentionally simplified for v1 (MVP).

## Technology Stack

- **Platform:** Tauri 2.x (Rust backend + WebView)
- **Frontend:** React 18+ with TypeScript, Tailwind CSS, Zustand
- **Database:** SQLite (local file) with SQLx
- **Build:** Vite

## Development Commands

```bash
npm install                    # Install frontend dependencies
cd src-tauri && cargo build    # Build Rust backend

npm run tauri dev              # Development mode (full app)
npm run dev                    # Frontend only
npm run tauri build            # Production build

cd src-tauri && cargo test     # Rust tests
npm test                       # Frontend tests
cd src-tauri && sqlx migrate run  # Run database migrations
```

**IMPORTANT**: When you work on a new feature or bug, create a git branch first. then work on changes in that branch for the remainder of the session

## Documentation Structure

All specifications are in `/docs/`:
- `prd.md` - Product requirements, goals, feature scope
- `functional-spec.md` - User-facing behavior and flows
- `data-model.md` - Entity definitions and relationships
- `metrics-and-calculations.md` - All financial formulas (critical reference)
- `technical-design.md` - Pending (architecture decisions TBD)

## Critical Design Principles

**Data Model:**
- One Trade = one completed position (no partial fills/scaling in v1)
- Trades are the single source of truth
- All aggregations are derived, never stored
- Derived fields are non-editable by users

**Calculations:**
- All metrics based on closed trades only (open trades excluded)
- Metrics must match Excel calculations within ±0.01
- Net PnL (after fees) is the primary value for all aggregations
- Performance attributed to `trade_date` (entry date), not exit date

## Key Formulas Reference

```
Gross PnL (Long):  (exit_price - entry_price) × quantity
Gross PnL (Short): (entry_price - exit_price) × quantity
Net PnL:           gross_pnl - fees
R-Multiple:        pnl_per_share / risk_per_share
Win Rate:          win_count / (win_count + loss_count)  # breakeven excluded
Profit Factor:     sum(wins) / abs(sum(losses))
Expectancy:        (win_rate × avg_win) + ((1 - win_rate) × avg_loss)
```

## Trade Classification

- `win`: net_pnl > 0
- `loss`: net_pnl < 0
- `breakeven`: net_pnl = 0 (exact, no tolerance band)

## Performance Requirements

- Calendar loads < 1 second for 1 year of data
- Dashboard metrics < 500ms for 10,000 trades
- Support 10,000+ trades without degradation

## Explicit Non-Goals (v1)

- Broker integrations
- Real-time market data
- Options/futures support
- Mobile app
- Partial fills/scaling
- Social features
