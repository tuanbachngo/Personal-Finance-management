# End-to-End Runbook (Reset -> Run -> Verify)

This runbook helps you verify the project from a clean database reset to app usage.

Database name is fixed: `Personal_Finance`.

## 1. Reset Database

Run SQL files in this exact order:

1. `database/schema.sql`
2. `database/sample_data.sql`
3. `database/views.sql`
4. `database/functions.sql`
5. `database/triggers.sql`
6. `database/procedures.sql`
7. `database/queries.sql`
8. `database/security.sql`

Optional PowerShell one-shot reset:

```powershell
powershell -ExecutionPolicy Bypass -File ops\reset_database.ps1 `
  -Host "localhost" `
  -Port 3306 `
  -User "root" `
  -Password "your_mysql_password"
```

After reset:
- Run `ops/bootstrap_auth.py` to create/update app credentials locally.
- `database/sample_data.sql` intentionally does not seed plaintext app passwords.

## 2. Bootstrap Auth Credentials (Required)

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
- `PF_ADMIN_RECOVERY_HINT` and `PF_ADMIN_RECOVERY_ANSWER` to seed admin recovery data.
- `PF_SEED_SAMPLE_USER_PASSWORD` to seed sample USER credentials.
- `PF_FORCE_RESET_SAMPLE_PASSWORDS=true` to overwrite existing sample USER credentials.

## 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

## 4. Run DB Connection + Sanity Check (Optional but recommended)

```bash
python python_app/test_connection.py
```

Expected result:
- `DB SANITY CHECK RESULT: PASSED`

This step only checks:
- DB connection to `Personal_Finance`
- basic table read sanity
- optional lightweight view sanity

## 5. Run Smoke Test (Main)

```bash
python python_app/smoke_test.py
```

Required env vars:
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

Example (PowerShell):

```powershell
$env:SMOKE_ADMIN_EMAIL=$env:PF_ADMIN_EMAIL
$env:SMOKE_ADMIN_PASSWORD=$env:PF_ADMIN_PASSWORD
python python_app/smoke_test.py
```

Expected result:
- `SMOKE TEST RESULT: PASSED`

The smoke test covers:
- DB connection
- login/authentication
- list users/accounts/categories
- add/update/delete income
- add/update/delete expense
- daily summary
- monthly summary
- yearly summary
- budget status
- alerts
- balance history
- user profile add/update/delete (admin path)

## 6. Run Streamlit App

```bash
streamlit run python_app/streamlit_app.py
```

Login:
- Use credentials created by `ops/bootstrap_auth.py`.
- No demo plaintext password is committed in source code.

## 7. Manual Functional Checklist

### Authentication
- Login success with valid credentials
- Login fail with wrong password
- Sign Up success for a new USER account
- Sign Up fail for duplicate/invalid email
- Logout works and returns to login screen

### User Profile Management
- Admin can list all users
- Admin can add user
- Admin can edit user
- Admin delete blocks when user has financial records
- Non-admin cannot access User Management page
- Non-admin is locked to own user scope

### Transactions
- Add income
- Add expense (sufficient balance)
- Add expense (insufficient balance) shows clear error
- Edit income/expense
- Delete income/expense

### Reports
- Daily summary page shows table + chart
- Monthly summary works
- Yearly summary works
- Budget status works
- Alerts page works
- Balance history works
