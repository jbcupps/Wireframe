# Testing Guide

This project uses **pytest** for unit and integration tests and **Playwright** for end-to-end tests.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   playwright install --with-deps
   ```

## Running Tests

- **Unit & Integration**:
  ```bash
  pytest
  ```
  Coverage is enforced at 80% by default.

- **End-to-End**:
  ```bash
  pytest tests/e2e
  ```

Playwright will start the local server automatically during the E2E tests.
