#!/bin/bash

# Script de sauvegarde pour Groupomania Backend
# Gestion des sauvegardes de bases de données et fichiers

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration des bases de données
DATABASES=("groupomania_auth" "groupomania_users" "groupomania_messages" "groupomania_files")

# Configuration S3 pour sauvegarde distante (optionnel)
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Rétention des sauvegardes
DAILY_RETENTION=7    # Garder 7 jours de sauvegardes quotidiennes
WEEKLY_RETENTION=4   # Garder 4 semaines de sauvegardes hebdomadaires
MONTHLY_RETENTION=12 # Garder 12 mois de sauvegardes mensuelles

# Création des dossiers de sauvegarde
setup_backup_directories() {
    local backup_type=$1
    local backup_dir="$BACKUP_ROOT/$backup_type/$TIMESTAMP"
    
    mkdir -p "$backup_dir"
    mkdir -p "$backup_dir/databases"
    mkdir -p "$backup_dir/files"
    mkdir -p "$backup_dir/logs"
    mkdir -p "$backup_dir/config"
    
    echo "$backup_dir"
}

# Sauvegarde des bases de données PostgreSQL
backup_databases() {
    local backup_dir=$1
    log_info "Sauvegarde des bases de données..."
    
    for db in "${DATABASES[@]}"; do
        log_info "Sauvegarde de la base de données: $db"
        
        local db_backup_file="$backup_dir/databases/${db}_${TIMESTAMP}.sql"
        local db_backup_compressed="$db_backup_file.gz"
        
        # Vérifier que la base de données existe
        if psql -lqt | cut -d \| -f 1 | grep -qw "$db"; then
            # Sauvegarde avec pg_dump
            if pg_dump "$db" > "$db_backup_file"; then
                # Compression
                gzip "$db_backup_file"
                
                local file_size=$(du -h "$db_backup_compressed" | cut -f1)
                log_success "Base de données $db sauvegardée (${file_size})"
                
                # Vérification de l'intégrité
                if gunzip -t "$db_backup_compressed"; then
                    log_success "Intégrité de la sauvegarde $db vérifiée"
                else
                    log_error "Erreur d'intégrité pour la sauvegarde $db"
                    return 1
                fi
            else
                log_error "Échec de la sauvegarde pour $db"
                return 1
            fi
        else
            log_warning "Base de données $db non trouvée"
        fi
    done
    
    return 0
}

# Sauvegarde de Redis
backup_redis() {
    local backup_dir=$1
    log_info "Sauvegarde de Redis..."
    
    if command -v redis-cli &> /dev/null; then
        local redis_backup_file="$backup_dir/databases/redis_${TIMESTAMP}.rdb"
        
        # Forcer une sauvegarde Redis
        if redis-cli BGSAVE | grep -q "Background saving started"; then
            # Attendre que la sauvegarde se termine
            sleep 5
            
            # Copier le fichier RDB
            local redis_dir=$(redis-cli CONFIG GET dir | tail -1)
            local redis_dbfilename=$(redis-cli CONFIG GET dbfilename | tail -1)
            
            if [[ -f "$redis_dir/$redis_dbfilename" ]]; then
                cp "$redis_dir/$redis_dbfilename" "$redis_backup_file"
                gzip "$redis_backup_file"
                log_success "Redis sauvegardé"
            else
                log_warning "Fichier RDB Redis non trouvé"
            fi
        else
            log_warning "Impossible de déclencher la sauvegarde Redis"
        fi
    else
        log_warning "Redis CLI non disponible"
    fi
}

# Sauvegarde des fichiers uploadés
backup_uploaded_files() {
    local backup_dir=$1
    log_info "Sauvegarde des fichiers uploadés..."
    
    local uploads_dir="$PROJECT_ROOT/uploads"
    if [[ -d "$uploads_dir" ]]; then
        local files_backup="$backup_dir/files/uploads_${TIMESTAMP}.tar.gz"
        
        if tar -czf "$files_backup" -C "$PROJECT_ROOT" uploads/; then
            local file_size=$(du -h "$files_backup" | cut -f1)
            log_success "Fichiers uploadés sauvegardés (${file_size})"
        else
            log_error "Échec de la sauvegarde des fichiers uploadés"
            return 1
        fi
    else
        log_info "Aucun dossier uploads trouvé"
    fi
}

# Sauvegarde des logs
backup_logs() {
    local backup_dir=$1
    log_info "Sauvegarde des logs..."
    
    local logs_dir="$PROJECT_ROOT/logs"
    if [[ -d "$logs_dir" ]]; then
        local logs_backup="$backup_dir/logs/logs_${TIMESTAMP}.tar.gz"
        
        # Sauvegarder les logs de plus de 1 jour
        find "$logs_dir" -name "*.log" -mtime +1 -print0 | tar -czf "$logs_backup" --null -T -
        
        if [[ -f "$logs_backup" ]]; then
            local file_size=$(du -h "$logs_backup" | cut -f1)
            log_success "Logs sauvegardés (${file_size})"
        else
            log_info "Aucun log ancien à sauvegarder"
        fi
    fi
}

# Sauvegarde des configurations
backup_configurations() {
    local backup_dir=$1
    log_info "Sauvegarde des configurations..."
    
    local config_backup="$backup_dir/config/config_${TIMESTAMP}.tar.gz"
    
    # Fichiers de configuration à sauvegarder
    local config_files=(
        "docker-compose*.yml"
        "package.json"
        "tsconfig.json"
        ".env.example"
        "microservices/*/package.json"
        "microservices/*/tsconfig.json"
        "microservices/*/.env.example"
    )
    
    # Créer une liste des fichiers existants
    local files_to_backup=()
    for pattern in "${config_files[@]}"; do
        for file in $pattern; do
            if [[ -f "$file" ]]; then
                files_to_backup+=("$file")
            fi
        done
    done
    
    if [[ ${#files_to_backup[@]} -gt 0 ]]; then
        tar -czf "$config_backup" "${files_to_backup[@]}"
        log_success "Configurations sauvegardées"
    else
        log_warning "Aucun fichier de configuration trouvé"
    fi
}

# Upload vers S3 (optionnel)
upload_to_s3() {
    local backup_dir=$1
    
    if [[ -n "$AWS_S3_BUCKET" ]] && command -v aws &> /dev/null; then
        log_info "Upload vers S3: $AWS_S3_BUCKET"
        
        local s3_path="s3://$AWS_S3_BUCKET/groupomania-backups/$(basename "$backup_dir")"
        
        if aws s3 cp "$backup_dir" "$s3_path" --recursive --region "$AWS_REGION"; then
            log_success "Sauvegarde uploadée vers S3"
            
            # Créer un fichier de métadonnées
            local metadata_file="$backup_dir/metadata.json"
            cat > "$metadata_file" << EOF
{
    "timestamp": "$TIMESTAMP",
    "backup_type": "$(basename $(dirname "$backup_dir"))",
    "s3_location": "$s3_path",
    "size": "$(du -sh "$backup_dir" | cut -f1)",
    "databases": $(printf '%s\n' "${DATABASES[@]}" | jq -R . | jq -s .),
    "created_by": "$(whoami)@$(hostname)"
}
EOF
            aws s3 cp "$metadata_file" "$s3_path/metadata.json" --region "$AWS_REGION"
        else
            log_error "Échec de l'upload S3"
            return 1
        fi
    else
        log_info "Upload S3 non configuré ou AWS CLI non disponible"
    fi
}

# Nettoyage des anciennes sauvegardes
cleanup_old_backups() {
    log_info "Nettoyage des anciennes sauvegardes..."
    
    # Nettoyage des sauvegardes quotidiennes
    if [[ -d "$BACKUP_ROOT/daily" ]]; then
        find "$BACKUP_ROOT/daily" -type d -mtime +$DAILY_RETENTION -exec rm -rf {} +
        log_info "Sauvegardes quotidiennes anciennes supprimées (> $DAILY_RETENTION jours)"
    fi
    
    # Nettoyage des sauvegardes hebdomadaires
    if [[ -d "$BACKUP_ROOT/weekly" ]]; then
        find "$BACKUP_ROOT/weekly" -type d -mtime +$((WEEKLY_RETENTION * 7)) -exec rm -rf {} +
        log_info "Sauvegardes hebdomadaires anciennes supprimées (> $WEEKLY_RETENTION semaines)"
    fi
    
    # Nettoyage des sauvegardes mensuelles
    if [[ -d "$BACKUP_ROOT/monthly" ]]; then
        find "$BACKUP_ROOT/monthly" -type d -mtime +$((MONTHLY_RETENTION * 30)) -exec rm -rf {} +
        log_info "Sauvegardes mensuelles anciennes supprimées (> $MONTHLY_RETENTION mois)"
    fi
    
    # Nettoyage S3 si configuré
    if [[ -n "$AWS_S3_BUCKET" ]] && command -v aws &> /dev/null; then
        log_info "Nettoyage des anciennes sauvegardes S3..."
        
        # Politique de cycle de vie S3 recommandée à configurer manuellement
        log_info "Note: Configurez une politique de cycle de vie S3 pour le nettoyage automatique"
    fi
}

# Restauration d'une sauvegarde
restore_backup() {
    local backup_path=$1
    log_info "Restauration de la sauvegarde: $backup_path"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Dossier de sauvegarde non trouvé: $backup_path"
        return 1
    fi
    
    # Confirmation utilisateur
    read -p "Êtes-vous sûr de vouloir restaurer cette sauvegarde? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        log_info "Restauration annulée"
        return 0
    fi
    
    # Restauration des bases de données
    if [[ -d "$backup_path/databases" ]]; then
        for db_backup in "$backup_path/databases"/*.sql.gz; do
            if [[ -f "$db_backup" ]]; then
                local db_name=$(basename "$db_backup" | sed 's/_[0-9]*\.sql\.gz$//')
                log_info "Restauration de la base de données: $db_name"
                
                # Décompresser et restaurer
                gunzip -c "$db_backup" | psql "$db_name"
                log_success "Base de données $db_name restaurée"
            fi
        done
    fi
    
    # Restauration des fichiers
    if [[ -f "$backup_path/files/uploads_"*".tar.gz" ]]; then
        log_info "Restauration des fichiers uploadés..."
        tar -xzf "$backup_path/files/uploads_"*".tar.gz" -C "$PROJECT_ROOT"
        log_success "Fichiers uploadés restaurés"
    fi
    
    log_success "Restauration terminée"
}

# Vérification de la santé des sauvegardes
verify_backup_health() {
    local backup_path=$1
    log_info "Vérification de la santé de la sauvegarde: $backup_path"
    
    local errors=0
    
    # Vérifier les sauvegardes de bases de données
    for db in "${DATABASES[@]}"; do
        local db_backup="$backup_path/databases/${db}_"*".sql.gz"
        if ls $db_backup 1> /dev/null 2>&1; then
            if gunzip -t $db_backup; then
                log_success "Sauvegarde $db: OK"
            else
                log_error "Sauvegarde $db: corrompue"
                ((errors++))
            fi
        else
            log_warning "Sauvegarde $db: non trouvée"
        fi
    done
    
    # Vérifier la taille totale
    local backup_size=$(du -sh "$backup_path" | cut -f1)
    log_info "Taille totale de la sauvegarde: $backup_size"
    
    if [[ $errors -eq 0 ]]; then
        log_success "Sauvegarde saine"
        return 0
    else
        log_error "$errors erreur(s) détectée(s)"
        return 1
    fi
}

# Listing des sauvegardes disponibles
list_backups() {
    log_info "Sauvegardes disponibles:"
    echo ""
    
    for backup_type in daily weekly monthly; do
        if [[ -d "$BACKUP_ROOT/$backup_type" ]]; then
            echo "=== Sauvegardes $backup_type ==="
            for backup_dir in "$BACKUP_ROOT/$backup_type"/*; do
                if [[ -d "$backup_dir" ]]; then
                    local size=$(du -sh "$backup_dir" | cut -f1)
                    local date=$(basename "$backup_dir")
                    echo "  $date ($size)"
                fi
            done
            echo ""
        fi
    done
}

# Affichage de l'aide
show_help() {
    echo ""
    echo "💾 Script de sauvegarde Groupomania Backend"
    echo "==========================================="
    echo ""
    echo "Usage: $0 <commande> [options]"
    echo ""
    echo "Commandes:"
    echo "  daily              - Sauvegarde quotidienne complète"
    echo "  weekly             - Sauvegarde hebdomadaire"
    echo "  monthly            - Sauvegarde mensuelle"
    echo "  db-only            - Sauvegarder uniquement les bases de données"
    echo "  files-only         - Sauvegarder uniquement les fichiers"
    echo "  restore <path>     - Restaurer une sauvegarde"
    echo "  verify <path>      - Vérifier une sauvegarde"
    echo "  list               - Lister les sauvegardes disponibles"
    echo "  cleanup            - Nettoyer les anciennes sauvegardes"
    echo ""
    echo "Variables d'environnement:"
    echo "  BACKUP_ROOT        - Dossier racine des sauvegardes (défaut: ./backups)"
    echo "  AWS_S3_BUCKET      - Bucket S3 pour sauvegarde distante"
    echo "  AWS_REGION         - Région AWS (défaut: us-east-1)"
    echo ""
    echo "Exemples:"
    echo "  $0 daily                           # Sauvegarde quotidienne"
    echo "  $0 restore backups/daily/20240124_120000"
    echo "  AWS_S3_BUCKET=my-bucket $0 weekly # Avec upload S3"
    echo ""
}

# Sauvegarde complète
full_backup() {
    local backup_type=$1
    local backup_dir=$(setup_backup_directories "$backup_type")
    
    log_info "Début de la sauvegarde $backup_type dans: $backup_dir"
    
    # Exécuter toutes les sauvegardes
    if backup_databases "$backup_dir" && \
       backup_redis "$backup_dir" && \
       backup_uploaded_files "$backup_dir" && \
       backup_logs "$backup_dir" && \
       backup_configurations "$backup_dir"; then
        
        # Upload vers S3 si configuré
        upload_to_s3 "$backup_dir"
        
        # Vérification de la sauvegarde
        verify_backup_health "$backup_dir"
        
        local backup_size=$(du -sh "$backup_dir" | cut -f1)
        log_success "Sauvegarde $backup_type terminée avec succès ($backup_size)"
        
        # Créer un fichier de résumé
        cat > "$backup_dir/summary.txt" << EOF
Sauvegarde Groupomania Backend
============================

Type: $backup_type
Timestamp: $TIMESTAMP
Taille: $backup_size
Bases de données: ${DATABASES[*]}

Contenu:
- Bases de données PostgreSQL
- Cache Redis
- Fichiers uploadés
- Logs applicatifs
- Configurations

Créé par: $(whoami)@$(hostname)
EOF
        
        return 0
    else
        log_error "Échec de la sauvegarde $backup_type"
        return 1
    fi
}

# Script principal
main() {
    case "${1:-daily}" in
        "daily")
            full_backup "daily"
            cleanup_old_backups
            ;;
        "weekly")
            full_backup "weekly"
            cleanup_old_backups
            ;;
        "monthly")
            full_backup "monthly"
            cleanup_old_backups
            ;;
        "db-only")
            backup_dir=$(setup_backup_directories "manual")
            backup_databases "$backup_dir"
            backup_redis "$backup_dir"
            ;;
        "files-only")
            backup_dir=$(setup_backup_directories "manual")
            backup_uploaded_files "$backup_dir"
            backup_logs "$backup_dir"
            backup_configurations "$backup_dir"
            ;;
        "restore")
            if [[ -n "$2" ]]; then
                restore_backup "$2"
            else
                log_error "Veuillez spécifier le chemin de la sauvegarde"
                exit 1
            fi
            ;;
        "verify")
            if [[ -n "$2" ]]; then
                verify_backup_health "$2"
            else
                log_error "Veuillez spécifier le chemin de la sauvegarde"
                exit 1
            fi
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
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
