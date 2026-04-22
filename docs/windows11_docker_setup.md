# Windows 11 Docker Setup Guide

This guide helps you run the Personal Finance Management System in a Dockerized, production-like local environment on Windows 11.

Main database name must stay exactly:

`Personal_Finance`

## 1. Prerequisites

- Windows 11
- Docker Desktop installed and running
- Linux containers enabled in Docker Desktop
- WSL2 recommended for smoother performance and compatibility

Useful official references:

- Docker Engine / Ubuntu concepts: [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- Docker Compose plugin overview: [Docker Compose install](https://docs.docker.com/compose/install/)
- DigitalOcean production-ready Droplet guidance for later deployment: [Production-ready Droplet](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/)

## 2. Copy Docker environment template

Docker Compose auto-loads `.env` by default, not `.env.docker`.

Recommended choices:

- Option A: copy the template to `.env` and use plain `docker compose ...`
- Option B: copy the template to `.env.docker` and always use `--env-file .env.docker`

Create a local Docker env file from the template:

```powershell
Copy-Item .env.docker.example .env
```

Or, if you prefer the explicit-flag style:

```powershell
Copy-Item .env.docker.example .env.docker
```

Then edit your chosen env file and set at least:

- `MYSQL_ROOT_PASSWORD`
- `PF_ADMIN_EMAIL`
- `PF_ADMIN_PASSWORD`
- `PF_ADMIN_RECOVERY_HINT`
- `PF_ADMIN_RECOVERY_ANSWER`

Notes:

- Keep `MYSQL_DATABASE=Personal_Finance`
- Keep `.env` / `.env.docker` local only
- Do not commit real secrets

## 3. Build the application image

```powershell
docker compose --env-file .env.docker build
```

If you copied to `.env`, you can also run:

```powershell
docker compose build
```

## 4. Start MySQL first

```powershell
docker compose --env-file .env.docker up -d db
```

The MySQL container is exposed locally on:

- `localhost:${MYSQL_LOCAL_PORT}`
- default local port from the template: `3307`

This avoids conflicts with a local MySQL already using `3306`.

## 5. Reset the database inside Docker

Run the canonical SQL scripts in the correct order:

```powershell
docker compose --env-file .env.docker run --rm db-reset
```

This executes:

1. `database/schema.sql`
2. `database/sample_data.sql`
3. `database/views.sql`
4. `database/functions.sql`
5. `database/triggers.sql`
6. `database/procedures.sql`
7. `database/queries.sql`
8. `database/security.sql`

## 5.1. Re-apply only views after SQL/view fixes

If you changed only `database/views.sql`, you do not need a full reset.

Use:

```powershell
docker compose --env-file .env.docker run --rm db-apply-views
```

## 6. Bootstrap admin account

After reset, create/update app-level credentials:

```powershell
docker compose --env-file .env.docker run --rm bootstrap-admin
```

This uses the values from `.env.docker`:

- `PF_ADMIN_EMAIL`
- `PF_ADMIN_PASSWORD`
- `PF_ADMIN_NAME`
- `PF_ADMIN_PHONE`
- `PF_ADMIN_RECOVERY_HINT`
- `PF_ADMIN_RECOVERY_ANSWER`

Optional:

- `PF_SEED_SAMPLE_USER_PASSWORD`
- `PF_FORCE_RESET_SAMPLE_PASSWORDS`

## 7. Start the Streamlit app

```powershell
docker compose --env-file .env.docker up -d --build app
```

Why `--build` matters:

- the app container does not live-edit from your host source tree
- if Python or SQL-related app code changed, rebuilding ensures Docker uses the newest image instead of an older cached app layer

Open the app in your browser:

- [http://localhost:8501](http://localhost:8501)

If you changed `STREAMLIT_LOCAL_PORT`, use that port instead.

## 8. Run smoke test

```powershell
docker compose --env-file .env.docker run --rm smoke-test
```

This is the main app/service-level smoke test.

## 8.1. Why `docker compose config` may fail

If you run:

```powershell
docker compose config
```

without a local `.env`, Docker Compose will not auto-read `.env.docker`, so variables such as:

- `MYSQL_ROOT_PASSWORD`
- `PF_ADMIN_EMAIL`
- `PF_ADMIN_PASSWORD`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

will appear as missing.

Use one of these:

```powershell
docker compose --env-file .env.docker config
```

or:

```powershell
Copy-Item .env.docker .env
docker compose config
```

## 9. Useful logs

Follow app logs:

```powershell
docker compose --env-file .env.docker logs -f app
```

Follow MySQL logs:

```powershell
docker compose --env-file .env.docker logs -f db
```

## 10. Stop containers

Stop the app + database while keeping MySQL data volume:

```powershell
docker compose --env-file .env.docker down
```

## 11. Full clean reset

If you want to remove the MySQL data volume and start from scratch:

```powershell
docker compose --env-file .env.docker down -v
```

Then repeat:

1. `docker compose --env-file .env.docker up -d db`
2. `docker compose --env-file .env.docker run --rm db-reset`
3. `docker compose --env-file .env.docker run --rm bootstrap-admin`
4. `docker compose --env-file .env.docker up -d app`

## 12. Recommended next step for real production

This Dockerized setup is ideal for local Windows 11 testing and for preparing a later production deployment.

When you are ready to go public, the next recommended step is:

- Ubuntu VPS / Droplet
- Docker Compose
- Reverse proxy (`Nginx` or `Caddy`)
- HTTPS
- Managed MySQL with trusted-source restrictions
