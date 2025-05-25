# Quick Start: Azure Container Apps Deployment

This guide will get your SKB Visualization application deployed to Azure Container Apps in minutes using our automated setup script.

## Prerequisites

1. **Azure CLI** - [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **GitHub CLI** - [Install GitHub CLI](https://cli.github.com/)
3. **PowerShell 7+** (recommended) or Windows PowerShell 5.1

## Step 1: Login to Azure and GitHub

```powershell
# Login to Azure
az login

# Login to GitHub
gh auth login
```

## Step 2: Run the Automated Setup Script

Execute the PowerShell setup script with your specific values:

```powershell
# Navigate to your repository root
cd path\to\your\Wireframe

# Run the setup script with your parameters
.\scripts\azure-setup.ps1 `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroup "your-resource-group-name" `
  -AcrName "your-acr-name" `
  -GitHubRepo "your-github-username/Wireframe"

# Example with actual values:
# .\scripts\azure-setup.ps1 `
#   -SubscriptionId "12345678-1234-1234-1234-123456789012" `
#   -ResourceGroup "my-resource-group" `
#   -AcrName "myacr" `
#   -GitHubRepo "jsmith/Wireframe"
```

### Optional Parameters

```powershell
# With additional optional parameters
.\scripts\azure-setup.ps1 `
  -SubscriptionId "your-subscription-id" `
  -ResourceGroup "your-resource-group-name" `
  -AcrName "your-acr-name" `
  -GitHubRepo "your-github-username/Wireframe" `
  -Location "West US 2" `
  -AppName "my-skb-app" `
  -ContainerEnvName "my-container-env" `
  -EnableLogging:$true
```

## Step 3: Verify Setup

After the script completes, verify the configuration:

```powershell
# Check GitHub secrets
gh secret list --repo your-username/Wireframe

# Check Azure resources
az containerapp list --resource-group your-resource-group-name --output table
```

## Step 4: Deploy Your Application

Trigger the deployment workflow:

```powershell
# Trigger deployment manually
gh workflow run "Deploy to Azure Container Apps" --repo your-username/Wireframe

# Monitor the deployment
gh run list --repo your-username/Wireframe --limit 5
```

Or simply push code to the `main` branch to trigger automatic deployment.

## What the Script Does

The automated setup script performs these actions:

1. ✅ **Creates Container Apps Environment** - Sets up the Azure Container Apps environment
2. ✅ **Creates OIDC App Registration** - Sets up Azure AD app with federated credentials
3. ✅ **Configures Permissions** - Assigns necessary roles (AcrPush, Container Apps Contributor)
4. ✅ **Creates Container App** - Initial container app with placeholder image
5. ✅ **Sets Up Logging** - Creates Log Analytics workspace for monitoring
6. ✅ **Configures GitHub Secrets** - Automatically sets all required repository secrets

## GitHub Secrets Configured

The script automatically configures these GitHub repository secrets:

- `AZURE_CLIENT_ID` - Service principal client ID
- `AZURE_TENANT_ID` - Azure tenant ID
- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID
- `AZURE_RESOURCE_GROUP` - Resource group name
- `ACR_NAME` - Container registry name
- `CONTAINER_APP_NAME` - Container app name
- `CONTAINER_APP_ENVIRONMENT` - Container environment name

## Troubleshooting

### Common Issues

**Permission denied errors:**
```powershell
# Ensure you're logged into Azure with sufficient permissions
az account show
az account list-locations  # Test Azure CLI access
```

**GitHub CLI authentication issues:**
```powershell
# Re-authenticate with GitHub
gh auth logout
gh auth login
```

**Script execution policy errors:**
```powershell
# Allow script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Verify Resources

```powershell
# Check Container Apps
az containerapp list --resource-group your-rg --output table

# Check App Registration
az ad app list --display-name "skb-visualization-github-oidc"

# Check Role Assignments
az role assignment list --assignee your-app-id --output table
```

## Next Steps

Once deployment is complete:

1. **Visit your application** - The script outputs the Container App URL
2. **Monitor logs** - Use Azure Portal or CLI to view application logs
3. **Set up custom domain** - Configure your own domain name (optional)
4. **Configure scaling** - Adjust min/max replicas based on usage

## Alternative: Manual Setup

If you prefer manual setup, see the detailed guide: [Azure Deployment Setup Guide](azure-deployment-setup.md)

## Getting Help

- **GitHub Issues**: Create an issue in this repository
- **Azure Documentation**: [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- **GitHub Actions**: [GitHub Actions Documentation](https://docs.github.com/en/actions) 