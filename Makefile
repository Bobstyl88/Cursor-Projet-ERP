.PHONY: help dev up down logs build clean migrate seed test lint format shell-backend shell-frontend ps restart pgadmin

COMPOSE = docker compose
COMPOSE_DEV = $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ──

dev: ## Start development environment with hot reload
	$(COMPOSE_DEV) up --build

dev-d: ## Start development environment in background
	$(COMPOSE_DEV) up --build -d

dev-down: ## Stop development environment
	$(COMPOSE_DEV) down

# ── Production ──

up: ## Start production environment
	$(COMPOSE) up -d --build

down: ## Stop all containers
	$(COMPOSE) down

restart: ## Restart all containers
	$(COMPOSE) restart

ps: ## Show running containers
	$(COMPOSE) ps

# ── Logs ──

logs: ## Show logs for all services
	$(COMPOSE) logs -f

logs-backend: ## Show backend logs
	$(COMPOSE) logs -f backend

logs-frontend: ## Show frontend logs
	$(COMPOSE) logs -f frontend

# ── Database ──

migrate: ## Run Prisma migrations
	$(COMPOSE) exec backend npx prisma migrate deploy

migrate-dev: ## Run Prisma dev migrations (creates migration files)
	$(COMPOSE_DEV) exec backend npx prisma migrate dev

seed: ## Seed the database
	$(COMPOSE) exec backend npx prisma db seed

db-reset: ## Reset database (WARNING: destroys all data)
	$(COMPOSE) exec backend npx prisma migrate reset --force

db-studio: ## Open Prisma Studio
	$(COMPOSE_DEV) exec backend npx prisma studio

# ── Testing ──

test: ## Run backend tests
	$(COMPOSE_DEV) exec backend npm test

test-cov: ## Run backend tests with coverage
	$(COMPOSE_DEV) exec backend npm run test:cov

test-e2e: ## Run backend E2E tests
	$(COMPOSE_DEV) exec backend npm run test:e2e

# ── Code Quality ──

lint: ## Run linters
	$(COMPOSE_DEV) exec backend npm run lint
	$(COMPOSE_DEV) exec frontend npm run lint

format: ## Run code formatter
	$(COMPOSE_DEV) exec backend npm run format

# ── Build ──

build: ## Build all containers
	$(COMPOSE) build

build-backend: ## Build backend container
	$(COMPOSE) build backend

build-frontend: ## Build frontend container
	$(COMPOSE) build frontend

# ── Shell Access ──

shell-backend: ## Open shell in backend container
	$(COMPOSE) exec backend sh

shell-frontend: ## Open shell in frontend container
	$(COMPOSE) exec frontend sh

shell-db: ## Open psql shell in postgres container
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-erp_user} -d $${POSTGRES_DB:-erp_saas}

# ── Tools ──

pgadmin: ## Start pgAdmin (database UI)
	$(COMPOSE) --profile tools up -d pgadmin

# ── Cleanup ──

clean: ## Remove all containers, volumes, and images
	$(COMPOSE) --profile tools down -v --rmi local --remove-orphans
	$(COMPOSE_DEV) down -v --rmi local --remove-orphans

prune: ## Remove dangling Docker resources
	docker system prune -f
	docker volume prune -f

# ── Setup ──

init: ## Initial project setup
	@echo "Copying environment files..."
	@test -f .env || cp .env.example .env
	@echo "Building containers..."
	$(COMPOSE_DEV) build
	@echo "Starting services..."
	$(COMPOSE_DEV) up -d
	@echo "Waiting for database..."
	@sleep 5
	@echo "Running migrations..."
	$(COMPOSE_DEV) exec backend npx prisma migrate deploy
	@echo "Seeding database..."
	$(COMPOSE_DEV) exec backend npx prisma db seed
	@echo ""
	@echo "Setup complete! Services are running:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:4000"
	@echo "  API Docs: http://localhost:4000/api/docs"
