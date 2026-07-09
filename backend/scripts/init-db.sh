#!/bin/bash

# Script d'initialisation des bases de données PostgreSQL pour Groupomania
# Ce script crée les bases de données nécessaires pour les microservices

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
DB_USER="${DB_USER:-groupomania}"
DB_PASSWORD="${DB_PASSWORD:-groupomania2024!}"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Bases de données à créer
DATABASES=(
    "groupomania_auth"
    "groupomania_users" 
    "groupomania_messages"
    "groupomania_files"
)

# Fonction pour tester la connexion PostgreSQL
test_postgres_connection() {
    log_info "Test de connexion à PostgreSQL..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c '\q' 2>/dev/null; then
        log_success "Connexion PostgreSQL réussie"
        return 0
    else
        log_error "Impossible de se connecter à PostgreSQL"
        log_error "Vérifiez que PostgreSQL est démarré et accessible sur $DB_HOST:$DB_PORT"
        return 1
    fi
}

# Fonction pour créer un utilisateur
create_user() {
    log_info "Création de l'utilisateur $DB_USER..."
    
    # Vérifier si l'utilisateur existe déjà
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        log_warning "L'utilisateur $DB_USER existe déjà"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "
            CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
            ALTER USER $DB_USER CREATEDB;
        "
        log_success "Utilisateur $DB_USER créé avec succès"
    fi
}

# Fonction pour créer une base de données
create_database() {
    local db_name=$1
    log_info "Création de la base de données: $db_name"
    
    # Vérifier si la base existe déjà
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        log_warning "La base de données $db_name existe déjà"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "
            CREATE DATABASE $db_name OWNER $DB_USER;
            GRANT ALL PRIVILEGES ON DATABASE $db_name TO $DB_USER;
        "
        log_success "Base de données $db_name créée avec succès"
    fi
    
    # Créer les extensions nécessaires
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$db_name" -c "
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
        CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
    " 2>/dev/null || log_warning "Impossible de créer certaines extensions pour $db_name"
}

# Fonction pour tester les bases de données créées
test_databases() {
    log_info "Test des bases de données créées..."
    
    for db in "${DATABASES[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c '\q' 2>/dev/null; then
            log_success "Connexion réussie à $db"
        else
            log_error "Impossible de se connecter à $db"
        fi
    done
}

# Fonction pour créer les bases de données de test
create_test_databases() {
    log_info "Création des bases de données de test..."
    
    for db in "${DATABASES[@]}"; do
        local test_db="test_$db"
        create_database "$test_db"
    done
}

# Fonction pour afficher un résumé
show_summary() {
    log_info "=========================================="
    log_info "Résumé de l'initialisation des bases de données"
    log_info "=========================================="
    echo ""
    log_info "Serveur PostgreSQL: $DB_HOST:$DB_PORT"
    log_info "Utilisateur créé: $DB_USER"
    echo ""
    log_info "Bases de données créées:"
    for db in "${DATABASES[@]}"; do
        echo "  - $db"
    done
    echo ""
    log_info "Bases de données de test créées:"
    for db in "${DATABASES[@]}"; do
        echo "  - test_$db"
    done
    echo ""
    log_info "Extensions installées:"
    echo "  - uuid-ossp (génération UUID)"
    echo "  - pgcrypto (fonctions cryptographiques)"
    echo ""
    log_success "Initialisation terminée avec succès!"
    echo ""
    log_info "Configuration à utiliser dans vos fichiers .env:"
    echo "DB_HOST=$DB_HOST"
    echo "DB_PORT=$DB_PORT"
    echo "DB_USER=$DB_USER"
    echo "DB_PASSWORD=$DB_PASSWORD"
}

# Fonction pour nettoyer (optionnel)
cleanup_databases() {
    log_warning "ATTENTION: Cette action va supprimer toutes les bases de données!"
    read -p "Êtes-vous sûr de vouloir continuer? (y/N): " confirm
    
    if [[ $confirm == [yY] ]]; then
        log_info "Suppression des bases de données..."
        
        for db in "${DATABASES[@]}"; do
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "DROP DATABASE IF EXISTS $db;" 2>/dev/null || true
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "DROP DATABASE IF EXISTS test_$db;" 2>/dev/null || true
            log_info "Base de données $db supprimée"
        done
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
        log_info "Utilisateur $DB_USER supprimé"
        
        log_success "Nettoyage terminé"
    else
        log_info "Nettoyage annulé"
    fi
}

# Affichage de l'aide
show_help() {
    echo ""
    echo "🗄️  Script d'initialisation PostgreSQL - Groupomania Backend"
    echo "=============================================================="
    echo ""
    echo "Usage: $0 [commande] [options]"
    echo ""
    echo "Commandes:"
    echo "  init        - Initialisation complète (défaut)"
    echo "  test-only   - Créer uniquement les bases de test"
    echo "  test-conn   - Tester la connexion PostgreSQL"
    echo "  cleanup     - Supprimer toutes les bases et l'utilisateur"
    echo "  summary     - Afficher le résumé de la configuration"
    echo ""
    echo "Variables d'environnement:"
    echo "  DB_HOST         - Hôte PostgreSQL (défaut: localhost)"
    echo "  DB_PORT         - Port PostgreSQL (défaut: 5432)"
    echo "  DB_ADMIN_USER   - Utilisateur admin PostgreSQL (défaut: postgres)"
    echo "  DB_USER         - Utilisateur à créer (défaut: groupomania)"
    echo "  DB_PASSWORD     - Mot de passe de l'utilisateur (défaut: groupomania2024!)"
    echo ""
    echo "Exemples:"
    echo "  $0                          # Initialisation complète"
    echo "  $0 test-conn                # Test de connexion"
    echo "  DB_PASSWORD=mypass $0 init  # Avec mot de passe personnalisé"
    echo ""
}

# Script principal
main() {
    case "${1:-init}" in
        "init")
            log_info "🗄️ Initialisation des bases de données PostgreSQL"
            echo ""
            
            test_postgres_connection || exit 1
            create_user
            
            for db in "${DATABASES[@]}"; do
                create_database "$db"
            done
            
            create_test_databases
            test_databases
            show_summary
            ;;
            
        "test-only")
            log_info "Création des bases de données de test uniquement"
            test_postgres_connection || exit 1
            create_test_databases
            ;;
            
        "test-conn")
            test_postgres_connection
            ;;
            
        "cleanup")
            cleanup_databases
            ;;
            
        "summary")
            show_summary
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

# Exécution du script
main "$@"
