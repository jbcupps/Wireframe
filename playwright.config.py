import os
from playwright.sync_api import Playwright

BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')

# Default configuration for Playwright tests

def pytest_configure(config):
    config.base_url = BASE_URL
