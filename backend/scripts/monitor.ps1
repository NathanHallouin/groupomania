# Script de monitoring PowerShell pour Groupomania Backend
# Version Windows native

param(
    [Parameter(Position=0)]
    [string]$Command = "check",
    
    [Parameter(Position=1)]
    [int]$Interval = 60
)

# Configuration
$Services = @(
    @{Name="auth-service"; Port=3001; Endpoint="/health"},
    @{Name="user-service"; Port=3002; Endpoint="/health"},
    @{Name="message-service"; Port=3003; Endpoint="/health"},
    @{Name="file-service"; Port=3004; Endpoint="/health"}
)

$LogFile = "logs\monitoring.log"

# Fonctions utilitaires
function Write-Log {
    param($Message, $Level = "INFO")
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    switch ($Level) {
        "INFO" { Write-Host $LogMessage -ForegroundColor Blue }
        "SUCCESS" { Write-Host $LogMessage -ForegroundColor Green }
        "WARNING" { Write-Host $LogMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $LogMessage -ForegroundColor Red }
    }
    
    # Créer le dossier logs s'il n'existe pas
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    Add-Content -Path $LogFile -Value $LogMessage
}

function Test-ServiceHealth {
    param($Service)
    
    $Url = "http://localhost:$($Service.Port)$($Service.Endpoint)"
    $StartTime = Get-Date
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        $EndTime = Get-Date
        $ResponseTime = ($EndTime - $StartTime).TotalMilliseconds
        
        if ($Response.StatusCode -eq 200) {
            Write-Log "Service $($Service.Name) OK ($([int]$ResponseTime)ms)" "SUCCESS"
            return $true
        } else {
            Write-Log "Service $($Service.Name) retourne le statut $($Response.StatusCode)" "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Service $($Service.Name) inaccessible ($Url)" "ERROR"
        return $false
    }
}

function Test-DatabaseHealth {
    param($DatabaseName)
    
    try {
        # Test simple de connexion PostgreSQL via psql (si disponible)
        $psqlExists = Get-Command psql -ErrorAction SilentlyContinue
        if ($psqlExists) {
            $result = & psql -d $DatabaseName -c "SELECT 1;" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Base de données $DatabaseName OK" "SUCCESS"
                return $true
            }
        }
        
        Write-Log "Base de données $DatabaseName inaccessible ou psql non disponible" "WARNING"
        return $false
    }
    catch {
        Write-Log "Erreur lors du test de la base de données $DatabaseName" "ERROR"
        return $false
    }
}

function Test-RedisHealth {
    try {
        # Test Redis via redis-cli (si disponible)
        $redisExists = Get-Command redis-cli -ErrorAction SilentlyContinue
        if ($redisExists) {
            $result = & redis-cli ping 2>$null
            if ($result -eq "PONG") {
                Write-Log "Redis OK" "SUCCESS"
                return $true
            }
        }
        
        Write-Log "Redis inaccessible ou redis-cli non disponible" "WARNING"
        return $false
    }
    catch {
        Write-Log "Erreur lors du test Redis" "ERROR"
        return $false
    }
}

function Get-SystemResources {
    try {
        # CPU
        $cpu = Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $cpuUsage = [int]$cpu.Average
        
        # Mémoire
        $totalMemory = (Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory
        $availableMemory = (Get-WmiObject Win32_OperatingSystem).AvailablePhysicalMemory
        $usedMemory = $totalMemory - $availableMemory
        $memoryPercent = [int](($usedMemory / $totalMemory) * 100)
        
        # Disque (disque C:)
        $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskPercent = [int]((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100)
        
        Write-Log "Ressources - CPU: $cpuUsage%, Mémoire: $memoryPercent%, Disque C: $diskPercent%" "INFO"
        
        # Alertes
        if ($cpuUsage -gt 80) {
            Write-Log "Utilisation CPU élevée: $cpuUsage%" "WARNING"
        }
        if ($memoryPercent -gt 80) {
            Write-Log "Utilisation mémoire élevée: $memoryPercent%" "WARNING"
        }
        if ($diskPercent -gt 85) {
            Write-Log "Utilisation disque élevée: $diskPercent%" "ERROR"
        }
        
        return @{
            CPU = $cpuUsage
            Memory = $memoryPercent
            Disk = $diskPercent
        }
    }
    catch {
        Write-Log "Erreur lors de la récupération des ressources système" "ERROR"
        return $null
    }
}

function Test-LogsForErrors {
    $LogDir = "logs"
    $ErrorPatterns = @("ERROR", "FATAL", "Exception", "failed", "timeout")
    $RecentErrors = 0
    
    if (Test-Path $LogDir) {
        $RecentFiles = Get-ChildItem -Path $LogDir -Filter "*.log" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) }
        
        foreach ($file in $RecentFiles) {
            foreach ($pattern in $ErrorPatterns) {
                $matches = Select-String -Path $file.FullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
                $RecentErrors += $matches.Count
            }
        }
        
        if ($RecentErrors -gt 10) {
            Write-Log "Nombre élevé d'erreurs récentes dans les logs: $RecentErrors" "WARNING"
        } elseif ($RecentErrors -gt 0) {
            Write-Log "$RecentErrors erreurs détectées dans les logs récents" "INFO"
        }
    }
}

function New-HealthReport {
    $ReportFile = "logs\health_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    
    Write-Log "Génération du rapport de santé: $ReportFile" "INFO"
    
    $Report = @{
        timestamp = $Timestamp
        services = @()
    }
    
    foreach ($service in $Services) {
        $url = "http://localhost:$($service.Port)$($service.Endpoint)"
        $status = "unknown"
        $responseTime = 0
        
        try {
            $startTime = Get-Date
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
            $endTime = Get-Date
            $responseTime = [int]($endTime - $startTime).TotalMilliseconds
            
            if ($response.StatusCode -eq 200) {
                $status = "healthy"
            } else {
                $status = "unhealthy"
            }
        }
        catch {
            $status = "unhealthy"
        }
        
        $Report.services += @{
            name = $service.Name
            status = $status
            response_time_ms = $responseTime
            url = $url
        }
    }
    
    $Report | ConvertTo-Json -Depth 3 | Out-File -FilePath $ReportFile -Encoding UTF8
    Write-Log "Rapport de santé généré: $ReportFile" "SUCCESS"
}

function Start-ContinuousMonitoring {
    param($IntervalSeconds)
    
    Write-Log "Début de la surveillance continue (intervalle: ${IntervalSeconds}s)" "INFO"
    
    while ($true) {
        Write-Host "`n=== Cycle de surveillance $(Get-Date) ===" -ForegroundColor Cyan
        
        # Vérifications
        Get-SystemResources | Out-Null
        
        foreach ($service in $Services) {
            Test-ServiceHealth $service | Out-Null
        }
        
        $databases = @("groupomania_auth", "groupomania_users", "groupomania_messages", "groupomania_files")
        foreach ($db in $databases) {
            Test-DatabaseHealth $db | Out-Null
        }
        
        Test-RedisHealth | Out-Null
        Test-LogsForErrors
        
        Write-Log "Cycle terminé, attente de ${IntervalSeconds}s..." "INFO"
        Start-Sleep -Seconds $IntervalSeconds
    }
}

function Show-Help {
    Write-Host "`n🔍 Script de monitoring Groupomania Backend (Windows)" -ForegroundColor Cyan
    Write-Host "======================================================`n"
    
    Write-Host "Usage: .\monitor.ps1 [commande] [options]`n"
    
    Write-Host "Commandes:"
    Write-Host "  check           - Vérification unique de tous les services"
    Write-Host "  services        - Vérifier uniquement les services HTTP"
    Write-Host "  databases       - Vérifier uniquement les bases de données"
    Write-Host "  system          - Vérifier uniquement les ressources système"
    Write-Host "  logs            - Analyser les logs pour détecter les erreurs"
    Write-Host "  report          - Générer un rapport de santé JSON"
    Write-Host "  watch [interval] - Surveillance continue (défaut: 60s)`n"
    
    Write-Host "Exemples:"
    Write-Host "  .\monitor.ps1 check"
    Write-Host "  .\monitor.ps1 watch 30"
    Write-Host "  .\monitor.ps1 services`n"
    
    Write-Host "Note: Certaines fonctionnalités nécessitent psql et redis-cli installés"
}

# Script principal
switch ($Command.ToLower()) {
    "check" {
        Write-Log "=== Vérification complète de la santé des services ===" "INFO"
        Get-SystemResources | Out-Null
        foreach ($service in $Services) {
            Test-ServiceHealth $service | Out-Null
        }
        $databases = @("groupomania_auth", "groupomania_users", "groupomania_messages", "groupomania_files")
        foreach ($db in $databases) {
            Test-DatabaseHealth $db | Out-Null
        }
        Test-RedisHealth | Out-Null
        Test-LogsForErrors
    }
    
    "services" {
        Write-Log "=== Vérification des services HTTP ===" "INFO"
        foreach ($service in $Services) {
            Test-ServiceHealth $service | Out-Null
        }
    }
    
    "databases" {
        Write-Log "=== Vérification des bases de données ===" "INFO"
        $databases = @("groupomania_auth", "groupomania_users", "groupomania_messages", "groupomania_files")
        foreach ($db in $databases) {
            Test-DatabaseHealth $db | Out-Null
        }
        Test-RedisHealth | Out-Null
    }
    
    "system" {
        Write-Log "=== Vérification des ressources système ===" "INFO"
        Get-SystemResources | Out-Null
    }
    
    "logs" {
        Write-Log "=== Analyse des logs ===" "INFO"
        Test-LogsForErrors
    }
    
    "report" {
        New-HealthReport
    }
    
    "watch" {
        Start-ContinuousMonitoring $Interval
    }
    
    default {
        if ($Command -eq "help" -or $Command -eq "-h" -or $Command -eq "--help") {
            Show-Help
        } else {
            Write-Log "Commande inconnue: $Command" "ERROR"
            Show-Help
        }
    }
}
