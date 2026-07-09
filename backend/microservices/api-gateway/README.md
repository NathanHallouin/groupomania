# Architecture Microservices - Groupomania

## Vue d'ensemble

Cette architecture microservices transforme l'application monolithique Groupomania en un système distribué et scalable. L'API Gateway agit comme point d'entrée unique et gère le routage, l'authentification, le rate limiting et la surveillance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTS                                │
│  (Web App, Mobile App, Third-party APIs)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  API GATEWAY                                │
│  - Authentification & Authorization                        │
│  - Rate Limiting & Throttling                              │
│  - Request/Response Logging                                 │
│  - Circuit Breaker Pattern                                  │
│  - Load Balancing                                           │
│  - Service Discovery                                        │
└─────────┬─────────┬─────────┬─────────┬─────────────────────┘
          │         │         │         │
  ┌───────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
  │ Auth     │ │ User   │ │Message │ │ File   │
  │ Service  │ │Service │ │Service │ │Service │
  │ (3001)   │ │(3002)  │ │(3003)  │ │(3004)  │
  └──────────┘ └────────┘ └────────┘ └────────┘
          │         │         │         │
  ┌───────▼─────────▼─────────▼─────────▼───────┐
  │             PostgreSQL Database             │
  │         (Shared or Per-Service)             │
  └─────────────────────────────────────────────┘
          │
  ┌───────▼──────┐
  │ Redis Cache  │
  │ & Sessions   │
  └──────────────┘
```

## Composants Principaux

### 1. API Gateway (Port 3000)

**Localisation :** `microservices/api-gateway/`

**Responsabilités :**
- Point d'entrée unique pour toutes les requêtes
- Authentification JWT et autorisation
- Rate limiting intelligent (par rôle utilisateur)
- Load balancing entre instances de services
- Circuit breaker pour la tolérance aux pannes
- Logging centralisé et métriques
- Validation des requêtes
- Proxy vers les microservices

**Technologies :**
- Express.js + TypeScript
- http-proxy-middleware pour le proxying
- express-rate-limit pour le rate limiting
- Winston pour le logging
- express-validator pour la validation

### 2. Service Discovery

**Implémentation :** Redis-based service registry

**Fonctionnalités :**
- Enregistrement automatique des services
- Health checks périodiques
- Découverte dynamique des services
- Métadonnées des services (version, capacité, etc.)

### 3. Load Balancer

**Stratégies supportées :**
- Round Robin
- Weighted Round Robin
- Least Connections
- Random
- Health-aware routing

### 4. Circuit Breaker

**Pattern de tolérance aux pannes :**
- États : CLOSED, OPEN, HALF_OPEN
- Seuils configurables
- Fallback responses
- Monitoring des échecs

## Middlewares

### AuthMiddleware
- Authentification JWT
- Vérification des rôles (user/admin)
- Propriété des ressources
- Permissions granulaires

### RateLimitMiddleware
- Rate limiting global et par endpoint
- Limites dynamiques par rôle
- Whitelist d'IPs
- Monitoring des limites

### LoggingMiddleware
- Logging structuré des requêtes/réponses
- Détection de tentatives de sécurité
- Métriques de performance
- Correlation IDs

### ValidationMiddleware
- Validation des données d'entrée
- Sanitisation XSS/injection
- Validation de fichiers
- Schémas de validation par endpoint

## Services Microservices (À implémenter)

### Auth Service (Port 3001)
```
Endpoints:
- POST /auth/login
- POST /auth/register
- POST /auth/refresh
- POST /auth/logout
- GET /auth/verify
```

### User Service (Port 3002)
```
Endpoints:
- GET /users/:id
- PUT /users/:id
- DELETE /users/:id
- GET /users/profile
- PUT /users/profile
```

### Message Service (Port 3003)
```
Endpoints:
- GET /messages
- POST /messages
- GET /messages/:id
- PUT /messages/:id
- DELETE /messages/:id
```

### File Service (Port 3004)
```
Endpoints:
- POST /upload
- GET /files/:id
- DELETE /files/:id
```

## Configuration

### Variables d'environnement

```bash
# API Gateway
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/groupomania
```

### Configuration Redis

```javascript
// Service Discovery utilise Redis pour :
- Registre des services : 'services:*'
- Health checks : 'health:*'
- Metrics : 'metrics:*'
- Rate limiting : 'rl:*'
```

## Routes API Gateway

### Routes d'Authentification
```
POST /auth/login      - Connexion utilisateur
POST /auth/register   - Inscription utilisateur
```

### Routes Protégées (Proxy)
```
/api/users/*      -> User Service (3002)
/api/messages/*   -> Message Service (3003)
/api/upload/*     -> File Service (3004)
/api/search/*     -> Search Service (3005)
```

### Routes d'Administration
```
GET /admin/services                    - Liste des services
POST /admin/circuit-breaker/reset/:service - Reset circuit breaker
GET /metrics                          - Métriques système
GET /health                          - Health check
```

## Déploiement

### Développement Local

1. **Démarrer Redis**
```bash
redis-server
```

2. **Démarrer l'API Gateway**
```bash
cd microservices/api-gateway
npm install
npm run dev
```

3. **Démarrer les microservices** (quand implémentés)
```bash
# Dans des terminaux séparés
cd microservices/auth-service && npm run dev
cd microservices/user-service && npm run dev
cd microservices/message-service && npm run dev
cd microservices/file-service && npm run dev
```

### Production avec Docker

```yaml
# docker-compose.yml (exemple)
version: '3.8'
services:
  api-gateway:
    build: ./microservices/api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=groupomania
      - POSTGRES_USER=groupomania
      - POSTGRES_PASSWORD=password
```

## Monitoring et Observabilité

### Métriques Collectées
- Latence des requêtes
- Taux d'erreur par service
- Utilisation CPU/mémoire
- Nombre de requêtes par endpoint
- État des circuit breakers

### Logging
- Logs structurés en JSON
- Correlation IDs pour tracer les requêtes
- Logs centralisés par service
- Niveaux : error, warn, info, debug

### Health Checks
- `/health` endpoint sur chaque service
- Vérifications périodiques automatiques
- Alertes en cas de panne

## Sécurité

### Authentification
- JWT tokens avec expiration
- Refresh tokens pour renouvellement
- Révocation de tokens

### Autorisation
- RBAC (Role-Based Access Control)
- Permissions granulaires
- Propriété des ressources

### Protection
- Rate limiting par IP et utilisateur
- Validation stricte des entrées
- Protection CSRF/XSS
- Headers de sécurité (Helmet)

## Évolutivité

### Horizontal Scaling
- Load balancing automatique
- Service discovery dynamique
- Auto-scaling des containers

### Performance
- Cache Redis pour les données fréquentes
- Connection pooling pour la base de données
- Compression gzip

### Résilience
- Circuit breakers pour éviter les cascades de pannes
- Retry logic avec backoff exponentiel
- Graceful degradation

## Prochaines Étapes

1. **Implémenter les microservices individuels**
   - Auth Service avec JWT complet
   - User Service avec CRUD utilisateurs
   - Message Service avec CRUD messages
   - File Service avec upload/storage

2. **Améliorer l'infrastructure**
   - Configuration Kubernetes
   - Monitoring avec Prometheus/Grafana
   - CI/CD pipeline

3. **Fonctionnalités avancées**
   - Event-driven architecture avec RabbitMQ
   - Distributed tracing avec Jaeger
   - Service mesh avec Istio

## Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests de charge
npm run test:load
```

## Contribution

1. Créer une branche feature
2. Implémenter les changements
3. Ajouter les tests appropriés
4. Mettre à jour la documentation
5. Créer une pull request

## Ressources

- [Documentation Express.js](https://expressjs.com/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
