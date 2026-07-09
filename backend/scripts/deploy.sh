#!/bin/bash

# Script de déploiement pour Groupomania Backend
# Support pour différents environnements (staging, production)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${PURPLE}[DEBUG]${NC} $1"; }

# Variables d'environnement
ENVIRONMENT=${1:-staging}
SERVICES=("auth-service" "user-service" "message-service" "file-service")

# Configuration par environnement
configure_environment() {
    case $ENVIRONMENT in
        "staging")
            DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
            REGISTRY="registry.staging.groupomania.com"
            NAMESPACE="staging"
            ;;
        "production")
            DOCKER_COMPOSE_FILE="docker-compose.production.yml"
            REGISTRY="registry.groupomania.com"
            NAMESPACE="production"
            ;;
        *)
            log_error "Environnement non supporté: $ENVIRONMENT"
            echo "Environnements supportés: staging, production"
            exit 1
            ;;
    esac
    
    log_info "Configuration pour l'environnement: $ENVIRONMENT"
    log_info "Registry: $REGISTRY"
    log_info "Namespace: $NAMESPACE"
}

# Vérifications pré-déploiement
pre_deployment_checks() {
    log_info "Vérifications pré-déploiement..."
    
    # Vérifier que nous sommes sur la bonne branche
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$ENVIRONMENT" == "production" ]] && [[ "$CURRENT_BRANCH" != "main" ]]; then
        log_error "Déploiement en production autorisé uniquement depuis la branche 'main'"
        log_error "Branche actuelle: $CURRENT_BRANCH"
        exit 1
    fi
    
    # Vérifier l'état Git
    if [[ -n $(git status --porcelain) ]]; then
        log_error "Des modifications non commitées détectées"
        git status --short
        exit 1
    fi
    
    # Vérifier les tests
    log_info "Exécution des tests..."
    npm test || {
        log_error "Les tests ont échoué"
        exit 1
    }
    
    # Vérifier le linting
    log_info "Vérification du code..."
    for service in "${SERVICES[@]}"; do
        if [[ -d "microservices/$service" ]]; then
            (cd "microservices/$service" && npm run lint) || {
                log_error "Linting échoué pour $service"
                exit 1
            }
        fi
    done
    
    log_success "Vérifications pré-déploiement terminées"
}

# Construction des images Docker
build_images() {
    log_info "Construction des images Docker..."
    
    # Tag basé sur le commit Git
    GIT_COMMIT=$(git rev-parse --short HEAD)
    IMAGE_TAG="${ENVIRONMENT}-${GIT_COMMIT}-${TIMESTAMP}"
    
    for service in "${SERVICES[@]}"; do
        if [[ -d "microservices/$service" ]]; then
            log_info "Construction de l'image pour $service..."
            
            docker build \
                -t "${REGISTRY}/${NAMESPACE}/${service}:${IMAGE_TAG}" \
                -t "${REGISTRY}/${NAMESPACE}/${service}:latest" \
                -f "microservices/${service}/Dockerfile" \
                "microservices/${service}/"
            
            log_success "Image construite: ${REGISTRY}/${NAMESPACE}/${service}:${IMAGE_TAG}"
        fi
    done
    
    # Sauvegarder le tag pour les étapes suivantes
    echo "$IMAGE_TAG" > ".deploy_tag"
}

# Tests des images Docker
test_images() {
    log_info "Tests des images Docker..."
    
    IMAGE_TAG=$(cat ".deploy_tag")
    
    for service in "${SERVICES[@]}"; do
        log_info "Test de l'image $service..."
        
        # Test de démarrage de base
        CONTAINER_ID=$(docker run -d "${REGISTRY}/${NAMESPACE}/${service}:${IMAGE_TAG}")
        sleep 5
        
        # Vérifier que le container fonctionne
        if docker ps | grep -q "$CONTAINER_ID"; then
            log_success "Image $service fonctionne correctement"
        else
            log_error "Image $service a échoué au démarrage"
            docker logs "$CONTAINER_ID"
            docker rm -f "$CONTAINER_ID"
            exit 1
        fi
        
        docker rm -f "$CONTAINER_ID"
    done
}

# Publication des images
push_images() {
    log_info "Publication des images..."
    
    IMAGE_TAG=$(cat ".deploy_tag")
    
    # Login au registry (si nécessaire)
    if [[ -n "${DOCKER_REGISTRY_USER:-}" ]] && [[ -n "${DOCKER_REGISTRY_PASS:-}" ]]; then
        echo "$DOCKER_REGISTRY_PASS" | docker login "$REGISTRY" -u "$DOCKER_REGISTRY_USER" --password-stdin
    fi
    
    for service in "${SERVICES[@]}"; do
        log_info "Publication de $service..."
        
        docker push "${REGISTRY}/${NAMESPACE}/${service}:${IMAGE_TAG}"
        docker push "${REGISTRY}/${NAMESPACE}/${service}:latest"
        
        log_success "Image publiée: ${REGISTRY}/${NAMESPACE}/${service}:${IMAGE_TAG}"
    done
}

# Sauvegarde de la base de données
backup_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Sauvegarde de la base de données..."
        
        BACKUP_DIR="backups/${ENVIRONMENT}/${TIMESTAMP}"
        mkdir -p "$BACKUP_DIR"
        
        # Sauvegarde de chaque base de données
        databases=("groupomania_auth" "groupomania_users" "groupomania_messages" "groupomania_files")
        
        for db in "${databases[@]}"; do
            log_info "Sauvegarde de $db..."
            pg_dump "$db" > "${BACKUP_DIR}/${db}.sql"
            gzip "${BACKUP_DIR}/${db}.sql"
        done
        
        log_success "Sauvegarde terminée dans $BACKUP_DIR"
    fi
}

# Déploiement avec Docker Compose
deploy_services() {
    log_info "Déploiement des services..."
    
    IMAGE_TAG=$(cat ".deploy_tag")
    
    # Exporter le tag pour docker-compose
    export IMAGE_TAG
    export ENVIRONMENT
    
    # Arrêter les services existants
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
    fi
    
    # Démarrer les nouveaux services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log_success "Services déployés"
}

# Tests post-déploiement
post_deployment_tests() {
    log_info "Tests post-déploiement..."
    
    # Attendre que les services soient prêts
    sleep 30
    
    # Tests de santé pour chaque service
    services_ports=("3001" "3002" "3003" "3004")
    service_names=("auth" "user" "message" "file")
    
    for i in "${!services_ports[@]}"; do
        port="${services_ports[$i]}"
        name="${service_names[$i]}"
        
        log_info "Test de santé pour $name service..."
        
        # Test de base HTTP
        if curl -f -s "http://localhost:${port}/health" > /dev/null; then
            log_success "$name service accessible"
        else
            log_error "$name service non accessible"
            # Afficher les logs en cas d'erreur
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs "$name-service"
        fi
    done
    
    # Tests d'intégration (optionnel)
    if [[ -f "tests/integration.test.js" ]]; then
        log_info "Exécution des tests d'intégration..."
        npm run test:integration || log_warning "Tests d'intégration échoués"
    fi
}

# Monitoring et alertes
setup_monitoring() {
    log_info "Configuration du monitoring..."
    
    # Vérifier que les métriques sont accessibles
    if curl -f -s "http://localhost:9090/metrics" > /dev/null 2>&1; then
        log_success "Prometheus accessible"
    else
        log_warning "Prometheus non accessible"
    fi
    
    # Notification de déploiement (webhook, Slack, etc.)
    if [[ -n "${DEPLOYMENT_WEBHOOK:-}" ]]; then
        curl -X POST "$DEPLOYMENT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"environment\": \"$ENVIRONMENT\",
                \"version\": \"$(cat .deploy_tag)\",
                \"status\": \"deployed\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }" || log_warning "Échec d'envoi de notification"
    fi
}

# Rollback en cas de problème
rollback() {
    log_warning "Rollback en cours..."
    
    if [[ -f ".last_deploy_tag" ]]; then
        ROLLBACK_TAG=$(cat ".last_deploy_tag")
        log_info "Rollback vers la version: $ROLLBACK_TAG"
        
        export IMAGE_TAG="$ROLLBACK_TAG"
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
        
        log_success "Rollback terminé"
    else
        log_error "Aucune version précédente trouvée pour le rollback"
    fi
}

# Nettoyage post-déploiement
cleanup() {
    log_info "Nettoyage..."
    
    # Sauvegarder le tag actuel pour un rollback potentiel
    if [[ -f ".deploy_tag" ]]; then
        cp ".deploy_tag" ".last_deploy_tag"
    fi
    
    # Nettoyer les images anciennes
    docker image prune -f
    
    # Nettoyer les volumes inutilisés
    docker volume prune -f
    
    rm -f ".deploy_tag"
    
    log_success "Nettoyage terminé"
}

# Affichage de l'aide
show_help() {
    echo ""
    echo "🚀 Script de déploiement Groupomania Backend"
    echo "============================================="
    echo ""
    echo "Usage: $0 <environnement> [options]"
    echo ""
    echo "Environnements:"
    echo "  staging     - Déploiement en staging"
    echo "  production  - Déploiement en production"
    echo ""
    echo "Options:"
    echo "  --skip-tests     - Ignorer les tests pré-déploiement"
    echo "  --skip-backup    - Ignorer la sauvegarde (staging uniquement)"
    echo "  --rollback       - Effectuer un rollback"
    echo ""
    echo "Variables d'environnement optionnelles:"
    echo "  DOCKER_REGISTRY_USER - Utilisateur du registry Docker"
    echo "  DOCKER_REGISTRY_PASS - Mot de passe du registry Docker"
    echo "  DEPLOYMENT_WEBHOOK   - URL de notification de déploiement"
    echo ""
}

# Script principal
main() {
    echo "🚀 Déploiement Groupomania Backend"
    echo "=================================="
    echo ""
    
    # Traitement des arguments
    SKIP_TESTS=false
    SKIP_BACKUP=false
    DO_ROLLBACK=false
    
    while [[ $# -gt 1 ]]; do
        case $2 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --rollback)
                DO_ROLLBACK=true
                shift
                ;;
            *)
                log_error "Option inconnue: $2"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Configuration de l'environnement
    configure_environment
    
    # Rollback si demandé
    if [[ "$DO_ROLLBACK" == true ]]; then
        rollback
        exit 0
    fi
    
    # Processus de déploiement complet
    cd "$PROJECT_ROOT"
    
    # Vérifications pré-déploiement
    if [[ "$SKIP_TESTS" == false ]]; then
        pre_deployment_checks
    fi
    
    # Sauvegarde de la base de données
    if [[ "$SKIP_BACKUP" == false ]]; then
        backup_database
    fi
    
    # Construction et tests des images
    build_images
    test_images
    
    # Publication des images
    push_images
    
    # Déploiement
    deploy_services
    
    # Tests post-déploiement
    post_deployment_tests
    
    # Monitoring
    setup_monitoring
    
    # Nettoyage
    cleanup
    
    log_success "Déploiement terminé avec succès!"
    log_info "Version déployée: $(cat .last_deploy_tag)"
}

# Vérification des arguments
if [[ $# -eq 0 ]] || [[ "$1" == "help" ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Exécution du script principal
main "$@"
