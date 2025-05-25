# Azure Container Apps Deployment - Setup Complete

## Overview

Your SKB Visualization application is now fully configured for deployment to Azure Container Apps using OIDC authentication and your existing Azure Container Registry. Here's what has been set up:

## ✅ What's Been Configured

### 1. GitHub Actions Workflow
- **File**: `.github/workflows/cd-azure.yml`
- **Triggers**: Automatic deployment on push to `main` branch
- **Features**: 
  - OIDC authentication (no stored secrets needed)
  - Docker image build and push to your ACR
  - Azure Container Apps deployment
  - Health checks and deployment verification
  - Deployment summary with application URL

### 2. Azure Setup Script
- **File**: `scripts/azure-setup.ps1`
- **Purpose**: Automates the complete Azure environment setup
- **Features**:
  - Creates OIDC App Registration with federated credentials
  - Sets up Container Apps environment
  - Configures all necessary Azure role assignments
  - Creates initial Container App with placeholder image
  - Sets up Log Analytics workspace for monitoring
  - Configures all GitHub repository secrets

### 3. Documentation
- **Quick Start Guide**: `docs/quick-start-azure-deployment.md`
- **Detailed Setup Guide**: `docs/azure-deployment-setup.md`
- **This Summary**: `docs/deployment-summary.md`

### 4. Application Health Endpoint
- **Endpoint**: `/health`
- **Purpose**: Container health monitoring and deployment verification
- **Response**: JSON with service status and version information

## 🚀 Next Steps

### Step 1: Run the Azure Setup Script

Open PowerShell and execute:

```powershell
# Navigate to your repository
cd C:\Users\jbcup\OneDrive\Documents\Repo\Wireframe\Wireframe

# Run the setup script (replace with your actual values)
.\scripts\azure-setup.ps1 `
  -SubscriptionId "your-subscription-one-id" `
  -ResourceGroup "your-existing-resource-group" `
  -AcrName "your-existing-acr-name" `
  -GitHubRepo "your-username/Wireframe"
```

### Step 2: Verify Configuration

```powershell
# Check GitHub secrets
gh secret list

# Check Azure resources
az containerapp list --resource-group your-rg --output table
```

### Step 3: Deploy Your Application

Either:
- **Automatic**: Push code to `main` branch
- **Manual**: Run `gh workflow run "Deploy to Azure Container Apps"`

## 📋 Required Information

Before running the setup script, gather these details:

| Parameter | Description | Where to Find |
|-----------|-------------|---------------|
| `SubscriptionId` | Your Azure subscription ID | `az account list --output table` |
| `ResourceGroup` | Resource group containing your ACR | Azure Portal or `az group list` |
| `AcrName` | Your existing Azure Container Registry name | Azure Portal or `az acr list` |
| `GitHubRepo` | Your GitHub repository (format: username/repo) | GitHub repository URL |

## 🔐 Security Features

### OIDC Authentication
- **No long-lived secrets** stored in GitHub
- **Federated credentials** for secure Azure access
- **Least privilege** role assignments
- **Automatic token rotation** by Azure AD

### Role Assignments
- `AcrPush` - Push Docker images to your ACR
- `Container Apps Contributor` - Deploy and manage Container Apps

## 🏗️ Architecture

```
GitHub Repository
    ↓ (Push to main)
GitHub Actions Workflow
    ↓ (OIDC Auth)
Azure AD App Registration
    ↓ (Authorized access)
Azure Container Registry ← Docker Image Build & Push
    ↓ (Image deployment)
Azure Container Apps ← Your Application
```

## 📊 Monitoring and Logging

### Application Logs
```powershell
# View real-time logs
az containerapp logs show --name skb-visualization --resource-group your-rg --follow

# View logs in Azure Portal
# Navigate to: Container Apps → your-app → Monitoring → Log stream
```

### GitHub Actions Monitoring
```powershell
# Check workflow runs
gh run list --limit 10

# View specific run details
gh run view [run-id]
```

## 🔧 Configuration Options

### Environment Variables
The Container App is configured with these environment variables:
- `SKB_ENVIRONMENT=production`
- `SKB_DEBUG=false`
- `SKB_ENABLE_CACHING=true`
- `SKB_CACHE_BACKEND=memory`
- `SKB_LOG_LEVEL=INFO`
- `SKB_HOST=0.0.0.0`
- `SKB_PORT=5000`

### Scaling Configuration
- **Min Replicas**: 1
- **Max Replicas**: 10
- **CPU**: 1.0 cores
- **Memory**: 2.0 GB
- **Auto-scaling**: Based on HTTP traffic

## 🌐 Application Access

After deployment, your application will be available at:
- **URL Format**: `https://[app-name].[random-id].[region].azurecontainerapps.io`
- **Health Check**: `https://[your-app-url]/health`
- **Main Application**: `https://[your-app-url]/`

## 🛠️ Customization

### Modify Deployment Settings
Edit `.github/workflows/cd-azure.yml` to:
- Change environment variables
- Adjust resource allocation
- Modify scaling parameters
- Add additional deployment steps

### Update Container Configuration
Use Azure CLI to update the Container App:
```powershell
az containerapp update \
  --name your-app-name \
  --resource-group your-rg \
  --cpu 2.0 \
  --memory 4.0Gi
```

## 🆘 Support

### Troubleshooting Resources
1. **GitHub Actions Logs**: Check workflow execution details
2. **Azure Portal**: Monitor Container App status and logs
3. **Azure CLI**: Use diagnostic commands for troubleshooting
4. **Documentation**: Refer to detailed guides in `docs/` folder

### Common Commands
```powershell
# Restart Container App
az containerapp restart --name your-app --resource-group your-rg

# Scale Container App
az containerapp update --name your-app --resource-group your-rg --min-replicas 2

# View Container App details
az containerapp show --name your-app --resource-group your-rg

# Check deployment status
gh run list --repo your-username/Wireframe
```

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ GitHub Actions workflow completes without errors
- ✅ Container App is running and healthy
- ✅ Health endpoint returns `200 OK`
- ✅ Application is accessible via HTTPS URL
- ✅ Application functionality works as expected

---

**Ready to deploy? Start with the Quick Start guide: [docs/quick-start-azure-deployment.md](quick-start-azure-deployment.md)** 