@echo off
REM Script de setup pour Windows - Groupomania Backend
REM Wrapper pour setup.sh

setlocal enabledelayedexpansion

echo ================================
echo Groupomania Backend Setup (Windows)
echo ================================
echo.

REM Vérifier si WSL est disponible
wsl --version >nul 2>&1
if %errorlevel% equ 0 (
    echo WSL détecté, exécution via WSL...
    wsl bash ./setup.sh %*
    goto :end
)

REM Vérifier si Git Bash est disponible
where bash >nul 2>&1
if %errorlevel% equ 0 (
    echo Git Bash détecté, exécution via Git Bash...
    bash ./setup.sh %*
    goto :end
)

REM Version native PowerShell (simplifiée)
echo Exécution en mode PowerShell natif...
echo.

REM Vérifier Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installé
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js installé
node --version

REM Vérifier npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: npm n'est pas disponible
    pause
    exit /b 1
)

echo ✓ npm disponible
npm --version

REM Installation des dépendances
echo.
echo Installation des dépendances...
call npm install
if %errorlevel% neq 0 (
    echo ERREUR: Échec de l'installation des dépendances principales
    pause
    exit /b 1
)

REM Installation pour chaque microservice
for /d %%d in (microservices\*) do (
    if exist "%%d\package.json" (
        echo Installation des dépendances pour %%d...
        pushd %%d
        call npm install
        if !errorlevel! neq 0 (
            echo ERREUR: Échec pour %%d
            popd
            pause
            exit /b 1
        )
        popd
    )
)

REM Copier les fichiers d'environnement
echo.
echo Configuration des fichiers d'environnement...
if exist .env.example (
    if not exist .env (
        copy .env.example .env
        echo ✓ Fichier .env créé
    ) else (
        echo ✓ Fichier .env existe déjà
    )
)

for /d %%d in (microservices\*) do (
    if exist "%%d\.env.example" (
        if not exist "%%d\.env" (
            copy "%%d\.env.example" "%%d\.env"
            echo ✓ Fichier .env créé pour %%d
        )
    )
)

REM Compilation TypeScript
echo.
echo Compilation des services TypeScript...
for /d %%d in (microservices\*) do (
    if exist "%%d\tsconfig.json" (
        echo Compilation de %%d...
        pushd %%d
        call npm run build
        popd
    )
)

echo.
echo ✓ Setup terminé avec succès!
echo.
echo Prochaines étapes:
echo 1. Configurez vos bases de données PostgreSQL
echo 2. Configurez Redis
echo 3. Modifiez les fichiers .env avec vos configurations
echo 4. Utilisez 'dev.bat' pour démarrer les services
echo.

:end
pause
