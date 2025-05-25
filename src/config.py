"""
Configuration management for SKB Visualization Application
Provides environment-specific configurations with validation and defaults.
"""

import os
from typing import Optional, List
from pydantic import Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from enum import Enum


class Environment(str, Enum):
    """Environment types for the application."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


class LogLevel(str, Enum):
    """Logging levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Settings(BaseSettings):
    """Application settings with validation and environment support."""
    
    model_config = ConfigDict(
        env_prefix="SKB_",
        env_file=".env",
        case_sensitive=False
    )
    
    # Application Settings
    app_name: str = Field(default="SKB Visualization", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    environment: Environment = Field(default=Environment.DEVELOPMENT, description="Runtime environment")
    debug: bool = Field(default=False, description="Debug mode flag")
    
    # Server Settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=5000, description="Server port")
    workers: int = Field(default=2, description="Number of worker processes")
    timeout: int = Field(default=120, description="Request timeout in seconds")
    
    # Security Settings
    secret_key: str = Field(default="dev-secret-key-change-in-production", description="Secret key for sessions")
    allowed_hosts: List[str] = Field(default=["*"], description="Allowed hosts for CORS")
    cors_origins: List[str] = Field(default=["*"], description="CORS allowed origins")
    
    # Scientific Computing Settings
    max_surface_resolution: int = Field(default=100, description="Maximum surface resolution for computations")
    computation_timeout: int = Field(default=30, description="Computation timeout in seconds")
    enable_caching: bool = Field(default=True, description="Enable computation caching")
    cache_ttl: int = Field(default=3600, description="Cache TTL in seconds")
    
    # Mathematical Precision Settings
    numerical_precision: int = Field(default=8, description="Decimal precision for calculations")
    stability_threshold: float = Field(default=0.001, description="Numerical stability threshold")
    max_iterations: int = Field(default=1000, description="Maximum iterations for iterative algorithms")
    
    # Visualization Settings
    default_plot_width: int = Field(default=800, description="Default plot width")
    default_plot_height: int = Field(default=600, description="Default plot height")
    max_export_resolution: int = Field(default=2048, description="Maximum export resolution")
    
    # Performance Settings
    enable_gpu_acceleration: bool = Field(default=False, description="Enable GPU acceleration if available")
    max_memory_usage_gb: float = Field(default=4.0, description="Maximum memory usage in GB")
    enable_multiprocessing: bool = Field(default=True, description="Enable multiprocessing for computations")
    
    # Logging Settings
    log_level: LogLevel = Field(default=LogLevel.INFO, description="Logging level")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format string"
    )
    enable_file_logging: bool = Field(default=False, description="Enable file logging")
    log_file_path: Optional[str] = Field(default=None, description="Log file path")
    
    # Database Settings (for future use)
    database_url: Optional[str] = Field(default=None, description="Database connection URL")
    database_pool_size: int = Field(default=10, description="Database connection pool size")
    
    # Redis/Cache Settings
    redis_url: Optional[str] = Field(default=None, description="Redis connection URL")
    cache_backend: str = Field(default="memory", description="Cache backend type")
    
    # Monitoring Settings
    enable_metrics: bool = Field(default=False, description="Enable Prometheus metrics")
    metrics_port: int = Field(default=9090, description="Metrics server port")
    
    # Export Settings
    export_formats: List[str] = Field(default=["png", "pdf", "svg"], description="Supported export formats")
    max_export_size_mb: float = Field(default=50.0, description="Maximum export file size in MB")
    
    @field_validator("port")
    @classmethod
    def validate_port(cls, v):
        """Validate port range."""
        if not 1024 <= v <= 65535:
            raise ValueError("Port must be between 1024 and 65535")
        return v
    
    @field_validator("workers")
    @classmethod
    def validate_workers(cls, v):
        """Validate worker count."""
        if v < 1:
            raise ValueError("Workers must be at least 1")
        return v
    
    @field_validator("max_surface_resolution")
    @classmethod
    def validate_resolution(cls, v):
        """Validate surface resolution."""
        if not 10 <= v <= 500:
            raise ValueError("Surface resolution must be between 10 and 500")
        return v
    
    @field_validator("numerical_precision")
    @classmethod
    def validate_precision(cls, v):
        """Validate numerical precision."""
        if not 1 <= v <= 15:
            raise ValueError("Numerical precision must be between 1 and 15")
        return v
    
    @field_validator("stability_threshold")
    @classmethod
    def validate_threshold(cls, v):
        """Validate stability threshold."""
        if not 1e-10 <= v <= 1e-1:
            raise ValueError("Stability threshold must be between 1e-10 and 1e-1")
        return v
    
    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v, info):
        """Validate secret key for production."""
        # Note: In Pydantic v2, access to other fields requires info.data
        if info.data and info.data.get("environment") == Environment.PRODUCTION and v == "dev-secret-key-change-in-production":
            raise ValueError("Must set a secure secret key in production")
        return v


class DevelopmentSettings(Settings):
    """Development environment settings."""
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = True
    log_level: LogLevel = LogLevel.DEBUG
    enable_caching: bool = False
    enable_file_logging: bool = True


class TestingSettings(Settings):
    """Testing environment settings."""
    environment: Environment = Environment.TESTING
    debug: bool = True
    log_level: LogLevel = LogLevel.WARNING
    enable_caching: bool = False
    database_url: str = "sqlite:///:memory:"


class ProductionSettings(Settings):
    """Production environment settings."""
    environment: Environment = Environment.PRODUCTION
    debug: bool = False
    log_level: LogLevel = LogLevel.INFO
    enable_caching: bool = True
    enable_metrics: bool = True
    enable_file_logging: bool = True
    log_file_path: str = "/var/log/skb/application.log"


def get_settings() -> Settings:
    """
    Get application settings based on environment.
    
    Returns:
        Settings: Configured settings instance
    """
    env = os.getenv("SKB_ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()


# Global settings instance
settings = get_settings()


def get_database_url() -> str:
    """
    Get database URL with fallback to SQLite.
    
    Returns:
        str: Database connection URL
    """
    if settings.database_url:
        return settings.database_url
    
    # Default SQLite database for development
    return "sqlite:///skb_data.db"


def get_cache_config() -> dict:
    """
    Get cache configuration based on settings.
    
    Returns:
        dict: Cache configuration
    """
    if settings.redis_url and settings.cache_backend == "redis":
        return {
            "backend": "redis",
            "url": settings.redis_url,
            "ttl": settings.cache_ttl
        }
    else:
        return {
            "backend": "memory",
            "max_size": 1000,
            "ttl": settings.cache_ttl
        }


def get_logging_config() -> dict:
    """
    Get logging configuration.
    
    Returns:
        dict: Logging configuration
    """
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": settings.log_format,
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.log_level.value,
                "formatter": "default",
                "stream": "ext://sys.stdout"
            }
        },
        "loggers": {
            "skb": {
                "level": settings.log_level.value,
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            }
        },
        "root": {
            "level": settings.log_level.value,
            "handlers": ["console"]
        }
    }
    
    # Add file handler if enabled
    if settings.enable_file_logging and settings.log_file_path:
        config["handlers"]["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": settings.log_level.value,
            "formatter": "detailed",
            "filename": settings.log_file_path,
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5
        }
        config["loggers"]["skb"]["handlers"].append("file")
        config["root"]["handlers"].append("file")
    
    return config


# Export commonly used settings
__all__ = [
    "Settings",
    "DevelopmentSettings", 
    "TestingSettings",
    "ProductionSettings",
    "Environment",
    "LogLevel",
    "settings",
    "get_settings",
    "get_database_url",
    "get_cache_config",
    "get_logging_config"
] 