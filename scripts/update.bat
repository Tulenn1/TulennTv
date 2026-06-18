@echo off
title TulennTv — Actualizar
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    🎬 TulennTv — Actualización      ║
echo  ╚══════════════════════════════════════╝
echo.

:: Verificar que estamos en la carpeta correcta
if not exist "package.json" (
    echo  [ERROR] No se encuentra package.json
    echo  Ejecutá este script desde la carpeta de TulennTv
    pause
    exit /b 1
)

:: 1. Guardar cambios locales pendientes
echo  [1/4] Guardando cambios locales...
git stash push -m "auto-stash before update" 2>nul
echo  ✓

:: 2. Descargar última versión
echo  [2/4] Descargando actualizaciones...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] No se pudo actualizar. Verificá tu conexión.
    pause
    exit /b 1
)
echo  ✓

:: 3. Instalar dependencias nuevas
echo  [3/4] Instalando dependencias...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Falló la instalación de dependencias.
    pause
    exit /b 1
)
echo  ✓

:: 4. Compilar frontend
echo  [4/4] Compilando frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Falló la compilación.
    pause
    exit /b 1
)
echo  ✓

:: Mostrar últimos cambios
echo.
echo  ============================================
echo  Últimos cambios instalados:
git log --oneline -5
echo  ============================================

echo.
echo  ✅ TulennTv actualizado correctamente.
echo.
echo  Si el servidor estaba corriendo, reinicialo con:
echo     npm start
echo     o hacé doble clic en scripts\start-server.bat
echo.
pause
