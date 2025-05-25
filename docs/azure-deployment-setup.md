# Azure Container Apps Deployment Setup Guide

This guide will help you set up Azure Container Apps deployment for the SKB Visualization application using OIDC authentication and your existing Azure Container Registry.

## Prerequisites

- Azure CLI installed and logged in
- GitHub CLI installed and authenticated
- Existing Azure Container Registry (ACR) in subscription one
- Repository owner or admin permissions

## Step 1: Azure Environment Setup

### 1.1 Set Environment Variables

```powershell
# Set your Azure subscription and resource details
$SUBSCRIPTION_ID = "your-subscription-id"  # Replace with your subscription one ID
$RESOURCE_GROUP = "your-resource-group"    # Your existing resource group with ACR
$ACR_NAME = "your-acr-name"               # Your existing ACR name
$LOCATION = "East US"                     # Preferred Azure region
$APP_NAME = "skb-visualization"           # Container App name
$GITHUB_REPO = "your-username/Wireframe"  # Your GitHub repository

# App Registration details
$APP_REGISTRATION_NAME = "skb-visualization-github-oidc"
$CONTAINER_ENV_NAME = "skb-container-env"
```

### 1.2 Create Azure Container Apps Environment

```powershell
# Create Container Apps environment if it doesn't exist
az containerapp env create `
  --name $CONTAINER_ENV_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --subscription $SUBSCRIPTION_ID
```

## Step 2: OIDC Authentication Setup

### 2.1 Create App Registration

```powershell
# Create the App Registration for OIDC
$APP_ID = $(az ad app create `
  --display-name $APP_REGISTRATION_NAME `
  --query appId `
  --output tsv)

echo "App Registration ID: $APP_ID"

# Create a service principal
az ad sp create --id $APP_ID
```

### 2.2 Configure Federated Credentials

```powershell
# Create federated credential for main branch
az ad app federated-credential create `
  --id $APP_ID `
  --parameters '{
    "name": "main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:' + $GITHUB_REPO + ':ref:refs/heads/main",
    "description": "GitHub Actions Main Branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for pull requests (optional)
az ad app federated-credential create `
  --id $APP_ID `
  --parameters '{
    "name": "pull-requests",
    "issuer": "https://token.actions.githubusercontent.com", 
    "subject": "repo:' + $GITHUB_REPO + ':pull_request",
    "description": "GitHub Actions Pull Requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 2.3 Assign Required Permissions

```powershell
# Get the subscription ID and resource group information
$SUBSCRIPTION_SCOPE = "/subscriptions/$SUBSCRIPTION_ID"
$RG_SCOPE = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

# Assign AcrPush role for container registry access
az role assignment create `
  --assignee $APP_ID `
  --role "AcrPush" `
  --scope "$RG_SCOPE/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"

# Assign Container Apps Contributor role
az role assignment create `
  --assignee $APP_ID `
  --role "ContainerApp Contributor" `
  --scope $RG_SCOPE

# Assign Container Apps Environment Contributor role  
az role assignment create `
  --assignee $APP_ID `
  --role "ContainerApp Environment Contributor" `
  --scope $RG_SCOPE
```

## Step 3: Create Container App

### 3.1 Initial Container App Creation

```powershell
# Create the container app with a placeholder image
az containerapp create `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --environment $CONTAINER_ENV_NAME `
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" `
  --target-port 5000 `
  --ingress external `
  --cpu 1.0 `
  --memory 2.0Gi `
  --min-replicas 1 `
  --max-replicas 10 `
  --env-vars `
    SKB_ENVIRONMENT=production `
    SKB_DEBUG=false `
    SKB_ENABLE_CACHING=true `
    SKB_CACHE_BACKEND=memory `
    SKB_LOG_LEVEL=INFO `
    SKB_HOST=0.0.0.0 `
    SKB_PORT=5000
```

## Step 4: GitHub Repository Secrets Configuration

### 4.1 Set GitHub Secrets

```powershell
# Get the tenant ID
$TENANT_ID = $(az account show --query tenantId --output tsv)

# Set GitHub repository secrets using GitHub CLI
gh secret set AZURE_CLIENT_ID --body $APP_ID --repo $GITHUB_REPO
gh secret set AZURE_TENANT_ID --body $TENANT_ID --repo $GITHUB_REPO  
gh secret set AZURE_SUBSCRIPTION_ID --body $SUBSCRIPTION_ID --repo $GITHUB_REPO
gh secret set AZURE_RESOURCE_GROUP --body $RESOURCE_GROUP --repo $GITHUB_REPO
gh secret set ACR_NAME --body $ACR_NAME --repo $GITHUB_REPO
gh secret set CONTAINER_APP_NAME --body $APP_NAME --repo $GITHUB_REPO
gh secret set CONTAINER_APP_ENVIRONMENT --body $CONTAINER_ENV_NAME --repo $GITHUB_REPO
```

### 4.2 Verify Secrets

```powershell
# List all secrets to verify they were set correctly
gh secret list --repo $GITHUB_REPO
```

## Step 5: Test Deployment

### 5.1 Trigger GitHub Actions Workflow

```powershell
# Trigger the deployment workflow manually
gh workflow run "Deploy to Azure Container Apps" --repo $GITHUB_REPO
```

### 5.2 Monitor Deployment

```powershell
# Watch the workflow status
gh run list --repo $GITHUB_REPO --limit 1

# Get the Container App URL
$APP_URL = $(az containerapp show `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query properties.configuration.ingress.fqdn `
  --output tsv)

echo "Application URL: https://$APP_URL"
```

## Step 6: Optional Enhancements

### 6.1 Enable Container App Logging

```powershell
# Create Log Analytics workspace for monitoring
$LOG_WORKSPACE = "skb-logs-workspace"

az monitor log-analytics workspace create `
  --resource-group $RESOURCE_GROUP `
  --workspace-name $LOG_WORKSPACE `
  --location $LOCATION

# Get workspace details for Container Apps environment
$WORKSPACE_ID = $(az monitor log-analytics workspace show `
  --resource-group $RESOURCE_GROUP `
  --workspace-name $LOG_WORKSPACE `
  --query customerId `
  --output tsv)

$WORKSPACE_KEY = $(az monitor log-analytics workspace get-shared-keys `
  --resource-group $RESOURCE_GROUP `
  --workspace-name $LOG_WORKSPACE `
  --query primarySharedKey `
  --output tsv)

# Update Container Apps environment with logging
az containerapp env update `
  --name $CONTAINER_ENV_NAME `
  --resource-group $RESOURCE_GROUP `
  --logs-workspace-id $WORKSPACE_ID `
  --logs-workspace-key $WORKSPACE_KEY
```

### 6.2 Configure Custom Domain (Optional)

```powershell
# Add custom domain to container app
az containerapp hostname add `
  --hostname "your-custom-domain.com" `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the service principal has all required role assignments
2. **OIDC Authentication Failures**: Verify federated credentials are correctly configured
3. **Container Start Failures**: Check application logs in Azure Portal
4. **Network Issues**: Ensure Container Apps environment is properly configured

### Useful Commands

```powershell
# Check container app status
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP

# View container app logs
az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --follow

# List all container apps in resource group
az containerapp list --resource-group $RESOURCE_GROUP --output table

# Check GitHub Actions workflow status
gh run list --repo $GITHUB_REPO

# View specific workflow run details
gh run view [RUN_ID] --repo $GITHUB_REPO
```

## Security Best Practices

1. **Least Privilege**: Only assign necessary permissions to the service principal
2. **Secrets Management**: Never commit secrets to the repository
3. **Environment Separation**: Use separate app registrations for different environments
4. **Regular Rotation**: Periodically review and rotate credentials
5. **Monitoring**: Enable logging and monitoring for security events

## Next Steps

After successful deployment:

1. Test the application thoroughly in the Azure environment
2. Set up monitoring and alerting
3. Configure backup and disaster recovery
4. Implement CI/CD for different environments (staging, production)
5. Consider implementing Azure Front Door for global distribution 