#!/bin/sh
set -e

if ! command -v flyctl >/dev/null 2>&1; then
  echo "ERROR: flyctl is not installed."
  echo "Install it from https://fly.io/docs/getting-started/installing-flyctl/"
  exit 1
fi

APP_NAME=${FLY_APP_NAME:-farmconnect-sa-api}

printf "Deploying Fly app: %s\n" "$APP_NAME"
flyctl deploy --remote-only --app "$APP_NAME"

printf "Deployment complete. Checking release status...\n"
flyctl status --app "$APP_NAME"
