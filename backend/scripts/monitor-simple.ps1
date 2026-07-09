# Script de monitoring simple pour Windows - Groupomania Backend
param(
    [string]$Command = "check"
)

# Configuration
$Services = @(
    @{Name="auth-service"; Port=3001},
    @{Name="user-service"; Port=3002},
    @{Name="message-service"; Port=3003},
    @{Name="file-service"; Port=3004}
)

function Write-ColorMessage {
    param($Message, $Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-ServiceHealth {
    param($Service)
    
    $Url = "http://localhost:$($Service.Port)/health"
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            Write-ColorMessage "✓ Service $($Service.Name) OK" "Green"
            return $true
        }
    }
    catch {
        Write-ColorMessage "✗ Service $($Service.Name) inaccessible" "Red"
        return $false
    }
}

function Test-AllServices {
    Write-ColorMessage "`n=== Vérification des services Groupomania ===" "Cyan"
    
    foreach ($service in $Services) {
        Test-ServiceHealth $service
    }
    
    Write-ColorMessage "`nVérification terminée.`n" "Cyan"
}

function Show-Help {
    Write-ColorMessage "`nScript de monitoring Groupomania Backend (Windows)" "Cyan"
    Write-ColorMessage "===================================================`n" "Cyan"
    
    Write-ColorMessage "Usage: .\monitor-simple.ps1 [commande]`n"
    
    Write-ColorMessage "Commandes:"
    Write-ColorMessage "  check    - Vérifier tous les services (défaut)"
    Write-ColorMessage "  help     - Afficher cette aide`n"
    
    Write-ColorMessage "Exemples:"
    Write-ColorMessage "  .\monitor-simple.ps1"
    Write-ColorMessage "  .\monitor-simple.ps1 check`n"
}

# Script principal
switch ($Command.ToLower()) {
    "check" {
        Test-AllServices
    }
    "help" {
        Show-Help
    }
    default {
        Write-ColorMessage "Commande inconnue: $Command" "Red"
        Show-Help
    }
}
