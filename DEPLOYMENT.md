# FarmConnect Production Deployment Runbook

## Target

Initial production target is Fly.io in Johannesburg (`jnb`) with:
- API process
- worker process
- managed PostgreSQL
- managed Redis
- GitHub Actions CI/CD

The architecture remains portable to AWS/GCP because deployment-specific concerns are isolated to `Dockerfile`, `fly.toml`, and workflow files.

## Required Secrets

Set these in Fly:

```sh
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set REDIS_URL="redis://..."
fly secrets set WHATSAPP_API_KEY="..."
fly secrets set WHATSAPP_WEBHOOK_SECRET="..."
```

Set this in GitHub Actions:

```text
FLY_API_TOKEN
```

## First Deploy

```sh
fly launch --no-deploy
fly postgres create --region jnb
fly redis create
fly deploy --remote-only
fly ssh console -C "npx prisma migrate deploy"
```

## CI/CD

`ci.yml` runs on pull requests and pushes to `main`/`master`:
- install
- Prisma validate
- Prisma generate
- TypeScript build
- high-severity audit

`deploy-fly.yml` deploys on push to `main` and manual dispatch.

## Runtime Processes

`fly.toml` defines:
- `app`: Express API
- `worker`: BullMQ workers

Worker autoscaling decisions are produced by `WorkerScalingService`; actual cloud scaling can be wired to Fly Machines, AWS ECS desired count, or GCP Cloud Run min/max instances.

## Health And Observability

Endpoints:
- `/api/v1/health`
- `/api/v1/metrics`
- `/api/v1/openapi.json`
- `/api/v1/docs`

Critical alerts:
- delivery over 24 hours
- matching returns zero candidates
- farmer payout exceeds 48 hours
- spoilage probability exceeds 0.3

## Launch Checklist

- Run `npx prisma migrate deploy`.
- Confirm `/api/v1/health` returns 200.
- Confirm `/api/v1/metrics` exposes Prometheus metrics.
- Send a test WhatsApp webhook.
- Confirm Redis sessions are expiring with TTL.
- Confirm worker process is connected to Redis.
- Create tomato perishability profile.
- Create ledger system accounts.
- Create pilot corridor and route hub.
- Run one internal test order before restaurant pilot.

