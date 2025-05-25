# GitHub Workflows Documentation

This document describes the GitHub Actions workflows implemented for the SKB Visualization project. The workflows have been streamlined to provide clear separation between development and production deployments.

## Overview

The project uses **two main workflows**:

1. **Development Pipeline** (`development.yml`) - Automatically triggered
2. **Production Deployment** (`production.yml`) - Manually triggered

## Development Pipeline

**File**: `.github/workflows/development.yml`

### Triggers
- **Automatic**: Pushes to `develop` branch and `feature/*` branches
- **Automatic**: Pull requests to `main` and `develop` branches
- **Ignores**: Documentation changes (`docs/**`, `*.md`, `.gitignore`)

### Jobs

#### 1. Code Quality & Security
- **Linting**: Runs flake8 with project-specific configuration
- **Security Scanning**: Uses bandit for vulnerability detection
- **Artifacts**: Uploads security reports for review

#### 2. Test Suite
- **Matrix Strategy**: Tests on Python 3.11 and 3.12
- **Test Types**: Unit, integration, and end-to-end tests
- **Coverage**: Generates and uploads coverage reports
- **Playwright**: Installs browser dependencies for e2e tests

#### 3. Docker Development Build
- **Build Target**: Uses `development` target from Dockerfile
- **Testing**: Runs container health checks
- **Caching**: Utilizes GitHub Actions cache for faster builds

#### 4. Development Summary
- **Status Reporting**: Provides comprehensive pipeline summary
- **Next Steps**: Guides developers on required actions

### Environment Variables
```yaml
PYTHON_VERSION: "3.11"
NODE_VERSION: "18"
```

## Production Deployment

**File**: `.github/workflows/production.yml`

### Triggers
- **Manual Only**: `workflow_dispatch` event
- **Input Parameters**:
  - `environment`: Choose between `production` or `staging`
  - `force_deploy`: Override change detection
  - `skip_tests`: Skip pre-deployment validation (not recommended)

### Jobs

#### 1. Pre-deployment Validation
- **Critical Tests**: Runs unit and integration tests
- **Security Scan**: Production-focused security analysis
- **Fast Fail**: Stops deployment if critical issues found

#### 2. Build and Deploy to Production
- **Azure Integration**: Uses OIDC authentication
- **Docker Build**: Production-optimized multi-stage build
- **Container Registry**: Pushes to Azure Container Registry
- **Deployment**: Deploys to Azure Container Apps
- **Health Checks**: Extended production health verification
- **Smoke Tests**: Validates key application endpoints

#### 3. Deployment Summary
- **Status Report**: Comprehensive deployment information
- **Post-deployment**: Provides monitoring and maintenance guidance

### Required Secrets

The production workflow requires the following GitHub secrets:

```yaml
# Azure Authentication
AZURE_SUBSCRIPTION_ID: Your Azure subscription ID
AZURE_TENANT_ID: Azure AD tenant ID
AZURE_CLIENT_ID: OIDC application client ID

# Azure Resources
AZURE_RESOURCE_GROUP: Resource group name
ACR_NAME: Azure Container Registry name
CONTAINER_APP_NAME: Container App name
CONTAINER_APP_ENVIRONMENT: Container App environment name
```

### Environment Configuration

Production deployments use the following environment variables:

```yaml
SKB_ENVIRONMENT: production/staging
SKB_DEBUG: false
SKB_ENABLE_CACHING: true
SKB_CACHE_BACKEND: redis
SKB_LOG_LEVEL: INFO
SKB_HOST: 0.0.0.0
SKB_PORT: 5000
SKB_SECURE_HEADERS: true
```

## Branch Strategy

### Recommended Branch Structure

```
main (protected)
├── develop (development pipeline triggers)
├── feature/new-feature (development pipeline triggers)
├── feature/another-feature (development pipeline triggers)
└── hotfix/critical-fix (manual merge to main)
```

### Workflow Integration

1. **Feature Development**:
   - Create feature branch from `develop`
   - Development pipeline runs automatically
   - Create PR to `develop` (triggers development pipeline)

2. **Release Preparation**:
   - Create PR from `develop` to `main`
   - Development pipeline validates changes
   - Manual review and approval required

3. **Production Deployment**:
   - Merge approved PR to `main`
   - Manually trigger production workflow
   - Select appropriate environment (staging/production)

## Usage Examples

### Triggering Development Pipeline

The development pipeline triggers automatically when:

```bash
# Push to develop branch
git checkout develop
git push origin develop

# Push to feature branch
git checkout -b feature/new-visualization
git push origin feature/new-visualization

# Create pull request (via GitHub UI or CLI)
gh pr create --base develop --title "Add new visualization feature"
```

### Triggering Production Deployment

Production deployments are **manual only**:

1. **Via GitHub UI**:
   - Go to Actions tab
   - Select "Production Deployment"
   - Click "Run workflow"
   - Choose environment and options

2. **Via GitHub CLI**:
   ```bash
   # Deploy to staging
   gh workflow run production.yml \
     -f environment=staging \
     -f force_deploy=false \
     -f skip_tests=false

   # Deploy to production
   gh workflow run production.yml \
     -f environment=production \
     -f force_deploy=false \
     -f skip_tests=false
   ```

## Monitoring and Maintenance

### Workflow Status

Monitor workflow status using:

```bash
# List all workflows
gh workflow list

# View recent runs
gh run list

# View specific run details
gh run view <run-id>
```

### Artifact Management

- **Security Reports**: Download from workflow run artifacts
- **Coverage Reports**: Available in development pipeline runs
- **Deployment Logs**: Available in Azure portal

### Troubleshooting

#### Common Issues

1. **Failed Security Scan**:
   - Download bandit report from artifacts
   - Review and fix security issues
   - Re-run pipeline

2. **Test Failures**:
   - Check test output in workflow logs
   - Run tests locally to debug
   - Fix issues and push changes

3. **Deployment Failures**:
   - Verify Azure credentials and permissions
   - Check container app configuration
   - Review Azure Container Apps logs

#### Debug Commands

```bash
# Check workflow status
gh workflow view development.yml
gh workflow view production.yml

# View recent runs with details
gh run list --workflow=development.yml --limit=5
gh run list --workflow=production.yml --limit=5

# Download workflow artifacts
gh run download <run-id>
```

## Security Considerations

### Secrets Management
- All Azure credentials stored as GitHub secrets
- OIDC authentication reduces credential exposure
- Environment-specific configurations

### Permission Model
```yaml
permissions:
  contents: read      # Repository access
  id-token: write     # OIDC token generation
  packages: write     # Container registry access
```

### Branch Protection
Recommended branch protection rules for `main`:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to specific roles

## Migration Notes

### Changes from Previous Workflows

1. **Removed Workflows**:
   - `cd-azure.yml` (replaced by `production.yml`)
   - `ci.yml` (functionality merged into development pipeline)
   - `test.yml` (expanded into development pipeline)

2. **Key Improvements**:
   - Clear separation of concerns
   - Manual production deployment control
   - Enhanced security scanning
   - Comprehensive testing matrix
   - Better error handling and reporting

3. **Breaking Changes**:
   - Production deployments no longer automatic on main branch push
   - Docker Hub CI removed (focus on Azure Container Registry)
   - Different branch naming strategy (develop vs main)

### Migration Checklist

- [ ] Update branch protection rules
- [ ] Configure required secrets
- [ ] Test development pipeline on feature branch
- [ ] Test production deployment to staging
- [ ] Update team documentation
- [ ] Train team on new workflow triggers 