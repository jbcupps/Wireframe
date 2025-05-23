# SKB Visualization - Multi-stage Docker Build
# Optimized for development, testing, and production environments

# Base stage with common dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r skb && useradd -r -g skb skb

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools>=70.0.0 && \
    pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development

# Install development dependencies
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Install additional development tools
RUN apt-get update && apt-get install -y \
    git \
    vim \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Create logs directory
RUN mkdir -p /app/logs && chown -R skb:skb /app/logs

# Copy source code
COPY --chown=skb:skb . .

# Switch to app user
USER skb

# Expose ports
EXPOSE 5000 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Default command for development
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000", "--debug"]

# Testing stage
FROM development as testing

# Switch back to root for test setup
USER root

# Install additional testing tools
RUN pip install --no-cache-dir \
    pytest-xdist \
    pytest-benchmark \
    coverage[toml]

# Create test results directory
RUN mkdir -p /app/test-results && chown -R skb:skb /app/test-results

# Switch back to app user
USER skb

# Default command for testing
CMD ["python", "-m", "pytest", "-v", "--cov=src", "--cov-report=html", "--cov-report=xml"]

# Production stage
FROM base as production

# Install production-only system dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /var/log/skb && \
    mkdir -p /app/static && \
    mkdir -p /app/instance && \
    chown -R skb:skb /var/log/skb /app

# Copy only necessary files for production
COPY --chown=skb:skb src/ /app/src/
COPY --chown=skb:skb Procfile /app/

# Create default .env file if .env.example doesn't exist
RUN echo "# SKB Visualization Environment Configuration\n\
SKB_ENVIRONMENT=production\n\
SKB_DEBUG=false\n\
SKB_SECRET_KEY=change-this-in-production\n\
SKB_HOST=0.0.0.0\n\
SKB_PORT=5000\n\
SKB_ENABLE_CACHING=true\n\
SKB_CACHE_BACKEND=redis\n\
SKB_REDIS_URL=redis://redis:6379/0\n\
SKB_LOG_LEVEL=INFO\n\
SKB_ENABLE_FILE_LOGGING=true\n\
SKB_LOG_FILE_PATH=/var/log/skb/application.log\n\
SKB_MAX_SURFACE_RESOLUTION=100\n\
SKB_COMPUTATION_TIMEOUT=30\n\
SKB_NUMERICAL_PRECISION=8" > /app/.env

# Create optimized Python cache
RUN python -m compileall src/

# Switch to app user
USER skb

# Set production environment
ENV SKB_ENVIRONMENT=production \
    SKB_DEBUG=false \
    FLASK_APP=src.app:app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "src.app:app"]

# Worker stage for background tasks
FROM production as worker

# Install Celery for background processing
RUN pip install --no-cache-dir celery[redis]==5.3.4

# Default command for worker
CMD ["celery", "-A", "src.tasks.celery_app", "worker", "--loglevel=info"]

# Nginx stage for serving static files (optional)
FROM nginx:alpine as nginx

# Copy static files
COPY src/static/ /var/www/static/

# Copy nginx configuration
COPY infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose ports
EXPOSE 80 443

# Default nginx command
CMD ["nginx", "-g", "daemon off;"]
