# AGENTS.md

This file gives Codex/AI agents the operating rules for this repository.
Read this file together with `HANDOFF.md` and `docs/13.pdf` before making changes.

## Project

Personal Finance Management System.

Tech stack:

- Python
- Streamlit
- MySQL
- Docker / Docker Compose

The database name must remain:

```text
Personal_Finance
```

## Original Assignment

The original assignment is in:

```text
docs/13.pdf
```

The project objective is to build a personal finance management system that can manage users, income, expenses, bank accounts, categories, reports, budget plans, and spending alerts. It also requires SQL scripts, sample data, ER diagram, advanced database objects, Python application code, report screenshots, GitHub source link, and a YouTube demo.

## Required First Read

Before editing code, read these files first:

1. `HANDOFF.md`
2. `docs/13.pdf`
3. `README.md`
4. `TODO.md`

Then inspect the files related to the specific task.

## Critical Rules

- Do not rename the database. It must stay `Personal_Finance`.
- Do not run destructive git commands unless the user explicitly asks.
- Do not run `git reset`, `git restore`, or delete files blindly.
- Always run `git status --short` before editing.
- Treat the current working tree as potentially dirty.
- Prefer Docker for verification because the local Python environment may be broken.
- After backend/database changes, run the smoke test when possible.
- Keep `HANDOFF.md` updated after each meaningful change.

## Known Environment Notes

Local Python was previously broken:

```text
python: command not recognized
```

The `.venv` was also broken because it pointed to a missing Python path. Use Docker unless the local Python environment has been fixed.

## Main Verification Commands

Fresh local Docker reset:

```powershell
docker compose down -v
docker compose build
docker compose up -d db
docker compose run --rm db-reset
docker compose run --rm bootstrap-admin
docker compose up -d --build app
docker compose run --rm smoke-test
```

For an existing local Docker database migration:

```powershell
Get-Content .\database\migrations\001_add_banks_catalog.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
Get-Content .\database\views.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
docker compose up -d --build app
docker compose run --rm smoke-test
```

Start/rebuild the app:

```powershell
docker compose up -d --build app
```

View app logs:

```powershell
docker compose logs -f app
```

## Current High-Priority Task

The current unresolved issue is documented in `HANDOFF.md`.

Summary:

- Smoke test fails when deleting a newly created user.
- New users now get an initial `BankAccounts` row.
- The delete-user rule treats any bank account as financial activity.
- This blocks deletion even when the account is empty and has balance `0.00`.

Expected fix:

- Allow deleting a user who only has empty zero-balance initial bank accounts.
- Continue blocking deletion when the user has income rows, expense rows, budget rows, or non-zero account balances.
- Keep admin self-delete protection unchanged.

Likely files:

- `python_app/repositories/user_repository.py`
- `python_app/services/finance_service.py`
- `python_app/smoke_test.py`
- `database/schema.sql`
- `database/migrations/001_add_banks_catalog.sql`

## After Each Session

Update `HANDOFF.md` with:

- What changed
- Files edited
- Tests or commands run
- Current test status
- Remaining issues
- Next recommended step

Do not leave important project context only in chat history.
