#!/bin/bash
set -e

echo "--- Running Migrations ---"
# Run all SQL files in the migrations folder sorted by name
for file in /docker-entrypoint-initdb.d/migrations/*.sql; do
    echo "Applying migration: $file"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
done

echo "--- Running Seed Data ---"
# Run all SQL files in the seeds folder
for file in /docker-entrypoint-initdb.d/seeds/*.sql; do
    echo "Applying seed: $file"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
done