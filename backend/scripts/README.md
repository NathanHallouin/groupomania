# Scripts d'automatisation Groupomania Backend

Ce dossier contient tous les scripts nécessaires pour l'automatisation du développement, déploiement et maintenance du backend Groupomania.

## 📁 Structure des scripts

```
scripts/
├── setup.sh          # Installation et configuration initiale
├── dev.sh             # Outils de développement quotidien
├── deploy.sh          # Déploiement automatisé
├── monitor.sh         # Surveillance et monitoring
├── backup.sh          # Gestion des sauvegardes
└── README.md          # Ce fichier
```

## 🚀 Setup - Installation initiale

### Usage
```bash
# Installation interactive
./scripts/setup.sh

# Installation automatique complète
./scripts/setup.sh full

# Démarrage avec Docker
./scripts/setup.sh docker
```

### Fonctionnalités
- ✅ Vérification des prérequis (Node.js, Docker)
- ✅ Installation des dépendances pour tous les microservices
- ✅ Configuration des fichiers d'environnement
- ✅ Setup des bases de données PostgreSQL
- ✅ Configuration Redis
- ✅ Génération des clés de sécurité
- ✅ Compilation TypeScript
- ✅ Tests de santé

## 🛠️ Dev - Outils de développement

### Usage
```bash
# Démarrer un service
./scripts/dev.sh start auth-service

# Arrêter un service  
./scripts/dev.sh stop auth-service

# Voir le statut de tous les services
./scripts/dev.sh status

# Voir les logs d'un service
./scripts/dev.sh logs user-service

# Compiler tous les services
./scripts/dev.sh build all

# Lancer les tests
./scripts/dev.sh test all
```

### Fonctionnalités
- ✅ Gestion des services individuels (start/stop/restart)
- ✅ Surveillance des statuts
- ✅ Affichage des logs en temps réel
- ✅ Compilation et tests automatisés
- ✅ Linting et formatage
- ✅ Surveillance des modifications (watch mode)
- ✅ Nettoyage des fichiers temporaires

## 🚀 Deploy - Déploiement automatisé

### Usage
```bash
# Déploiement en staging
./scripts/deploy.sh staging

# Déploiement en production
./scripts/deploy.sh production

# Rollback rapide
./scripts/deploy.sh production --rollback
```

### Fonctionnalités
- ✅ Vérifications pré-déploiement (tests, linting, Git)
- ✅ Construction d'images Docker optimisées
- ✅ Tests des images avant déploiement
- ✅ Publication vers registry Docker
- ✅ Sauvegarde automatique en production
- ✅ Déploiement avec Docker Compose
- ✅ Tests post-déploiement
- ✅ Monitoring et alertes
- ✅ Rollback automatique en cas d'échec

### Variables d'environnement
```bash
export DOCKER_REGISTRY_USER="username"
export DOCKER_REGISTRY_PASS="password"
export DEPLOYMENT_WEBHOOK="https://hooks.slack.com/..."
```

## 🔍 Monitor - Surveillance et monitoring

### Usage
```bash
# Vérification complète
./scripts/monitor.sh check

# Surveillance continue
./scripts/monitor.sh watch 30

# Test de charge
./scripts/monitor.sh load-test

# Génération de rapport
./scripts/monitor.sh report
```

### Fonctionnalités
- ✅ Surveillance des services HTTP avec temps de réponse
- ✅ Monitoring des bases de données PostgreSQL et Redis
- ✅ Surveillance des ressources système (CPU, RAM, disque)
- ✅ Analyse des logs pour détecter les erreurs
- ✅ Vérification des certificats SSL
- ✅ Tests de charge basiques
- ✅ Alertes Slack et email
- ✅ Rapports de santé en JSON

### Configuration des alertes
```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
export EMAIL_RECIPIENTS="admin@groupomania.com"
```

## 💾 Backup - Gestion des sauvegardes

### Usage
```bash
# Sauvegarde quotidienne
./scripts/backup.sh daily

# Sauvegarde avec upload S3
AWS_S3_BUCKET=my-bucket ./scripts/backup.sh weekly

# Restauration
./scripts/backup.sh restore backups/daily/20240124_120000

# Lister les sauvegardes
./scripts/backup.sh list
```

### Fonctionnalités
- ✅ Sauvegarde automatisée des bases de données PostgreSQL
- ✅ Sauvegarde du cache Redis
- ✅ Sauvegarde des fichiers uploadés
- ✅ Sauvegarde des logs et configurations
- ✅ Compression et vérification d'intégrité
- ✅ Upload vers AWS S3
- ✅ Restauration complète ou sélective
- ✅ Nettoyage automatique (rétention configurable)
- ✅ Rapports de sauvegarde

### Configuration AWS S3
```bash
export AWS_S3_BUCKET="groupomania-backups"
export AWS_REGION="eu-west-3"
# Configurez vos credentials AWS avec aws configure
```

## 📅 Automation - Tâches automatisées

### Crontab recommandée

```bash
# Éditer le crontab
crontab -e

# Ajouter ces lignes:
# Sauvegarde quotidienne à 2h du matin
0 2 * * * cd /path/to/groupomania-backend && ./scripts/backup.sh daily

# Monitoring toutes les 5 minutes
*/5 * * * * cd /path/to/groupomania-backend && ./scripts/monitor.sh check

# Nettoyage hebdomadaire le dimanche à 3h
0 3 * * 0 cd /path/to/groupomania-backend && ./scripts/dev.sh clean

# Sauvegarde hebdomadaire le dimanche à 1h
0 1 * * 0 cd /path/to/groupomania-backend && ./scripts/backup.sh weekly
```

### GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging
        run: ./scripts/deploy.sh staging
        env:
          DOCKER_REGISTRY_USER: ${{ secrets.DOCKER_USER }}
          DOCKER_REGISTRY_PASS: ${{ secrets.DOCKER_PASS }}
```

## 🔧 Configuration globale

### Variables d'environnement principales

```bash
# Développement
export NODE_ENV=development
export LOG_LEVEL=debug

# Base de données
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=groupomania
export DB_PASS=password

# Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Sécurité
export JWT_SECRET=your-secret-key
export ENCRYPTION_KEY=your-encryption-key

# Monitoring
export SLACK_WEBHOOK=https://hooks.slack.com/...
export EMAIL_RECIPIENTS=admin@groupomania.com

# Sauvegardes
export BACKUP_ROOT=/path/to/backups
export AWS_S3_BUCKET=groupomania-backups

# Déploiement
export DOCKER_REGISTRY_USER=username
export DOCKER_REGISTRY_PASS=password
export DEPLOYMENT_WEBHOOK=https://hooks.slack.com/...
```

## 🏃‍♂️ Workflow de développement recommandé

### 1. Setup initial
```bash
# Cloner le projet
git clone https://github.com/organization/groupomania-backend.git
cd groupomania-backend

# Installation complète
./scripts/setup.sh full

# Initialiser l'environnement de dev
./scripts/dev.sh init
```

### 2. Développement quotidien
```bash
# Démarrer les services nécessaires
./scripts/dev.sh start auth-service
./scripts/dev.sh start user-service

# Développer avec watch mode
./scripts/dev.sh watch auth-service

# Tests avant commit
./scripts/dev.sh test all
./scripts/dev.sh lint all
```

### 3. Déploiement
```bash
# Staging pour tests
./scripts/deploy.sh staging

# Production après validation
./scripts/deploy.sh production
```

### 4. Monitoring
```bash
# Surveillance continue
./scripts/monitor.sh watch

# Sauvegarde régulière
./scripts/backup.sh daily
```

## 🚨 Dépannage

### Problèmes fréquents

1. **Erreur de permissions**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Services non démarrés**
   ```bash
   ./scripts/dev.sh status
   ./scripts/monitor.sh services
   ```

3. **Base de données inaccessible**
   ```bash
   ./scripts/monitor.sh databases
   ```

4. **Problème de build**
   ```bash
   ./scripts/dev.sh clean
   ./scripts/dev.sh build all
   ```

### Logs de débogage

```bash
# Logs des services
./scripts/dev.sh logs service-name

# Logs de monitoring
tail -f logs/monitoring.log

# Logs d'application
tail -f logs/application-$(date +%Y-%m-%d).log
```

## 📊 Métriques et KPIs

### Métriques surveillées
- ✅ Temps de réponse des APIs
- ✅ Utilisation CPU/RAM/Disque
- ✅ Nombre de connexions base de données
- ✅ Taille des bases de données
- ✅ Erreurs dans les logs
- ✅ Disponibilité des services

### Seuils d'alerte
- ⚠️ Temps de réponse > 5s
- ⚠️ CPU > 80%
- ⚠️ RAM > 80%
- 🚨 Disque > 85%
- 🚨 Service inaccessible
- 🚨 Erreurs critiques dans les logs

## 🔒 Sécurité

### Bonnes pratiques implémentées
- ✅ Variables d'environnement sécurisées
- ✅ Chiffrement des sauvegardes
- ✅ Validation des images Docker
- ✅ Authentification pour les déploiements
- ✅ Logs d'audit
- ✅ Rotation des secrets

### Recommandations
- 🔒 Changez régulièrement les mots de passe
- 🔒 Utilisez des clés SSH pour les déploiements
- 🔒 Activez l'authentification 2FA
- 🔒 Surveillez les accès aux sauvegardes
- 🔒 Auditez régulièrement les permissions

## 📞 Support

En cas de problème avec les scripts :

1. Vérifiez les logs : `logs/monitoring.log`
2. Testez les prérequis : `./scripts/setup.sh`
3. Consultez la documentation des services
4. Contactez l'équipe DevOps

---

*Documentation générée automatiquement - Dernière mise à jour : $(date)*
