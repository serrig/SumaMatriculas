#!/bin/bash
# ────────────────────────────────────────────────────────────────────
# Crea el usuario limitado que usará la app.
# Se ejecuta automáticamente por la imagen postgres en el primer arranque,
# gracias al volumen ./db/init:/docker-entrypoint-initdb.d en compose.
# Idempotente: si el usuario ya existe, no falla.
# ────────────────────────────────────────────────────────────────────

set -euo pipefail

if [ -z "${APP_DB_USER:-}" ] || [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "ERROR: APP_DB_USER y APP_DB_PASSWORD deben estar definidos en .env" >&2
  exit 1
fi

export PGPASSWORD="$POSTGRES_PASSWORD"

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<EOSQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$APP_DB_USER') THEN
    CREATE USER $APP_DB_USER WITH PASSWORD '$APP_DB_PASSWORD';
  END IF;
END
\$do\$;
GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO "$APP_DB_USER";
GRANT USAGE ON SCHEMA public TO "$APP_DB_USER";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "$APP_DB_USER";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "$APP_DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "$APP_DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "$APP_DB_USER";
EOSQL

echo "✓ Usuario $APP_DB_USER listo con privilegios limitados"