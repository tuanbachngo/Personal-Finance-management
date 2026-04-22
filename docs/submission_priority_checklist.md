# Project Closing Priority Checklist

Use this checklist to close the project in the fastest safe order.
Tick each item only when it is really done.

## P0 - Core code already present

- [x] Database name is kept as `Personal_Finance`
- [x] SQL schema file exists: `database/schema.sql`
- [x] Sample data file exists: `database/sample_data.sql`
- [x] Views file exists: `database/views.sql`
- [x] Functions file exists: `database/functions.sql`
- [x] Triggers file exists: `database/triggers.sql`
- [x] Procedures file exists: `database/procedures.sql`
- [x] Security script exists: `database/security.sql`
- [x] Python backend exists in `python_app/`
- [x] Streamlit UI exists in `python_app/streamlit_app.py`
- [x] Backup / restore scripts exist in `ops/`
- [x] Smoke test script exists: `python_app/smoke_test.py`
- [x] DB sanity check script exists: `python_app/test_connection.py`
- [x] Runbook exists: `docs/end_to_end_runbook.md`
- [x] Demo checklist exists: `docs/demo_checklist.md`

## P1 - Must verify before submission

- [x] Reset database successfully with the final SQL order
- [x] Confirm `database/sample_data.sql` runs without MySQL syntax errors
- [x] Run auth bootstrap successfully with local environment variables
- [x] Run `python_app/test_connection.py` successfully
- [x] Run `python_app/smoke_test.py` successfully
- [x] Start Streamlit app successfully
- [x] Login with admin account successfully
- [ ] Login with a normal user account successfully
- [ ] Verify user role access works correctly
- [ ] Verify add income works
- [ ] Verify add expense works
- [ ] Verify update income works
- [ ] Verify update expense works
- [ ] Verify delete income works
- [ ] Verify delete expense works
- [ ] Verify daily summary page works
- [ ] Verify monthly summary works
- [ ] Verify yearly summary works
- [ ] Verify budget status works
- [ ] Verify alerts page works
- [ ] Verify balance history works

## P2 - Submission assets still needed

- [ ] Export ER diagram file
- [ ] Export MySQL Workbench schema diagram
- [ ] Put diagram files into `docs/assets/diagrams/`
- [ ] Capture app screenshots for report
- [ ] Put screenshots into `docs/assets/screenshots/`
- [ ] Write the final report using `docs/report_outline.md`
- [ ] Put final report file into `docs/assets/report/`

## P3 - Demo and publishing

- [ ] Push final source code to GitHub
- [ ] Put GitHub repository link into `docs/final_links.md`
- [ ] Record demo video
- [ ] Put YouTube demo link into `docs/final_links.md`
- [ ] Rehearse the demo using `docs/demo_checklist.md`

## P4 - Final submission review

- [ ] Recheck that the database name is still `Personal_Finance`
- [ ] Recheck that no required SQL file is missing
- [ ] Recheck that README instructions still match the current project
- [ ] Recheck that screenshots match the final UI
- [ ] Recheck that report content matches the implemented features
- [ ] Recheck that GitHub repo is public or accessible as required
- [ ] Recheck that YouTube video link is working
- [ ] Recheck the final links in `docs/final_links.md`
- [ ] Do one last manual walkthrough before submitting
