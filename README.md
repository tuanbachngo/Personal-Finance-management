# Personal Finance Management System

Personal Finance Management System built with MySQL 8+, Python, and Streamlit.

Main database name is fixed: `Personal_Finance`.

## 1) Project Structure

- `database/`: canonical SQL scripts
- `python_app/`: backend repositories/services + CLI + Streamlit app
- `python_app/ui/pages/`: Streamlit pages
- `ops/`: backup/restore helper scripts
- `docs/`: runbook + deliverables checklists

## 2) Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Set MySQL connection via environment variables or Streamlit secrets:

- `MYSQL_HOST` (optional, default `localhost`)
- `MYSQL_PORT` (optional, default `3306`)
- `MYSQL_USER` (optional, default `root`)
- `MYSQL_PASSWORD` (required, no hard-coded fallback)
- `MYSQL_DATABASE` (must be `Personal_Finance`)

Use templates:
- `.env.example`
- `.streamlit/secrets.toml` (local-only secret file, do not commit)
- `.env.docker.example`

Docker note:
- Plain `docker compose ...` automatically reads `.env`
- `.env.docker` is only used when you pass `--env-file .env.docker`
- If you want `docker compose config` / `docker compose up` without extra flags, copy your Docker env to `.env`

Auth runtime flags:
- `AUTH_DEV_MODE=false` (default)
- `AUTH_LOG_OTP_IN_DEV=true` (when dev mode is true, OTP is logged to terminal only)

## 3) Reset Database (Recommended SQL Order)

Run scripts in this order:

1. `database/schema.sql`
2. `database/sample_data.sql`
3. `database/views.sql`
4. `database/functions.sql`
5. `database/triggers.sql`
6. `database/procedures.sql`
7. `database/queries.sql`
8. `database/security.sql`

Note:
- `database/security.sql` uses placeholder MySQL user passwords (`CHANGE_ME_*`).
- Replace placeholders before running in non-demo environments.

Or run one-shot reset:

```powershell
powershell -ExecutionPolicy Bypass -File ops\reset_database.ps1 -Host "localhost" -Port 3306 -User "root" -Password "your_mysql_password"
```

## 4) Bootstrap App Auth Credentials (Required after reset)

Sample PowerShell flow:

```powershell
$env:PF_ADMIN_EMAIL="tuanbachngo@gmail.com"
$env:PF_ADMIN_PASSWORD="change_me_admin_password"
$env:PF_ADMIN_NAME="Ngo Tuan Bach"
$env:PF_ADMIN_PHONE="0901000010"
$env:PF_ADMIN_RECOVERY_HINT="Your recovery hint here"
$env:PF_ADMIN_RECOVERY_ANSWER="your_recovery_answer"
python ops/bootstrap_auth.py
```

Optional:
- Set `PF_ADMIN_RECOVERY_HINT` and `PF_ADMIN_RECOVERY_ANSWER` to bootstrap admin recovery data.
- Set `PF_SEED_SAMPLE_USER_PASSWORD` to seed password for sample USER accounts.
- Set `PF_FORCE_RESET_SAMPLE_PASSWORDS=true` to overwrite existing sample USER passwords.

## 5) Run DB Connection + Sanity Check (Quick)

```bash
python python_app/test_connection.py
```

This quick check covers:

- Connect to database `Personal_Finance`
- Basic read sanity for `Users`, `BankAccounts`, `ExpenseCategories`
- Optional lightweight view sanity (`vw_total_income_by_user`, `vw_total_expense_by_user`)

## 6) Run End-to-End Smoke Test (Main)

```bash
python python_app/smoke_test.py
```

Required env vars for smoke login:
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

Example (PowerShell):

```powershell
$env:SMOKE_ADMIN_EMAIL=$env:PF_ADMIN_EMAIL
$env:SMOKE_ADMIN_PASSWORD=$env:PF_ADMIN_PASSWORD
python python_app/smoke_test.py
```

Smoke test covers:

- DB connection
- App-level authentication
- List users/accounts/categories
- Add/update/delete income
- Add/update/delete expense
- Daily/monthly/yearly summaries
- Budget status, alerts, balance history
- User profile add/update/delete (admin path)

## 7) Run Streamlit App

```bash
streamlit run python_app/streamlit_app.py
```

Main pages:

- Dashboard
- Transactions
- Add Income
- Add Expense
- Edit Income
- Edit Expense
- Daily Summary
- Reports
- Budgets (CRUD + budget-vs-actual)
- Alerts
- Balance History
- User Management

Login account:
- Use the account created by `ops/bootstrap_auth.py`.
- No demo plaintext password is committed in source code.

## 7.1) Dockerized Local Run on Windows 11

For a production-like local setup with Docker Desktop:

- Prepare env:
  - either `Copy-Item .env.docker.example .env`
  - or `Copy-Item .env.docker.example .env.docker` and always use `--env-file .env.docker`
- Build image: `docker compose --env-file .env.docker build`
- Start MySQL: `docker compose --env-file .env.docker up -d db`
- Reset DB: `docker compose --env-file .env.docker run --rm db-reset`
- Re-apply only views after SQL/view fixes: `docker compose --env-file .env.docker run --rm db-apply-views`
- Bootstrap admin: `docker compose --env-file .env.docker run --rm bootstrap-admin`
- Start app with newest code/image: `docker compose --env-file .env.docker up -d --build app`
- Run smoke test: `docker compose --env-file .env.docker run --rm smoke-test`

Detailed guide:

- `docs/windows11_docker_setup.md`

## 7.2) Production-Like Global Deployment

The repo now includes a production deployment scaffold for:

- Ubuntu VPS / Droplet
- remote MySQL / managed MySQL
- Docker Compose
- Caddy reverse proxy with HTTPS

Key files:

- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.production.example`
- `ops/linux/reset_remote_db.sh`
- `ops/linux/apply_remote_views.sh`
- `ops/linux/deploy_prod.sh`
- `docs/production_deployment.md`

Quick Linux flow:

```bash
cp .env.production.example .env.production
# edit .env.production with real values

sh ops/linux/deploy_prod.sh first-start
sh ops/linux/deploy_prod.sh smoke
```

This production flow expects:

- `MYSQL_DATABASE=Personal_Finance`
- `AUTH_DEV_MODE=false`
- `AUTH_LOG_OTP_IN_DEV=false`
- a public domain already pointing to your server for HTTPS

## 8) Backup / Recovery

PowerShell helper scripts:

- Backup: `ops/backup_database.ps1`
- Restore: `ops/restore_database.ps1`

Detailed guide: `docs/backup_recovery.md`

## 9) Quick Manual Test Checklist

1. Run bootstrap script and login with your local admin account
2. Test Sign Up to create a new USER account
3. Open `User Management` and verify list/add/edit/delete behavior (ADMIN only)
4. Select current user in sidebar (admin can switch; normal user is fixed to self)
5. Open `Dashboard` and verify metrics + monthly trend + alert summary
6. Open `Daily Summary` and verify table + chart
7. Open `Budgets`:
   - add budget plan
   - update budget plan
   - delete budget plan
   - verify budget-vs-actual table/chart updates
8. Add income/expense and then edit/delete from edit pages
9. Verify `Transactions`, `Reports`, `Alerts`, `Balance History`
10. Verify insufficient-balance validation on expense
11. Login as a normal USER and verify no access to `User Management`

## 10) Submission Support Docs

- End-to-end runbook: `docs/end_to_end_runbook.md`
- Deliverables checklist: `docs/deliverables_checklist.md`
- Demo checklist: `docs/demo_checklist.md`
- Report outline: `docs/report_outline.md`
- Final links placeholder: `docs/final_links.md`
