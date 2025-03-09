#!/bin/bash

# 4D Manifold Explorer - Startup Script
# This script provides an easy way to start the application with Docker Compose

# Function to display colored output
print_color() {
    COLOR='\033[0;36m' # Cyan
    NC='\033[0m' # No Color
    echo -e "${COLOR}[4D Manifold Explorer]${NC} $1"
}

print_color "Starting 4D Manifold Explorer Application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_color "Error: Docker is not installed. Please install Docker to continue."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_color "Error: Docker Compose is not installed. Please install Docker Compose to continue."
    exit 1
fi

# Create necessary directories if they don't exist
print_color "Setting up directory structure..."
mkdir -p app/common/static/assets
mkdir -p app/common/static/error
mkdir -p instance
mkdir -p nginx/conf.d

# Create error pages if they don't exist
if [ ! -f app/common/static/error/404.html ]; then
    print_color "Creating error pages..."
    echo '<!DOCTYPE html><html><head><title>404 - Page Not Found</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}</style></head><body><h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p><p><a href="/">Return to Home</a></p></body></html>' > app/common/static/error/404.html
fi

if [ ! -f app/common/static/error/50x.html ]; then
    echo '<!DOCTYPE html><html><head><title>Server Error</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}</style></head><body><h1>Server Error</h1><p>Something went wrong. Please try again later.</p><p><a href="/">Return to Home</a></p></body></html>' > app/common/static/error/50x.html
fi

# Check if requirements.txt exists
if [ ! -f requirements.txt ]; then
    print_color "Error: requirements.txt not found. Please make sure the application is set up correctly."
    exit 1
fi

# Build and start the containers
print_color "Building and starting Docker containers..."
docker-compose up --build -d

# Check if the containers are running
if [ "$(docker ps -q -f name=4d-manifold-explorer)" ]; then
    print_color "Application is now running!"
    print_color "You can access it at http://localhost"
    print_color "To view logs: docker-compose logs -f"
    print_color "To stop the application: docker-compose down"
else
    print_color "Error: Failed to start the application. Check the logs with: docker-compose logs"
    exit 1
fi

exit 0 