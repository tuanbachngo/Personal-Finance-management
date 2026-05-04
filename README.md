# Personal Finance Management System

A Streamlit + Python + MySQL application for managing personal finance data.

The project is based on the assignment in `docs/13.pdf`.

## Objective

Build a system that helps users manage income, expenses, bank accounts, spending categories, financial summaries, reports, budget planning, and spending alerts.

## Tech Stack

- Python
- Streamlit
- MySQL
- Docker / Docker Compose
- mysql-connector-python or equivalent MySQL connector layer

## Database Name

The database name must remain:

```text
Personal_Finance
```

## Main Features

Implemented or in progress:

- User authentication
- Persistent login session tokens
- User profile management
- Income CRUD
- Expense CRUD
- Reports and summaries
- Spending alerts overview
- Bank catalog and bank selection during signup/admin user creation
- Initial bank account creation for new users
- Smoke test coverage for core flows

Expected from the assignment:

- Users
- Income
- Expense categories
- Expenses
- Bank accounts
- Daily/monthly/yearly summaries
- Budget planning
- Spending limit alerts
- Category-wise spending reports
- ER diagram
- SQL schema and sample data
- Indexes
- Views
- Stored procedures
- User-defined functions
- Triggers
- Security/access controls
- Backup and recovery explanation
- Python application
- Final report with screenshots
- GitHub source code link
- YouTube demo link

## Important Files and Folders

```text
database/schema.sql
database/sample_data.sql
database/views.sql
database/queries.sql
database/migrations/001_add_banks_catalog.sql
python_app/streamlit_app.py
python_app/services/finance_service.py
python_app/repositories/user_repository.py
python_app/repositories/account_repository.py
python_app/repositories/report_repository.py
python_app/ui/helpers/session.py
python_app/ui/components/theme.py
python_app/ui/pages/alerts.py
python_app/ui/pages/user_management.py
python_app/smoke_test.py
HANDOFF.md
AGENTS.md
TODO.md
docs/13.pdf
```

## Current Project State

Read `HANDOFF.md` for the latest state.

The latest known issue is that the smoke test fails during delete-user cleanup because newly created users now receive an initial zero-balance bank account. The current delete-user logic treats any account as a blocking dependency.

Expected behavior:

- Block deletion when the user has actual financial activity.
- Allow deletion when the user only has empty zero-balance initial accounts.

## Setup and Verification

Because the local Python environment may be broken, Docker is the preferred verification path.

### Fresh Docker Reset

```powershell
docker compose down -v
docker compose build
docker compose up -d db
docker compose run --rm db-reset
docker compose run --rm bootstrap-admin
docker compose up -d --build app
docker compose run --rm smoke-test
```

### Existing Local Docker Database Migration

```powershell
Get-Content .\database\migrations\001_add_banks_catalog.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
Get-Content .\database\views.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
docker compose up -d --build app
docker compose run --rm smoke-test
```

### Run App

```powershell
docker compose up -d --build app
```

## FastAPI + Next.js Incremental Migration

This repository now includes an incremental migration workspace:

- `backend/` for FastAPI REST APIs (auth, dashboard, transactions, reports, budgets, alerts, users)
- `frontend/` for Next.js pages that mirror Streamlit features
- Legacy Streamlit app remains active in `python_app/streamlit_app.py`

### Install dependencies locally

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

Frontend:

```powershell
cd frontend
npm install
```

### Run locally

Backend:

```powershell
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

### Run with Docker Compose

```powershell
docker compose up -d db
docker compose run --rm db-reset
docker compose run --rm bootstrap-admin
docker compose up -d --build backend frontend app
```

### Quick test (Login/Dashboard baseline)

1. Open backend docs: `http://localhost:8000/docs`
2. Call `POST /api/v1/auth/login` with admin credentials.
3. Use returned bearer token for `GET /api/v1/dashboard/overview`.
4. Open frontend at `http://localhost:3000/login`.
5. Login and verify dashboard KPI/chart/alerts render.

### Implemented Next.js Routes (Parity Migration)

Auth routes:

- `/login`
- `/signup`
- `/verify-otp-unlock`
- `/forgot-password`

App routes:

- `/dashboard`
- `/transactions`
- `/add-income`
- `/add-expense`
- `/edit-income`
- `/edit-expense`
- `/reports`
- `/daily-summary`
- `/budgets`
- `/alerts`
- `/balance-history`
- `/user-management` (admin only)

### Implemented FastAPI Endpoints

Auth:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/otp/unlock/request`
- `POST /api/v1/auth/otp/unlock/verify`
- `GET /api/v1/auth/recovery-hint`
- `POST /api/v1/auth/password/reset/request`
- `POST /api/v1/auth/password/reset/confirm`

Meta:

- `GET /api/v1/meta/users`
- `GET /api/v1/meta/accounts`
- `GET /api/v1/meta/categories`
- `GET /api/v1/meta/banks`

Transactions:

- `GET /api/v1/transactions`
- `GET /api/v1/incomes`
- `GET /api/v1/incomes/{income_id}`
- `POST /api/v1/incomes`
- `PUT /api/v1/incomes/{income_id}`
- `DELETE /api/v1/incomes/{income_id}`
- `GET /api/v1/expenses`
- `GET /api/v1/expenses/{expense_id}`
- `POST /api/v1/expenses`
- `PUT /api/v1/expenses/{expense_id}`
- `DELETE /api/v1/expenses/{expense_id}`

Reports/Budgets/Alerts:

- `GET /api/v1/reports/monthly`
- `GET /api/v1/reports/yearly`
- `GET /api/v1/reports/daily`
- `GET /api/v1/reports/category-spending`
- `GET /api/v1/balance-history`
- `GET /api/v1/budgets/plans`
- `POST /api/v1/budgets/plans`
- `PUT /api/v1/budgets/plans/{budget_id}`
- `DELETE /api/v1/budgets/plans/{budget_id}`
- `GET /api/v1/budgets/status`
- `GET /api/v1/alerts/spending`

User Management:

- `GET /api/v1/users/profiles`
- `POST /api/v1/users/profiles`
- `PUT /api/v1/users/profiles/{target_user_id}`
- `DELETE /api/v1/users/profiles/{target_user_id}`

### View Logs

```powershell
docker compose logs -f app
```

## Workflow for Future Codex Sessions

When starting a new Codex session:

1. Read `HANDOFF.md`.
2. Read `AGENTS.md`.
3. Read `TODO.md`.
4. Read `docs/13.pdf` to understand the original assignment.
5. Run:

```powershell
git status --short
```

6. Summarize the current project state before editing files.
7. Make the smallest safe change for the requested task.
8. Verify with Docker/smoke test when possible.
9. Update `HANDOFF.md` before ending the session.

## Final Deliverables Checklist

The final submission should include:

- Printed comprehensive report with database design, implementation details, and screenshots
- First pages of the report should attach the original PDF assignment
- GitHub source code link
- YouTube presentation/demo link
- SQL schema script
- Sample data script
- ER diagram or MySQL Workbench schema diagram
- Python application source code
- Demonstration of adding income, managing expenses, and generating reports
