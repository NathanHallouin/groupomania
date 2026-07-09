# Architecture Microservices - Groupomania

## 📋 Vue d'ensemble

Ce document décrit l'architecture microservices de l'application Groupomania, un réseau social d'entreprise moderne et scalable. L'architecture a été conçue pour remplacer le système monolithique précédent en offrant une meilleure maintenabilité, scalabilité et résilience.

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTS                                │
│  (Web App, Mobile App, Applications tierces)               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  API GATEWAY                                │
│  Port: 3000                                                 │
│  • Authentification & Authorization                        │
│  • Rate Limiting & Throttling                              │
│  • Request/Response Logging                                 │
│  • Circuit Breaker Pattern                                  │
│  • Load Balancing                                           │
│  • Service Discovery                                        │
│  • CORS & Security Headers                                  │
└─────────┬─────────┬─────────┬─────────┬─────────────────────┘
          │         │         │         │
  ┌───────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
  │ Auth     │ │ User   │ │Message │ │ File   │
  │ Service  │ │Service │ │Service │ │Service │
  │ (3001)   │ │(3002)  │ │(3003)  │ │(3004)  │
  └─────┬────┘ └────┬───┘ └───┬────┘ └──┬─────┘
        │           │         │         │
        └───────────┼─────────┼─────────┘
                    │         │
          ┌─────────▼─────────▼─────────┐
          │       INFRASTRUCTURE       │
          │  • PostgreSQL (5432)       │
          │  • Redis Cache (6379)      │
          │  • File Storage             │
          │  • Monitoring & Logs        │
          └─────────────────────────────┘
```

## 🚀 Services

### 1. API Gateway (`api-gateway/`)
**Port:** 3000  
**Responsabilités:**
- Point d'entrée unique pour tous les clients
- Authentification et autorisation globales
- Routage intelligent vers les microservices
- Rate limiting et protection anti-DDoS
- Monitoring et logging centralisé
- Gestion des erreurs et circuit breaker
- Load balancing et service discovery

**Technologies:**
- Express.js + TypeScript
- http-proxy-middleware pour le routage
- helmet pour la sécurité
- express-rate-limit pour la limitation

### 2. Auth Service (`auth-service/`)
**Port:** 3001  
**Responsabilités:**
- Gestion de l'authentification (login/logout)
- Inscription des nouveaux utilisateurs
- Génération et validation des tokens JWT
- Gestion des refresh tokens
- Protection contre les attaques par force brute
- Audit des connexions

**Technologies:**
- Express.js + TypeScript
- bcrypt pour le hashage des mots de passe
- jsonwebtoken pour les JWT
- PostgreSQL pour le stockage
- Redis pour le cache des sessions

**Base de données:** `groupomania_auth`

### 3. User Service (`user-service/`)
**Port:** 3002  
**Responsabilités:**
- Gestion des profils utilisateurs
- CRUD des informations personnelles
- Gestion des rôles et permissions
- Relations entre utilisateurs (suivis, etc.)
- Préférences utilisateur

**Technologies:**
- Express.js + TypeScript
- Sequelize ORM
- PostgreSQL
- Multer pour les avatars

**Base de données:** `groupomania_users`

### 4. Message Service (`message-service/`)
**Port:** 3003  
**Responsabilités:**
- Création et gestion des posts
- Système de commentaires
- Gestion des réactions (likes, etc.)
- Timeline et flux d'actualités
- Notifications

**Technologies:**
- Express.js + TypeScript
- Sequelize ORM
- PostgreSQL
- Redis pour le cache des timelines

**Base de données:** `groupomania_messages`

### 5. File Service (`file-service/`)
**Port:** 3004  
**Responsabilités:**
- Upload et stockage des fichiers
- Traitement des images (redimensionnement, optimisation)
- Gestion des métadonnées
- Sécurité et validation des fichiers
- Génération de thumbnails

**Technologies:**
- Express.js + TypeScript
- Multer pour les uploads
- Sharp pour le traitement d'images
- Système de fichiers local/cloud

**Stockage:** `uploads/` directory + base de données pour métadonnées

## 🗄️ Infrastructure

### Base de Données - PostgreSQL
- **Version:** 15-alpine
- **Port:** 5432
- **Architecture:** Une base par service pour l'isolation
  - `groupomania_auth` - Service d'authentification
  - `groupomania_users` - Service utilisateur
  - `groupomania_messages` - Service de messages
  - `groupomania_files` - Service de fichiers

### Cache - Redis
- **Version:** 7-alpine
- **Port:** 6379
- **Usage:**
  - Cache des sessions utilisateur
  - Cache des timelines
  - Rate limiting
  - Stockage temporaire

### Stockage de Fichiers
- **Local:** `uploads/` pour le développement
- **Production:** Configuration cloud (S3, etc.)

## 🛡️ Sécurité

### Authentification
- **JWT Access Tokens:** Durée de vie courte (15 min)
- **Refresh Tokens:** Durée de vie longue (7 jours)
- **Rotation des tokens:** Sécurité renforcée

### Protection
- **Rate Limiting:** Protection contre les attaques DDoS
- **Helmet:** Headers de sécurité HTTP
- **CORS:** Configuration stricte des domaines autorisés
- **Validation:** Validation stricte des inputs avec Joi
- **Sanitization:** Protection XSS et injection

### Audit et Monitoring
- **Logs structurés:** Winston + rotation quotidienne
- **Audit trail:** Traçabilité des actions utilisateur
- **Health checks:** Monitoring de la santé des services

## 🚀 Déploiement

### Docker Compose
```bash
# Développement avec tous les services
docker-compose -f docker-compose.microservices.yml up

# Services individuels
docker-compose -f docker-compose.microservices.yml up auth-service user-service
```

### Variables d'Environnement
Chaque service possède son propre fichier `.env` avec :
- Configuration base de données
- Secrets JWT
- Configuration Redis
- Paramètres spécifiques au service

## 📊 Communication Inter-Services

### API REST
- Communication synchrone via HTTP/HTTPS
- Authentification par JWT entre services
- Retry et circuit breaker patterns

### Messages Asynchrones (Future)
- Event sourcing pour la cohérence des données
- Message queues pour les notifications
- Saga pattern pour les transactions distribuées

## 🔄 Patterns Architecturaux

### API Gateway Pattern
- Point d'entrée unique
- Routage et composition de réponses
- Cross-cutting concerns (auth, logging, rate limiting)

### Database per Service
- Isolation des données
- Autonomie des services
- Cohérence éventuelle

### Circuit Breaker
- Protection contre les pannes en cascade
- Fallback mechanisms
- Monitoring de la santé des services

### Shared Libraries
- Code commun dans le dossier `shared/`
- Types TypeScript partagés
- Utilitaires et middleware communs

## 🚦 Monitoring et Observabilité

### Logs
- **Format:** JSON structuré
- **Niveaux:** Error, Warn, Info, Debug
- **Rotation:** Quotidienne avec archivage
- **Localisation:** `logs/` directory

### Métriques
- Temps de réponse par endpoint
- Taux d'erreur par service
- Utilisation des ressources
- Métriques business (nombre d'utilisateurs, posts, etc.)

### Health Checks
- `/health` endpoint sur chaque service
- Vérification des dépendances (DB, Redis)
- Intégration avec Docker health checks

## 📈 Scalabilité

### Horizontale
- Services stateless
- Load balancing via API Gateway
- Auto-scaling basé sur les métriques

### Performance
- Cache Redis pour les données fréquentes
- Pagination pour les listes
- Compression des réponses HTTP
- CDN pour les assets statiques

## 🔮 Évolutions Futures

### Améliorations Techniques
- [ ] Migration vers des message queues (RabbitMQ/Kafka)
- [ ] Implémentation d'Event Sourcing
- [ ] Service mesh (Istio) pour la production
- [ ] Observabilité avancée (Prometheus + Grafana)

### Nouveaux Services
- [ ] Notification Service
- [ ] Search Service (Elasticsearch)
- [ ] Analytics Service
- [ ] Email Service

### Infrastructure
- [ ] Kubernetes pour l'orchestration
- [ ] CI/CD avancé avec GitHub Actions
- [ ] Multi-environnements (dev, staging, prod)
- [ ] Backup et disaster recovery automatisés

## 📚 Documentation Additionnelle

- [Détails des Services](./services/)
- [Schémas de Base de Données](./database-schemas/)
- [APIs et Endpoints](./api-documentation/)
- [Guide de Déploiement](./deployment-guide/)
- [Sécurité et Bonnes Pratiques](./security-guidelines/)
