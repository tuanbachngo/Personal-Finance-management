param(
    [string]$DbHost = "localhost",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = ""
)

$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

if (-not (Test-Path $mysqlExe)) {
    throw "mysql.exe was not found at: $mysqlExe"
}

$scriptFiles = @(
    "database/schema.sql"
    "database/sample_data.sql"
    "database/views.sql"
    "database/functions.sql"
    "database/triggers.sql"
    "database/procedures.sql"
    "database/queries.sql"
    "database/security.sql"
)

$args = @(
    "--host=$DbHost"
    "--port=$Port"
    "--user=$User"
    "--default-character-set=utf8mb4"
)

if ($Password -ne "") {
    $args += "--password=$Password"
}

foreach ($file in $scriptFiles) {
    if (-not (Test-Path $file)) {
        throw "Missing SQL file: $file"
    }

    Write-Host "Running $file ..."
    Get-Content -Raw $file | & $mysqlExe @args
    if ($LASTEXITCODE -ne 0) {
        throw "Failed while running: $file"
    }
}

Write-Host "Database reset completed successfully for Personal_Finance."