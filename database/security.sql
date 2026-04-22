-- Security and administration setup for Personal Finance Management System.
-- MySQL 8+ syntax only.
-- IMPORTANT:
-- Replace placeholder passwords below before running this script in real environments.

USE Personal_Finance;

-- 1) Create MySQL users (if they do not already exist).
-- Use placeholders here to avoid committing any real secret to source code.
CREATE USER IF NOT EXISTS 'pf_readonly'@'localhost'
    IDENTIFIED BY 'CHANGE_ME_PF_READONLY_PASSWORD'
    ACCOUNT UNLOCK;

CREATE USER IF NOT EXISTS 'pf_app'@'localhost'
    IDENTIFIED BY 'CHANGE_ME_PF_APP_PASSWORD'
    ACCOUNT UNLOCK;

-- 2) Grant least-privilege access for this project database only.
-- Read-only account: reporting/demo access.
GRANT SELECT, SHOW VIEW
ON Personal_Finance.*
TO 'pf_readonly'@'localhost';

-- App account: data operations + execute routines.
GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW, EXECUTE
ON Personal_Finance.*
TO 'pf_app'@'localhost';

-- 3) Verify privileges after running grants.
SHOW GRANTS FOR 'pf_readonly'@'localhost';
SHOW GRANTS FOR 'pf_app'@'localhost';

-- Backup/Recovery note:
-- Backup and restore are usually handled with mysqldump or MySQL Workbench tools.
-- This file focuses only on account creation and privilege management.
