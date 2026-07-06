# Inventory System — Windows 11 one-time setup script
# Run this in PowerShell as Administrator
#
# This installs Docker Desktop (WSL2 backend), Git for Windows,
# clones the repo, and starts the system. After setup, the system
# auto-starts on boot and syncs with other laptops on the LAN.

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/ShadowRahlM/inventory-system.git"
$RepoDir = "$env:USERPROFILE\inventory-system"

Write-Host "=== Inventory System Setup ===" -ForegroundColor Cyan
Write-Host "This script will install required software and start the system."
Write-Host ""

# ── 1. Install WSL2 if missing ──
$wsl = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wsl) {
    Write-Host "[1/6] Installing WSL2..." -ForegroundColor Yellow
    wsl --install -d Ubuntu
    Write-Host "  WSL2 installed. You may need to reboot after setup completes."
} else {
    Write-Host "[1/6] WSL2 already installed" -ForegroundColor Green
}

# ── 2. Install Docker Desktop ──
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "[2/6] Installing Docker Desktop..." -ForegroundColor Yellow
    $installer = "$env:TEMP\DockerDesktop.exe"
    Write-Host "  Downloading Docker Desktop..."
    Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $installer
    Write-Host "  Running installer (this may take a few minutes)..."
    Start-Process -Wait -FilePath $installer -ArgumentList "install", "--quiet" -NoNewWindow
    Write-Host "  Docker Desktop installed."
    Write-Host "  NOTE: You may need to log out and back in for Docker to start."
    Write-Host "  After login, Docker will start automatically and show a whale icon in the system tray."
    Write-Host "  Waiting 30 seconds for Docker to initialize..."
    Start-Sleep -Seconds 30
} else {
    Write-Host "[2/6] Docker Desktop already installed" -ForegroundColor Green
}

# ── 3. Enable Docker Desktop to start on boot ──
Write-Host "[3/6] Enabling Docker Desktop auto-start..." -ForegroundColor Yellow
$startup = [Environment]::GetFolderPath("Startup")
$shortcut = Join-Path $startup "Docker Desktop.lnk"
if (-not (Test-Path $shortcut)) {
    $wshell = New-Object -ComObject WScript.Shell
    $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerPath)) {
        $dockerPath = "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    }
    $s = $wshell.CreateShortcut($shortcut)
    $s.TargetPath = $dockerPath
    $s.Save()
    Write-Host "  Added Docker Desktop to Windows startup."
} else {
    Write-Host "  Docker Desktop already in Windows startup."
}
Write-Host "  (Containers will also restart automatically via restart: unless-stopped)"

# ── 4. Install Git for Windows ──
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "[4/6] Installing Git for Windows..." -ForegroundColor Yellow
    try {
        winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
        # Refresh PATH so git is available in this session
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        Write-Host "  Git installed."
    } catch {
        Write-Host "  winget failed, trying direct download..." -ForegroundColor Yellow
        $gitInstaller = "$env:TEMP\GitInstaller.exe"
        Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.48.1.windows.1/Git-2.48.1-64-bit.exe" -OutFile $gitInstaller
        Start-Process -Wait -FilePath $gitInstaller -ArgumentList "/VERYSILENT", "/NORESTART" -NoNewWindow
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    }
} else {
    Write-Host "[4/6] Git for Windows already installed" -ForegroundColor Green
}

# ── 5. Clone or update repository ──
Write-Host "[5/6] Setting up repository..." -ForegroundColor Yellow
if (-not (Test-Path $RepoDir)) {
    git clone $RepoUrl $RepoDir
    Write-Host "  Repository cloned to $RepoDir"
} else {
    Set-Location $RepoDir
    git pull
    Write-Host "  Repository updated."
}
Set-Location $RepoDir

# ── 6. Build and start containers ──
Write-Host "[6/6] Building and starting Docker containers..." -ForegroundColor Yellow
Write-Host "  (This builds the backend and frontend images — may take 5-10 minutes on first run)"
docker compose up -d --build

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open http://localhost in your browser to use the system." -ForegroundColor White
Write-Host ""
Write-Host "  Default logins:" -ForegroundColor White
Write-Host "    admin / admin123     (full access)" -ForegroundColor Gray
Write-Host "    manager / manager123 (operations)" -ForegroundColor Gray
Write-Host "    viewer / viewer123   (read-only)" -ForegroundColor Gray
Write-Host ""
Write-Host "  After a reboot, the system starts automatically." -ForegroundColor Green
Write-Host "  If Docker Desktop asks for login, just close the window — it works without one."
Write-Host ""
Write-Host "  NEXT STEP for multi-laptop sync:" -ForegroundColor Yellow
Write-Host "  ---------------------------------" -ForegroundColor Yellow
Write-Host "  1. Find this laptop's IP:    ipconfig | findstr IPv4" -ForegroundColor Gray
Write-Host "  2. On OTHER laptops, edit:   $RepoDir\.env" -ForegroundColor Gray
Write-Host "  3. Set:                      SYNC_PEERS=http://THIS_LAPTOP_IP" -ForegroundColor Gray
Write-Host "  4. Restart:                  docker compose up -d" -ForegroundColor Gray
Write-Host "  See README.md → 'Multi-Laptop Sync' for details." -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
