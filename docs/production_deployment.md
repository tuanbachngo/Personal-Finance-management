# Production Deployment Guide

This guide takes the project from Docker Desktop to a production-like public setup.

Main database name must remain exactly:

`Personal_Finance`

## Target architecture

- Ubuntu VPS / Droplet
- Docker Engine + Docker Compose
- Caddy reverse proxy
- Remote MySQL / managed MySQL
- Streamlit app running in Docker

Recommended hosting direction:

- App server: Ubuntu VPS / Droplet
- Database: managed MySQL in the same region

Helpful official references:

- DigitalOcean production-ready Droplet: https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/
- DigitalOcean managed MySQL: https://docs.digitalocean.com/products/databases/mysql/
- Docker on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Caddy reverse proxy + HTTPS: https://caddyserver.com/docs/quick-starts/reverse-proxy

## Files added for production

- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.production.example`
- `ops/linux/reset_remote_db.sh`
- `ops/linux/apply_remote_views.sh`
- `ops/linux/deploy_prod.sh`

## 1. Prepare infrastructure

Create:

- one Ubuntu server
- one managed MySQL instance
- one domain or subdomain, for example `finance.example.com`

Recommended server/network baseline:

- SSH key login only
- cloud firewall:
  - allow `22`
  - allow `80`
  - allow `443`
- keep MySQL restricted to the app server / trusted source only
- enable backups and monitoring

## 2. Install Docker on the server

Follow the official Docker installation guide for Ubuntu, then verify:

```bash
docker --version
docker compose version
```

## 3. Clone the repository

```bash
git clone <your-repo-url>
cd FinalProject
```

## 4. Create the production env file

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and fill at least:

- `APP_DOMAIN`
- `CADDY_EMAIL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE=Personal_Finance`
- `PF_ADMIN_EMAIL`
- `PF_ADMIN_PASSWORD`
- `PF_ADMIN_RECOVERY_HINT`
- `PF_ADMIN_RECOVERY_ANSWER`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

Recommended production flags:

- `AUTH_DEV_MODE=false`
- `AUTH_LOG_OTP_IN_DEV=false`

## 5. Point DNS to the server

Before enabling public HTTPS, point your domain to the VPS public IP.

Example:

- `finance.example.com -> <your_server_public_ip>`

This matters because Caddy can issue a trusted certificate automatically only when:

- DNS points to your server
- ports `80` and `443` are open

## 6. First-time deployment

Run the complete first-start flow:

```bash
sh ops/linux/deploy_prod.sh first-start
```

This will:

- build the app image
- reset the remote database using the canonical SQL order
- bootstrap the admin account
- start the Streamlit app and Caddy

## 7. Verify the deployment

Run the smoke test against the remote database:

```bash
sh ops/linux/deploy_prod.sh smoke
```

Check running services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Follow logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
```

Then open:

- `https://your-domain`

## 8. Common maintenance flows

### Redeploy app code only

```bash
sh ops/linux/deploy_prod.sh deploy
```

### Re-apply only updated views

```bash
sh ops/linux/deploy_prod.sh apply-views
```

### Re-bootstrap admin credentials

```bash
sh ops/linux/deploy_prod.sh bootstrap
```

### Full remote DB reset

```bash
sh ops/linux/deploy_prod.sh reset-db
sh ops/linux/deploy_prod.sh bootstrap
sh ops/linux/deploy_prod.sh deploy
```

## 9. Security checklist before going public

- Keep `.env.production` on the server only
- Do not commit real secrets
- Keep `MYSQL_DATABASE=Personal_Finance`
- Keep `AUTH_DEV_MODE=false`
- Keep `AUTH_LOG_OTP_IN_DEV=false`
- Restrict database access to the app server only
- Use a strong admin password and recovery answer
- Confirm OTP is not exposed in the UI
- Confirm `User Management` stays admin-only

## 10. Notes about the production compose file

`docker-compose.prod.yml` intentionally does not start a local MySQL container.

It assumes your database is external, which is closer to a real deployment:

- app container connects to remote MySQL
- Caddy terminates HTTPS and proxies traffic to Streamlit
- public traffic reaches only Caddy on `80/443`

## 11. If you are upgrading from Docker Desktop local setup

The local Windows 11 Docker setup remains useful for:

- local debugging
- smoke testing
- confirming SQL and Docker changes

The production files in this repo are the next step after that.
