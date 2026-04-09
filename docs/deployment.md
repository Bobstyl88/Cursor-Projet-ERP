# Deployment Guide

> Production deployment, configuration, monitoring, and operations documentation.

---

## Table of Contents

- [Docker Production Deployment](#docker-production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [SSL/TLS Setup](#ssltls-setup)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup Strategy](#backup-strategy)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## Docker Production Deployment

### Prerequisites

- Docker Engine 24+ and Docker Compose v2+
- A server with at least 2GB RAM and 2 CPU cores (4GB+ recommended)
- Domain name with DNS configured (for SSL)

### Production Deployment Steps

#### 1. Clone and Configure

```bash
git clone <repository-url>
cd erp-saas

cp .env.example .env
```

#### 2. Configure Production Environment

Edit `.env` with production values:

```bash
# PostgreSQL — use strong credentials
POSTGRES_DB=erp_saas
POSTGRES_USER=erp_prod_user
POSTGRES_PASSWORD=<generate-a-strong-password>
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Backend
BACKEND_PORT=4000
NODE_ENV=production
JWT_SECRET=<generate-a-64-char-random-string>
JWT_EXPIRATION=1h
CORS_ORIGINS=https://erp.yourdomain.com

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://erp.yourdomain.com/api
```

Generate strong secrets:

```bash
# Generate JWT secret
openssl rand -base64 48

# Generate database password
openssl rand -base64 32
```

#### 3. Build and Start

```bash
# Build all images
docker compose build

# Start all services in detached mode
docker compose up -d

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Seed initial data (first deployment only)
docker compose exec backend npx prisma db seed

# Verify all services are running
docker compose ps
```

#### 4. Verify Deployment

```bash
# Check backend health
curl http://localhost:4000/api/docs

# Check frontend
curl http://localhost:3000

# Check database connectivity
docker compose exec postgres pg_isready -U erp_prod_user -d erp_saas

# Check Redis
docker compose exec redis redis-cli ping
```

### Container Architecture

The production `docker-compose.yml` orchestrates four services:

```
┌─────────────────────────────────────────────────┐
│                Docker Network                    │
│                (erp-network)                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │PostgreSQL│  │  Redis   │  │   pgAdmin    │   │
│  │  :5432   │  │  :6379   │  │   :5050      │   │
│  └────┬─────┘  └────┬─────┘  │  (optional)  │   │
│       │              │        └──────────────┘   │
│       │              │                           │
│  ┌────┴──────────────┴─────┐                     │
│  │       Backend           │                     │
│  │     (NestJS :4000)      │                     │
│  └────────────┬────────────┘                     │
│               │                                  │
│  ┌────────────┴────────────┐                     │
│  │       Frontend          │                     │
│  │    (Next.js :3000)      │                     │
│  └─────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

### Multi-Stage Docker Builds

Both backend and frontend Dockerfiles use multi-stage builds for optimized production images:

**Backend stages:**
1. `deps` — Install npm dependencies and generate Prisma client
2. `build` — Compile TypeScript to JavaScript
3. `production` — Minimal Alpine image with compiled code, non-root user (`nestjs`), `dumb-init` as PID 1

**Frontend stages:**
1. `deps` — Install npm dependencies
2. `build` — Next.js production build with standalone output
3. `production` — Minimal Alpine image with standalone server, non-root user (`nextjs`), `dumb-init` as PID 1

### Updating the Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Run any new migrations
docker compose exec backend npx prisma migrate deploy

# Verify
docker compose ps
docker compose logs -f --tail=50
```

---

## Environment Configuration

### Required Variables

| Variable | Production Recommendation | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | Random 32+ character string | Never use the default |
| `JWT_SECRET` | Random 64+ character string | Used for signing JWTs — if compromised, all tokens are invalid |
| `NODE_ENV` | `production` | Enables production optimizations in NestJS and Next.js |
| `CORS_ORIGINS` | `https://your-domain.com` | Restrict to your actual frontend domain |

### Optional Variables

| Variable | Default | Notes |
|---|---|---|
| `JWT_EXPIRATION` | `24h` | Reduce to `1h` or `4h` for production security |
| `PGADMIN_PORT` | `5050` | Only needed if using the `tools` profile |

### Secrets Management

For production environments, avoid storing secrets in `.env` files on disk. Consider:

- **Docker Secrets**: Use Docker Swarm secrets for sensitive values
- **Vault**: HashiCorp Vault for centralized secret management
- **Cloud provider**: AWS Secrets Manager, GCP Secret Manager, Azure Key Vault
- **Environment injection**: CI/CD pipeline injects secrets at deployment time

---

## Database Migrations

### Running Migrations

```bash
# Production: apply pending migrations
docker compose exec backend npx prisma migrate deploy

# Development: create a new migration from schema changes
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  exec backend npx prisma migrate dev --name <migration-name>
```

### Migration Workflow

1. Modify `backend/prisma/schema.prisma`
2. Run `make migrate-dev` to generate migration SQL
3. Review the generated migration in `backend/prisma/migrations/`
4. Commit the migration file to version control
5. On deployment: `make migrate` applies pending migrations

### Database Reset (Development Only)

```bash
# WARNING: Destroys all data
make db-reset
```

### Rollback Strategy

Prisma does not support automatic rollback of applied migrations. For production rollbacks:

1. Create a new migration that reverses the changes
2. Or restore from a database backup taken before the migration

Always back up the database before running migrations in production.

---

## SSL/TLS Setup

### Option 1: Reverse Proxy with Certbot (Recommended)

Use Nginx as a reverse proxy with Let's Encrypt SSL certificates:

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger docs
    location /api/docs {
        proxy_pass http://localhost:4000/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Install Certbot and obtain certificates:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d erp.yourdomain.com
```

### Option 2: Cloud Load Balancer

If deploying to a cloud provider, use their managed SSL:
- **AWS**: Application Load Balancer with ACM certificate
- **GCP**: Cloud Load Balancing with managed SSL
- **Azure**: Application Gateway with managed certificate

---

## Reverse Proxy Configuration

### Nginx as Reverse Proxy (Docker)

Add an Nginx container to your Docker Compose setup:

```yaml
  nginx:
    image: nginx:alpine
    container_name: erp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - erp-network
```

### Security Headers

Add these headers in your Nginx configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Monitoring and Logging

### Application Logs

View logs from Docker:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Structured Logging

The backend uses NestJS's built-in `Logger` which outputs structured log messages. Key log sources:

- **AuditInterceptor**: Logs all write operations with user, tenant, duration, and status
- **Queue Processors**: Log job start, completion, and failure for invoice, stock, and accounting jobs
- **Exception Filters**: Log all HTTP errors with request context

### Log Aggregation

For production, forward Docker logs to a log aggregation service:

```yaml
# docker-compose.yml logging configuration
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        tag: "erp-backend"
```

Recommended log aggregation stacks:
- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Loki + Grafana**: Lightweight alternative
- **Cloud**: AWS CloudWatch, GCP Cloud Logging, Datadog

### Application Metrics

To add metrics monitoring:

1. **Prometheus**: Add `@willsoto/nestjs-prometheus` to expose `/metrics` endpoint
2. **Grafana**: Visualize metrics dashboards
3. Key metrics to track:
   - Request rate and latency (p50, p95, p99)
   - Error rate by status code
   - BullMQ queue depth and processing time
   - Database connection pool utilization
   - Memory and CPU usage per container

### Database Monitoring

```bash
# Check active connections
docker compose exec postgres psql -U erp_prod_user -d erp_saas \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker compose exec postgres psql -U erp_prod_user -d erp_saas \
  -c "SELECT pg_size_pretty(pg_database_size('erp_saas'));"

# Check slow queries (if pg_stat_statements is enabled)
docker compose exec postgres psql -U erp_prod_user -d erp_saas \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Backup Strategy

### Database Backups

#### Automated Daily Backups

Create a backup script (`scripts/backup.sh`):

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/erp_saas_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-erp_user}" \
  -d "${POSTGRES_DB:-erp_saas}" \
  --format=custom \
  --compress=9 \
  > "${BACKUP_FILE}"

echo "Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "Cleaned backups older than ${RETENTION_DAYS} days"
```

Schedule with cron:

```bash
# Run daily at 2:00 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/erp-backup.log 2>&1
```

#### Manual Backup

```bash
# Full database dump
docker compose exec -T postgres pg_dump \
  -U erp_prod_user -d erp_saas \
  --format=custom --compress=9 \
  > backup_$(date +%Y%m%d).dump

# Restore from backup
docker compose exec -T postgres pg_restore \
  -U erp_prod_user -d erp_saas \
  --clean --if-exists \
  < backup_20250115.dump
```

### Redis Backups

Redis is configured with AOF persistence (`--appendonly yes`). The data directory is mounted as a Docker volume.

```bash
# Trigger manual save
docker compose exec redis redis-cli BGSAVE

# Copy the RDB file
docker cp erp-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Backup Storage

For production, copy backups to remote storage:
- **AWS S3**: `aws s3 cp backup.dump s3://your-bucket/backups/`
- **GCP Cloud Storage**: `gsutil cp backup.dump gs://your-bucket/backups/`
- **Azure Blob**: `az storage blob upload --file backup.dump --container-name backups`

### Backup Verification

Periodically test backup restoration:

```bash
# Create a test database
docker compose exec postgres createdb -U erp_prod_user erp_saas_test

# Restore backup into test database
docker compose exec -T postgres pg_restore \
  -U erp_prod_user -d erp_saas_test \
  < backup_20250115.dump

# Verify data integrity
docker compose exec postgres psql -U erp_prod_user -d erp_saas_test \
  -c "SELECT count(*) FROM tenants;"

# Clean up
docker compose exec postgres dropdb -U erp_prod_user erp_saas_test
```

---

## Health Checks

### Docker Health Checks

Health checks are configured in `docker-compose.yml`:

- **PostgreSQL**: `pg_isready` command, checked every 10s
- **Redis**: `redis-cli ping`, checked every 10s

### Application Health

Add a health check endpoint to the backend (recommended):

```bash
# Quick check — is the backend responding?
curl -f http://localhost:4000/api/docs || echo "Backend is down"

# Database connectivity
docker compose exec postgres pg_isready -U erp_prod_user -d erp_saas

# Redis connectivity
docker compose exec redis redis-cli ping
```

### Container Status

```bash
# Check all container statuses
docker compose ps

# Check resource usage
docker stats --no-stream
```

---

## Troubleshooting

### Common Issues

#### Backend fails to start: "Database connection refused"

The backend starts before PostgreSQL is ready.

```bash
# Check if PostgreSQL is healthy
docker compose ps postgres

# Wait for health check to pass, then restart backend
docker compose restart backend
```

The `depends_on` with `condition: service_healthy` in `docker-compose.yml` should handle this automatically, but network delays can occasionally cause issues.

#### "Tenant context required" errors

Every authenticated request needs a tenant context. Ensure:
1. The `X-Tenant-Id` header is set, OR
2. The JWT token contains a `tenantId` claim

#### Prisma migration errors

```bash
# Check migration status
docker compose exec backend npx prisma migrate status

# Reset and re-apply (DEVELOPMENT ONLY — destroys data)
docker compose exec backend npx prisma migrate reset --force
```

#### Redis connection errors

```bash
# Check Redis is running and healthy
docker compose exec redis redis-cli ping

# Check Redis memory usage
docker compose exec redis redis-cli info memory
```

#### Out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean unused resources
docker system prune -f
docker volume prune -f
```

#### High memory usage

```bash
# Check per-container memory
docker stats --no-stream

# Increase Redis max memory (already set to 256MB in compose)
# Adjust in docker-compose.yml: --maxmemory 512mb
```
