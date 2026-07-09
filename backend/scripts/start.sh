#!/bin/bash

# Script de démarrage rapide pour Groupomania Backend
# Point d'entrée principal pour tous les scripts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logo ASCII
show_logo() {
    echo -e "${CYAN}"
    cat << 'EOF'
  ____                                            _       
 / ___|_ __ ___  _   _ _ __   ___  _ __ ___   __ _| |_ __ _
| |  _| '__/ _ \| | | | '_ \ / _ \| '_ ` _ \ / _` | __/ _` |
| |_| | | | (_) | |_| | |_) | (_) | | | | | | (_| | || (_| |
 \____|_|  \___/ \__,_| .__/ \___/|_| |_| |_|\__,_|\__\__,_|
                      |_|                                  
EOF
    echo -e "${NC}"
    echo -e "${BLUE}Backend Automation Scripts v1.0${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
}

# Menu principal
show_main_menu() {
    echo -e "${YELLOW}🚀 Menu Principal${NC}"
    echo ""
    echo "1. 🔧 Setup & Installation"
    echo "2. 🛠️  Développement"
    echo "3. 🚀 Déploiement"
    echo "4. 🔍 Monitoring"
    echo "5. 💾 Sauvegardes"
    echo "6. ⚙️  Configuration"
    echo "7. 📚 Documentation"
    echo "8. 🧪 Tests rapides"
    echo "9. 🐳 Docker"
    echo "0. ❌ Quitter"
    echo ""
}

# Menu Setup
show_setup_menu() {
    echo -e "${YELLOW}🔧 Setup & Installation${NC}"
    echo ""
    echo "1. Installation complète (recommandé pour nouveau projet)"
    echo "2. Installation des dépendances seulement"
    echo "3. Configuration de l'environnement"
    echo "4. Configuration des bases de données"
    echo "5. Génération des clés de sécurité"
    echo "6. Tests de santé du système"
    echo "7. Initialisation avec Docker"
    echo "0. Retour au menu principal"
    echo ""
}

# Menu Développement
show_dev_menu() {
    echo -e "${YELLOW}🛠️ Développement${NC}"
    echo ""
    echo "1. Démarrer tous les services"
    echo "2. Démarrer un service spécifique"
    echo "3. Arrêter tous les services"
    echo "4. Voir le statut des services"
    echo "5. Voir les logs en temps réel"
    echo "6. Compiler tous les services"
    echo "7. Lancer tous les tests"
    echo "8. Lancer le linting"
    echo "9. Nettoyage (clean)"
    echo "10. Mode surveillance (watch)"
    echo "0. Retour au menu principal"
    echo ""
}

# Menu Déploiement
show_deploy_menu() {
    echo -e "${YELLOW}🚀 Déploiement${NC}"
    echo ""
    echo "1. Déploiement en staging"
    echo "2. Déploiement en production"
    echo "3. Rollback staging"
    echo "4. Rollback production"
    echo "5. Vérification pré-déploiement"
    echo "6. Tests post-déploiement"
    echo "0. Retour au menu principal"
    echo ""
}

# Menu Monitoring
show_monitoring_menu() {
    echo -e "${YELLOW}🔍 Monitoring${NC}"
    echo ""
    echo "1. Vérification complète"
    echo "2. Surveillance continue"
    echo "3. Test des services seulement"
    echo "4. Test des bases de données"
    echo "5. Ressources système"
    echo "6. Analyse des logs"
    echo "7. Test de charge"
    echo "8. Générer un rapport"
    echo "0. Retour au menu principal"
    echo ""
}

# Menu Sauvegardes
show_backup_menu() {
    echo -e "${YELLOW}💾 Sauvegardes${NC}"
    echo ""
    echo "1. Sauvegarde quotidienne"
    echo "2. Sauvegarde hebdomadaire"
    echo "3. Sauvegarde mensuelle"
    echo "4. Sauvegarde bases de données seulement"
    echo "5. Sauvegarde fichiers seulement"
    echo "6. Restaurer une sauvegarde"
    echo "7. Lister les sauvegardes"
    echo "8. Vérifier une sauvegarde"
    echo "9. Nettoyer les anciennes sauvegardes"
    echo "0. Retour au menu principal"
    echo ""
}

# Fonctions d'exécution
run_setup() {
    case $1 in
        1) ./setup.sh full ;;
        2) ./setup.sh && echo "2" | ./setup.sh ;;
        3) ./setup.sh && echo "3" | ./setup.sh ;;
        4) ./setup.sh && echo "4" | ./setup.sh ;;
        5) source config.sh && generate_jwt_secret ;;
        6) ./setup.sh && echo "6" | ./setup.sh ;;
        7) ./setup.sh docker ;;
    esac
}

run_dev() {
    case $1 in
        1) 
            echo "Démarrage de tous les services..."
            ./dev.sh start auth-service &
            ./dev.sh start user-service &
            ./dev.sh start message-service &
            ./dev.sh start file-service &
            echo "Services démarrés en arrière-plan"
            ;;
        2) 
            echo "Services disponibles: auth-service, user-service, message-service, file-service"
            read -p "Service à démarrer: " service
            ./dev.sh start "$service"
            ;;
        3) 
            echo "Arrêt de tous les services..."
            ./dev.sh stop auth-service
            ./dev.sh stop user-service
            ./dev.sh stop message-service
            ./dev.sh stop file-service
            ;;
        4) ./dev.sh status ;;
        5) 
            echo "Services disponibles: auth-service, user-service, message-service, file-service"
            read -p "Service pour les logs: " service
            ./dev.sh logs "$service"
            ;;
        6) ./dev.sh build all ;;
        7) ./dev.sh test all ;;
        8) ./dev.sh lint all ;;
        9) ./dev.sh clean ;;
        10) 
            echo "Services disponibles: auth-service, user-service, message-service, file-service"
            read -p "Service à surveiller: " service
            ./dev.sh watch "$service"
            ;;
    esac
}

run_deploy() {
    case $1 in
        1) ./deploy.sh staging ;;
        2) 
            echo -e "${RED}⚠️ ATTENTION: Déploiement en PRODUCTION${NC}"
            read -p "Êtes-vous sûr ? (y/N): " confirm
            if [[ $confirm == [yY] ]]; then
                ./deploy.sh production
            fi
            ;;
        3) ./deploy.sh staging --rollback ;;
        4) 
            echo -e "${RED}⚠️ ATTENTION: Rollback en PRODUCTION${NC}"
            read -p "Êtes-vous sûr ? (y/N): " confirm
            if [[ $confirm == [yY] ]]; then
                ./deploy.sh production --rollback
            fi
            ;;
        5) ./deploy.sh staging --skip-tests --skip-backup ;;
        6) ./monitor.sh services ;;
    esac
}

run_monitoring() {
    case $1 in
        1) ./monitor.sh check ;;
        2) 
            read -p "Intervalle en secondes (défaut: 60): " interval
            ./monitor.sh watch "${interval:-60}"
            ;;
        3) ./monitor.sh services ;;
        4) ./monitor.sh databases ;;
        5) ./monitor.sh system ;;
        6) ./monitor.sh logs ;;
        7) ./monitor.sh load-test ;;
        8) ./monitor.sh report ;;
    esac
}

run_backup() {
    case $1 in
        1) ./backup.sh daily ;;
        2) ./backup.sh weekly ;;
        3) ./backup.sh monthly ;;
        4) ./backup.sh db-only ;;
        5) ./backup.sh files-only ;;
        6) 
            ./backup.sh list
            echo ""
            read -p "Chemin de la sauvegarde à restaurer: " backup_path
            ./backup.sh restore "$backup_path"
            ;;
        7) ./backup.sh list ;;
        8) 
            ./backup.sh list
            echo ""
            read -p "Chemin de la sauvegarde à vérifier: " backup_path
            ./backup.sh verify "$backup_path"
            ;;
        9) ./backup.sh cleanup ;;
    esac
}

# Menu Configuration
show_config_menu() {
    echo -e "${YELLOW}⚙️ Configuration${NC}"
    echo ""
    echo "1. Afficher la configuration actuelle"
    echo "2. Valider la configuration"
    echo "3. Générer un nouveau JWT secret"
    echo "4. Créer les dossiers nécessaires"
    echo "5. Éditer la configuration principale"
    echo "6. Éditer les variables d'environnement"
    echo "7. Tester la connexion base de données"
    echo "8. Tester la connexion Redis"
    echo "0. Retour au menu principal"
    echo ""
}

run_config() {
    case $1 in
        1) source config.sh && show_config ;;
        2) source config.sh && validate_config ;;
        3) source config.sh && generate_jwt_secret ;;
        4) source config.sh && create_directories ;;
        5) ${EDITOR:-nano} config.sh ;;
        6) ${EDITOR:-nano} ../.env ;;
        7) psql -h localhost -U groupomania -d groupomania_auth -c "SELECT 1;" ;;
        8) redis-cli ping ;;
    esac
}

# Menu Tests
show_test_menu() {
    echo -e "${YELLOW}🧪 Tests Rapides${NC}"
    echo ""
    echo "1. Tests unitaires complets"
    echo "2. Tests d'intégration"
    echo "3. Tests de performance"
    echo "4. Tests de sécurité"
    echo "5. Tests de l'API (Postman/Newman)"
    echo "6. Vérification du code (linting)"
    echo "7. Analyse de couverture"
    echo "8. Tests end-to-end"
    echo "0. Retour au menu principal"
    echo ""
}

run_tests() {
    case $1 in
        1) ./dev.sh test all ;;
        2) npm run test:integration ;;
        3) ./monitor.sh load-test ;;
        4) npm audit && npm run security-scan ;;
        5) newman run tests/api-tests.json ;;
        6) ./dev.sh lint all ;;
        7) npm run test:coverage ;;
        8) npm run test:e2e ;;
    esac
}

# Menu Docker
show_docker_menu() {
    echo -e "${YELLOW}🐳 Docker${NC}"
    echo ""
    echo "1. Construire toutes les images"
    echo "2. Démarrer avec Docker Compose"
    echo "3. Arrêter les conteneurs"
    echo "4. Voir les logs des conteneurs"
    echo "5. Nettoyer les images inutilisées"
    echo "6. Statistiques des conteneurs"
    echo "7. Shell dans un conteneur"
    echo "8. Redémarrer tous les services"
    echo "0. Retour au menu principal"
    echo ""
}

run_docker() {
    case $1 in
        1) docker-compose -f ../docker-compose.microservices.yml build ;;
        2) docker-compose -f ../docker-compose.microservices.yml up -d ;;
        3) docker-compose -f ../docker-compose.microservices.yml down ;;
        4) docker-compose -f ../docker-compose.microservices.yml logs -f ;;
        5) docker system prune -f ;;
        6) docker stats ;;
        7) 
            echo "Services: auth-service, user-service, message-service, file-service"
            read -p "Service: " service
            docker-compose -f ../docker-compose.microservices.yml exec "$service" /bin/bash
            ;;
        8) docker-compose -f ../docker-compose.microservices.yml restart ;;
    esac
}

# Documentation
show_docs() {
    echo -e "${YELLOW}📚 Documentation${NC}"
    echo ""
    echo "1. README principal"
    echo "2. Guide d'installation"
    echo "3. Guide de développement"
    echo "4. Guide de déploiement"
    echo "5. Documentation des scripts"
    echo "6. Architecture du projet"
    echo "7. API Documentation"
    echo "8. Dépannage"
    echo "0. Retour au menu principal"
    echo ""
}

run_docs() {
    case $1 in
        1) less ../README.md ;;
        2) less ../SETUP.md ;;
        3) less ../DEVELOPMENT.md ;;
        4) less ../DEPLOYMENT.md ;;
        5) less README.md ;;
        6) less ../ARCHITECTURE.md ;;
        7) 
            if command -v python3 >/dev/null; then
                echo "Démarrage du serveur de documentation..."
                cd .. && python3 -m http.server 8080
            else
                echo "Python3 non trouvé. Documentation disponible dans docs/"
            fi
            ;;
        8) less ../TROUBLESHOOTING.md ;;
    esac
}

# Fonction principale
main() {
    cd "$SCRIPT_DIR"
    
    # Vérification initiale
    if [[ ! -f "config.sh" ]]; then
        echo -e "${RED}Erreur: Fichiers de configuration manquants${NC}"
        exit 1
    fi
    
    while true; do
        clear
        show_logo
        show_main_menu
        
        read -p "Choisissez une option: " choice
        
        case $choice in
            1)
                clear
                show_setup_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_setup "$sub_choice"
                ;;
            2)
                clear
                show_dev_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_dev "$sub_choice"
                ;;
            3)
                clear
                show_deploy_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_deploy "$sub_choice"
                ;;
            4)
                clear
                show_monitoring_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_monitoring "$sub_choice"
                ;;
            5)
                clear
                show_backup_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_backup "$sub_choice"
                ;;
            6)
                clear
                show_config_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_config "$sub_choice"
                ;;
            7)
                clear
                show_docs
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_docs "$sub_choice"
                ;;
            8)
                clear
                show_test_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_tests "$sub_choice"
                ;;
            9)
                clear
                show_docker_menu
                read -p "Choisissez une option: " sub_choice
                [[ $sub_choice != "0" ]] && run_docker "$sub_choice"
                ;;
            0)
                echo -e "${GREEN}Au revoir !${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Option invalide${NC}"
                ;;
        esac
        
        if [[ $choice != "0" ]]; then
            echo ""
            read -p "Appuyez sur Entrée pour continuer..."
        fi
    done
}

# Lancement du script
main "$@"
