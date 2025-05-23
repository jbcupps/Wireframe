# SKB Visualization - Development Makefile
# Provides convenient commands for development, testing, and deployment

.PHONY: help
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Project configuration
PROJECT_NAME := skb-visualization
DOCKER_COMPOSE := docker-compose
PYTHON := python3
PIP := pip3

help: ## Show this help message
	@echo "$(BLUE)SKB Visualization - Development Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | grep -E "(setup|dev|install|clean)"
	@echo ""
	@echo "$(GREEN)Testing:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | grep -E "(test|lint|format|check)"
	@echo ""
	@echo "$(GREEN)Docker Operations:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | grep -E "(docker|build|up|down)"
	@echo ""
	@echo "$(GREEN)Production:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | grep -E "(deploy|prod|release)"
	@echo ""
	@echo "$(GREEN)Maintenance:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | grep -E "(logs|backup|monitor|cache)"

# Development Commands
setup: ## Set up development environment
	@echo "$(BLUE)Setting up development environment...$(RESET)"
	@$(PYTHON) -m venv .venv
	@.venv/bin/pip install --upgrade pip setuptools wheel
	@.venv/bin/pip install -r requirements.txt
	@.venv/bin/pip install -r requirements-dev.txt
	@echo "$(GREEN)Development environment ready!$(RESET)"
	@echo "$(YELLOW)Activate with: source .venv/bin/activate$(RESET)"

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	@$(PIP) install --upgrade pip setuptools wheel
	@$(PIP) install -r requirements.txt
	@echo "$(GREEN)Dependencies installed!$(RESET)"

install-dev: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(RESET)"
	@$(PIP) install -r requirements-dev.txt
	@echo "$(GREEN)Development dependencies installed!$(RESET)"

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(RESET)"
	@export SKB_ENVIRONMENT=development && \
	export SKB_DEBUG=true && \
	$(PYTHON) -m flask --app src.app run --host=0.0.0.0 --port=5000 --debug

dev-docker: ## Start development server with Docker
	@echo "$(BLUE)Starting development server with Docker...$(RESET)"
	@$(DOCKER_COMPOSE) --profile development up web-dev redis-dev

# Testing Commands
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(RESET)"
	@$(PYTHON) -m pytest tests/ -v --cov=src --cov-report=html --cov-report=term

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(RESET)"
	@$(PYTHON) -m pytest tests/unit/ -v

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(RESET)"
	@$(PYTHON) -m pytest tests/integration/ -v

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running E2E tests...$(RESET)"
	@$(PYTHON) -m pytest tests/e2e/ -v

test-docker: ## Run tests in Docker
	@echo "$(BLUE)Running tests in Docker...$(RESET)"
	@$(DOCKER_COMPOSE) --profile testing run --rm test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(RESET)"
	@$(PYTHON) -m pytest tests/ -v --cov=src -f

benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running benchmarks...$(RESET)"
	@$(PYTHON) -m pytest tests/benchmarks/ -v --benchmark-only --benchmark-sort=mean

# Code Quality Commands
lint: ## Run linting
	@echo "$(BLUE)Running linting...$(RESET)"
	@$(PYTHON) -m flake8 src tests
	@$(PYTHON) -m pylint src
	@$(PYTHON) -m mypy src

format: ## Format code
	@echo "$(BLUE)Formatting code...$(RESET)"
	@$(PYTHON) -m black src tests
	@$(PYTHON) -m isort src tests

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(RESET)"
	@$(PYTHON) -m black --check src tests
	@$(PYTHON) -m isort --check-only src tests

security-check: ## Run security checks
	@echo "$(BLUE)Running security checks...$(RESET)"
	@$(PYTHON) -m bandit -r src
	@$(PYTHON) -m safety check

check-all: lint format-check security-check ## Run all code quality checks

# Docker Commands
docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(RESET)"
	@$(DOCKER_COMPOSE) build

docker-build-prod: ## Build production Docker image
	@echo "$(BLUE)Building production Docker image...$(RESET)"
	@docker build --target production -t $(PROJECT_NAME):latest .

docker-up: ## Start all services
	@echo "$(BLUE)Starting all services...$(RESET)"
	@$(DOCKER_COMPOSE) up -d

docker-up-dev: ## Start development services
	@echo "$(BLUE)Starting development services...$(RESET)"
	@$(DOCKER_COMPOSE) --profile development up -d

docker-up-prod: ## Start production services
	@echo "$(BLUE)Starting production services...$(RESET)"
	@$(DOCKER_COMPOSE) --profile production up -d

docker-down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(RESET)"
	@$(DOCKER_COMPOSE) down

docker-logs: ## Show Docker logs
	@echo "$(BLUE)Showing Docker logs...$(RESET)"
	@$(DOCKER_COMPOSE) logs -f

docker-clean: ## Clean Docker resources
	@echo "$(BLUE)Cleaning Docker resources...$(RESET)"
	@docker system prune -f
	@docker volume prune -f

# Database Commands
db-init: ## Initialize database
	@echo "$(BLUE)Initializing database...$(RESET)"
	@$(PYTHON) -c "from src.database import init_db; init_db()"

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	@$(PYTHON) scripts/migrate.py

db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(RESET)"
	@$(PYTHON) scripts/seed_data.py

# Cache Commands
cache-clear: ## Clear application cache
	@echo "$(BLUE)Clearing application cache...$(RESET)"
	@$(PYTHON) -c "from src.utils.cache import clear_cache; clear_cache()"

cache-stats: ## Show cache statistics
	@echo "$(BLUE)Cache statistics:$(RESET)"
	@$(PYTHON) -c "from src.utils.cache import get_cache_stats; import json; print(json.dumps(get_cache_stats(), indent=2))"

# Monitoring Commands
logs: ## Show application logs
	@echo "$(BLUE)Showing application logs...$(RESET)"
	@tail -f logs/*.log 2>/dev/null || echo "No log files found"

logs-error: ## Show error logs only
	@echo "$(BLUE)Showing error logs...$(RESET)"
	@grep -i error logs/*.log 2>/dev/null || echo "No error logs found"

monitor: ## Start monitoring stack
	@echo "$(BLUE)Starting monitoring stack...$(RESET)"
	@$(DOCKER_COMPOSE) --profile monitoring up -d

health-check: ## Check application health
	@echo "$(BLUE)Checking application health...$(RESET)"
	@curl -f http://localhost:5000/health || echo "$(RED)Health check failed$(RESET)"

# Production Commands
deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	@echo "$(YELLOW)Staging deployment not implemented yet$(RESET)"

deploy-prod: ## Deploy to production environment
	@echo "$(BLUE)Deploying to production...$(RESET)"
	@echo "$(YELLOW)Production deployment not implemented yet$(RESET)"

backup: ## Create backup
	@echo "$(BLUE)Creating backup...$(RESET)"
	@mkdir -p backups
	@tar -czf backups/skb-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz \
		src/ docs/ requirements*.txt docker-compose.yml Dockerfile
	@echo "$(GREEN)Backup created in backups/$(RESET)"

release: check-all test docker-build ## Prepare release (run checks, tests, build)
	@echo "$(GREEN)Release preparation complete!$(RESET)"

# Utility Commands
clean: ## Clean up generated files
	@echo "$(BLUE)Cleaning up...$(RESET)"
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -delete
	@find . -type d -name "*.egg-info" -exec rm -rf {} +
	@rm -rf .pytest_cache
	@rm -rf htmlcov
	@rm -rf .coverage
	@rm -rf dist
	@rm -rf build
	@echo "$(GREEN)Cleanup complete!$(RESET)"

env-example: ## Create .env.example file
	@echo "$(BLUE)Creating .env.example...$(RESET)"
	@cat > .env.example << 'EOF'
# SKB Visualization Environment Configuration

# Application Settings
SKB_ENVIRONMENT=development
SKB_DEBUG=true
SKB_SECRET_KEY=your-secret-key-here

# Server Settings
SKB_HOST=0.0.0.0
SKB_PORT=5000

# Cache Settings
SKB_ENABLE_CACHING=true
SKB_CACHE_BACKEND=memory
SKB_REDIS_URL=redis://localhost:6379/0

# Logging Settings
SKB_LOG_LEVEL=INFO
SKB_ENABLE_FILE_LOGGING=false
SKB_LOG_FILE_PATH=logs/application.log

# Scientific Computing Settings
SKB_MAX_SURFACE_RESOLUTION=100
SKB_COMPUTATION_TIMEOUT=30
SKB_NUMERICAL_PRECISION=8

# Performance Settings
SKB_ENABLE_GPU_ACCELERATION=false
SKB_MAX_MEMORY_USAGE_GB=4.0
SKB_ENABLE_MULTIPROCESSING=true
EOF
	@echo "$(GREEN).env.example created!$(RESET)"

update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	@$(PIP) list --outdated --format=freeze | grep -v '^\-e' | cut -d = -f 1 | xargs -n1 $(PIP) install -U
	@$(PIP) freeze > requirements.txt
	@echo "$(GREEN)Dependencies updated!$(RESET)"

docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	@mkdir -p docs/generated
	@$(PYTHON) -m pydoc -w src
	@mv *.html docs/generated/ 2>/dev/null || echo "No HTML files to move"
	@echo "$(GREEN)Documentation generated in docs/generated/$(RESET)"

# Version Commands
version: ## Show current version
	@echo "$(BLUE)Current version:$(RESET)"
	@$(PYTHON) -c "from src.config import settings; print(settings.app_version)"

bump-version: ## Bump version (requires VERSION parameter)
	@echo "$(BLUE)Bumping version to $(VERSION)...$(RESET)"
	@sed -i 's/app_version: str = Field(default="[^"]*"/app_version: str = Field(default="$(VERSION)"/' src/config.py
	@echo "$(GREEN)Version bumped to $(VERSION)$(RESET)"

# Quick start command
quickstart: setup env-example ## Quick setup for new developers
	@echo "$(GREEN)Quick start complete!$(RESET)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(RESET)"
	@echo "1. Activate virtual environment: $(BLUE)source .venv/bin/activate$(RESET)"
	@echo "2. Copy and configure: $(BLUE)cp .env.example .env$(RESET)"
	@echo "3. Start development server: $(BLUE)make dev$(RESET)"
	@echo "4. Open browser: $(BLUE)http://localhost:5000$(RESET)" 