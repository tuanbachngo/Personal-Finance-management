# Personal Finance Management System (Personal_Finance)

Personal finance management system using MySQL + Python service layer, with:

- API layer: FastAPI (`backend/`)
- Web UI: Next.js (`frontend/`)

Database name is fixed and must remain:

```text
Personal_Finance
```

## 1. Scope and Features

Core modules currently implemented:

- Authentication and session handling
- User profile management
- Income / Expense CRUD
- Budget planning and spending guardrails
- Spending alerts
- Goals and goal contributions
- Reports (daily / monthly / yearly, category spending, balance history)
- Bank catalog and bank-linked account setup
- CSV/Excel transaction import preview + confirm (via backend APIs and transactions UI flow)

## 2. Tech Stack

- MySQL 8
- Python
  - FastAPI
  - mysql-connector
- Next.js + TypeScript + Tailwind
- Docker / Docker Compose

## 3. Repository Structure

```text
database/
  schema.sql
  sample_data.sql
  views.sql
  procedures.sql
  functions.sql
  triggers.sql
  security.sql
  migrations/

python_app/          # shared core service/repository modules
backend/             # FastAPI API
frontend/            # Next.js frontend
ops/                 # helper scripts (bootstrap/reset)
docs/13.pdf          # assignment source
```

## 4. Prerequisites

- Docker Desktop (recommended path)
- Or local:
  - Python 3.11+
  - Node.js 18+
  - npm

## 5. Environment Setup

Use env template:

```powershell
Copy-Item .env.docker.example .env
```

Fill required values in `.env`:

- `MYSQL_ROOT_PASSWORD`
- `PF_ADMIN_EMAIL`
- `PF_ADMIN_PASSWORD`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

Optional ports:

- `MYSQL_LOCAL_PORT` (default `3307`)
- `BACKEND_LOCAL_PORT` (default `8000`)
- `FRONTEND_LOCAL_PORT` (default `3000`)

## 6. Run with Docker (Recommended)

### 6.1 First setup (fresh DB)

```powershell
docker compose up -d db
docker compose run --rm db-reset
docker compose run --rm bootstrap-admin
docker compose up -d --build backend frontend
```

### 6.2 Access services

- FastAPI docs: `http://localhost:8000/docs`
- Next.js: `http://localhost:3000`

### 6.3 Smoke test

```powershell
docker compose run --rm smoke-test
```

## 7. Local Development (without Docker)

### 7.1 Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7.2 Frontend

```powershell
cd frontend
npm install
npm run dev
```

## 8. Current Frontend Routes (Next.js)

Auth pages:

- `/login`
- `/signup`
- `/forgot-password`
- `/verify-otp-unlock`

App pages:

- `/dashboard`
- `/transactions` (includes manual input + import flow UI)
- `/budgets`
- `/goals`
- `/reports`
- `/balance-history`
- `/profile`
- `/user-management` (admin)

## 9. FastAPI Route Groups

Base prefix: `/api/v1`

- `auth`: login/logout/me/signup/otp/recovery/password/profile
- `meta`: users/accounts/categories/banks
- `transactions`: transactions + incomes + expenses
- `imports`: preview/confirm/history
- `reports`: monthly/yearly/daily/category-spending/balance-history
- `dashboard`: overview
- `budgets`: plans/status/settings/overview/can-i-spend
- `alerts`: spending alerts
- `goals`: goals/progress/contributions
- `users`: admin profile CRUD

## 10. Database Assets

Main SQL files:

- `database/schema.sql`
- `database/sample_data.sql`
- `database/views.sql`
- `database/procedures.sql`
- `database/functions.sql`
- `database/triggers.sql`
- `database/security.sql`

Migrations:

- `database/migrations/001_add_banks_catalog.sql`
- `database/migrations/002_add_saving_goals.sql`
- `database/migrations/002_seed_saving_goals_demo.sql`
- `database/migrations/003_add_transaction_import_tables.sql`
- `database/migrations/004_smart_budget_guardrails.sql`
- `database/migrations/005_budget_settings_recurring_items.sql`

## 11. Notes

- Assignment reference: `docs/13.pdf`
- Do not rename database `Personal_Finance`.
