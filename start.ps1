<#
.SYNOPSIS
  One-click launcher for Inventory System (no Docker required).
  Installs prerequisites, sets up DB, and runs backend + frontend.
#>

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Inventory System Launcher (no Docker) ===" -ForegroundColor Cyan
Write-Host ""

# ---- Check prerequisites ----
function Check-Command($cmd, $name) {
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $name..." -ForegroundColor Yellow
        return $false
    }
    return $true
}

# ---- Python ----
if (!(Check-Command python "Python")) {
    Write-Host "Downloading Python 3.13..." -ForegroundColor Yellow
    $url = "https://www.python.org/ftp/python/3.13.2/python-3.13.2-amd64.exe"
    $installer = "$env:TEMP\python-installer.exe"
    Invoke-WebRequest -Uri $url -OutFile $installer
    Start-Process $installer -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
    refreshenv
}

# ---- Node.js ----
if (!(Check-Command node "Node.js")) {
    Write-Host "Downloading Node.js..." -ForegroundColor Yellow
    $url = "https://nodejs.org/dist/v24.9.0/node-v24.9.0-x64.msi"
    $installer = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri $url -OutFile $installer
    Start-Process msiexec -ArgumentList "/i $installer /quiet" -Wait
    refreshenv
}

# ---- PostgreSQL (via Chocolatey) ----
if (!(Get-Service postgresql* -ErrorAction SilentlyContinue)) {
    if (!(Check-Command choco "Chocolatey")) {
        Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    Write-Host "Installing PostgreSQL..." -ForegroundColor Yellow
    choco install postgresql16 --params "/Password:postgres" -y
    $env:Path += ";$env:ProgramFiles\PostgreSQL\16\bin"
}

# ---- Redis (via Memurai for Windows) ----
if (!(Get-Service Memurai* -ErrorAction SilentlyContinue) -and !(Get-Service redis* -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Memurai (Redis for Windows)..." -ForegroundColor Yellow
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install memurai -y
    } else {
        Write-Host "WARNING: Redis not available. Install manually from https://www.memurai.com/"
    }
}

# ---- Backend setup ----
Write-Host ""
Write-Host ">>> Setting up backend..." -ForegroundColor Green
Push-Location "$RootDir\backend"

$venvPath = "venv"
if (!(Test-Path $venvPath)) {
    python -m venv $venvPath
}
$activate = "$venvPath\Scripts\Activate.ps1"
. $activate

pip install -r requirements.txt -q

# Create .env if missing
if (!(Test-Path .env)) {
    @"
DB_PASSWORD=postgres
DB_HOST=localhost
"@ | Out-File -Encoding UTF8 .env
}

python manage.py migrate
python manage.py collectstatic --noinput

# Create default superuser if not exists
$userCheck = & python -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.filter(username='manager').exists())"
if ($userCheck -eq "False") {
    python manage.py shell -c "
from django.contrib.auth import get_user_model; from django.contrib.auth.models import Group
User = get_user_model()
user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
user.save()
manager = User.objects.create_user('manager', 'manager@example.com', 'manager123')
g, _ = Group.objects.get_or_create(name='inventory_managers')
manager.groups.add(g)
print('Default users created: admin/admin123, manager/manager123')
"
}

Write-Host "Starting backend on port 8000..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($dir, $activate)
    cd $dir
    . $activate
    python manage.py runserver 0.0.0.0:8000
} -ArgumentList $pwd, $activate

Pop-Location

# ---- Frontend setup ----
Write-Host ""
Write-Host ">>> Setting up frontend..." -ForegroundColor Green
Push-Location "$RootDir\frontend"

npm install --silent
Write-Host "Starting frontend on port 5173..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    cd $dir
    npm run dev
} -ArgumentList $pwd

Pop-Location

# ---- Done ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000/api/" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Admin:    http://localhost:8000/admin/" -ForegroundColor Green
Write-Host ""
Write-Host "  Login:    manager / manager123" -ForegroundColor White
Write-Host "  Admin:    admin   / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers."

# Wait for user interrupt
try {
    while ($true) { Start-Sleep 10 }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -Force
    Stop-Job $frontendJob -Force
    Remove-Job $backendJob -Force
    Remove-Job $frontendJob -Force
    Write-Host "Done." -ForegroundColor Green
}
