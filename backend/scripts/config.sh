# Configuration principale pour les scripts Groupomania Backend
# Source ce fichier dans vos scripts ou définissez ces variables d'environnement

# ==============================
# Configuration Générale
# ==============================
export PROJECT_NAME="groupomania-backend"
export PROJECT_VERSION="1.0.0"
export NODE_ENV="${NODE_ENV:-development}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# ==============================
# Services Configuration
# ==============================
export SERVICES="auth-service user-service message-service file-service"

# Ports des services
export AUTH_SERVICE_PORT=3001
export USER_SERVICE_PORT=3002
export MESSAGE_SERVICE_PORT=3003
export FILE_SERVICE_PORT=3004

# ==============================
# Base de Données
# ==============================
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_USER="${DB_USER:-groupomania}"
export DB_PASS="${DB_PASS:-password}"

# Noms des bases de données
export DB_AUTH="${DB_AUTH:-groupomania_auth}"
export DB_USERS="${DB_USERS:-groupomania_users}"
export DB_MESSAGES="${DB_MESSAGES:-groupomania_messages}"
export DB_FILES="${DB_FILES:-groupomania_files}"

# ==============================
# Redis Configuration
# ==============================
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export REDIS_DB="${REDIS_DB:-0}"

# ==============================
# Sécurité
# ==============================
export JWT_SECRET="${JWT_SECRET:-your-secret-key-change-this}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-24h}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-your-encryption-key-32-chars}"
export BCRYPT_ROUNDS="${BCRYPT_ROUNDS:-12}"

# ==============================
# Configuration Docker
# ==============================
export DOCKER_REGISTRY="${DOCKER_REGISTRY:-registry.groupomania.com}"
export DOCKER_NAMESPACE_STAGING="${DOCKER_NAMESPACE_STAGING:-staging}"
export DOCKER_NAMESPACE_PRODUCTION="${DOCKER_NAMESPACE_PRODUCTION:-production}"

# Authentification Docker Registry
export DOCKER_REGISTRY_USER="${DOCKER_REGISTRY_USER:-}"
export DOCKER_REGISTRY_PASS="${DOCKER_REGISTRY_PASS:-}"

# ==============================
# Sauvegardes
# ==============================
export BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
export BACKUP_RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-7}"
export BACKUP_RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-4}"
export BACKUP_RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"

# Configuration AWS S3 pour sauvegardes distantes
export AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# ==============================
# Monitoring et Alertes
# ==============================
export MONITORING_INTERVAL="${MONITORING_INTERVAL:-60}"
export MAX_RESPONSE_TIME="${MAX_RESPONSE_TIME:-5000}"
export MAX_CPU_USAGE="${MAX_CPU_USAGE:-80}"
export MAX_MEMORY_USAGE="${MAX_MEMORY_USAGE:-80}"
export MAX_DISK_USAGE="${MAX_DISK_USAGE:-85}"

# Notifications
export SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
export EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-}"
export DEPLOYMENT_WEBHOOK="${DEPLOYMENT_WEBHOOK:-}"

# ==============================
# Paths et Dossiers
# ==============================
export LOGS_DIR="${LOGS_DIR:-./logs}"
export UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
export TEMP_DIR="${TEMP_DIR:-./temp}"
export PID_DIR="${PID_DIR:-./.pid}"

# ==============================
# Configuration de Développement
# ==============================
export DEV_WATCH_ENABLED="${DEV_WATCH_ENABLED:-true}"
export DEV_AUTO_RESTART="${DEV_AUTO_RESTART:-true}"
export DEV_OPEN_BROWSER="${DEV_OPEN_BROWSER:-false}"

# ==============================
# Configuration de Production
# ==============================
export PROD_SSL_ENABLED="${PROD_SSL_ENABLED:-true}"
export PROD_SSL_CERT_PATH="${PROD_SSL_CERT_PATH:-/etc/ssl/certs/groupomania.crt}"
export PROD_SSL_KEY_PATH="${PROD_SSL_KEY_PATH:-/etc/ssl/private/groupomania.key}"

# Rate Limiting
export RATE_LIMIT_WINDOW="${RATE_LIMIT_WINDOW:-15}"
export RATE_LIMIT_MAX_REQUESTS="${RATE_LIMIT_MAX_REQUESTS:-100}"

# ==============================
# Configuration des Tests
# ==============================
export TEST_DB_HOST="${TEST_DB_HOST:-localhost}"
export TEST_DB_PORT="${TEST_DB_PORT:-5432}"
export TEST_DB_USER="${TEST_DB_USER:-test_user}"
export TEST_DB_PASS="${TEST_DB_PASS:-test_password}"

# Bases de données de test
export TEST_DB_AUTH="${TEST_DB_AUTH:-test_groupomania_auth}"
export TEST_DB_USERS="${TEST_DB_USERS:-test_groupomania_users}"
export TEST_DB_MESSAGES="${TEST_DB_MESSAGES:-test_groupomania_messages}"
export TEST_DB_FILES="${TEST_DB_FILES:-test_groupomania_files}"

# ==============================
# Configuration CI/CD
# ==============================
export CI_SKIP_TESTS="${CI_SKIP_TESTS:-false}"
export CI_SKIP_LINTING="${CI_SKIP_LINTING:-false}"
export CI_SKIP_SECURITY_SCAN="${CI_SKIP_SECURITY_SCAN:-false}"
export CI_PARALLEL_JOBS="${CI_PARALLEL_JOBS:-4}"

# ==============================
# Configuration Performance
# ==============================
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-16}"
export CLUSTER_WORKERS="${CLUSTER_WORKERS:-auto}"

# ==============================
# Configuration Upload de Fichiers
# ==============================
export MAX_FILE_SIZE="${MAX_FILE_SIZE:-10485760}"  # 10MB
export ALLOWED_FILE_TYPES="${ALLOWED_FILE_TYPES:-jpg,jpeg,png,gif,pdf,doc,docx}"
export IMAGE_QUALITY="${IMAGE_QUALITY:-80}"
export THUMBNAIL_SIZE="${THUMBNAIL_SIZE:-200x200}"

# ==============================
# Configuration Email
# ==============================
export SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
export SMTP_PORT="${SMTP_PORT:-587}"
export SMTP_USER="${SMTP_USER:-}"
export SMTP_PASS="${SMTP_PASS:-}"
export EMAIL_FROM="${EMAIL_FROM:-noreply@groupomania.com}"

# ==============================
# Configuration Cache
# ==============================
export CACHE_TTL="${CACHE_TTL:-3600}"  # 1 heure
export CACHE_MAX_SIZE="${CACHE_MAX_SIZE:-100}"  # 100 MB
export SESSION_TIMEOUT="${SESSION_TIMEOUT:-1800}"  # 30 minutes

# ==============================
# URLs et Domaines
# ==============================
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
export API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000,http://localhost:8080}"

# Domaines par environnement
export STAGING_DOMAIN="${STAGING_DOMAIN:-staging.groupomania.com}"
export PRODUCTION_DOMAIN="${PRODUCTION_DOMAIN:-api.groupomania.com}"

# ==============================
# Configuration Logging
# ==============================
export LOG_FORMAT="${LOG_FORMAT:-combined}"
export LOG_ROTATION="${LOG_ROTATION:-daily}"
export LOG_MAX_SIZE="${LOG_MAX_SIZE:-50M}"
export LOG_MAX_FILES="${LOG_MAX_FILES:-30}"

# ==============================
# Configuration Health Checks
# ==============================
export HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
export HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
export HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
export HEALTH_CHECK_START_PERIOD="${HEALTH_CHECK_START_PERIOD:-60}"

# ==============================
# Fonctions Utilitaires
# ==============================

# Charger la configuration d'environnement spécifique
load_env_config() {
    local env=${1:-$NODE_ENV}
    local env_file=".env.${env}"
    
    if [[ -f "$env_file" ]]; then
        echo "Chargement de la configuration pour l'environnement: $env"
        source "$env_file"
    fi
}

# Valider la configuration
validate_config() {
    local errors=0
    
    # Vérifications critiques
    if [[ -z "$JWT_SECRET" ]] || [[ "$JWT_SECRET" == "your-secret-key-change-this" ]]; then
        echo "ERREUR: JWT_SECRET doit être défini et modifié"
        ((errors++))
    fi
    
    if [[ -z "$DB_PASS" ]] || [[ "$DB_PASS" == "password" ]]; then
        echo "ERREUR: DB_PASS doit être défini et sécurisé"
        ((errors++))
    fi
    
    if [[ "$NODE_ENV" == "production" ]]; then
        if [[ -z "$DOCKER_REGISTRY_USER" ]] || [[ -z "$DOCKER_REGISTRY_PASS" ]]; then
            echo "ERREUR: Authentification Docker Registry requise en production"
            ((errors++))
        fi
        
        if [[ "$PROD_SSL_ENABLED" == "true" ]]; then
            if [[ ! -f "$PROD_SSL_CERT_PATH" ]] || [[ ! -f "$PROD_SSL_KEY_PATH" ]]; then
                echo "ERREUR: Certificats SSL introuvables"
                ((errors++))
            fi
        fi
    fi
    
    return $errors
}

# Afficher la configuration actuelle
show_config() {
    echo "Configuration Groupomania Backend"
    echo "================================="
    echo "Environnement: $NODE_ENV"
    echo "Version: $PROJECT_VERSION"
    echo "Services: $SERVICES"
    echo "Base de données: $DB_HOST:$DB_PORT"
    echo "Redis: $REDIS_HOST:$REDIS_PORT"
    echo "Logs: $LOGS_DIR"
    echo "Sauvegardes: $BACKUP_ROOT"
    echo "Registry Docker: $DOCKER_REGISTRY"
}

# Générer un JWT secret sécurisé
generate_jwt_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    elif command -v node >/dev/null 2>&1; then
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    else
        echo "Impossible de générer un secret JWT. Installez openssl ou Node.js"
        return 1
    fi
}

# Créer les dossiers nécessaires
create_directories() {
    mkdir -p "$LOGS_DIR" "$UPLOADS_DIR" "$TEMP_DIR" "$PID_DIR" "$BACKUP_ROOT"
    echo "Dossiers créés: $LOGS_DIR, $UPLOADS_DIR, $TEMP_DIR, $PID_DIR, $BACKUP_ROOT"
}

# ==============================
# Export des fonctions
# ==============================
export -f load_env_config validate_config show_config generate_jwt_secret create_directories

# ==============================
# Initialisation automatique
# ==============================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script exécuté directement
    case "${1:-show}" in
        "show") show_config ;;
        "validate") validate_config ;;
        "generate-jwt") generate_jwt_secret ;;
        "create-dirs") create_directories ;;
        "help")
            echo "Usage: $0 [show|validate|generate-jwt|create-dirs|help]"
            ;;
    esac
else
    # Script sourcé
    create_directories >/dev/null 2>&1
fi
