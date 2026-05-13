# WesternAfrica

FarmConnect SA backend for logistics, real-time tracking, and financing workflows.

## Fly.io Deployment

This repository is configured to deploy to Fly.io using `fly.toml`, GitHub Actions, and helper scripts.

### Required secrets

Set these values in Fly or GitHub Secrets before deployment:
- `FLY_API_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`
- `WHATSAPP_API_KEY`
- `WHATSAPP_WEBHOOK_SECRET`
- `PUBLIC_MEDIA_BASE_URL`

### Local setup

1. Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Log in: `flyctl auth login`
3. Export required values:
   ```sh
   export FLY_API_TOKEN=...
   export DATABASE_URL=postgresql://... \
     ?schema=public
   export REDIS_URL=redis://... \
     
   export WHATSAPP_API_KEY=...
   export WHATSAPP_WEBHOOK_SECRET=...
   export PUBLIC_MEDIA_BASE_URL=https://media.example.com
   ```
4. Create and configure Fly infrastructure:
   ```sh
   ./scripts/fly-setup-secrets.sh
   ```

### Deploy

Run:
```sh
./scripts/fly-deploy.sh
```

### GitHub Actions

The repo already contains a Fly deploy workflow at `.github/workflows/deploy-fly.yml` that deploys on pushes to `main`.

