<#
.SYNOPSIS
    Uninstalls the Backend Admin System Windows Service
.DESCRIPTION
    This script removes the Backend Admin System service from Windows.
    Must be run as Administrator.
.PARAMETER Force
    Remove without confirmation prompt
.EXAMPLE
    .\uninstall-service.ps1
.EXAMPLE
    .\uninstall-service.ps1 -Force
#>

param(
    [switch]$Force,
    [string]$ServiceName = "BackendAdminSystem"
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator!"
    exit 1
}

Write-Host "=== Backend Admin System Service Uninstallation ===" -ForegroundColor Cyan

# Check if service exists
try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    Write-Host "Found service: $($service.DisplayName)" -ForegroundColor Yellow
} catch {
    Write-Host "Service '$ServiceName' not found." -ForegroundColor Green
    Write-Host "Nothing to uninstall." -ForegroundColor Green
    exit 0
}

if ($null -eq (Get-Command nssm.exe -ErrorAction SilentlyContinue)) {
    Write-Warning "NSSM not found in PATH, attempting manual removal..." -ForegroundColor Yellow
    
    # Try to stop and remove service using sc command
    Write-Host "Stopping service..." -ForegroundColor Yellow
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Warning "Could not stop service: $_"
    }
    
    Write-Host "Removing service..." -ForegroundColor Yellow
    try {
        sc delete $ServiceName
        Write-Host "✓ Service removed successfully (using sc command)" -ForegroundColor Green
    } catch {
        Write-Error "Failed to remove service: $_"
        exit 1
    }
} else {
    # NSSM is available, use it for proper cleanup
    if (-not $Force) {
        $response = Read-Host "Are you sure you want to uninstall the '$ServiceName' service? (Y/N)"
        if ($response -ne 'Y' -and $response -ne 'y') {
            Write-Host "Uninstallation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Stop the service if running
    if ($service.Status -eq "Running") {
        Write-Host "Stopping service..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force -Confirm:$false
        Start-Sleep -Seconds 2
    }
    
    # Remove the service using NSSM
    Write-Host "Removing service with NSSM..." -ForegroundColor Yellow
    & nssm.exe remove $ServiceName confirm
    
    Write-Host "✓ Service uninstalled successfully!" -ForegroundColor Green
}

# Cleanup (optional - commented out by default)
#$InstallPath = "C:\backend-admin"
#if (Test-Path $InstallPath) {
#    $cleanupResponse = Read-Host "Do you want to remove the installation directory ($InstallPath)? (Y/N)"
#    if ($cleanupResponse -eq 'Y' -or $cleanupResponse -eq 'y') {
#        Write-Host "Removing installation directory..." -ForegroundColor Yellow
#        Remove-Item -Recurse -Force $InstallPath
#        Write-Host "Installation directory removed." -ForegroundColor Green
#    }
#}

Write-Host ""
Write-Host "Uninstallation complete." -ForegroundColor Cyan
