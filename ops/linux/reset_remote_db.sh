#!/bin/sh
set -eu

DB_HOST="${MYSQL_HOST:-}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_PASSWORD:-}"
DB_NAME="${MYSQL_DATABASE:-Personal_Finance}"
SQL_DIR="${SQL_DIR:-/app/database}"

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
  echo "MYSQL_HOST and MYSQL_PASSWORD are required." >&2
  exit 1
fi

if [ "$DB_NAME" != "Personal_Finance" ]; then
  echo "MYSQL_DATABASE must stay exactly Personal_Finance." >&2
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

echo "Resetting remote database ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."

for file in $SQL_FILES; do
  echo "Running ${file}..."
  mysql --protocol=tcp -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" < "${SQL_DIR}/${file}"
done

echo "Remote database reset completed successfully."
