# MonetraPOS - Start All Services
# Run: powershell -ExecutionPolicy Bypass -File start-all.ps1

Write-Host "🚀 Starting MonetraPOS Services..." -ForegroundColor Green
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Stop existing PM2 processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
pm2 delete monetrapos-company-admin 2>$null | Out-Null
pm2 delete monetrapos-member-admin 2>$null | Out-Null

# Start PM2 frontend apps
Write-Host "Starting Company Admin & Member Admin (PM2)..." -ForegroundColor Yellow
pm2 start "$root\ecosystem.config.js" --only monetrapos-company-admin,monetrapos-member-admin

# Start API (background)
Write-Host "Starting API Server..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "dist/src/main.js" -WorkingDirectory "$root\apps\api" -WindowStyle Hidden

Start-Sleep -Seconds 10

# Test all services
Write-Host ""
Write-Host "=== SERVICE STATUS ===" -ForegroundColor Green

$services = @(
  @{ name = "API (4404)"; url = "http://localhost:4404/api/v1/health/simple" },
  @{ name = "Company Admin (4402)"; url = "http://localhost:4402" },
  @{ name = "Member Admin (4403)"; url = "http://localhost:4403" }
)

foreach ($svc in $services) {
  try {
    $r = Invoke-WebRequest -Uri $svc.url -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ $($svc.name): Running" -ForegroundColor Green
  } catch {
    Write-Host "❌ $($svc.name): Not responding" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   API:           http://151.242.116.114:4404"
Write-Host "   Company Admin: http://151.242.116.114:4402"
Write-Host "   Member Admin:  http://151.242.116.114:4403"
Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
