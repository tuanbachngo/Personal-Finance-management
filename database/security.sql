-- Security and administration setup for Personal Finance Management System.
-- MySQL 8+ syntax only.
-- IMPORTANT:
-- Replace placeholder passwords below before running this script in real environments.

USE Personal_Finance;

CREATE USER IF NOT EXISTS 'pf_readonly'@'%'
    IDENTIFIED BY 'CHANGE_ME_PF_READONLY_PASSWORD'
    ACCOUNT UNLOCK;

CREATE USER IF NOT EXISTS 'pf_app'@'%'
    IDENTIFIED BY 'CHANGE_ME_PF_APP_PASSWORD'
    ACCOUNT UNLOCK;

GRANT SELECT, SHOW VIEW
ON Personal_Finance.*
TO 'pf_readonly'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW, EXECUTE
ON Personal_Finance.*
TO 'pf_app'@'%';

SHOW GRANTS FOR 'pf_readonly'@'%';
SHOW GRANTS FOR 'pf_app'@'%';

-- Backup/Recovery note:
-- Backup and restore are usually handled with mysqldump or MySQL Workbench tools.
-- This file focuses only on account creation and privilege management.


