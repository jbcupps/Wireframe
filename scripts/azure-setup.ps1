# SKB Visualization - Azure Container Apps Setup Script
# This script automates the setup of Azure Container Apps deployment with OIDC authentication
# Run this script from the repository root directory

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AcrName,
    
    [Parameter(Mandatory=$true)]
    [string]$GitHubRepo,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "skb-visualization",
    
    [Parameter(Mandatory=$false)]
    [string]$ContainerEnvName = "skb-container-env",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipContainerAppCreation = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableLogging = $true
)

# Script configuration
$ErrorActionPreference = "Stop"
$APP_REGISTRATION_NAME = "skb-visualization-github-oidc"
$LOG_WORKSPACE = "skb-logs-workspace"

Write-Host "🚀 SKB Visualization Azure Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if Azure CLI is logged in
function Test-AzureLogin {
    try {
        $null = az account show 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check if GitHub CLI is authenticated
function Test-GitHubAuth {
    try {
        $null = gh auth status 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to log steps
function Write-Step {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Pre-flight checks
Write-Step "Running pre-flight checks..."

if (-not (Test-AzureLogin)) {
    Write-Error "Azure CLI is not logged in. Please run 'az login' first."
    exit 1
}

if (-not (Test-GitHubAuth)) {
    Write-Error "GitHub CLI is not authenticated. Please run 'gh auth login' first."
    exit 1
}

# Verify Azure subscription
Write-Info "Setting Azure subscription to: $SubscriptionId"
az account set --subscription $SubscriptionId

$currentSub = az account show --query id --output tsv
if ($currentSub -ne $SubscriptionId) {
    Write-Error "Failed to set subscription to $SubscriptionId"
    exit 1
}

Write-Success "Pre-flight checks completed successfully"

# Step 1: Create Container Apps Environment
Write-Step "Creating Azure Container Apps Environment..."

$envExists = az containerapp env show --name $ContainerEnvName --resource-group $ResourceGroup 2>$null
if (-not $envExists) {
    Write-Info "Creating new Container Apps environment: $ContainerEnvName"
    az containerapp env create `
        --name $ContainerEnvName `
        --resource-group $ResourceGroup `
        --location $Location `
        --subscription $SubscriptionId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create Container Apps environment"
        exit 1
    }
    Write-Success "Container Apps environment created successfully"
}
else {
    Write-Info "Container Apps environment '$ContainerEnvName' already exists"
}

# Step 2: Create App Registration for OIDC
Write-Step "Setting up OIDC App Registration..."

$existingApp = az ad app list --display-name $APP_REGISTRATION_NAME --query "[0].appId" --output tsv 2>$null
if ($existingApp) {
    Write-Warning "App registration '$APP_REGISTRATION_NAME' already exists. Using existing app: $existingApp"
    $APP_ID = $existingApp
}
else {
    Write-Info "Creating new app registration: $APP_REGISTRATION_NAME"
    $APP_ID = az ad app create --display-name $APP_REGISTRATION_NAME --query appId --output tsv
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create app registration"
        exit 1
    }
    
    Write-Info "Creating service principal..."
    az ad sp create --id $APP_ID
    Write-Success "App registration created with ID: $APP_ID"
}

# Step 3: Configure Federated Credentials
Write-Step "Configuring federated credentials..."

# Check if main branch credential exists
$mainCredential = az ad app federated-credential list --id $APP_ID --query "[?name=='main-branch']" --output tsv 2>$null
if (-not $mainCredential) {
    Write-Info "Creating federated credential for main branch"
    $federatedCredentialParams = @{
        name = "main-branch"
        issuer = "https://token.actions.githubusercontent.com"
        subject = "repo:$GitHubRepo`:ref:refs/heads/main"
        description = "GitHub Actions Main Branch"
        audiences = @("api://AzureADTokenExchange")
    } | ConvertTo-Json -Depth 3

    az ad app federated-credential create --id $APP_ID --parameters $federatedCredentialParams
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create federated credential for main branch"
        exit 1
    }
    Write-Success "Main branch federated credential created"
}
else {
    Write-Info "Main branch federated credential already exists"
}

# Step 4: Assign Required Permissions
Write-Step "Assigning Azure role permissions..."

$RG_SCOPE = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup"
$ACR_SCOPE = "$RG_SCOPE/providers/Microsoft.ContainerRegistry/registries/$AcrName"

# Assign AcrPush role
Write-Info "Assigning AcrPush role for ACR access..."
try {
    az role assignment create --assignee $APP_ID --role "AcrPush" --scope $ACR_SCOPE 2>$null
    Write-Success "AcrPush role assigned"
}
catch {
    Write-Warning "AcrPush role may already be assigned"
}

# Assign Container Apps Contributor role
Write-Info "Assigning Container Apps Contributor role..."
try {
    az role assignment create --assignee $APP_ID --role "Container Apps Contributor" --scope $RG_SCOPE 2>$null
    Write-Success "Container Apps Contributor role assigned"
}
catch {
    Write-Warning "Container Apps Contributor role may already be assigned"
}

# Step 5: Create Container App (if requested)
if (-not $SkipContainerAppCreation) {
    Write-Step "Creating Container App..."
    
    $appExists = az containerapp show --name $AppName --resource-group $ResourceGroup 2>$null
    if (-not $appExists) {
        Write-Info "Creating new container app: $AppName"
        az containerapp create `
            --name $AppName `
            --resource-group $ResourceGroup `
            --environment $ContainerEnvName `
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
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create container app"
            exit 1
        }
        Write-Success "Container app created successfully"
    }
    else {
        Write-Info "Container app '$AppName' already exists"
    }
}

# Step 6: Configure Logging (if enabled)
if ($EnableLogging) {
    Write-Step "Setting up Log Analytics workspace..."
    
    $workspaceExists = az monitor log-analytics workspace show --resource-group $ResourceGroup --workspace-name $LOG_WORKSPACE 2>$null
    if (-not $workspaceExists) {
        Write-Info "Creating Log Analytics workspace: $LOG_WORKSPACE"
        az monitor log-analytics workspace create `
            --resource-group $ResourceGroup `
            --workspace-name $LOG_WORKSPACE `
            --location $Location
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to create Log Analytics workspace, continuing without logging"
        }
        else {
            Write-Success "Log Analytics workspace created"
            
            # Get workspace details and update Container Apps environment
            $WORKSPACE_ID = az monitor log-analytics workspace show --resource-group $ResourceGroup --workspace-name $LOG_WORKSPACE --query customerId --output tsv
            $WORKSPACE_KEY = az monitor log-analytics workspace get-shared-keys --resource-group $ResourceGroup --workspace-name $LOG_WORKSPACE --query primarySharedKey --output tsv
            
            Write-Info "Updating Container Apps environment with logging configuration..."
            az containerapp env update `
                --name $ContainerEnvName `
                --resource-group $ResourceGroup `
                --logs-workspace-id $WORKSPACE_ID `
                --logs-workspace-key $WORKSPACE_KEY
            
            Write-Success "Logging configuration completed"
        }
    }
    else {
        Write-Info "Log Analytics workspace '$LOG_WORKSPACE' already exists"
    }
}

# Step 7: Set GitHub Secrets
Write-Step "Configuring GitHub repository secrets..."

$TENANT_ID = az account show --query tenantId --output tsv

$secrets = @{
    "AZURE_CLIENT_ID" = $APP_ID
    "AZURE_TENANT_ID" = $TENANT_ID
    "AZURE_SUBSCRIPTION_ID" = $SubscriptionId
    "AZURE_RESOURCE_GROUP" = $ResourceGroup
    "ACR_NAME" = $AcrName
    "CONTAINER_APP_NAME" = $AppName
    "CONTAINER_APP_ENVIRONMENT" = $ContainerEnvName
}

foreach ($secret in $secrets.GetEnumerator()) {
    Write-Info "Setting GitHub secret: $($secret.Key)"
    gh secret set $secret.Key --body $secret.Value --repo $GitHubRepo
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to set GitHub secret: $($secret.Key)"
    }
}

Write-Success "GitHub secrets configured"

# Step 8: Summary and Next Steps
Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Configuration Summary:" -ForegroundColor Cyan
Write-Host "  App Registration ID: $APP_ID"
Write-Host "  Container App Name: $AppName"
Write-Host "  Container Environment: $ContainerEnvName"
Write-Host "  Resource Group: $ResourceGroup"
Write-Host "  ACR Name: $AcrName"
Write-Host ""

if (-not $SkipContainerAppCreation) {
    $APP_URL = az containerapp show --name $AppName --resource-group $ResourceGroup --query properties.configuration.ingress.fqdn --output tsv
    if ($APP_URL) {
        Write-Host "🌐 Application URL: https://$APP_URL" -ForegroundColor Green
    }
}

Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Verify GitHub secrets: gh secret list --repo $GitHubRepo"
Write-Host "  2. Trigger deployment: gh workflow run 'Deploy to Azure Container Apps' --repo $GitHubRepo"
Write-Host "  3. Monitor deployment: gh run list --repo $GitHubRepo"
Write-Host ""

Write-Host "📚 For detailed information, see: docs/azure-deployment-setup.md" -ForegroundColor Blue 