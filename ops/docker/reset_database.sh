#!/bin/sh
set -eu

DB_HOST="${MYSQL_HOST:-db}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_PASSWORD:-}"
SQL_DIR="${SQL_DIR:-/app/database}"

if [ -z "$DB_PASSWORD" ]; then
  echo "MYSQL_PASSWORD is required to run database reset." >&2
  exit 1
fi

export MYSQL_PWD="$DB_PASSWORD"

SQL_FILES="
schema.sql
sample_data.sql
views.sql
functions.sql
triggers.sql
procedures.sql
queries.sql
security.sql
"

echo "Resetting database Personal_Finance on ${DB_HOST}:${DB_PORT}..."

for file in $SQL_FILES; do
  echo "Running ${file}..."
  mysql \
    --protocol=tcp \
    --default-character-set=utf8mb4 \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    < "${SQL_DIR}/${file}"
done

echo "Database reset completed successfully."
