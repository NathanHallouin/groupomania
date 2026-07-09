#!/bin/bash

# Script de développement pour Groupomania Backend
# Facilite les tâches de développement quotidiennes

set -e

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

# Services disponibles
SERVICES=("auth-service" "user-service" "message-service" "file-service")

# Démarrage d'un service spécifique
start_service() {
    local service=$1
    log_info "Démarrage du service: $service"
    
    if [[ -d "microservices/$service" ]]; then
        cd "microservices/$service"
        
        # Vérifier si le service est compilé
        if [[ ! -d "dist" ]]; then
            log_info "Compilation du service $service..."
            npm run build
        fi
        
        # Démarrer en mode développement
        npm run dev &
        SERVICE_PID=$!
        echo $SERVICE_PID > "../../.pid/$service.pid"
        log_success "Service $service démarré (PID: $SERVICE_PID)"
        cd ../..
    else
        log_error "Service $service non trouvé"
    fi
}

# Arrêt d'un service
stop_service() {
    local service=$1
    log_info "Arrêt du service: $service"
    
    if [[ -f ".pid/$service.pid" ]]; then
        local pid=$(cat ".pid/$service.pid")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            rm ".pid/$service.pid"
            log_success "Service $service arrêté"
        else
            log_warning "Service $service n'était pas en cours d'exécution"
            rm ".pid/$service.pid"
        fi
    else
        log_warning "Fichier PID non trouvé pour $service"
    fi
}

# Statut des services
status_services() {
    log_info "Statut des services:"
    echo ""
    
    for service in "${SERVICES[@]}"; do
        if [[ -f ".pid/$service.pid" ]]; then
            local pid=$(cat ".pid/$service.pid")
            if kill -0 $pid 2>/dev/null; then
                echo -e "  ${GREEN}●${NC} $service (PID: $pid)"
            else
                echo -e "  ${RED}●${NC} $service (PID mort: $pid)"
                rm ".pid/$service.pid"
            fi
        else
            echo -e "  ${RED}●${NC} $service (arrêté)"
        fi
    done
    echo ""
}

# Logs d'un service
logs_service() {
    local service=$1
    log_info "Affichage des logs pour: $service"
    
    if [[ -f "logs/$service.log" ]]; then
        tail -f "logs/$service.log"
    else
        log_warning "Fichier de log non trouvé pour $service"
    fi
}

# Tests pour un service
test_service() {
    local service=$1
    log_info "Exécution des tests pour: $service"
    
    if [[ "$service" == "all" ]]; then
        # Tests pour tous les services
        for svc in "${SERVICES[@]}"; do
            if [[ -d "microservices/$svc" ]]; then
                log_info "Tests pour $svc..."
                (cd "microservices/$svc" && npm test)
            fi
        done
    else
        # Tests pour un service spécifique
        if [[ -d "microservices/$service" ]]; then
            (cd "microservices/$service" && npm test)
        else
            log_error "Service $service non trouvé"
        fi
    fi
}

# Linting pour un service
lint_service() {
    local service=$1
    log_info "Linting pour: $service"
    
    if [[ "$service" == "all" ]]; then
        # Lint pour tous les services
        for svc in "${SERVICES[@]}"; do
            if [[ -d "microservices/$svc" ]]; then
                log_info "Linting pour $svc..."
                (cd "microservices/$svc" && npm run lint)
            fi
        done
    else
        # Lint pour un service spécifique
        if [[ -d "microservices/$service" ]]; then
            (cd "microservices/$service" && npm run lint)
        else
            log_error "Service $service non trouvé"
        fi
    fi
}

# Compilation d'un service
build_service() {
    local service=$1
    log_info "Compilation pour: $service"
    
    if [[ "$service" == "all" ]]; then
        # Build pour tous les services
        for svc in "${SERVICES[@]}"; do
            if [[ -d "microservices/$svc" ]]; then
                log_info "Compilation pour $svc..."
                (cd "microservices/$svc" && npm run build)
            fi
        done
    else
        # Build pour un service spécifique
        if [[ -d "microservices/$service" ]]; then
            (cd "microservices/$service" && npm run build)
        else
            log_error "Service $service non trouvé"
        fi
    fi
}

# Nettoyage des fichiers temporaires
clean() {
    log_info "Nettoyage des fichiers temporaires..."
    
    # Nettoyer les fichiers de build
    for service in "${SERVICES[@]}"; do
        if [[ -d "microservices/$service/dist" ]]; then
            rm -rf "microservices/$service/dist"
            log_success "Dossier dist nettoyé pour $service"
        fi
    done
    
    # Nettoyer les fichiers PID
    if [[ -d ".pid" ]]; then
        rm -f .pid/*.pid
        log_success "Fichiers PID nettoyés"
    fi
    
    # Nettoyer les logs anciens
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    log_success "Logs anciens nettoyés"
}

# Mise à jour des dépendances
update_deps() {
    log_info "Mise à jour des dépendances..."
    
    # Vérifier les updates disponibles
    npm outdated || true
    
    for service in "${SERVICES[@]}"; do
        if [[ -d "microservices/$service" ]]; then
            log_info "Vérification des updates pour $service..."
            (cd "microservices/$service" && npm outdated) || true
        fi
    done
    
    read -p "Voulez-vous mettre à jour toutes les dépendances? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
        npm update
        for service in "${SERVICES[@]}"; do
            if [[ -d "microservices/$service" ]]; then
                (cd "microservices/$service" && npm update)
            fi
        done
        log_success "Dépendances mises à jour"
    fi
}

# Initialisation de l'environnement de développement
init_dev() {
    log_info "Initialisation de l'environnement de développement..."
    
    # Créer les dossiers nécessaires
    mkdir -p .pid logs
    
    # Copier les fichiers d'environnement si nécessaire
    for service in "${SERVICES[@]}"; do
        if [[ -f "microservices/$service/.env.example" ]] && [[ ! -f "microservices/$service/.env" ]]; then
            cp "microservices/$service/.env.example" "microservices/$service/.env"
            log_success "Fichier .env créé pour $service"
        fi
    done
    
    # Installer les hooks git
    if [[ -d ".git" ]]; then
        echo "#!/bin/bash" > .git/hooks/pre-commit
        echo "./scripts/dev.sh lint all" >> .git/hooks/pre-commit
        chmod +x .git/hooks/pre-commit
        log_success "Hook de pre-commit installé"
    fi
    
    log_success "Environnement de développement initialisé"
}

# Surveillance des fichiers
watch_service() {
    local service=$1
    log_info "Surveillance des modifications pour: $service"
    
    if command -v fswatch &> /dev/null; then
        fswatch -o "microservices/$service/src" | while read f; do
            log_info "Modifications détectées, recompilation..."
            (cd "microservices/$service" && npm run build)
        done
    else
        log_warning "fswatch non installé. Utilisation du mode watch de TypeScript..."
        (cd "microservices/$service" && npm run build:watch)
    fi
}

# Affichage de l'aide
show_help() {
    echo ""
    echo "🛠️  Script de développement Groupomania Backend"
    echo "================================================"
    echo ""
    echo "Usage: $0 <commande> [service]"
    echo ""
    echo "Commandes disponibles:"
    echo "  start <service>     - Démarrer un service"
    echo "  stop <service>      - Arrêter un service"
    echo "  restart <service>   - Redémarrer un service"
    echo "  status             - Statut de tous les services"
    echo "  logs <service>     - Afficher les logs d'un service"
    echo "  test [service]     - Exécuter les tests (all par défaut)"
    echo "  lint [service]     - Exécuter le linting (all par défaut)"
    echo "  build [service]    - Compiler un service (all par défaut)"
    echo "  clean              - Nettoyer les fichiers temporaires"
    echo "  update             - Vérifier/mettre à jour les dépendances"
    echo "  init               - Initialiser l'environnement de dev"
    echo "  watch <service>    - Surveiller les modifications"
    echo ""
    echo "Services disponibles: ${SERVICES[*]}"
    echo ""
    echo "Exemples:"
    echo "  $0 start auth-service"
    echo "  $0 test all"
    echo "  $0 logs user-service"
    echo ""
}

# Script principal
main() {
    # Créer le dossier .pid s'il n'existe pas
    mkdir -p .pid
    
    case "${1:-help}" in
        "start")
            if [[ -n "$2" ]]; then
                start_service "$2"
            else
                log_error "Veuillez spécifier un service"
                show_help
            fi
            ;;
        "stop")
            if [[ -n "$2" ]]; then
                stop_service "$2"
            else
                log_error "Veuillez spécifier un service"
                show_help
            fi
            ;;
        "restart")
            if [[ -n "$2" ]]; then
                stop_service "$2"
                sleep 2
                start_service "$2"
            else
                log_error "Veuillez spécifier un service"
                show_help
            fi
            ;;
        "status")
            status_services
            ;;
        "logs")
            if [[ -n "$2" ]]; then
                logs_service "$2"
            else
                log_error "Veuillez spécifier un service"
                show_help
            fi
            ;;
        "test")
            test_service "${2:-all}"
            ;;
        "lint")
            lint_service "${2:-all}"
            ;;
        "build")
            build_service "${2:-all}"
            ;;
        "clean")
            clean
            ;;
        "update")
            update_deps
            ;;
        "init")
            init_dev
            ;;
        "watch")
            if [[ -n "$2" ]]; then
                watch_service "$2"
            else
                log_error "Veuillez spécifier un service"
                show_help
            fi
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
