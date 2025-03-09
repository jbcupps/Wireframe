FROM python:3.9-slim-buster

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    # Prevents Python from writing pyc files
    # Ensures Python output is sent straight to terminal without buffering
    # Set Flask environment to production
    PIP_NO_CACHE_DIR=1 \
    # Disable pip cache to reduce image size
    PIP_DISABLE_PIP_VERSION_CHECK=1 
    # Don't check for pip updates during build

# Create a non-root user to run the application
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory and ensure proper permissions
WORKDIR /app
RUN chown appuser:appuser /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Add any system dependencies here
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and setuptools before copying requirements
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy the application files with proper ownership
COPY --chown=appuser:appuser app.py skb_visualization.py methodical_search.py ./
COPY --chown=appuser:appuser templates templates/
COPY --chown=appuser:appuser static static/

# Switch to non-root user for security
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Run the application with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "app:app"]