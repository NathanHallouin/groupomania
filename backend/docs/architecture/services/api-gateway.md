# API Gateway Service

## 🎯 Vue d'ensemble

L'API Gateway est le point d'entrée unique de l'architecture microservices Groupomania. Il agit comme un proxy intelligent qui route les requêtes vers les services appropriés tout en gérant les préoccupations transversales.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 3000)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Routing   │  │  Security   │  │ Rate Limit  │        │
│  │   & Proxy   │  │   Headers   │  │ & Throttle  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Logging   │  │Circuit      │  │ Load        │        │
│  │ & Monitor   │  │Breaker      │  │ Balancer    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
    ┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐
    │Auth Service ││User Service ││Message      ││File Service │
    │   (3001)    ││   (3002)    ││Service      ││   (3004)    │
    │             ││             ││  (3003)     ││             │
    └─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

## 🚀 Fonctionnalités

### 🔐 Sécurité
- **Headers Sécurisés:** Helmet.js pour les headers HTTP sécurisés
- **CORS:** Configuration stricte des domaines autorisés
- **Rate Limiting:** Protection contre les attaques DDoS et spam
- **Authentification:** Validation des tokens JWT pour les routes protégées

### 🛣️ Routage Intelligent
- **Proxy HTTP:** Redirection transparente vers les microservices
- **Load Balancing:** Distribution de charge entre instances
- **Service Discovery:** Détection automatique des services disponibles
- **Fallback Routes:** Gestion des services indisponibles

### 📊 Monitoring & Observabilité
- **Request Logging:** Traçage complet des requêtes
- **Health Checks:** Surveillance de l'état des services
- **Metrics Collection:** Collecte de métriques de performance
- **Error Tracking:** Suivi centralisé des erreurs

### ⚡ Performance
- **Response Compression:** Compression gzip/deflate
- **Caching Headers:** Optimisation du cache navigateur
- **Request Timeout:** Gestion des timeouts
- **Circuit Breaker:** Protection contre les pannes en cascade

## 🗂️ Structure du Projet

```
microservices/api-gateway/
├── src/
│   ├── config/
│   │   ├── config.ts           # Configuration générale
│   │   ├── cors.ts             # Configuration CORS
│   │   └── routes.ts           # Mapping des routes
│   ├── middleware/
│   │   ├── auth.ts             # Middleware d'authentification
│   │   ├── errorHandler.ts     # Gestion des erreurs
│   │   ├── logging.ts          # Middleware de logging
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   └── security.ts         # Headers de sécurité
│   ├── services/
│   │   ├── circuitBreaker.ts   # Circuit breaker pattern
│   │   ├── loadBalancer.ts     # Load balancing
│   │   └── healthCheck.ts      # Health checks
│   ├── utils/
│   │   ├── logger.ts           # Configuration logging
│   │   └── metrics.ts          # Métriques
│   ├── app.ts                  # Configuration Express
│   └── server.ts               # Point d'entrée
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🛣️ Configuration des Routes

### Routes Publiques
```typescript
// Pas d'authentification requise
GET  /health              → Health check
POST /auth/login          → auth-service:3001/login
POST /auth/register       → auth-service:3001/register
POST /auth/refresh        → auth-service:3001/refresh
```

### Routes Protégées
```typescript
// Authentification JWT requise
GET    /api/users/*       → user-service:3002/*
POST   /api/users/*       → user-service:3002/*
PUT    /api/users/*       → user-service:3002/*
DELETE /api/users/*       → user-service:3002/*

GET    /api/messages/*    → message-service:3003/*
POST   /api/messages/*    → message-service:3003/*
PUT    /api/messages/*    → message-service:3003/*
DELETE /api/messages/*    → message-service:3003/*

GET    /api/files/*       → file-service:3004/*
POST   /api/files/*       → file-service:3004/*
PUT    /api/files/*       → file-service:3004/*
DELETE /api/files/*       → file-service:3004/*
```

## ⚙️ Configuration

### Variables d'Environnement
```env
# Server
PORT=3000
NODE_ENV=development

# Services URLs
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
MESSAGE_SERVICE_URL=http://message-service:3003
FILE_SERVICE_URL=http://file-service:3004

# Security
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:4200

# Rate Limiting
RATE_LIMIT_WINDOW=15 # minutes
RATE_LIMIT_MAX=100   # requests per window

# Timeouts
REQUEST_TIMEOUT=30000 # ms
```

### Rate Limiting
```typescript
// Configuration par endpoint
const rateLimits = {
  '/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
  '/auth/register': { windowMs: 60 * 60 * 1000, max: 3 },
  '/api/*': { windowMs: 15 * 60 * 1000, max: 100 },
  default: { windowMs: 15 * 60 * 1000, max: 50 }
};
```

## 🔧 Middleware Pipeline

```typescript
app.use(helmet());                    // 1. Sécurité headers
app.use(cors(corsOptions));          // 2. CORS
app.use(compression());              // 3. Compression
app.use(morgan('combined'));         // 4. Logging
app.use(rateLimiter);               // 5. Rate limiting
app.use(authMiddleware);            // 6. Authentification
app.use('/api', proxyMiddleware);   // 7. Proxy vers services
app.use(errorHandler);              // 8. Gestion erreurs
```

## 🔄 Circuit Breaker

Protection contre les pannes en cascade :

```typescript
const circuitBreakerOptions = {
  timeout: 3000,        // Timeout des requêtes
  errorThreshold: 50,   // % d'erreurs avant ouverture
  resetTimeout: 30000   // Temps avant tentative de fermeture
};

// États du circuit breaker
enum CircuitState {
  CLOSED,    // Normal - requêtes passent
  OPEN,      // Panne - requêtes bloquées
  HALF_OPEN  // Test - une requête test
}
```

## 📊 Health Checks

Surveillance de l'état des services :

```typescript
GET /health
{
  "status": "healthy",
  "timestamp": "2025-07-25T10:30:00Z",
  "services": {
    "auth-service": "healthy",
    "user-service": "healthy", 
    "message-service": "degraded",
    "file-service": "unhealthy"
  },
  "version": "1.0.0"
}
```

## 📈 Métriques

Collecte de métriques de performance :

```typescript
// Métriques exposées sur /metrics
{
  "requests_total": 1250,
  "requests_per_second": 15.3,
  "average_response_time": 245,
  "error_rate": 0.02,
  "active_connections": 8,
  "services_status": {
    "auth-service": "up",
    "user-service": "up",
    "message-service": "down",
    "file-service": "up"
  }
}
```

## 🚀 Démarrage

### Développement Local
```bash
cd microservices/api-gateway
npm install
npm run dev
```

### Docker
```bash
docker build -t groupomania-api-gateway .
docker run -p 3000:3000 --env-file .env groupomania-api-gateway
```

### Docker Compose
```bash
docker-compose -f docker-compose.microservices.yml up api-gateway
```

## 🔍 Debugging

### Logs
```bash
# Logs en temps réel
docker logs -f groupomania-api-gateway

# Logs avec filtrage
docker logs groupomania-api-gateway 2>&1 | grep ERROR
```

### Monitoring des Requêtes
```bash
# Utilisation des métriques
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/health
```

## 🛡️ Sécurité

### Headers de Sécurité
- **X-Content-Type-Options:** nosniff
- **X-Frame-Options:** DENY
- **X-XSS-Protection:** 1; mode=block
- **Strict-Transport-Security:** max-age=31536000
- **Content-Security-Policy:** Configuration stricte

### Protection DDoS
- Rate limiting par IP
- Rate limiting par endpoint
- Blacklisting automatique
- Timeout des requêtes

## 🔮 Évolutions Futures

- [ ] Service mesh integration (Istio)
- [ ] GraphQL Federation
- [ ] WebSocket proxy support
- [ ] Advanced load balancing algorithms
- [ ] Distributed tracing
- [ ] API versioning support
