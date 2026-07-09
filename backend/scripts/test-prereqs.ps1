# Test simple des services Groupomania
Write-Host "Test des services Groupomania" -ForegroundColor Cyan

# Test Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js: non installe" -ForegroundColor Red
}

# Test npm
try {
    $npmVersion = npm --version
    Write-Host "npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm: non installe" -ForegroundColor Red
}

# Test PostgreSQL
try {
    $pgVersion = psql --version
    Write-Host "PostgreSQL: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL: non installe ou non dans PATH" -ForegroundColor Yellow
}

# Test Redis
try {
    $redisTest = redis-cli ping
    if ($redisTest -eq "PONG") {
        Write-Host "Redis: accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "Redis: non accessible" -ForegroundColor Yellow
}

Write-Host "Test termine" -ForegroundColor Cyan
