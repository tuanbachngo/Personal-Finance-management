param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$Host = "localhost",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Database = "Personal_Finance",
    [string]$Password = ""
)

if ($Database -ne "Personal_Finance") {
    throw "Database must remain Personal_Finance for this project."
}

if (-not (Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$mysqlCommand = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlCommand) {
    throw "mysql command was not found. Please install MySQL client tools first."
}

$args = @(
    "--host=$Host"
    "--port=$Port"
    "--user=$User"
    "--default-character-set=utf8mb4"
)

if ($Password -ne "") {
    $args += "--password=$Password"
}

Get-Content -Raw $BackupFile | & mysql @args
if ($LASTEXITCODE -ne 0) {
    throw "Restore failed. Check MySQL credentials or backup file."
}

Write-Host "Restore completed successfully from:"
Write-Host "  $BackupFile"
Write-Host "Target database: $Database"
