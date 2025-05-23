# Docker Development Guide

This project has been configured for Docker-based development to ensure consistent environments across all developers and eliminate the need for local Python package installations.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd wireframe
```

### 2. Build and Run with Docker Compose

For production-like development:
```bash
docker-compose up web
```

For development with hot reloading:
```bash
docker-compose up web-dev
```

The application will be available at `http://localhost:5000`

### 3. Development Workflow

#### Making Code Changes
- Make changes to your code in the `src/` directory
- Changes will be automatically reflected in the container due to volume mounting
- The `web-dev` service includes hot reloading for faster development

#### Installing New Dependencies
1. Add the package to `requirements.txt` or `requirements-dev.txt`
2. Rebuild the container:
   ```bash
   docker-compose build
   docker-compose up web-dev
   ```

#### Running Tests
```bash
# Run tests in container
docker-compose exec web python -m pytest

# Or run with a one-off container
docker-compose run --rm web python -m pytest
```

#### Accessing the Container Shell
```bash
docker-compose exec web bash
```

## Container Services

### `web`
- Production-like service using Gunicorn
- Best for testing production behavior
- Available at `http://localhost:5000`

### `web-dev`
- Development service with Flask's development server
- Hot reloading enabled
- Debug mode enabled
- Best for active development

## File Structure

The following directories and files are excluded from the Docker build context via `.dockerignore`:
- `.venv/` - Local virtual environments (not needed in containers)
- `__pycache__/` - Python cache files
- `tests/` - Test files (run separately)
- `docs/` - Documentation
- IDE and OS-specific files

## Environment Variables

Development environment variables are set in `docker-compose.yml`:
- `FLASK_ENV=development`
- `FLASK_DEBUG=1`
- `PYTHONUNBUFFERED=1`

For production deployment, these should be configured appropriately in your deployment environment.

## Troubleshooting

### Container Won't Start
- Check if port 5000 is already in use
- Ensure Docker Desktop is running
- Try rebuilding: `docker-compose build --no-cache`

### Code Changes Not Reflected
- Ensure you're using the `web-dev` service
- Check volume mounting in `docker-compose.yml`
- Restart the container: `docker-compose restart web-dev`

### Permission Issues (Linux/macOS)
If you encounter permission issues with mounted volumes:
```bash
# Fix ownership (adjust UID/GID as needed)
docker-compose exec web chown -R $(id -u):$(id -g) /app
```

## Best Practices

1. **Never install packages locally** - Always use Docker containers
2. **Use volume mounts for development** - Allows real-time code changes
3. **Keep secrets out of images** - Use environment variables or secret management
4. **Rebuild containers after dependency changes** - Ensures all packages are properly installed
5. **Use `.dockerignore`** - Keeps build context small and secure

## GitHub Actions Integration

This setup is designed to work with GitHub Actions and Azure for CI/CD:
- Docker builds are reproducible across environments
- No local environment setup required for developers
- Consistent testing and deployment environment 