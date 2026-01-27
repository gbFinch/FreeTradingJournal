# Technical Design Document (v1)
Trading Journal Application

---

## 1. Technology Stack

| Layer | Technology |
|-------|------------|
| Platform | Tauri 2.x (Rust backend, WebView frontend) |
| Frontend | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand or React Query |
| Database | SQLite (local file) |
| ORM | SQLx (Rust, compile-time checked queries) |
| Build Tool | Vite |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Tauri Shell                     │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │           React Frontend (WebView)         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐  │  │
│  │  │  Views  │ │  Hooks  │ │  Components │  │  │
│  │  └────┬────┘ └────┬────┘ └──────┬──────┘  │  │
│  │       └───────────┼─────────────┘         │  │
│  │                   ▼                        │  │
│  │           ┌─────────────┐                  │  │
│  │           │  API Client │                  │  │
│  │           └──────┬──────┘                  │  │
│  └──────────────────┼────────────────────────┘  │
│                     │ invoke()                   │
│  ┌──────────────────▼────────────────────────┐  │
│  │           Rust Backend (Tauri)             │  │
│  │  ┌──────────────┐  ┌───────────────────┐  │  │
│  │  │   Commands   │  │  Business Logic   │  │  │
│  │  │  (API Layer) │──│  (Services)       │  │  │
│  │  └──────────────┘  └─────────┬─────────┘  │  │
│  │                              │             │  │
│  │                    ┌─────────▼─────────┐  │  │
│  │                    │   Repository      │  │  │
│  │                    │   (SQLx + SQLite) │  │  │
│  │                    └───────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  trades.db    │
                 │  (SQLite)     │
                 └───────────────┘
```

---

## 3. Project Structure

```
tjs/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Tauri entry point
│   │   ├── commands/         # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── trades.rs
│   │   │   ├── accounts.rs
│   │   │   └── metrics.rs
│   │   ├── services/         # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── trade_service.rs
│   │   │   ├── metrics_service.rs
│   │   │   └── import_service.rs
│   │   ├── models/           # Domain entities
│   │   │   ├── mod.rs
│   │   │   ├── trade.rs
│   │   │   ├── account.rs
│   │   │   └── instrument.rs
│   │   ├── repository/       # Database access
│   │   │   ├── mod.rs
│   │   │   └── trade_repo.rs
│   │   └── calculations/     # Metrics calculations
│   │       ├── mod.rs
│   │       ├── pnl.rs
│   │       └── aggregations.rs
│   ├── migrations/           # SQLite migrations
│   └── Cargo.toml
│
├── src/                       # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/                  # Tauri invoke wrappers
│   │   ├── trades.ts
│   │   ├── accounts.ts
│   │   └── metrics.ts
│   ├── components/           # Reusable UI components
│   │   ├── Calendar/
│   │   ├── TradeTable/
│   │   └── MetricCard/
│   ├── views/                # Page-level components
│   │   ├── Dashboard/
│   │   ├── CalendarView/
│   │   ├── TradeList/
│   │   └── TradeDetail/
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand stores
│   └── types/                # TypeScript definitions
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 4. Database Schema

```sql
-- Users table (supports future multi-user)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trading accounts
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    base_currency TEXT DEFAULT 'USD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tradable instruments
CREATE TABLE instruments (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    asset_class TEXT DEFAULT 'stock',
    exchange TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Core trades table
CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    instrument_id TEXT NOT NULL REFERENCES instruments(id),
    trade_number INTEGER,
    trade_date DATE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    quantity REAL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    stop_loss_price REAL,
    entry_time TEXT,
    exit_time TEXT,
    fees REAL DEFAULT 0,
    strategy TEXT,
    notes TEXT,
    status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags for trade categorization
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL
);

CREATE TABLE trade_tags (
    trade_id TEXT REFERENCES trades(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

-- External links
CREATE TABLE trade_links (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('tradingview', 'reference', 'other')),
    url TEXT NOT NULL,
    label TEXT
);

-- Indexes for common queries
CREATE INDEX idx_trades_user_date ON trades(user_id, trade_date);
CREATE INDEX idx_trades_account ON trades(account_id);
CREATE INDEX idx_trades_instrument ON trades(instrument_id);
```

---

## 5. API Design (Tauri Commands)

### Trade Commands

```rust
#[tauri::command]
async fn get_trades(
    account_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<TradeWithDerived>, String>

#[tauri::command]
async fn get_trade(id: String) -> Result<TradeWithDerived, String>

#[tauri::command]
async fn create_trade(input: CreateTradeInput) -> Result<TradeWithDerived, String>

#[tauri::command]
async fn update_trade(id: String, input: UpdateTradeInput) -> Result<TradeWithDerived, String>

#[tauri::command]
async fn delete_trade(id: String) -> Result<(), String>

#[tauri::command]
async fn import_trades(file_path: String, mapping: ColumnMapping) -> Result<ImportResult, String>
```

### Metrics Commands

```rust
#[tauri::command]
async fn get_daily_performance(
    account_id: Option<String>,
    start_date: String,
    end_date: String,
) -> Result<Vec<DailyPerformance>, String>

#[tauri::command]
async fn get_period_metrics(
    account_id: Option<String>,
    start_date: String,
    end_date: String,
) -> Result<PeriodMetrics, String>

#[tauri::command]
async fn get_equity_curve(
    account_id: Option<String>,
) -> Result<Vec<EquityPoint>, String>
```

### Account Commands

```rust
#[tauri::command]
async fn get_accounts() -> Result<Vec<Account>, String>

#[tauri::command]
async fn create_account(name: String, base_currency: Option<String>) -> Result<Account, String>
```

---

## 6. Frontend State Management

### Stores (Zustand)

```typescript
// trades.store.ts
interface TradesStore {
  trades: Trade[];
  selectedTrade: Trade | null;
  filters: TradeFilters;
  isLoading: boolean;
  fetchTrades: (filters?: TradeFilters) => Promise<void>;
  selectTrade: (id: string) => void;
  createTrade: (input: CreateTradeInput) => Promise<void>;
  updateTrade: (id: string, input: UpdateTradeInput) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
}

// metrics.store.ts
interface MetricsStore {
  dailyPerformance: DailyPerformance[];
  periodMetrics: PeriodMetrics | null;
  dateRange: DateRange;
  fetchDailyPerformance: () => Promise<void>;
  fetchPeriodMetrics: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
}
```

---

## 7. Derived Field Calculations (Rust)

```rust
impl Trade {
    pub fn calculate_derived(&self) -> DerivedFields {
        let gross_pnl = self.calculate_gross_pnl();
        let net_pnl = gross_pnl.map(|g| g - self.fees);
        let pnl_per_share = self.calculate_pnl_per_share();
        let risk_per_share = self.calculate_risk_per_share();
        let r_multiple = match (pnl_per_share, risk_per_share) {
            (Some(pnl), Some(risk)) if risk > 0.0 => Some(pnl / risk),
            _ => None,
        };
        let result = net_pnl.map(|pnl| {
            if pnl > 0.0 { TradeResult::Win }
            else if pnl < 0.0 { TradeResult::Loss }
            else { TradeResult::Breakeven }
        });

        DerivedFields { gross_pnl, net_pnl, pnl_per_share, risk_per_share, r_multiple, result }
    }

    fn calculate_gross_pnl(&self) -> Option<f64> {
        let (entry, exit, qty) = (self.entry_price, self.exit_price?, self.quantity?);
        Some(match self.direction {
            Direction::Long => (exit - entry) * qty,
            Direction::Short => (entry - exit) * qty,
        })
    }
}
```

---

## 8. Import System

### Supported Formats
- CSV (`.csv`)
- Excel (`.xlsx`) via `calamine` crate

### Column Mapping Flow
1. User selects file
2. System detects columns
3. User maps columns to trade fields
4. System validates and previews
5. User confirms import
6. Trades inserted with derived fields calculated

---

## 9. Performance Considerations

| Requirement | Implementation |
|-------------|----------------|
| Calendar < 1s | Pre-aggregate daily PnL in single query |
| Metrics < 500ms | Use SQL aggregations, not Rust iteration |
| 10k+ trades | Indexed queries, pagination for trade list |
| Responsive UI | Async commands, optimistic updates |

---

## 10. Security

- All data stored locally in SQLite file
- No network requests (offline-first)
- User owns and controls data file location
- Future: optional encryption at rest

---

## 11. Development Commands

```bash
# Install dependencies
npm install
cd src-tauri && cargo build

# Development mode
npm run tauri dev

# Run frontend only
npm run dev

# Build for production
npm run tauri build

# Run Rust tests
cd src-tauri && cargo test

# Run frontend tests
npm test

# Database migrations
cd src-tauri && sqlx migrate run
```

---

## 12. Testing Strategy

### Backend (Rust)
- Unit tests for calculations in `calculations/` module
- Integration tests for repository layer with test database
- Property-based tests for metric formulas

### Frontend (React)
- Component tests with React Testing Library
- Hook tests for API integration
- E2E tests with Playwright for critical flows

---

## 13. Future Considerations

- **Cloud sync**: Add optional backend service for backup
- **Multi-platform**: Tauri supports Windows, macOS, Linux
- **Plugin system**: Allow custom metric calculations
- **Theming**: Dark/light mode via Tailwind

---
