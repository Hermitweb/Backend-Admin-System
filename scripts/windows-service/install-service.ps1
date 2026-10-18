<#
.SYNOPSIS
    Installs the Backend Admin System as a Windows Service using NSSM
.DESCRIPTION
    This script installs and configures the Backend Admin System as a Windows Service.
    Prerequisites:
    - NSSM must be installed and in PATH or specify nssm.exe path
    - Run as Administrator
.PARAMETER InstallPath
    The directory where the application is installed (default: C:\backend-admin)
.EXAMPLE
    .\install-service.ps1 -InstallPath "C:\backend-admin"
.EXAMPLE
    .\install-service.ps1
#>

param(
    [string]$InstallPath = "C:\backend-admin",
    [string]$ServiceName = "BackendAdminSystem",
    [string]$NssmPath = "nssm.exe"
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator!"
    exit 1
}

Write-Host "=== Backend Admin System Service Installation ===" -ForegroundColor Cyan

# Create installation directory if it doesn't exist
if (-not (Test-Path $InstallPath)) {
    Write-Host "Creating installation directory: $InstallPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
}

# Create logs directory
$logsPath = Join-Path $InstallPath "logs"
if (-not (Test-Path $logsPath)) {
    Write-Host "Creating logs directory: $logsPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
}

# Create databases directory
$databasesPath = Join-Path $InstallPath "databases"
if (-not (Test-Path $databasesPath)) {
    Write-Host "Creating databases directory: $databasesPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $databasesPath | Out-Null
}

# Create data directory
$dataPath = Join-Path $InstallPath "data"
if (-not (Test-Path $dataPath)) {
    Write-Host "Creating data directory: $dataPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
}

# Locate nssm.exe
if ($null -eq (Get-Command $NssmPath -ErrorAction SilentlyContinue)) {
    # Try common paths for NSSM
    $nssmPaths = @(
        "$env:SystemRoot\system32\nssm.exe",
        "${env:ProgramFiles}\nssm\nssm.exe",
        ".\nssm.exe"
    )
    
    foreach ($path in $nssmPaths) {
        if (Test-Path $path) {
            $NssmPath = $path
            Write-Host "Found NSSM at: $NssmPath" -ForegroundColor Green
            break
        }
    }
    
    if (-not (Test-Path $NssmPath)) {
        Write-Error "NSSM not found. Please download from https://nssm.cc/download and extract to system PATH"
        exit 1
    }
} else {
    Write-Host "Found NSSM in PATH" -ForegroundColor Green
}

# Get full path to service wrapper
$wrapperPath = Join-Path $InstallPath "service-wrapper.ps1"
if (-not (Test-Path $wrapperPath)) {
    Write-Error "Service wrapper not found: $wrapperPath"
    Write-Host "Make sure you have copied the following files to $InstallPath:" -ForegroundColor Red
    Write-Host "  - service-wrapper.ps1" -ForegroundColor Red
    Write-Host "  - dist folder (build output)" -ForegroundColor Red
    exit 1
}

Write-Host "Checking for existing service..." -ForegroundColor Yellow

# Check if service already exists
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    $response = Read-Host "Service '$ServiceName' already exists. Do you want to stop and replace it? (Y/N)"
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-Host "Installation cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    & $NssmPath remove $ServiceName confirm
}

# Install the service
Write-Host "Installing service '$ServiceName'..." -ForegroundColor Cyan

& $NssmPath install $ServiceName `
    "powershell.exe" `
    "-ExecutionPolicy Bypass -File '$wrapperPath'"

Write-Host "Configuring service parameters..." -ForegroundColor Cyan

# Set environment variables
& $NssmPath set $ServiceName DisplayName "Backend Admin System"
& $NssmPath set $ServiceName Description "Backend Admin System Service"
& $NssmPath set $ServiceName AppDirectory $InstallPath
& $NssmPath set $ServiceName StartType SERVICE_AUTO_START

# Configure logging
& $NssmPath set $ServiceName StdoutPath "$logsPath\output.log"
& $NssmPath set $ServiceName StderrPath "$logsPath\error.log"
& $NssmPath set $ServiceName StdoutShareFlag FILE_SHARE_READ
& $NssmPath set $ServiceName StderrShareFlag FILE_SHARE_READ

# Configure recovery options
& $NssmPath set $ServiceName Recovery RestartService
& $NssmPath set $ServiceName Recovery DelayMinutes 5
& $NssmPath set $ServiceName Recovery RebootCount 3
& $NssmPath set $ServiceName Recovery LastSuccess KeepRunning

# Configure resource limits
& $NssmPath set $ServiceName Memory PhysicalLimitLow 268435456
& $NssmPath set $ServiceName Memory PhysicalLimitHigh 536870912

# Configure priority
& $NssmPath set $ServiceName Priority NORMAL_PRIORITY_CLASS

# Configure dependencies
& $NssmPath set $ServiceName DependOn "Postgres"
& $NssmPath set $ServiceName DependOn "Redis"

# Start the service
Write-Host "Starting service..." -ForegroundColor Cyan
& $NssmPath start $ServiceName

# Verify service status
Start-Sleep -Seconds 3
$serviceStatus = Get-Service -Name $ServiceName

if ($serviceStatus.Status -eq "Running") {
    Write-Host "✓ Service installed and running successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Information:" -ForegroundColor Cyan
    Write-Host "  Name:         $($serviceStatus.Name)"
    Write-Host "  Display Name: $($serviceStatus.DisplayName)"
    Write-Host "  Status:       $($serviceStatus.Status)"
    Write-Host "  Start Type:   Automatic"
    Write-Host "  Path:         $wrapperPath"
    Write-Host ""
    Write-Host "To manage the service:" -ForegroundColor Yellow
    Write-Host "  Start:        Start-Service $ServiceName"
    Write-Host "  Stop:         Stop-Service $ServiceName"
    Write-Host "  Restart:      Restart-Service $ServiceName"
    Write-Host "  Uninstall:    .\uninstall-service.ps1"
    Write-Host ""
    Write-Host "Logs available at: $logsPath" -ForegroundColor Cyan
} else {
    Write-Host "✗ Service started but status is: $($serviceStatus.Status)" -ForegroundColor Yellow
    Write-Host "Check logs for details." -ForegroundColor Yellow
}

exit 0
