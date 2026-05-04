# TODO.md

This file tracks the remaining work for the Personal Finance Management System project.
For detailed context, read `HANDOFF.md` first.

## Priority 1 - Fix Current Smoke Test Failure

- [x] Inspect `python_app/repositories/user_repository.py`.
- [x] Inspect `python_app/services/finance_service.py`.
- [x] Inspect `python_app/smoke_test.py`.
- [x] Update delete-user dependency logic.
- [x] Do not treat an empty zero-balance bank account as financial activity.
- [x] Block deletion only when the user has at least one of:
  - [x] Income rows
  - [x] Expense rows
  - [x] BudgetPlans rows
  - [x] BankAccounts with non-zero balance
- [x] Keep admin self-delete protection unchanged.
- [ ] Run smoke test:

```powershell
docker compose up -d --build app
docker compose run --rm smoke-test
```

Expected result:

```text
SMOKE TEST RESULT: PASSED
```

## Priority 2 - Verify Database Assignment Requirements

- [ ] Confirm `database/schema.sql` contains required tables.
- [ ] Confirm `database/sample_data.sql` has representative data.
- [ ] Confirm indexes exist for user queries and expense lookups.
- [ ] Confirm views exist for monthly income/expense summaries.
- [ ] Confirm views exist for category-wise spending.
- [ ] Confirm stored procedures exist or add them if missing.
- [ ] Confirm user-defined functions exist or add them if missing.
- [ ] Confirm triggers update bank account balance after income/expense changes.
- [ ] Confirm security/access-control explanation is documented.
- [ ] Confirm backup/recovery procedure is documented.
- [ ] Confirm performance optimization notes are documented.

## Priority 3 - Verify Python Application Requirements

- [ ] Confirm database connection works through Docker.
- [ ] Confirm authentication works.
- [ ] Confirm persistent session works after reload.
- [ ] Confirm user profile management works.
- [ ] Confirm income create/read/update/delete works.
- [ ] Confirm expense create/read/update/delete works.
- [ ] Confirm bank account tracking works.
- [ ] Confirm reports render correctly.
- [ ] Confirm budget planning works if implemented.
- [ ] Confirm spending alerts work.
- [ ] Confirm admin user management works.

## Priority 4 - Prepare Final Report

- [ ] Add the original assignment PDF at the beginning of the report.
- [ ] Write project objective and scope.
- [ ] Include ER diagram.
- [ ] Include relational schema.
- [ ] Explain primary keys, foreign keys, and constraints.
- [ ] Explain sample data.
- [ ] Explain indexes.
- [ ] Explain views.
- [ ] Explain stored procedures.
- [ ] Explain user-defined functions.
- [ ] Explain triggers.
- [ ] Explain authentication and access control.
- [ ] Explain backup and recovery.
- [ ] Explain Python/Streamlit application architecture.
- [ ] Include screenshots of major screens.
- [ ] Include screenshots of adding income.
- [ ] Include screenshots of managing expenses.
- [ ] Include screenshots of generating reports.
- [ ] Include conclusion and recommendations.
- [ ] Include references.

## Priority 5 - Prepare Submission Links

- [ ] Push source code to GitHub.
- [ ] Ensure README has setup/run instructions.
- [ ] Record YouTube demo.
- [ ] Add GitHub link to report.
- [ ] Add YouTube link to report.

## Priority 6 - Keep Handoff Updated

After every coding session:

- [ ] Update `HANDOFF.md` with files changed.
- [ ] Update `HANDOFF.md` with commands run.
- [ ] Update `HANDOFF.md` with current test result.
- [ ] Update `HANDOFF.md` with remaining issues.
- [ ] Update `HANDOFF.md` with the next recommended step.
