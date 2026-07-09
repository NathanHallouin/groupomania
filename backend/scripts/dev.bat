@echo off
REM Script de développement pour Windows - Groupomania Backend
REM Wrapper pour dev.sh

setlocal enabledelayedexpansion

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="-h" goto :help
if "%1"=="--help" goto :help

set COMMAND=%1
set SERVICE=%2

REM Créer le dossier .pid s'il n'existe pas
if not exist .pid mkdir .pid

REM Vérifier si WSL est disponible
wsl --version >nul 2>&1
if %errorlevel% equ 0 (
    wsl bash ./dev.sh %*
    goto :end
)

REM Vérifier si Git Bash est disponible
where bash >nul 2>&1
if %errorlevel% equ 0 (
    bash ./dev.sh %*
    goto :end
)

REM Version native PowerShell (simplifiée)
echo Groupomania Backend Dev Tools (Windows)
echo ======================================
echo.

if "%COMMAND%"=="start" goto :start
if "%COMMAND%"=="stop" goto :stop
if "%COMMAND%"=="status" goto :status
if "%COMMAND%"=="build" goto :build
if "%COMMAND%"=="test" goto :test
if "%COMMAND%"=="lint" goto :lint
if "%COMMAND%"=="clean" goto :clean

echo Commande non supportée en mode natif: %COMMAND%
echo Utilisez WSL ou Git Bash pour toutes les fonctionnalités
goto :help

:start
if "%SERVICE%"=="" (
    echo Erreur: Veuillez spécifier un service
    goto :help
)
echo Démarrage du service: %SERVICE%
if not exist "microservices\%SERVICE%" (
    echo Erreur: Service %SERVICE% non trouvé
    goto :end
)
pushd microservices\%SERVICE%
start "Groupomania %SERVICE%" cmd /k "npm run dev"
popd
echo Service %SERVICE% démarré dans une nouvelle fenêtre
goto :end

:stop
echo Fonctionnalité 'stop' nécessite WSL ou Git Bash
goto :end

:status
echo Vérification du statut des services...
for /d %%d in (microservices\*) do (
    echo Vérification de %%d...
    if exist "%%d\dist" (
        echo   ✓ %%d - Compilé
    ) else (
        echo   ✗ %%d - Non compilé
    )
)
goto :end

:build
if "%SERVICE%"=="all" set SERVICE=
if "%SERVICE%"=="" (
    echo Compilation de tous les services...
    for /d %%d in (microservices\*) do (
        if exist "%%d\tsconfig.json" (
            echo Compilation de %%d...
            pushd %%d
            call npm run build
            popd
        )
    )
) else (
    if exist "microservices\%SERVICE%" (
        echo Compilation de %SERVICE%...
        pushd microservices\%SERVICE%
        call npm run build
        popd
    ) else (
        echo Erreur: Service %SERVICE% non trouvé
    )
)
goto :end

:test
if "%SERVICE%"=="all" set SERVICE=
if "%SERVICE%"=="" (
    echo Tests pour tous les services...
    for /d %%d in (microservices\*) do (
        if exist "%%d\package.json" (
            echo Tests pour %%d...
            pushd %%d
            call npm test
            popd
        )
    )
) else (
    if exist "microservices\%SERVICE%" (
        echo Tests pour %SERVICE%...
        pushd microservices\%SERVICE%
        call npm test
        popd
    ) else (
        echo Erreur: Service %SERVICE% non trouvé
    )
)
goto :end

:lint
if "%SERVICE%"=="all" set SERVICE=
if "%SERVICE%"=="" (
    echo Linting pour tous les services...
    for /d %%d in (microservices\*) do (
        if exist "%%d\package.json" (
            echo Linting pour %%d...
            pushd %%d
            call npm run lint
            popd
        )
    )
) else (
    if exist "microservices\%SERVICE%" (
        echo Linting pour %SERVICE%...
        pushd microservices\%SERVICE%
        call npm run lint
        popd
    ) else (
        echo Erreur: Service %SERVICE% non trouvé
    )
)
goto :end

:clean
echo Nettoyage des fichiers temporaires...
for /d %%d in (microservices\*) do (
    if exist "%%d\dist" (
        rmdir /s /q "%%d\dist"
        echo ✓ Dossier dist nettoyé pour %%d
    )
)
if exist .pid (
    del /q .pid\*.pid 2>nul
    echo ✓ Fichiers PID nettoyés
)
echo Nettoyage terminé
goto :end

:help
echo.
echo 🛠️  Script de développement Groupomania Backend (Windows)
echo ==========================================================
echo.
echo Usage: %0 ^<commande^> [service]
echo.
echo Commandes disponibles:
echo   start ^<service^>     - Démarrer un service
echo   stop ^<service^>      - Arrêter un service (WSL/Git Bash requis)
echo   status              - Statut de tous les services
echo   test [service]      - Exécuter les tests (all par défaut)
echo   lint [service]      - Exécuter le linting (all par défaut)
echo   build [service]     - Compiler un service (all par défaut)
echo   clean               - Nettoyer les fichiers temporaires
echo.
echo Services disponibles: auth-service user-service message-service file-service
echo.
echo Exemples:
echo   %0 start auth-service
echo   %0 test all
echo   %0 build user-service
echo.
echo Note: Pour toutes les fonctionnalités, installez WSL ou Git Bash
echo.

:end
