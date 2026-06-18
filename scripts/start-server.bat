@echo off
REM TulennTv Server — Inicio Manual
REM ===================================
echo.
echo  🎬 TulennTv Server
echo  ==================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js no encontrado. Instalalo desde https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo  [*] Instalando dependencias...
    call npm install
)

REM ─────────────────────────────────────────────
REM IP del servidor en la red WiFi
REM Si el QR no funciona desde el celular,
REM cambia esto por la IP que muestra ipconfig
REM ─────────────────────────────────────────────
set TULENNTV_HOST_IP=192.168.100.83

echo  [*] Iniciando servidor...
echo.
echo  Abri http://localhost:3456 en tu navegador
echo  Celular: escanea el QR en Conectar o usa http://%TULENNTV_HOST_IP%:3456
echo.
start http://localhost:3456
npx tsx server/index.ts

pause
