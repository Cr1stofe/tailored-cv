#!/usr/bin/env sh
set -eu

compose_file="${COMPOSE_FILE:-compose.yaml}"
backup_dir="${1:-./backups/postgres}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/tailored-cv-${timestamp}.dump"

mkdir -p "$backup_dir"

echo "Creating PostgreSQL backup at ${backup_file}"
docker compose -f "$compose_file" exec -T postgres \
  sh -c 'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$backup_file"

test -s "$backup_file"
echo "Backup completed successfully. Keep this file outside the application host as well."
