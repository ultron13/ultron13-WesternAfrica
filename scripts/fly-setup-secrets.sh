#!/bin/sh
set -e

if [ -z "$FLY_API_TOKEN" ]; then
  echo "ERROR: FLY_API_TOKEN must be set."
  echo "Run: export FLY_API_TOKEN=your-token"
  exit 1
fi

if ! command -v flyctl >/dev/null 2>&1; then
  echo "ERROR: flyctl is not installed."
  echo "Install it from https://fly.io/docs/getting-started/installing-flyctl/"
  exit 1
fi

APP_NAME=${FLY_APP_NAME:-farmconnect-sa-api}
REGION=${FLY_REGION:-jnb}
POSTGRES_APP_NAME=${FLY_POSTGRES_APP_NAME:-farmconnect-sa-postgres}

printf "Using Fly app: %s\n" "$APP_NAME"

if ! flyctl apps list | grep -q "^$APP_NAME$"; then
  flyctl apps create "$APP_NAME" --region "$REGION"
fi

printf "Using Postgres app: %s\n" "$POSTGRES_APP_NAME"

if ! flyctl postgres list | grep -q "$POSTGRES_APP_NAME"; then
  flyctl postgres create --name "$POSTGRES_APP_NAME" --region "$REGION" --vm-size shared-cpu-1x --volume-size 10
fi

flyctl postgres attach --postgres-app "$POSTGRES_APP_NAME" --app "$APP_NAME" || true

flyctl secrets set \
  DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}" \
  REDIS_URL="${REDIS_URL:?REDIS_URL is required}" \
  WHATSAPP_API_KEY="${WHATSAPP_API_KEY:?WHATSAPP_API_KEY is required}" \
  WHATSAPP_WEBHOOK_SECRET="${WHATSAPP_WEBHOOK_SECRET:?WHATSAPP_WEBHOOK_SECRET is required}" \
  PUBLIC_MEDIA_BASE_URL="${PUBLIC_MEDIA_BASE_URL:?PUBLIC_MEDIA_BASE_URL is required}" \
  WHATSAPP_PROVIDER="${WHATSAPP_PROVIDER:-clickatell}" \
  NODE_ENV="${NODE_ENV:-production}" \
  PORT="${PORT:-4000}"

printf "Fly secrets configured successfully for %s\n" "$APP_NAME"
