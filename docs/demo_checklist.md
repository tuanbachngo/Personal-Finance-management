# Demo Checklist

Use this script-like checklist when recording the demo video.

## 1. Setup evidence

- [ ] Show database name `Personal_Finance`
- [ ] Show app start command: `streamlit run python_app/streamlit_app.py`
- [ ] Show login page

## 2. Authentication flow

- [ ] Login as admin (`tuanbachngo@gmail.com`)
- [ ] Sign up a new USER account
- [ ] Logout
- [ ] Login as a normal user

## 3. User management

- [ ] Open `User Management`
- [ ] Show list of users
- [ ] Add one test user
- [ ] Edit that user
- [ ] Delete that user (or show safe-delete message)

## 4. Financial transaction flow

- [ ] Add income
- [ ] Add expense
- [ ] Edit income
- [ ] Edit expense
- [ ] Delete income/expense sample rows
- [ ] Show insufficient-balance error case for expense

## 5. Reporting flow

- [ ] Open `Daily Summary` and show table + chart
- [ ] Open `Dashboard` (metrics + chart)
- [ ] Open `Reports` (monthly/yearly/category/budget views)
- [ ] Open `Alerts`
- [ ] Open `Balance History`

## 6. Final proof

- [ ] Show `docs/end_to_end_runbook.md`
- [ ] Show `python_app/smoke_test.py` run result
