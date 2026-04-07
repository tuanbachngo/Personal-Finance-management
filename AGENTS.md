# AGENTS.md

## Project overview
- Project name: Personal Finance Management System
- Primary goal: build a personal finance management app with MySQL and Python
- Main database name must always be: Personal_Finance

## Tech stack
- Backend language: Python
- Database: MySQL
- SQL dialect: MySQL 8+
- Frontend/UI: optional later, do not create unless requested
- Prediction features for saving/overspending will be added later

## Non-negotiable rules
- Never rename the database `Personal_Finance`
- Never rename existing tables unless explicitly asked
- Keep SQL files inside the `/database` folder
- Preserve current schema design unless explicitly asked to refactor
- Before making major structural changes, explain the change first
- Do not delete existing files unless explicitly asked
- Prefer incremental edits over full rewrites

## Current schema scope
The current core tables are:
- Users
- ExpenseCategories
- BankAccounts
- Income
- Expenses

Important schema rule:
- `Income` and `Expenses` must use `AccountID`
- Keep compatibility with future triggers for updating `BankAccounts.Balance`

## File organization
- Put schema creation scripts in `database/schema.sql`
- Put sample data in `database/sample_data.sql`
- Put reporting and analysis queries in `database/queries.sql`
- Put views in `database/views.sql`
- Put triggers in `database/triggers.sql`
- Put stored procedures in `database/procedures.sql`
- Put functions in `database/functions.sql`

## Coding preferences
- Write clean, readable, beginner-friendly code
- Add comments where helpful
- Keep functions and files simple and modular
- Do not overengineer
- When generating Python code, use the database name `Personal_Finance` exactly
- When writing SQL, prefer safe and explicit JOIN conditions

## Working style
- First inspect the current project structure before creating new files
- Reuse existing files if they already match the purpose
- If something is ambiguous, make the safest minimal assumption
- For major new features, propose a short plan before implementing
- For database changes, preserve compatibility with current sample data and queries

## Immediate priorities
Current focus:
1. Database correctness
2. SQL queries
3. Views and triggers
4. Python connection to MySQL
5. Basic app features
6. Prediction module later