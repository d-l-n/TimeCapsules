@echo off
setlocal EnableDelayedExpansion
title Time Capsules - Crear Backup ZIP

:: ============================
:: CONFIGURACION
:: ============================

set "SOURCE=D:\Mi Home\Desktop\proyectos\TimeCapsules"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set DATETIME=%%i

set "ZIPNAME=timecapsules_%DATETIME%.zip"
set "DEST=%~dp0%ZIPNAME%"
set "STAGE=%~dp0timecapsules"

echo.
echo ============================================================
echo        Time Capsules - Generador de Backup ZIP
echo ============================================================
echo.
echo Proyecto:
echo   %SOURCE%
echo.
echo Destino:
echo   %DEST%
echo.

:: ============================
:: LIMPIEZA
:: ============================

if exist "%STAGE%" rd /s /q "%STAGE%"
mkdir "%STAGE%"

echo Copiando proyecto...
echo.

robocopy "%SOURCE%" "%STAGE%" /E /R:1 /W:1 ^
/XD ^
.git ^
.github ^
.vscode ^
.idea ^
.agents ^
.claude ^
.impeccable ^
.opencode ^
.qwen ^
node_modules ^
dist ^
coverage ^
playwright-report ^
test-results ^
.wrangler ^
.cache ^
.vite ^
imdb_data ^
.specify ^
.auth ^
data ^
screenshots ^
temp ^
tmp ^
/XF ^
.env ^
.env.e2e ^
*.local ^
service-account.json ^
*.log ^
*.tmp ^
*.bak ^
*.pem ^
*.key ^
*.cert ^
Thumbs.db ^
Desktop.ini ^
*.zip ^
skills-lock.json ^
Backup.cmd ^
nul ^
>nul

echo Eliminando archivos temporales...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem '%STAGE%' -Recurse -Force | Where-Object { $_.Name -match '^\.env' -or $_.Name -eq 'desktop.ini' -or $_.Name -eq 'thumbs.db' -or $_.Extension -in '.log','.tmp','.bak' } | Remove-Item -Force -ErrorAction SilentlyContinue; if (Test-Path '%STAGE%\gdpr-data from admin') { Remove-Item -Recurse -Force '%STAGE%\gdpr-data from admin' }"

echo.
echo Comprimiendo...

if exist "%DEST%" del "%DEST%"

powershell -NoProfile -ExecutionPolicy Bypass ^
"Compress-Archive -Path '%STAGE%\*' -DestinationPath '%DEST%' -CompressionLevel Optimal -Force"

if not exist "%DEST%" (
    echo.
    echo ERROR: No se pudo crear el ZIP.
    rd /s /q "%STAGE%"
    pause
    exit /b 1
)

for %%F in ("%DEST%") do set SIZE=%%~zF

set /a MB=%SIZE%/1024/1024

rd /s /q "%STAGE%"

echo.
echo ============================================================
echo                    PROCESO FINALIZADO
echo ============================================================
echo.
echo Archivo:
echo   %ZIPNAME%
echo.
echo Tamano aproximado:
echo   %MB% MB
echo.
echo Ubicacion:
echo   %DEST%
echo.
echo Backup listo. Envia el ZIP a tu celular para analizarlo con IA.
echo ============================================================
echo.

pause
