# FinAI — Personal Finance Chatbot

A production-grade, AI-powered personal finance platform built for individuals who want full visibility and control over their money. Features bank account sync via Plaid, a conversational AI assistant powered by Google Gemini with native Function Calling (create budgets and log transactions directly from chat), automated spending analytics, month-over-month category comparisons, budget progress tracking with color-coded alerts, savings goal management, recurring subscription detection, manual transaction logging, CSV data export, profile & security management, and a daily automated transaction sync cron engine.

## Features

### Core Functionality
- **Bank Account Linking**: Connect real bank accounts via Plaid Link with OAuth-safe public token exchange — access tokens are AES-256 encrypted at rest before storage
- **Automatic Transaction Sync**: Cursor-based Plaid `transactionsSync` API with full pagination — fetches added, modified, and removed transactions incrementally without re-fetching historical data
- **Dashboard Overview**: Unified financial command center showing net worth, stat cards (total spent, top category, biggest transaction), spending charts, budgets, savings goals, subscriptions, and linked account balances — all in a single glassmorphic dark-mode interface
- **User Authentication**: Secure registration and login with bcrypt password hashing and HTTP-only JWT cookies

### AI & Chat Features
- **Conversational AI Assistant**: Full-context chat powered by Google Gemini that reads your real transaction history, budgets, savings goals, and account balances before every response — answers are grounded in your actual financial data, not generic advice
- **Gemini Function Calling — Budget Creation**: Say *"Set a $300 budget for food"* in chat and FinAI automatically creates the budget in the database and confirms it — no separate form required
- **Gemini Function Calling — Transaction Logging**: Say *"Log a $14.50 cash expense at McDonald's"* and FinAI parses the amount, merchant, category, and date, then inserts it directly into your transaction history before responding conversationally
- **Persistent Chat History**: All messages are stored per-user in PostgreSQL and injected as conversation history on every new message, enabling true multi-turn memory across sessions
- **Clear Chat**: One-click chat history deletion with a confirmation modal — wipes both the UI and the stored database history

### Financial Tracking
- **Spending by Category**: Bar chart showing where your money goes this month, with color-coded category legend pills for quick scanning
- **Cumulative Spending Trend**: Area line chart plotting a rolling daily running total so you can spot overspending patterns before the month ends
- **Month-over-Month Comparison**: Side-by-side dual progress bars for every category comparing current month vs. previous month spending — each card shows a `+X%` / `-X%` badge and an overall summary banner showing total delta and direction
- **Recent Transactions Widget**: Live table of the latest 10 transactions with merchant name, category, amount, and date — with a one-click link to the full transaction history tab
- **Full Transaction History**: Paginated, searchable, and filterable transaction list supporting free-text search across merchant names and descriptions, category filtering, and date range selection with a custom date picker

### Budget Management
- **Category Budget Limits**: Set monthly spending limits per category (Food & Drink, Shops, Travel, Service, Recreation, Transfer, Payment)
- **Live Progress Bars**: Each budget card shows a real-time fill bar — indigo at normal, amber at 80% utilization, and red when the limit is exceeded — with exact `$spent / $limit` amounts
- **Budget Deletion**: Remove any budget limit with a single button, with instant UI update

### Savings Goals
- **Goal Creation**: Define savings goals with a name, target amount, optional starting balance, and an optional target date
- **Contribution Tracking**: Inline contribution form on each goal card — enter an amount and it accumulates toward the target
- **Visual Progress Circles**: Animated circular progress indicators showing exact percentage completion for each goal, color-coded by proximity to the target date
- **Goal Deletion**: Remove goals cleanly with cascade-safe database deletes

### Subscriptions & Recurring Bills
- **Automatic Subscription Detection**: Server-side algorithm scans transaction history for recurring patterns — same merchant, similar amounts, monthly intervals — and surfaces them as detected subscriptions (e.g., Netflix, Spotify, gym memberships)
- **Subscriptions Card**: Dedicated sidebar widget listing detected recurring bills with estimated monthly cost totals and next billing date projections
- **Zero Configuration**: Detection runs on-demand from existing transaction data — no user tagging or manual input required

### Transaction Tools
- **Manual Transaction Logging**: Add cash expenses and off-platform spending via the `+ Add Transaction` modal — supports amount, description, merchant, category, and date — immediately reflected in charts and AI context
- **Manual Transaction Deletion**: Remove manually-logged entries; Plaid-synced transactions are protected from manual deletion
- **CSV Export**: Download the full filtered transaction list as a CSV file directly in the browser — no server roundtrip required
- **Custom Date Picker**: Fully accessible, keyboard-navigable custom calendar widget with month/year navigation, `min`/`max` date constraints, and support for both upward and downward opening directions

### Account Management
- **Linked Accounts Widget**: Real-time balance display for every connected bank account — checking, savings, and credit cards — with account type badges and institution names
- **Net Worth Banner**: Welcome header shows total net worth (assets minus liabilities) alongside a greeting and quick-action buttons
- **Plaid Connection Manager**: View all connected banks from the Settings modal and disconnect any item — revokes the Plaid access token via `item/remove` and deletes the encrypted credentials from the database
- **Profile & Security Settings**: Change email address or password directly from the Settings modal — password changes validate the current password before hashing and storing the new one with bcrypt

### Infrastructure
- **Encrypted Credential Storage**: All Plaid access tokens are AES-256-CBC encrypted using a 32-byte hex key before being written to the database — the raw token never touches disk
- **Daily Transaction Sync Cron**: Automated `node-cron` job runs at 2:00 AM every night — iterates all Plaid items in the database and runs a full cursor-based sync for each one, keeping transaction data fresh without user action
- **Promise.allSettled Fetching**: Dashboard data loading uses `Promise.allSettled` so a single failing API endpoint never silently breaks unrelated widgets — each panel degrades independently with a safe fallback value
- **Resilient Balance Fallback**: If a Plaid sandbox call fails or no accounts are connected, the balance endpoint returns realistic mock data so the UI never shows blank states during development

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for persistent storage (users, transactions, budgets, savings goals, chat history)
- **JWT** for authentication via HTTP-only cookies
- **bcrypt** for password hashing
- **Google Gemini AI** (`gemini-2.0-flash`) for conversational responses and native Function Calling (tool execution)
- **Plaid Node SDK** for bank linking, transaction sync, and account balance retrieval
- **AES-256-CBC encryption** via Node.js `crypto` module for access token security
- **node-cron** for scheduled daily transaction sync (runs at 2:00 AM)
- **dotenv** for environment variable management

### Frontend
- **React 18** with Vite for fast development and optimized production builds
- **React Router v6** for client-side navigation
- **Axios** for API requests with a base URL proxy configuration
- **Recharts** for the Category Bar Chart and Cumulative Spending Area Chart
- **Lucide React** for consistent iconography
- **React Icons** (`react-icons/fa`) for the custom date picker calendar controls
- **Tailwind CSS** for all styling — glassmorphic dark-mode design system with HSL-tuned color palette, gradient accents, and micro-animations
- **Custom Component Library**: `CustomDatePicker`, `CustomSelectDropdown`, `PlaidLink`, `SettingsModal`, `TransactionList` — all built in-house with zero UI framework dependency

### Database Schema
- **`users`** — UUID primary key, email, bcrypt password hash, created timestamp
- **`plaid_items`** — encrypted access token, item ID, institution name, sync cursor, last synced timestamp
- **`transactions`** — Plaid transaction ID, amount, category, subcategory, merchant name, description, date, pending flag, manual flag
- **`chat_messages`** — user ID, role (`user` / `assistant`), content, created timestamp
- **`budgets`** — user ID + category unique constraint, limit amount
- **`savings_goals`** — name, target amount, current amount, optional target date

## System Architecture

The system follows a modern full-stack architecture with a clean separation between the React client and Express API server, with Plaid and Google Gemini as external service dependencies.

```mermaid
graph TD
    subgraph Client ["Frontend (React/Vite)"]
        UI["UI Components (Tailwind CSS)"]
        Pages["Pages (Dashboard, Chat, Login, Signup)"]
        Charts["Charts (Recharts — Bar, Area)"]
        CustomPicker["Custom Component Library"]
    end

    subgraph Server ["Backend (Node.js/Express)"]
        Auth["Auth Routes (JWT/bcrypt)"]
        TxRoutes["Transaction Routes (sync, CRUD, analytics)"]
        BudgetRoutes["Budget Routes"]
        SavingsRoutes["Savings Routes"]
        SubRoutes["Subscription Detection"]
        ChatRoutes["Chat Routes"]
        PlaidRoutes["Plaid Routes (link, exchange, balances, disconnect)"]
        Cron["Daily Sync Cron (2:00 AM)"]
        Crypto["AES-256 Crypto Service"]
    end

    subgraph External ["External Services"]
        PlaidAPI["Plaid API (Sandbox/Production)"]
        GeminiAI["Google Gemini AI (Function Calling)"]
        DB[(PostgreSQL Database)]
    end

    UI --> Pages
    Pages --> Charts
    Pages --> CustomPicker
    Pages --> Auth
    Pages --> TxRoutes
    Pages --> BudgetRoutes
    Pages --> SavingsRoutes
    Pages --> SubRoutes
    Pages --> ChatRoutes
    Pages --> PlaidRoutes
    Auth --> DB
    TxRoutes --> DB
    TxRoutes --> PlaidAPI
    BudgetRoutes --> DB
    SavingsRoutes --> DB
    SubRoutes --> DB
    ChatRoutes --> GeminiAI
    ChatRoutes --> DB
    PlaidRoutes --> PlaidAPI
    PlaidRoutes --> Crypto
    Crypto --> DB
    Cron --> PlaidAPI
    Cron --> DB
```

## Module Dependency

```mermaid
graph LR
    subgraph BE ["Backend Module Flow"]
        AuthMod[Auth Module] --> TxMod[Transaction Module]
        AuthMod --> PlaidMod[Plaid Module]
        PlaidMod --> CryptoSvc[Crypto Service]
        TxMod --> SummaryAPI["Summary & Analytics Routes"]
        TxMod --> CronJob[Daily Sync Cron]
        ChatMod[Chat Module] --> GeminiSvc[Gemini Function Calling]
        GeminiSvc --> BudgetMod[Budget Module]
        GeminiSvc --> TxMod
        BudgetMod --> DB[(PostgreSQL)]
        SavingsMod[Savings Module] --> DB
        SubMod[Subscription Detector] --> DB
    end

    subgraph FE ["Frontend Module Flow"]
        App[App Router] --> DashPage[Dashboard Page]
        App --> ChatPage[Chat Page]
        DashPage --> StatCards[Stat Cards]
        DashPage --> RechartsCharts[Recharts Charts]
        DashPage --> MoMWidget["Month-over-Month Widget"]
        DashPage --> BudgetCards[Budget Progress Cards]
        DashPage --> SavingsGoals[Savings Goal Circles]
        DashPage --> SubCard[Subscriptions Card]
        DashPage --> TxList[Transaction List]
        DashPage --> SettingsModal[Settings Modal]
        DashPage --> PlaidLinkBtn[PlaidLink Button]
        ChatPage --> AIChat[AI Chat Window]
        AIChat --> SuggestedChips[Suggested Prompt Chips]
    end
```

## Project Structure

```
personal-finance-chatbot/
├── backend/                        # Node.js/Express API server
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # PostgreSQL connection pool (pg)
│   │   │   └── plaidClient.js      # Plaid SDK client initialization
│   │   ├── cron/
│   │   │   └── syncTransactions.js # Daily 2 AM transaction sync for all Plaid items
│   │   ├── db/
│   │   │   └── schema.sql          # Full PostgreSQL schema (auto-run on server start)
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, /login, /logout, /me, /change-password, /change-email
│   │   │   ├── budgets.js          # GET/POST/DELETE /api/budgets
│   │   │   ├── chat.js             # POST /api/chat, DELETE /api/chat/history
│   │   │   ├── plaid.js            # POST /create-link-token, /exchange-token, GET /items, /balances, DELETE /items/:id
│   │   │   ├── savings.js          # GET/POST/DELETE /api/savings, POST /api/savings/:id/contribute
│   │   │   ├── subscriptions.js    # GET /api/subscriptions (auto-detection algorithm)
│   │   │   └── transactions.js     # GET /, /summary, /by-category, /daily-trend, /monthly-compare, POST /, DELETE /:id, POST /sync
│   │   ├── services/
│   │   │   ├── chatService.js      # Gemini chat orchestration with Function Calling tools
│   │   │   └── cryptoService.js    # AES-256-CBC encrypt/decrypt for Plaid access tokens
│   │   └── server.js               # Express app, middleware, route mounting, DB init, cron bootstrap
│   ├── .env                        # DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, PLAID_*, GEMINI_API_KEY
│   └── package.json
├── frontend/                       # React 18 + Vite client
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── CategoryBarChart.jsx    # Recharts horizontal bar chart by spending category
│   │   │   │   └── SpendingLineChart.jsx   # Recharts cumulative area chart with gradient fill
│   │   │   ├── CustomDatePicker.jsx        # Fully custom accessible calendar with month navigation
│   │   │   ├── CustomSelectDropdown.jsx    # Animated dropdown replacing native select
│   │   │   ├── PlaidLink.jsx               # Plaid Link widget integration with token exchange
│   │   │   ├── ProtectedRoute.jsx          # Auth guard redirecting unauthenticated users
│   │   │   ├── SettingsModal.jsx           # Email/password change + Plaid disconnect manager
│   │   │   └── TransactionList.jsx         # Paginated list with search, filter, CSV export, manual delete
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx             # JWT user state provider with login/logout helpers
│   │   ├── pages/
│   │   │   ├── Chat.jsx                    # AI chat interface with suggested prompt chips and clear history
│   │   │   ├── Dashboard.jsx               # Main financial dashboard (overview + transactions tabs)
│   │   │   ├── Login.jsx                   # Login form with JWT cookie auth
│   │   │   └── Signup.jsx                  # Registration form with validation
│   │   ├── App.jsx                         # React Router route definitions
│   │   └── index.css                       # Global Tailwind base styles
│   ├── .env                                # VITE_API_URL
│   └── package.json
└── README.md
```

## API Reference

### Authentication — `/api/auth`
*   `POST /api/auth/register` — Create a new account with email and password (bcrypt hashed).
*   `POST /api/auth/login` — Authenticate and receive an HTTP-only JWT cookie.
*   `POST /api/auth/logout` — Clear the auth cookie.
*   `GET /api/auth/me` — Return the authenticated user profile.
*   `POST /api/auth/change-email` — Update account email (requires current password verification).
*   `POST /api/auth/change-password` — Update password (validates current password, re-hashes new one with bcrypt).

### Transactions — `/api/transactions`
*   `POST /api/transactions/sync` — Trigger an on-demand Plaid `transactionsSync` for all linked items. Returns added/modified/removed counts.
*   `GET /api/transactions` — Fetch paginated transactions with optional `start_date`, `end_date`, `category`, `search`, `page`, and `limit` filters.
*   `GET /api/transactions/summary` — Aggregated totals, top merchants, and daily spending for a date range.
*   `GET /api/transactions/by-category` — Current month spending grouped and sorted by category.
*   `GET /api/transactions/daily-trend` — Daily spending totals for the current month for the area chart.
*   `GET /api/transactions/monthly-compare` — Category-level and total spending for current vs. previous month, with `diff` and `pct` fields per category.
*   `POST /api/transactions` — Log a manual transaction (amount, name, category, merchant, date).
*   `DELETE /api/transactions/:id` — Delete a manual transaction only; Plaid-synced entries are protected.

### Budgets — `/api/budgets`
*   `GET /api/budgets` — List all budget limits for the authenticated user.
*   `POST /api/budgets` — Create or update a budget limit for a category (upsert on `user_id + category`).
*   `DELETE /api/budgets/:id` — Remove a budget limit.

### Savings Goals — `/api/savings`
*   `GET /api/savings` — List all savings goals.
*   `POST /api/savings` — Create a new savings goal (name, target amount, current amount, optional target date).
*   `POST /api/savings/:id/contribute` — Add to the current amount of an existing goal.
*   `DELETE /api/savings/:id` — Delete a savings goal.

### Subscriptions
*   `GET /api/subscriptions` — Run the recurring transaction detection algorithm and return detected subscription entries with estimated monthly cost and next billing date.

### AI Chat — `/api/chat`
*   `POST /api/chat` — Send a user message. The service fetches full financial context, builds a Gemini prompt with Function Calling tools, and returns a response. If Gemini invokes `createBudget` or `logTransaction`, the server executes the database write before returning the final text reply.
*   `DELETE /api/chat/history` — Permanently delete all stored chat messages for the authenticated user.

### Plaid — `/api/plaid`
*   `POST /api/plaid/create-link-token` — Generate a short-lived Plaid Link token for the frontend widget.
*   `POST /api/plaid/exchange-token` — Exchange a one-time `public_token` for a permanent `access_token` (AES-256 encrypted before storage).
*   `GET /api/plaid/items` — List all connected bank items for the current user.
*   `GET /api/plaid/balances` — Fetch real-time account balances from Plaid. Returns mock data gracefully if no items are connected.
*   `DELETE /api/plaid/items/:itemId` — Call Plaid `item/remove`, revoke the access token, and delete the item from the database.

## Features in Detail

### AI Chat & Function Calling

The chat service builds a complete financial context window before every Gemini API call. It queries the user's last 50 transactions, all active budgets, savings goals, and Plaid account balances, then injects a structured system prompt that grounds every answer in real data. The model is configured with two tool declarations:

**`createBudget`** accepts `category` and `limit_amount`. When the user says something like *"Set a $200 budget for groceries,"* Gemini invokes the tool with the parsed arguments and the server creates or updates the budget row, then confirms it in the reply.

**`logTransaction`** accepts `amount`, `name`, `category`, `merchant_name`, and `date`. When the user says *"I spent $45 on gas at Shell today,"* Gemini extracts and structures the fields, the server inserts the manual transaction, and the assistant acknowledges it naturally.

Both tools execute database writes on the server before the final response is sent — the user sees a single, coherent conversational reply that reflects the action already taken.

### Month-over-Month Comparison

The `/api/transactions/monthly-compare` endpoint computes two separate date ranges — the current calendar month and the immediately preceding month — and runs parallel `GROUP BY category` queries for both. It builds a unified category list, computes per-category `diff` and `pct` change values, and returns a summary object with overall totals.

The frontend renders a summary banner showing last month's total, the delta amount, and this month's total. Below it, each detected category gets a card with two 1.5px progress bars — indigo for the current month, gray for the previous — scaled proportionally to the larger of the two values. Change badges are green for decreases and red for increases.

### Subscription Detection

The detection algorithm queries the last 90 days of transactions and groups them by merchant name. A merchant is flagged as a subscription if it appears at least twice, the amounts are within 10% of each other (allowing for minor billing fluctuations), and the average interval between charges is between 25 and 40 days. The algorithm estimates the next billing date by projecting the average interval forward from the last charge date.

### Encrypted Token Storage

Every Plaid `access_token` is encrypted with AES-256-CBC before being written to the database. The encryption key is a 32-byte (64-character hex) secret loaded from the `ENCRYPTION_KEY` environment variable. The `cryptoService.js` generates a fresh random 16-byte IV for every encryption operation and prepends it to the ciphertext, so no two encrypted tokens are identical even for the same input. Decryption extracts the IV from the first 32 hex characters before deciphering.

### Custom Date Picker

The `CustomDatePicker` component is a fully self-contained calendar widget built with React hooks — no third-party date library required. It supports `min` and `max` date constraints enforced at both the day and month navigation level, keyboard-accessible day selection, smart viewport detection to open upward when near the bottom of the screen, `sm` and `md` size variants, and a click-outside handler for dismissal. It replaces every native `<input type="date">` in the app for visual consistency.

### Daily Transaction Sync

The `initTransactionCron` function registers a `node-cron` schedule for `0 2 * * *` (2:00 AM daily). On each trigger it queries all `plaid_items` rows, decrypts each access token, and runs a full cursor-based `transactionsSync` call for each item. Added and modified transactions are upserted; removed transactions are hard-deleted. Each item's cursor is updated atomically. Errors on individual items are caught and logged without aborting the rest of the batch, so a single bad token never breaks the nightly sync for other users.

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/finai
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=64-char-hex-string-for-aes256
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
PLAID_ENV=sandbox
GEMINI_API_KEY=your-google-gemini-api-key
PORT=5000
```

Generate a secure encryption key:
```bash
openssl rand -hex 32
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- A [Plaid](https://plaid.com) developer account (free Sandbox tier)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Giancyril/FinBot.git
   cd FinBot
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure environment variables** — fill in `backend/.env` and `frontend/.env` as shown above

4. **Start both servers**
   ```bash
   npm run dev
   ```
   - Backend API: `http://localhost:5000`
   - Frontend: `http://localhost:5174`

> The backend auto-creates all database tables on first boot via `schema.sql` — no manual migration step required.

### Connecting a Test Bank (Plaid Sandbox)
1. Click **Connect Bank** on the Dashboard
2. Search for any institution (e.g., *Chase*) in the Plaid Link widget
3. Use credentials `user_good` / `pass_good`
4. Click **Sync Transactions** — your transaction history will be imported immediately

## Security Notes

- Plaid access tokens are **never logged** or stored in plaintext — only AES-256-CBC ciphertext reaches the database
- JWT tokens are stored in **HTTP-only cookies** — inaccessible to JavaScript and immune to XSS token theft
- Password changes require the **current password** to be validated before the new hash is stored
- The `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes) — the server performs a length check on startup and exits with a `FATAL` error if misconfigured
- Plaid item disconnection calls Plaid `item/remove` first to revoke the token at the source before deleting the local record
