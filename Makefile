.PHONY: help dev-db dev-db-down dev-db-clean prod-up prod-down

DOCKER_DIR := apps/fullstack/infrastructure
ENV_FILE := apps/fullstack/.env

help:
	@echo "Development:"
	@echo "  make dev-db       - Start dev db"
	@echo "  make dev-db-down  - Stop dev db"
	@echo "  make dev-db-clean - Clean dev db (CAUTION: will remove all data)"
	@echo ""
	@echo "Production:"
	@echo "  make prod-up      - Start production stack"
	@echo "  make prod-down    - Stop production stack"

# Development
dev-db:
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) up -d db
	@echo "Dev database: postgresql://dev:dev@localhost:5432/frost_ai_dev"

dev-db-down:
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) stop db

dev-db-clean:
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) down -v

# Production
prod-up:
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) --profile full up -d --build
	@echo "Applying database migrations..."
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) --profile migrate run --rm db-migrate
	@echo "Production: http://localhost:3000"

prod-down:
	@docker compose -f $(DOCKER_DIR)/docker-compose.yml --env-file $(ENV_FILE) --profile full down