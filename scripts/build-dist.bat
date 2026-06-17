@echo off
REM ===========================================
REM  TulennTv — Preparar distribución portátil
REM ===========================================
echo.
echo  🎬 Empaquetando TulennTv para distribuir...
echo.

if not exist "node_modules" (
    echo  [*] Instalando dependencias...
    call npm install
)

echo  [*] Compilando frontend...
call npm run build

echo  [*] Creando carpeta de distribución...
if exist "dist-tulenntv" rmdir /s /q dist-tulenntv
mkdir dist-tulenntv

echo  [*] Copiando archivos...
mkdir dist-tulenntv\server
xcopy /e /i dist dist-tulenntv\dist >nul
xcopy /e /i server\utils dist-tulenntv\server\utils >nul
xcopy /e /i node_modules\better-sqlite3 dist-tulenntv\node_modules\better-sqlite3 /i >nul

copy server\index.ts dist-tulenntv\ >nul
copy server\database.ts dist-tulenntv\ >nul
copy server\schema.ts dist-tulenntv\ >nul
copy server\scanner.ts dist-tulenntv\ >nul
copy server\parser.ts dist-tulenntv\ >nul
copy server\streamer.ts dist-tulenntv\ >nul
copy server\channels.ts dist-tulenntv\ >nul
copy server\backup.ts dist-tulenntv\ >nul
copy package.json dist-tulenntv\ >nul
copy scripts\start-server.bat dist-tulenntv\ >nul
copy scripts\install-service.ps1 dist-tulenntv\ >nul
copy scripts\firewall.ps1 dist-tulenntv\ >nul

echo.
echo  ✅ Distribución lista en: dist-tulenntv\
echo.
echo  Para instalar en el notebook:
echo    1. Copiá la carpeta dist-tulenntv al notebook
echo    2. Ejecutá npm install dentro de la carpeta
echo       (solo la primera vez, descarga dependencias)
echo    3. Ejecutá start-server.bat para iniciar
echo.
pause
