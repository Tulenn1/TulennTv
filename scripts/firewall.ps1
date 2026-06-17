# TulennTv Server — Excepción de Firewall de Windows
# ====================================================
# Abre el puerto 3456 en el Firewall de Windows para permitir
# conexiones desde otros dispositivos en la red local.
#
# Uso: PowerShell (Como Administrador)
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\firewall.ps1

$Port = 3456
$RuleName = "TulennTv Server (TCP $Port)"

# Check if rule already exists
$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[*] La regla '$RuleName' ya existe." -ForegroundColor Yellow
    exit 0
}

# Create firewall rule
New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Permite conexiones al servidor TulennTv desde dispositivos en la red local"

if ($?) {
    Write-Host "  ✓ Regla de firewall creada: Puerto $Port (TCP)" -ForegroundColor Green
    Write-Host "  Ahora otros dispositivos en tu red pueden conectarse."
} else {
    Write-Host "[ERROR] No se pudo crear la regla. Ejecutá PowerShell como Administrador." -ForegroundColor Red
    exit 1
}
