# Backup and Recovery Guide

This project includes PowerShell helper scripts for local MySQL backup/restore.

Database name must stay: `Personal_Finance`.

## Files

- `ops/backup_database.ps1`
- `ops/restore_database.ps1`

## 1. Backup

Example:

```powershell
powershell -ExecutionPolicy Bypass -File ops\backup_database.ps1 `
  -Host "localhost" `
  -Port 3306 `
  -User "root" `
  -Password "your_mysql_password"
```

Output:
- SQL dump file in `backups/` folder.

## 2. Restore

Example:

```powershell
powershell -ExecutionPolicy Bypass -File ops\restore_database.ps1 `
  -BackupFile "backups\Personal_Finance_20260414_120000.sql" `
  -Host "localhost" `
  -Port 3306 `
  -User "root" `
  -Password "your_mysql_password"
```

## 3. Notes

- Scripts require MySQL client tools (`mysqldump`, `mysql`) in PATH.
- For school/demo use this is enough; for production, add encrypted secrets and scheduled jobs.
