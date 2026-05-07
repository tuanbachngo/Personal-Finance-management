#!/bin/sh
set -eu

DB_HOST="${MYSQL_HOST:-db}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_PASSWORD:-}"
DB_NAME="${MYSQL_DATABASE:-Personal_Finance}"
VIEWS_FILE="${VIEWS_FILE:-/app/database/views.sql}"

if [ -z "$DB_PASSWORD" ]; then
  echo "MYSQL_PASSWORD is required to apply views." >&2
  exit 1
fi

export MYSQL_PWD="$DB_PASSWORD"

echo "Applying updated views.sql to ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."
mysql \
  --protocol=tcp \
  --default-character-set=utf8mb4 \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  "$DB_NAME" < "$VIEWS_FILE"
echo "Views applied successfully."
