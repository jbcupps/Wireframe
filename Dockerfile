FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Update pip and setuptools to secure versions
RUN pip install --no-cache-dir --upgrade pip setuptools>=70.0.0

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application files
COPY src src/
COPY Procfile Procfile

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=src/app.py

# Run the application with Gunicorn
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 src.app:app"]
