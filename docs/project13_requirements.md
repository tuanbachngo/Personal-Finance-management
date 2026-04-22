# Project 13 Requirements
## Personal Finance Management System

## 1. Project Objective
Build a system that helps users:
- manage personal income and expenses
- track financial activities
- analyze spending habits
- optimize savings through reports and alerts

## 2. Technology Requirements
- Database Management System: MySQL
- Programming Language: Python

## 3. Main Functionalities
The system should support:

### 3.1 User and Transaction Management
- User profile management
- Income entry
- Expense entry
- Update income and expense records
- Expense categorization

### 3.2 Account and Financial Tracking
- Bank account tracking
- Balance history
- Daily financial summaries
- Monthly financial summaries
- Yearly financial summaries

### 3.3 Budgeting and Alerts
- Budget planning
- Spending limit alerts

### 3.4 Reporting
- Reporting on spending trends
- Category-wise expenditure reporting
- Graphical and tabular reports

## 4. Database Design and Implementation Requirements

### 4.1 Data Model
- Create an ER diagram for users, income, expenses, and accounts
- Convert the ERD into a relational schema with PKs, FKs, and constraints

### 4.2 Required Core Tables
- Users (UserID, UserName, Email, PhoneNumber)
- Income (IncomeID, UserID, Amount, IncomeDate, Description)
- ExpenseCategories (CategoryID, CategoryName)
- Expenses (ExpenseID, UserID, CategoryID, Amount, ExpenseDate, Description)
- BankAccounts (AccountID, UserID, BankName, Balance)

### 4.3 Sample Data
- Populate each table with representative records
- Keep sample data meaningful enough for reports and testing

### 4.4 Advanced Database Objects
- Indexes for performance
- Views for monthly income/expense summaries and category-wise spending
- Stored Procedures for transaction operations and monthly closure support
- User Defined Functions for total income, total expenses, budget status, or related summaries
- Triggers for automatic balance updates on income/expense entry

## 5. Security and Administration
The project should also consider:
- authentication roles
- access controls
- backup and recovery
- query performance optimization

## 6. Python Application Requirements
The Python application should provide:
- database connection
- transaction input and tracking
- financial summaries
- graphical and tabular reports
- a user interface (CLI or GUI/web UI)

## 7. Deliverables
The final project should include:
- SQL schema
- sample data scripts
- views, triggers, functions, procedures
- ER diagram
- schema diagram from MySQL Workbench
- Python code
- a comprehensive report with screenshots
- GitHub source code link
- YouTube demo video

## 8. Current Project Direction
This repository should prioritize:
1. database correctness
2. complete core financial features
3. reports and alerts
4. usable Python app
5. demo-ready UI
6. documentation and deliverables

## 9. Implementation Notes for Codex
When implementing features in this project:
- preserve the database name `Personal_Finance`
- preserve existing schema unless a change is truly necessary
- prefer incremental edits
- reuse existing files and architecture
- keep Streamlit/UI logic separate from service and repository layers
- prefer service/repository access instead of raw SQL in UI pages
- when adding new features, align them with the required functionalities above

## 10. Future Enhancements
The following features are recommended as future extensions of the project. They are useful for improving the system, but they are not part of the core required features for the current submission.

### 10.1 Saving Goals
Users can define personal saving goals, such as:
- emergency fund targets
- travel goals
- tuition savings
- device purchase goals

The system may later track:
- target amount
- current progress
- estimated completion time
- monthly contribution recommendations

### 10.2 Predictive Analytics
The system may later include predictive analytics features, such as:
- forecasting next month’s income
- forecasting next month’s expenses
- forecasting net saving trends
- identifying categories with high overspending risk

These features can be implemented after the main system is stable and enough historical transaction data has been collected.

### 10.3 Mobile Banking Integration
A future version of the project may integrate with mobile banking or financial platforms in order to:
- import transactions automatically
- reduce manual data entry
- improve data accuracy
- support near real-time financial tracking

### 10.4 Enhanced Notification Experience
The current system focuses on spending limit alerts. In a future version, alerts may be expanded into a richer notification experience, such as:
- warning banners in the dashboard
- budget threshold reminders
- unusual spending notifications
- monthly financial summary reminders

### 10.5 Long-Term Product Direction
Future development should only begin after the core project requirements are complete, including:
- database correctness
- transaction management
- summaries and reporting
- budget planning
- spending alerts
- a usable Python application and UI

These extensions are aligned with the recommendation section of the original Project 13 assignment and should be treated as optional post-core improvements.