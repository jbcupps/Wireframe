@echo off
setlocal enabledelayedexpansion

:: 4D Manifold Explorer - Startup Script for Windows
:: This script provides an easy way to start the application with Docker Compose

echo [4D Manifold Explorer] Starting 4D Manifold Explorer Application...

:: Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [4D Manifold Explorer] Error: Docker is not installed. Please install Docker to continue.
    exit /b 1
)

:: Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [4D Manifold Explorer] Error: Docker Compose is not installed. Please install Docker Compose to continue.
    exit /b 1
)

:: Process command line arguments
set QUIET_MODE=0
set GPU_MODE=0

if "%1"=="--quiet" (
    set QUIET_MODE=1
    echo [4D Manifold Explorer] Running in quiet mode (TensorFlow warnings disabled)
)

if "%1"=="--gpu" (
    set GPU_MODE=1
    echo [4D Manifold Explorer] Attempting to use GPU acceleration (requires nvidia-docker)
)

if "%1"=="--help" (
    echo [4D Manifold Explorer] Usage options:
    echo   start.bat             - Start application normally
    echo   start.bat --quiet     - Start with TensorFlow warnings disabled
    echo   start.bat --gpu       - Start with GPU support enabled (requires nvidia-docker)
    echo   start.bat --help      - Show this help message
    exit /b 0
)

:: Create necessary directories if they don't exist
echo [4D Manifold Explorer] Setting up directory structure...
if not exist app\common\static\assets mkdir app\common\static\assets
if not exist app\common\static\error mkdir app\common\static\error
if not exist instance mkdir instance
if not exist nginx\conf.d mkdir nginx\conf.d

:: Create error pages if they don't exist
if not exist app\common\static\error\404.html (
    echo [4D Manifold Explorer] Creating error pages...
    echo ^<!DOCTYPE html^>^<html^>^<head^>^<title^>404 - Page Not Found^</title^>^<style^>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}^</style^>^</head^>^<body^>^<h1^>404 - Page Not Found^</h1^>^<p^>The page you are looking for does not exist.^</p^>^<p^>^<a href="/"^>Return to Home^</a^>^</p^>^</body^>^</html^> > app\common\static\error\404.html
)

if not exist app\common\static\error\50x.html (
    echo ^<!DOCTYPE html^>^<html^>^<head^>^<title^>Server Error^</title^>^<style^>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}^</style^>^</head^>^<body^>^<h1^>Server Error^</h1^>^<p^>Something went wrong. Please try again later.^</p^>^<p^>^<a href="/"^>Return to Home^</a^>^</p^>^</body^>^</html^> > app\common\static\error\50x.html
)

:: Check if requirements.txt exists
if not exist requirements.txt (
    echo [4D Manifold Explorer] Error: requirements.txt not found. Please make sure the application is set up correctly.
    exit /b 1
)

:: Update docker-compose.yml for quiet mode if requested
if %QUIET_MODE% equ 1 (
    echo [4D Manifold Explorer] Configuring TensorFlow to run in quiet mode...
    powershell -Command "(Get-Content docker-compose.yml) -replace '# - TF_CPP_MIN_LOG_LEVEL=2', '- TF_CPP_MIN_LOG_LEVEL=2' | Set-Content docker-compose.yml"
)

:: Update docker-compose.yml for GPU mode if requested
if %GPU_MODE% equ 1 (
    echo [4D Manifold Explorer] Enabling GPU support in docker-compose.yml...
    powershell -Command "(Get-Content docker-compose.yml) -replace '#\s+deploy:', 'deploy:' -replace '#\s+resources:', '  resources:' -replace '#\s+reservations:', '    reservations:' -replace '#\s+devices:', '      devices:' -replace '#\s+- driver: nvidia', '        - driver: nvidia' -replace '#\s+count: 1', '          count: 1' -replace '#\s+capabilities: \[gpu\]', '          capabilities: [gpu]' | Set-Content docker-compose.yml"
)

:: Build and start the containers
echo [4D Manifold Explorer] Building and starting Docker containers...
docker-compose up --build -d

:: Check if the containers are running
docker ps | findstr "4d-manifold-explorer" >nul
if %ERRORLEVEL% equ 0 (
    echo [4D Manifold Explorer] Application is now running!
    echo [4D Manifold Explorer] You can access it at http://localhost
    echo [4D Manifold Explorer] To view logs: docker-compose logs -f
    echo [4D Manifold Explorer] To stop the application: docker-compose down
) else (
    echo [4D Manifold Explorer] Error: Failed to start the application. Check the logs with: docker-compose logs
    exit /b 1
)

exit /b 0 