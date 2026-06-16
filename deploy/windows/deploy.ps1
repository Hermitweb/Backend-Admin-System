param(
    [string]$Action = "deploy",
    [string]$Port = "3000",
    [string]$NodeVersion = "20"
)

$ErrorActionPreference = "Stop"
$LogFile = "C:\Logs\backend-admin-deploy.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    Write-Host $LogMessage
}

function Check-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Log "Node.js not found. Installing Node.js $NodeVersion..." "WARNING"
        winget install OpenJS.NodeJS.LTS --version $NodeVersion --accept-source-agreements --accept-package-agreements
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Log "npm not found. Please install Node.js first." "ERROR"
        return $false
    }
    
    $NodeVersionInstalled = (node --version)
    Write-Log "Node.js version: $NodeVersionInstalled"
    
    if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
        Write-Log "NSSM not found. Downloading NSSM..." "INFO"
        $NssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $NssmPath = "C:\tools\nssm"
        if (-not (Test-Path $NssmPath)) {
            New-Item -ItemType Directory -Path $NssmPath -Force
            Invoke-WebRequest -Uri $NssmUrl -OutFile "$NssmPath\nssm.zip"
            Expand-Archive -Path "$NssmPath\nssm.zip" -DestinationPath $NssmPath
            Copy-Item "$NssmPath\nssm-2.24\win64\nssm.exe" "$NssmPath\nssm.exe"
            $env:Path += ";$NssmPath"
        }
    }
    
    return $true
}

function Build-Project {
    Write-Log "Building backend-admin system..." "INFO"
    
    $ProjectPath = $PSScriptRoot\..
    Set-Location $ProjectPath
    
    Write-Log "Installing backend dependencies..."
    npm ci --production
    
    Write-Log "Building backend..."
    npm run build
    
    Set-Location "$ProjectPath\frontend"
    Write-Log "Installing frontend dependencies..."
    npm ci
    
    Write-Log "Building frontend..."
    npm run build
    
    Set-Location $ProjectPath
    Write-Log "Build completed successfully!" "SUCCESS"
}

function Install-WindowsService {
    param([string]$ServiceName = "BackendAdmin")
    
    Write-Log "Installing Windows service: $ServiceName..." "INFO"
    
    $ProjectPath = $PSScriptRoot\..
    $NodePath = (Get-Command node).Source
    $MainPath = "$ProjectPath\dist\main.js"
    $LogPath = "$ProjectPath\logs"
    
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force
    }
    
    $NssmPath = "C:\tools\nssm\nssm.exe"
    
    & $NssmPath install $ServiceName $NodePath $MainPath
    
    & $NssmPath set $ServiceName DisplayName "Backend Admin System"
    & $NssmPath set $ServiceName Description "Backend Admin Management System - NestJS + React"
    & $NssmPath set $ServiceName Start SERVICE_AUTO_START
    & $NssmPath set $ServiceName AppDirectory $ProjectPath
    & $NssmPath set $ServiceName AppParameters $MainPath
    & $NssmPath set $ServiceName AppRotateFiles 1
    & $NssmPath set $ServiceName AppRotateBytes 10485760
    & $NssmPath set $ServiceName AppStdout "$LogPath\service-stdout.log"
    & $NssmPath set $ServiceName AppStderr "$LogPath\service-stderr.log"
    & $NssmPath set $ServiceName AppStdoutCreationDisposition 4
    & $NssmPath set $ServiceName AppStderrCreationDisposition 4
    & $NssmPath set $ServiceName AppTimestampLog 1
    & $NssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port"
    
    Write-Log "Service installed successfully!" "SUCCESS"
}

function Configure-IIS {
    Write-Log "Configuring IIS..." "INFO"
    
    $FrontendPath = "$PSScriptRoot\..\frontend\dist"
    $BackendPort = $Port
    
    $WebConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:$BackendPort/api/{R:1}" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
    <handlers>
      <add name="WebDAV" path="*" verb="PROPFIND,PROPPATCH,MKCOL,DELETE,COPY,MOVE" 
           modules="WebDAVModule" resourceType="Unspecified" />
    </handlers>
  </system.webServer>
</configuration>
"@
    
    $WebConfig | Out-File -FilePath "$FrontendPath\web.config" -Encoding UTF8
    
    Write-Log "IIS configuration created at $FrontendPath\web.config" "SUCCESS"
    Write-Log "Important: Install URL Rewrite Module on IIS for API proxy rules to work" "WARNING"
}

function Start-Service {
    param([string]$ServiceName = "BackendAdmin")
    
    Write-Log "Starting service: $ServiceName..." "INFO"
    
    $NssmPath = "C:\tools\nssm\nssm.exe"
    
    $Status = & $NssmPath status $ServiceName
    
    if ($Status -match "SERVICE_STOPPED") {
        & $NssmPath start $ServiceName
        Write-Log "Service started successfully!" "SUCCESS"
    } elseif ($Status -match "SERVICE_RUNNING") {
        Write-Log "Service is already running." "INFO"
    } else {
        Write-Log "Unexpected service status: $Status" "WARNING"
    }
}

function Stop-Service {
    param([string]$ServiceName = "BackendAdmin")
    
    Write-Log "Stopping service: $ServiceName..." "INFO"
    
    $NssmPath = "C:\tools\nssm\nssm.exe"
    
    $Status = & $NssmPath status $ServiceName
    
    if ($Status -match "SERVICE_RUNNING") {
        & $NssmPath stop $ServiceName
        Write-Log "Service stopped successfully!" "SUCCESS"
    } else {
        Write-Log "Service is not running." "INFO"
    }
}

function Remove-Service {
    param([string]$ServiceName = "BackendAdmin")
    
    Write-Log "Removing service: $ServiceName..." "WARNING"
    
    $NssmPath = "C:\tools\nssm\nssm.exe"
    
    & $NssmPath stop $ServiceName
    & $NssmPath remove $ServiceName confirm
    
    Write-Log "Service removed successfully!" "SUCCESS"
}

function Full-Deploy {
    Write-Log "Starting full deployment..." "INFO"
    
    if (-not (Check-Prerequisites)) {
        Write-Log "Prerequisites check failed." "ERROR"
        exit 1
    }
    
    Build-Project
    Install-WindowsService
    Configure-IIS
    Start-Service
    
    Write-Log "============================================" "SUCCESS"
    Write-Log "Deployment completed successfully!" "SUCCESS"
    Write-Log "Backend service running on port: $Port" "SUCCESS"
    Write-Log "Frontend served from IIS or directly: http://localhost" "SUCCESS"
    Write-Log "============================================" "SUCCESS"
}

switch ($Action) {
    "deploy" { Full-Deploy }
    "build" { Build-Project }
    "install" { Install-WindowsService }
    "configure-iis" { Configure-IIS }
    "start" { Start-Service }
    "stop" { Stop-Service }
    "restart" { 
        Stop-Service
        Start-Service
    }
    "remove" { Remove-Service }
    default { 
        Write-Host "Usage: .\deploy.ps1 -Action [deploy|build|install|configure-iis|start|stop|restart|remove]"
        Write-Host ""
        Write-Host "Actions:"
        Write-Host "  deploy         - Full deployment (build + install + configure + start)"
        Write-Host "  build          - Build the project only"
        Write-Host "  install        - Install as Windows service"
        Write-Host "  configure-iis  - Generate IIS configuration"
        Write-Host "  start          - Start the service"
        Write-Host "  stop           - Stop the service"
        Write-Host "  restart        - Restart the service"
        Write-Host "  remove         - Remove the service"
    }
}
