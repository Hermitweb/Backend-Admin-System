<#
.SYNOPSIS
    Service Wrapper Script for Backend Admin System
.DESCRIPTION
    This wrapper script manages the Node.js application as a Windows service.
    It handles startup, graceful shutdown, restart on failure, and monitoring.
.PARAMETER Start
    Starts the application with optional configuration
.EXAMPLE
    .\service-wrapper.ps1 start
.EXAMPLE
    .\service-wrapper.ps1 stop
#>

param(
    [string]$Command = "start",
    [int]$Port = 3000,
    [string]$NodeEnv = "production"
)

# Configuration
$AppRoot = "C:\backend-admin"
$DistPath = Join-Path $AppRoot "dist"
$LogsPath = Join-Path $AppRoot "logs"
$DatabasePath = Join-Path $AppRoot "databases"
$DataPath = Join-Path $AppRoot "data"
$MainScript = Join-Path $DistPath "main.js"
$PidFile = Join-Path $LogsPath "server.pid"
$MaxRestarts = 3
$RestartDelay = 5 # seconds
$HealthCheckTimeout = 60 # seconds
$StartupTimeout = 30 # seconds

# Ensure directories exist
@(
    $LogsPath,
    $DatabasePath,
    $DataPath
) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Force -Path $_ > $null
    }
}

# Logging functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$LogFile = "$LogsPath\wrapper.log"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    try {
        Add-Content -Path $LogFile -Value $logEntry
    } catch {
        # Silent fail for logging
    }
}

# Check if server is already running
function IsServerRunning {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($null -ne $process -and -not $process.HasExited) {
            return $true
        }
        Remove-Item $PidFile -ErrorAction SilentlyContinue
    }
    return $false
}

# Wait for server to be ready
function WaitForServerReady {
    param(
        [int]$Timeout = $HealthCheckTimeout
    )
    
    $startTime = Get-Date
    
    while ((Get-Date).Seconds -lt ($startTime.AddSeconds($Timeout)).Seconds) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -Method GET -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "Server is healthy at http://localhost:$Port/health"
                return $true
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Log "Server health check timeout after $Timeout seconds"
    return $false
}

# Graceful shutdown handler
function OnShutdown {
    param([int]$ExitCode = 0)
    
    Write-Log "Shutdown initiated (exit code: $ExitCode)"
    
    if (IsServerRunning) {
        $pid = Get-Content $PidFile
        
        try {
            # First try graceful shutdown via SIGTERM
            $process = Get-Process -Id $pid
            
            # Send signal to child processes if possible
            $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $pid")
            foreach ($child in $children) {
                try {
                    $child.Terminate() | Out-Null
                } catch {}
            }
            
            # Wait for graceful shutdown (max 30s)
            $gracePeriod = 30
            $waited = 0
            while (-not $process.HasExited -and $waited -lt $gracePeriod) {
                Start-Sleep -Seconds 1
                $waited++
            }
            
            # Force kill if still running
            if (-not $process.HasExited) {
                Write-Log "Forcing shutdown after $gracePeriod second grace period"
                $process.Kill() | Out-Null
                Start-Sleep -Seconds 2
            }
            
            Remove-Item $PidFile -ErrorAction SilentlyContinue
            Write-Log "Server stopped gracefully"
        } catch {
            Write-Log "Error during shutdown: $_"
        }
    }
}

# Restart logic with protection against infinite loops
$restartCount = 0
$lastStartTime = $null

# Main execution
switch ($Command) {
    "start" {
        if (IsServerRunning) {
            Write-Log "Server is already running!" -Level "WARNING"
            exit 1
        }
        
        Write-Log "Starting Backend Admin System..."
        
        $env:NODE_ENV = $NodeEnv
        
        $nodeArgs = @(
            "--max-old-space-size=512"
            $MainScript
        )
        
        Write-Log "Starting Node.js with arguments: $nodeArgs"
        
        $startProcess = Start-Process -FilePath "node.exe" `
            -ArgumentList $nodeArgs `
            -WorkingDirectory $DistPath `
            -PassThru `
            -WindowStyle Hidden `
            -RedirectStandardOutput "$LogsPath\node.out" `
            -RedirectStandardError "$LogsPath\node.err"
        
        # Save PID file
        Set-Content -Path $PidFile -Value $startProcess.Id
        
        $lastStartTime = Get-Date
        
        # Wait for server to be ready
        Write-Log "Waiting for server to be ready..."
        
        for ($i = 0; $i -lt 10; $i++) {
            if ((Get-Process -Id $startProcess.Id -ErrorAction SilentlyContinue).HasExited) {
                Write-Log "Node process exited unexpectedly" -Level "ERROR"
                
                if ($restartCount -lt $MaxRestarts) {
                    $restartCount++
                    Write-Log "Restart attempt $restartCount of $MaxRestarts" -Level "WARNING"
                    Start-Sleep -Seconds $RestartDelay
                    break
                } else {
                    Write-Log "Max restart attempts reached. Giving up." -Level "ERROR"
                    exit 1
                }
            }
            
            if (WaitForServerReady -Timeout 6) {
                Write-Log "Server started successfully" -Level "SUCCESS"
                exit 0
            }
            
            Start-Sleep -Seconds 3
        }
        
        Write-Log "Server failed to become ready" -Level "ERROR"
        exit 1
    }
    
    "stop" {
        OnShutdown -ExitCode 0
        exit 0
    }
    
    "restart" {
        OnShutdown -ExitCode 0
        Start-Sleep -Seconds 2
        $Command = "start"
        & $PSCommandPath $Command
    }
    
    "status" {
        if (IsServerRunning) {
            Write-Log "Server is running" -Level "SUCCESS"
            exit 0
        } else {
            Write-Log "Server is not running" -Level "INFO"
            exit 1
        }
    }
    
    default {
        Write-Log "Unknown command: $Command" -Level "ERROR"
        Write-Host "Usage: $MyInvocation.MyCommand.Name {start|stop|restart|status}"
        exit 1
    }
}
