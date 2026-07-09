#!/bin/bash

# Script de monitoring pour Groupomania Backend
# Surveillance de la santé des services et alertes

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/monitoring.log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { 
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}
log_success() { 
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}
log_warning() { 
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}
log_error() { 
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Configuration des services
SERVICES=(
    "auth-service:3001:/health"
    "user-service:3002:/health"
    "message-service:3003:/health"
    "file-service:3004:/health"
)

DATABASES=(
    "groupomania_auth"
    "groupomania_users"
    "groupomania_messages"
    "groupomania_files"
)

# Seuils d'alerte
MAX_RESPONSE_TIME=5000  # ms
MAX_CPU_USAGE=80        # %
MAX_MEMORY_USAGE=80     # %
MAX_DISK_USAGE=85       # %

# URLs de notification
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-}"

# Fonction d'envoi d'alertes
send_alert() {
    local severity=$1
    local message=$2
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Log local
    case $severity in
        "critical")
            log_error "ALERTE CRITIQUE: $message"
            ;;
        "warning")
            log_warning "ALERTE WARNING: $message"
            ;;
        "info")
            log_info "ALERTE INFO: $message"
            ;;
    esac
    
    # Notification Slack
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color=""
        case $severity in
            "critical") color="#ff0000" ;;
            "warning") color="#ff9900" ;;
            "info") color="#36a64f" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Groupomania Backend Alert\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$timestamp\", \"short\": true}
                    ]
                }]
            }" 2>/dev/null || log_warning "Échec envoi Slack"
    fi
    
    # Notification email (si disponible)
    if [[ -n "$EMAIL_RECIPIENTS" ]] && command -v mail &> /dev/null; then
        echo "Alerte Groupomania Backend

Severité: $severity
Message: $message
Timestamp: $timestamp

---
Monitoring automatique Groupomania Backend" | mail -s "Alerte [$severity] Groupomania Backend" "$EMAIL_RECIPIENTS"
    fi
}

# Vérification de la santé d'un service HTTP
check_service_health() {
    local service_info=$1
    IFS=':' read -r service_name port endpoint <<< "$service_info"
    
    local url="http://localhost:${port}${endpoint}"
    local start_time=$(date +%s%3N)
    
    # Test de connectivité avec timeout
    if response=$(curl -s -f -m 10 "$url" 2>/dev/null); then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        # Vérifier le temps de réponse
        if [[ $response_time -gt $MAX_RESPONSE_TIME ]]; then
            send_alert "warning" "Service $service_name: temps de réponse élevé (${response_time}ms)"
        fi
        
        # Analyser la réponse JSON si possible
        if echo "$response" | jq . &>/dev/null; then
            local status=$(echo "$response" | jq -r '.status // "unknown"')
            if [[ "$status" != "healthy" ]] && [[ "$status" != "ok" ]]; then
                send_alert "warning" "Service $service_name: statut non optimal ($status)"
            fi
        fi
        
        log_success "Service $service_name OK (${response_time}ms)"
        return 0
    else
        send_alert "critical" "Service $service_name inaccessible ($url)"
        return 1
    fi
}

# Vérification de la base de données
check_database_health() {
    local db_name=$1
    
    # Test de connexion PostgreSQL
    if psql -d "$db_name" -c "SELECT 1;" &>/dev/null; then
        # Vérifier la taille de la base
        local db_size=$(psql -d "$db_name" -t -c "SELECT pg_size_pretty(pg_database_size('$db_name'));" | xargs)
        
        # Vérifier les connexions actives
        local active_connections=$(psql -d "$db_name" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$db_name';" | xargs)
        
        log_success "Base de données $db_name OK (Taille: $db_size, Connexions: $active_connections)"
        
        # Alerte si trop de connexions
        if [[ $active_connections -gt 50 ]]; then
            send_alert "warning" "Base de données $db_name: nombre élevé de connexions ($active_connections)"
        fi
        
        return 0
    else
        send_alert "critical" "Base de données $db_name inaccessible"
        return 1
    fi
}

# Vérification de Redis
check_redis_health() {
    if redis-cli ping &>/dev/null; then
        # Obtenir des informations sur Redis
        local memory_used=$(redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        local connected_clients=$(redis-cli info clients | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
        
        log_success "Redis OK (Mémoire: $memory_used, Clients: $connected_clients)"
        return 0
    else
        send_alert "critical" "Redis inaccessible"
        return 1
    fi
}

# Surveillance des ressources système
check_system_resources() {
    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    cpu_usage=${cpu_usage%.*}  # Enlever les décimales
    
    if [[ $cpu_usage -gt $MAX_CPU_USAGE ]]; then
        send_alert "warning" "Utilisation CPU élevée: ${cpu_usage}%"
    fi
    
    # Mémoire
    local memory_info=$(free | grep "Mem:")
    local memory_total=$(echo $memory_info | awk '{print $2}')
    local memory_used=$(echo $memory_info | awk '{print $3}')
    local memory_percent=$((memory_used * 100 / memory_total))
    
    if [[ $memory_percent -gt $MAX_MEMORY_USAGE ]]; then
        send_alert "warning" "Utilisation mémoire élevée: ${memory_percent}%"
    fi
    
    # Disque
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $MAX_DISK_USAGE ]]; then
        send_alert "critical" "Utilisation disque élevée: ${disk_usage}%"
    fi
    
    log_info "Ressources - CPU: ${cpu_usage}%, Mémoire: ${memory_percent}%, Disque: ${disk_usage}%"
}

# Surveillance des logs pour détecter les erreurs
check_logs_for_errors() {
    local log_dir="$PROJECT_ROOT/logs"
    local error_patterns=("ERROR" "FATAL" "Exception" "failed" "timeout")
    local recent_errors=0
    
    # Chercher les erreurs dans les logs récents (dernières 5 minutes)
    for pattern in "${error_patterns[@]}"; do
        if [[ -d "$log_dir" ]]; then
            local count=$(find "$log_dir" -name "*.log" -mmin -5 -exec grep -c "$pattern" {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')
            recent_errors=$((recent_errors + count))
        fi
    done
    
    if [[ $recent_errors -gt 10 ]]; then
        send_alert "warning" "Nombre élevé d'erreurs récentes dans les logs: $recent_errors"
    elif [[ $recent_errors -gt 0 ]]; then
        log_info "$recent_errors erreurs détectées dans les logs récents"
    fi
}

# Vérification des certificats SSL (si applicable)
check_ssl_certificates() {
    local domains=("api.groupomania.com" "auth.groupomania.com")
    
    for domain in "${domains[@]}"; do
        if command -v openssl &> /dev/null; then
            local cert_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [[ -n "$cert_info" ]]; then
                local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo 0)
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [[ $days_until_expiry -lt 30 ]]; then
                    send_alert "warning" "Certificat SSL pour $domain expire dans $days_until_expiry jours"
                elif [[ $days_until_expiry -lt 7 ]]; then
                    send_alert "critical" "Certificat SSL pour $domain expire dans $days_until_expiry jours"
                fi
            fi
        fi
    done
}

# Test de charge basique
basic_load_test() {
    local test_url="http://localhost:3001/health"
    local concurrent_requests=10
    local total_requests=100
    
    log_info "Test de charge basique ($concurrent_requests connexions simultanées, $total_requests requêtes)"
    
    if command -v curl &> /dev/null; then
        local start_time=$(date +%s)
        
        # Lancer les requêtes en parallèle
        for ((i=1; i<=concurrent_requests; i++)); do
            {
                for ((j=1; j<=10; j++)); do
                    curl -s -f "$test_url" >/dev/null || echo "FAILED"
                done
            } &
        done
        
        wait  # Attendre que toutes les requêtes se terminent
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_info "Test de charge terminé en ${duration}s"
        
        if [[ $duration -gt 30 ]]; then
            send_alert "warning" "Test de charge lent: ${duration}s pour $total_requests requêtes"
        fi
    fi
}

# Génération d'un rapport de santé
generate_health_report() {
    local report_file="$PROJECT_ROOT/logs/health_report_$(date +%Y%m%d_%H%M%S).json"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    log_info "Génération du rapport de santé: $report_file"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "services": [
EOF

    # Tester chaque service et ajouter au rapport
    local first=true
    for service_info in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port endpoint <<< "$service_info"
        
        if [[ "$first" == false ]]; then
            echo "," >> "$report_file"
        fi
        first=false
        
        local url="http://localhost:${port}${endpoint}"
        local status="unknown"
        local response_time=0
        
        local start_time=$(date +%s%3N)
        if curl -s -f -m 10 "$url" >/dev/null 2>&1; then
            status="healthy"
            local end_time=$(date +%s%3N)
            response_time=$((end_time - start_time))
        else
            status="unhealthy"
        fi
        
        cat >> "$report_file" << EOF
        {
            "name": "$service_name",
            "status": "$status",
            "response_time_ms": $response_time,
            "url": "$url"
        }
EOF
    done
    
    echo "    ]" >> "$report_file"
    echo "}" >> "$report_file"
    
    log_success "Rapport de santé généré: $report_file"
}

# Surveillance continue
continuous_monitoring() {
    local interval=${1:-60}  # Intervalle en secondes
    log_info "Début de la surveillance continue (intervalle: ${interval}s)"
    
    while true; do
        echo ""
        log_info "=== Cycle de surveillance $(date) ==="
        
        # Vérifications principales
        check_system_resources
        
        for service_info in "${SERVICES[@]}"; do
            check_service_health "$service_info"
        done
        
        for db in "${DATABASES[@]}"; do
            check_database_health "$db"
        done
        
        check_redis_health
        check_logs_for_errors
        
        log_info "Cycle terminé, attente de ${interval}s..."
        sleep "$interval"
    done
}

# Affichage de l'aide
show_help() {
    echo ""
    echo "🔍 Script de monitoring Groupomania Backend"
    echo "==========================================="
    echo ""
    echo "Usage: $0 <commande> [options]"
    echo ""
    echo "Commandes:"
    echo "  check           - Vérification unique de tous les services"
    echo "  services        - Vérifier uniquement les services HTTP"
    echo "  databases       - Vérifier uniquement les bases de données"
    echo "  system          - Vérifier uniquement les ressources système"
    echo "  logs            - Analyser les logs pour détecter les erreurs"
    echo "  ssl             - Vérifier les certificats SSL"
    echo "  load-test       - Effectuer un test de charge basique"
    echo "  report          - Générer un rapport de santé JSON"
    echo "  watch [interval] - Surveillance continue (défaut: 60s)"
    echo ""
    echo "Variables d'environnement:"
    echo "  SLACK_WEBHOOK      - URL du webhook Slack pour les alertes"
    echo "  EMAIL_RECIPIENTS   - Adresses email pour les alertes"
    echo ""
    echo "Exemples:"
    echo "  $0 check                    # Vérification complète"
    echo "  $0 watch 30                 # Surveillance toutes les 30s"
    echo "  SLACK_WEBHOOK=... $0 check  # Avec notifications Slack"
    echo ""
}

# Script principal
main() {
    # Créer le dossier de logs s'il n'existe pas
    mkdir -p "$PROJECT_ROOT/logs"
    
    case "${1:-check}" in
        "check")
            log_info "=== Vérification complète de la santé des services ==="
            check_system_resources
            for service_info in "${SERVICES[@]}"; do
                check_service_health "$service_info"
            done
            for db in "${DATABASES[@]}"; do
                check_database_health "$db"
            done
            check_redis_health
            check_logs_for_errors
            ;;
        "services")
            log_info "=== Vérification des services HTTP ==="
            for service_info in "${SERVICES[@]}"; do
                check_service_health "$service_info"
            done
            ;;
        "databases")
            log_info "=== Vérification des bases de données ==="
            for db in "${DATABASES[@]}"; do
                check_database_health "$db"
            done
            check_redis_health
            ;;
        "system")
            log_info "=== Vérification des ressources système ==="
            check_system_resources
            ;;
        "logs")
            log_info "=== Analyse des logs ==="
            check_logs_for_errors
            ;;
        "ssl")
            log_info "=== Vérification des certificats SSL ==="
            check_ssl_certificates
            ;;
        "load-test")
            log_info "=== Test de charge basique ==="
            basic_load_test
            ;;
        "report")
            generate_health_report
            ;;
        "watch")
            continuous_monitoring "${2:-60}"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Commande inconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

# Exécution
main "$@"
