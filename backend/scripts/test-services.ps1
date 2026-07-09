# Script de test simple pour Groupomania Backend
Write-Host "=== Test des services Groupomania ===" -ForegroundColor Cyan

$Services = @(
    @{Name="auth-service"; Port=3001},
    @{Name="user-service"; Port=3002},
    @{Name="message-service"; Port=3003},
    @{Name="file-service"; Port=3004}
)

foreach ($service in $Services) {
    $url = "http://localhost:$($service.Port)/health"
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Service $($service.Name) OK" -ForegroundColor Green
        } else {
            Write-Host "✗ Service $($service.Name) erreur $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "✗ Service $($service.Name) inaccessible" -ForegroundColor Red
    }
}

Write-Host "`nTest terminé." -ForegroundColor Cyan
