#!/bin/bash

# Script d'installation et de configuration automatique pour Groupomania Backend
# Usage: ./scripts/setup.sh [environment]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Version requise: >=20.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    if [[ $(echo "$NODE_VERSION 20.0.0" | tr " " "\n" | sort -V | head -n1) != "20.0.0" ]]; then
        log_error "Version Node.js trop ancienne. Actuelle: $NODE_VERSION, Requise: >=20.0.0"
        exit 1
    fi
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_warning "Docker n'est pas installé. Installation manuelle requise pour l'environnement containerisé."
    fi
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_warning "Docker Compose n'est pas installé. Installation manuelle requise pour l'environnement containerisé."
    fi
    
    log_success "Prérequis validés"
}

# Installation des dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    
    # Installation des dépendances root
    log_info "Installation des dépendances principales..."
    npm install
    
    # Installation des dépendances pour chaque microservice
    for service in microservices/*/; do
        if [[ -f "$service/package.json" ]]; then
            service_name=$(basename "$service")
            log_info "Installation des dépendances pour $service_name..."
            (cd "$service" && npm install)
        fi
    done
    
    log_success "Dépendances installées"
}

# Configuration de l'environnement
setup_environment() {
    local env=${1:-development}
    log_info "Configuration de l'environnement: $env"
    
    # Copier les fichiers d'environnement
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            log_success "Fichier .env créé depuis .env.example"
        else
            log_warning "Aucun fichier .env.example trouvé"
        fi
    else
        log_info "Fichier .env existe déjà"
    fi
    
    # Configuration pour chaque microservice
    for service in microservices/*/; do
        if [[ -f "$service/.env.example" ]] && [[ ! -f "$service/.env" ]]; then
            cp "$service/.env.example" "$service/.env"
            service_name=$(basename "$service")
            log_success "Fichier .env créé pour $service_name"
        fi
    done
}

# Configuration de la base de données
setup_database() {
    log_info "Configuration de la base de données..."
    
    # Vérifier si PostgreSQL est disponible
    if command -v psql &> /dev/null; then
        log_info "PostgreSQL détecté localement"
        
        # Créer les bases de données si elles n'existent pas
        databases=("groupomania_auth" "groupomania_users" "groupomania_messages" "groupomania_files")
        
        for db in "${databases[@]}"; do
            if psql -lqt | cut -d \| -f 1 | grep -qw "$db"; then
                log_info "Base de données $db existe déjà"
            else
                log_info "Création de la base de données $db..."
                createdb "$db" 2>/dev/null || log_warning "Impossible de créer $db (permissions?)"
            fi
        done
    else
        log_warning "PostgreSQL non détecté. Utilisation de Docker recommandée."
    fi
}

# Configuration Redis
setup_redis() {
    log_info "Vérification de Redis..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            log_success "Redis est accessible"
        else
            log_warning "Redis n'est pas en cours d'exécution"
        fi
    else
        log_warning "Redis CLI non détecté. Utilisation de Docker recommandée."
    fi
}

# Génération des clés de sécurité
generate_secrets() {
    log_info "Génération des clés de sécurité..."
    
    # Générer JWT secret si pas défini
    if ! grep -q "JWT_SECRET=" .env 2>/dev/null || grep -q "JWT_SECRET=your-secret-key" .env 2>/dev/null; then
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> .env
        log_success "JWT secret généré"
    fi
    
    # Répliquer dans tous les services
    for service in microservices/*/; do
        if [[ -f "$service/.env" ]]; then
            JWT_SECRET=$(grep "JWT_SECRET=" .env | cut -d'=' -f2)
            if [[ -n "$JWT_SECRET" ]]; then
                sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$service/.env" 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> "$service/.env"
            fi
        fi
    done
}

# Compilation TypeScript
build_services() {
    log_info "Compilation des services TypeScript..."
    
    for service in microservices/*/; do
        if [[ -f "$service/tsconfig.json" ]]; then
            service_name=$(basename "$service")
            log_info "Compilation de $service_name..."
            (cd "$service" && npm run build) || log_warning "Échec de compilation pour $service_name"
        fi
    done
    
    log_success "Compilation terminée"
}

# Tests de santé
health_check() {
    log_info "Vérification de la santé du système..."
    
    # Vérifier la compilation
    for service in microservices/*/; do
        if [[ -d "$service/dist" ]]; then
            service_name=$(basename "$service")
            log_success "$service_name compilé avec succès"
        else
            service_name=$(basename "$service")
            log_warning "$service_name non compilé"
        fi
    done
    
    # Vérifier les configurations
    if [[ -f .env ]]; then
        log_success "Configuration principale OK"
    else
        log_warning "Configuration principale manquante"
    fi
}

# Menu principal
show_menu() {
    echo ""
    echo "=== Configuration Groupomania Backend ==="
    echo "1. Installation complète"
    echo "2. Installation des dépendances seulement"
    echo "3. Configuration de l'environnement"
    echo "4. Configuration de la base de données"
    echo "5. Compilation des services"
    echo "6. Vérification de santé"
    echo "7. Démarrage avec Docker"
    echo "8. Quitter"
    echo ""
}

# Démarrage Docker
start_docker() {
    log_info "Démarrage des services avec Docker..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.microservices.yml up -d
        log_success "Services démarrés avec Docker Compose"
        log_info "Accès aux services:"
        log_info "  - Auth Service: http://localhost:3001"
        log_info "  - User Service: http://localhost:3002"
        log_info "  - Message Service: http://localhost:3003"
        log_info "  - File Service: http://localhost:3004"
    else
        log_error "Docker Compose non disponible"
    fi
}

# Script principal
main() {
    echo "🚀 Script de configuration Groupomania Backend"
    echo "================================================"
    
    if [[ $# -eq 0 ]]; then
        while true; do
            show_menu
            read -p "Choisissez une option: " choice
            case $choice in
                1)
                    check_prerequisites
                    install_dependencies
                    setup_environment
                    setup_database
                    setup_redis
                    generate_secrets
                    build_services
                    health_check
                    log_success "Installation complète terminée!"
                    ;;
                2)
                    install_dependencies
                    ;;
                3)
                    setup_environment
                    generate_secrets
                    ;;
                4)
                    setup_database
                    setup_redis
                    ;;
                5)
                    build_services
                    ;;
                6)
                    health_check
                    ;;
                7)
                    start_docker
                    ;;
                8)
                    log_info "Au revoir!"
                    exit 0
                    ;;
                *)
                    log_error "Option invalide"
                    ;;
            esac
            echo ""
            read -p "Appuyez sur Entrée pour continuer..."
        done
    else
        # Mode automatique avec argument
        case $1 in
            "full")
                check_prerequisites
                install_dependencies
                setup_environment
                setup_database
                setup_redis
                generate_secrets
                build_services
                health_check
                ;;
            "docker")
                start_docker
                ;;
            *)
                echo "Usage: $0 [full|docker]"
                exit 1
                ;;
        esac
    fi
}

# Exécution du script
main "$@"
