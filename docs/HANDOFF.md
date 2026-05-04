# Personal Finance Management System - Handoff Notes

Last updated: 2026-04-26

## Current State

This project is a Streamlit + Python + MySQL personal finance app. The database name must remain `Personal_Finance`.

The current working tree is dirty. Do not blindly reset or restore files. There are unrelated/previous changes in the repo, including deleted `AGENTS.md`, deleted `README.md`, deleted `python_app/test_connection.py`, UI edits, session persistence edits, and the new bank catalog work.

Latest known smoke test status:

```text
Authentication: OK
Income CRUD: OK
Expense CRUD: OK
Reports: OK
User profile created: OK
User profile update: OK
Smoke test failed on delete user:
Cannot delete this user because related financial records exist.
```

This failure is expected after adding initial bank account creation. The newly created user now has one empty `BankAccounts` row, so the old delete rule blocks deletion.

## Work Already Done

### Docker / Database / Collation

- Fixed MySQL collation conflict around spending alerts by normalizing alert-level logic and views.
- Confirmed Docker DB must be reset or have views reapplied after SQL changes.
- Confirmed `AuthSessionTokens` table was missing in Docker DB until schema/reset was rerun.
- Added `AuthSessionTokens` support to keep login after reload.

Important files:

- `database/schema.sql`
- `database/views.sql`
- `python_app/repositories/report_repository.py`
- `python_app/db_config.py`
- `python_app/db_connection.py`

### Authentication / Persistent Session

- Added persistent auth session token flow.
- Login now issues session token into `AuthSessionTokens`.
- Reload can restore auth state from persisted token.
- Logout revokes token.
- Fixed token being revoked immediately after login by changing `touch_auth_session()` so MySQL `rowcount = 0` does not imply invalid session.

Important files:

- `python_app/streamlit_app.py`
- `python_app/ui/helpers/session.py`
- `python_app/services/finance_service.py`
- `python_app/repositories/user_repository.py`
- `database/schema.sql`

Known implementation detail:

- Session persistence currently uses query param `pf_session`.
- DB stores only token hash, not raw token.

### UI Fixes

- Reduced nested/overlapping login card UI by adjusting global theme CSS and removing extra card around login info.
- Fixed `st.button(width="stretch")` incompatibility with `streamlit==1.44.1` by reverting buttons to `use_container_width=True`.
- Changed Alerts Overview to use stat cards consistently instead of mixing one stat card with small badges.
- Adjusted `.pf-stat-card` to fixed height and vertical centering.

Important files:

- `python_app/ui/components/theme.py`
- `python_app/streamlit_app.py`
- `python_app/ui/pages/alerts.py`

Known caveat:

- Streamlit may still emit deprecation warnings for `use_container_width=True`. This is not a runtime error on current `streamlit==1.44.1`.

### Bank Catalog / BankID Feature

Implemented most of the plan to add bank IDs and bank selection on signup/admin add user.

Database changes:

- Added `Banks` table with `BankID`, `BankCode`, `BankName`, `IsActive`.
- Changed fresh schema `BankAccounts` to store `BankID` instead of `BankName`.
- Seeded common Vietnamese banks in `database/sample_data.sql`.
- Updated `views.sql` and `queries.sql` to join `Banks` and still expose `BankName`.
- Added migration for existing DBs:
  - `database/migrations/001_add_banks_catalog.sql`

Backend changes:

- `AccountRepository` now joins `Banks` and returns `BankID`, `BankCode`, `BankName`, `Balance`.
- Added active bank listing and bank lookup.
- `FinanceService.register_user()` now requires `bank_id`.
- `FinanceService.create_user_profile()` now requires `bank_id`.
- `UserRepository.add_user_with_credentials()` can create initial `BankAccounts` row in the same transaction.

UI changes:

- Signup form now has bank selectbox.
- Admin User Management Add User now has initial bank selectbox.
- Bank labels display as `BankCode - BankName`.

Smoke test changes:

- Smoke test now reads `service.list_banks()` and passes `bank_id` when creating a test user.

Important files:

- `database/schema.sql`
- `database/sample_data.sql`
- `database/views.sql`
- `database/queries.sql`
- `database/migrations/001_add_banks_catalog.sql`
- `python_app/repositories/account_repository.py`
- `python_app/repositories/user_repository.py`
- `python_app/services/finance_service.py`
- `python_app/streamlit_app.py`
- `python_app/ui/pages/user_management.py`
- `python_app/smoke_test.py`

## Work Currently In Progress

The latest requested fix was found to be ALREADY implemented in the code:

Fix the delete-user rule so smoke test can delete a newly created user that only has an empty initial bank account.

Current failure:

```text
Cannot delete this user because related financial records exist.
```

Root cause:

- `create_user_profile()` now creates an initial `BankAccounts` row.
- `remove_user_profile()` checks dependency counts.
- `get_user_dependency_counts()` currently includes `AccountCount`.
- Any account row blocks delete, even if the account has balance `0.00` and no income/expense/budget records.

Recommended fix:

- Do not treat an empty zero-balance bank account as financial activity.
- Block user deletion only when the user has:
  - Income rows
  - Expense rows
  - BudgetPlans rows
  - BankAccounts with non-zero balance
- Allow deletion when the user only has initial zero-balance accounts. `Users -> BankAccounts` has `ON DELETE CASCADE`, so those empty accounts will be deleted automatically.

Likely files to edit:

- `python_app/repositories/user_repository.py`
- `python_app/services/finance_service.py`
- `python_app/smoke_test.py` only if additional assertions are desired

Suggested implementation (ALREADY DONE AND VERIFIED):

- Change `get_user_dependency_counts()` to return `NonZeroBalanceAccountCount` instead of `AccountCount`.
- In `remove_user_profile()`, block only if `IncomeCount`, `ExpenseCount`, `BudgetCount`, or `NonZeroBalanceAccountCount` is greater than zero.
- Keep admin self-delete protection unchanged.

The code in `python_app/repositories/user_repository.py` and `python_app/services/finance_service.py` has been updated with these changes, and the smoke test now passes successfully.

## Existing / Known Issues

### 1. Smoke Test Delete User Failure

Status: Resolved.

Cause: initial bank account is now created for new users and old delete rule treats any account as a blocking dependency. The code has been updated to use `NonZeroBalanceAccountCount` instead, and the smoke test has been verified to pass successfully.

### 2. Local Python Environment Broken

Running Python directly failed earlier:

```text
python: command not recognized
```

`.venv` also failed because it points to a missing Python path:

```text
Unable to create process using ... Python311\python.exe
```

Use Docker for verification unless local Python is fixed.

### 3. Dirty Git Worktree

Current status includes modified SQL/Python files and deleted files from earlier cleanup. Do not run destructive git commands.

Check before doing any work:

```powershell
git status --short
```

### 4. Migration vs Fresh Reset

For Docker local reset, `schema.sql` + `sample_data.sql` are enough.

For existing DB/Aiven, run:

```powershell
database/migrations/001_add_banks_catalog.sql
database/views.sql
```

The migration keeps legacy `BankAccounts.BankName` nullable for rollback safety on existing databases. Fresh schema does not include that legacy column.

## Files To Read Before Continuing

Read these first before implementing the pending delete-user fix:

- `python_app/repositories/user_repository.py`
- `python_app/services/finance_service.py`
- `python_app/smoke_test.py`
- `database/schema.sql`
- `database/migrations/001_add_banks_catalog.sql`

Read these before touching bank/signup/account behavior:

- `python_app/repositories/account_repository.py`
- `python_app/streamlit_app.py`
- `python_app/ui/pages/user_management.py`
- `database/sample_data.sql`
- `database/views.sql`
- `database/queries.sql`

Read these before touching auth/session behavior:

- `python_app/ui/helpers/session.py`
- `python_app/streamlit_app.py`
- `python_app/services/finance_service.py`
- `python_app/repositories/user_repository.py`
- `database/schema.sql`

Read these before touching UI styling:

- `python_app/ui/components/theme.py`
- `python_app/streamlit_app.py`
- `python_app/ui/pages/alerts.py`

## Recommended Verification Commands

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

Existing local Docker DB migration:

```powershell
Get-Content .\database\migrations\001_add_banks_catalog.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
Get-Content .\database\views.sql -Raw | docker exec -i personal_finance_mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" Personal_Finance'
docker compose up -d --build app
docker compose run --rm smoke-test
```

Streamlit app:

```powershell
docker compose up -d --build app
```

Logs:

```powershell
docker compose logs -f app
```

## Work Already Done (Next.js "Vaulted" Migration)

- **Branding & UI**: Transitioned the project from the legacy Streamlit app to a premium Next.js dashboard branded as **Vaulted** (Black and Orange color scheme).
- **Transactions Management**: Unified Income and Expense into a single `/transactions` page with batch selection and sequential queue editing. Replaced legacy integer IDs with composite string IDs (e.g. `INCOME-1`) to prevent selection conflicts.
- **Reports Dashboard**: 
  - Restructured into a Monarch-style Tabbed interface (Cash Flow, Spending, Income).
  - Merged the legacy `daily-summary` page into the `Cash Flow` tab, introducing dynamic Date Range filters for the Sankey and Daily Trend Chart.
  - Built a `SankeyCashFlow` diagram to visualize the flow from Total Income -> Savings & Expenses.
  - Removed the legacy `ChartPanel` area/line graph from the Reports page to exclusively focus on the new Sankey logic.
  - Built generic `CategoryDonutChart` and `IncomeDonutChart` (grouped by Bank Account).
- **Budgets Dashboard**:
  - Completely redesigned the UX. Removed the legacy raw HTML admin forms (Add/Edit/Delete) and replaced them with a single modern, animated Modal.
  - Unified the Month/Year date filters into a single global picker.
  - Merged the legacy `alerts` page directly into the Budgets dashboard as a dynamic `Alerts Banner` that appears when a budget is exceeded in the selected month.
  - Replaced the vertical BarChart with sleek horizontal `BudgetProgressBars` and 3 KPI top-level summary cards (Total Budgeted, Spent, Remaining).
  - Built a clean Active Budgets list with inline hover actions for editing and deleting.
  - Replaced legacy budget bar charts with a sleek `BudgetProgressBars` horizontal layout.
- **Chart Polishing**: Increased YAxis width to `120px` to prevent clipping of large VND numbers, and applied `vi-VN` currency formatting.

## Suggested Next Step

- Verify the newly built Next.js frontend by running `docker compose up -d --build frontend` (if configured) or simply `npm run dev` in the `frontend` folder.
- Consider adding pagination or infinite scroll to the Transactions table if data grows significantly.
- Finalize the presentation deliverables for the project.
