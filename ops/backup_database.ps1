param(
    [string]$Host = "localhost",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Database = "Personal_Finance",
    [string]$OutputDir = "backups",
    [string]$Password = ""
)

if ($Database -ne "Personal_Finance") {
    throw "Database must remain Personal_Finance for this project."
}

$mysqldumpCommand = Get-Command mysqldump -ErrorAction SilentlyContinue
if (-not $mysqldumpCommand) {
    throw "mysqldump command was not found. Please install MySQL client tools first."
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $OutputDir "$Database`_$timestamp.sql"

$args = @(
    "--host=$Host"
    "--port=$Port"
    "--user=$User"
    "--default-character-set=utf8mb4"
    "--routines"
    "--triggers"
    "--events"
    "--databases"
    $Database
    "--result-file=$backupFile"
)

if ($Password -ne "") {
    $args += "--password=$Password"
}

& mysqldump @args
if ($LASTEXITCODE -ne 0) {
    throw "Backup failed. Check MySQL credentials and connection settings."
}

Write-Host "Backup completed successfully:"
Write-Host "  $backupFile"
