# TulennTv Server — Instalación como Servicio de Windows
# ========================================================
# Crea una tarea programada que inicia el servidor automáticamente
# al iniciar sesión en Windows.
#
# Uso: PowerShell (Como Administrador)
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\install-service.ps1

$TaskName = "TulennTvServer"
$ProjectDir = (Get-Location).Path
$NodePath = (Get-Command node).Source

if (-not $NodePath) {
    Write-Host "[ERROR] Node.js no encontrado. Instalalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "$ProjectDir\node_modules")) {
    Write-Host "[*] Instalando dependencias..." -ForegroundColor Yellow
    & "npm" "install"
}

# Check if task already exists
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[*] La tarea '$TaskName' ya existe. Actualizando..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the scheduled task
$Action = New-ScheduledTaskAction -Execute "$ProjectDir\node_modules\.bin\tsx.cmd" `
    -Argument "server/index.ts" `
    -WorkingDirectory $ProjectDir

$Trigger = New-ScheduledTaskTrigger -AtLogOn -RandomDelay (New-TimeSpan -Seconds 30)

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U `
    -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "TulennTv - Servidor de streaming multimedia casero" `
    -Force

if ($?) {
    Write-Host ""
    Write-Host "  ✓ Tarea '$TaskName' instalada correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "  El servidor se iniciará automáticamente al iniciar sesión."
    Write-Host "  Accede desde cualquier dispositivo en:"
    Write-Host ""
    Write-Host "  Para desinstalar:" -ForegroundColor Yellow
    Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] No se pudo crear la tarea. Ejecutá PowerShell como Administrador." -ForegroundColor Red
    exit 1
}
