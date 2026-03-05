@echo off
echo ╔══════════════════════════════════════════╗
echo ║     NexusHub — Actualizador              ║
echo ╚══════════════════════════════════════════╝
echo.

REM Detener servidor si está corriendo
echo [1/4] Parando servidor...
taskkill /f /im node.exe >nul 2>&1

REM Ir a la carpeta del proyecto (ajusta esta ruta si es diferente)
cd /d "%~dp0"

echo [2/4] Instalando dependencias de Supabase...
cd apps\hub
call npm install @supabase/supabase-js
cd ..\..

echo [3/4] Limpiando caché de Vite...
if exist "apps\hub\node_modules\.vite" rmdir /s /q "apps\hub\node_modules\.vite"
if exist "apps\market\node_modules\.vite" rmdir /s /q "apps\market\node_modules\.vite"
if exist "apps\bet\node_modules\.vite" rmdir /s /q "apps\bet\node_modules\.vite"

echo [4/4] Listo. Arrancando...
echo.
call npm run dev

pause
