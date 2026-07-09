# Services - Vue d'ensemble

Ce dossier contient la documentation détaillée de chaque microservice de l'architecture Groupomania.

## 📋 Services Disponibles

### [API Gateway](./api-gateway.md)
- **Port:** 3000
- **Rôle:** Point d'entrée unique, routage, authentification globale
- **Technologies:** Express.js, http-proxy-middleware

### [Auth Service](./auth-service.md)  
- **Port:** 3001
- **Rôle:** Authentification, gestion des tokens JWT, sécurité
- **Technologies:** Express.js, bcrypt, jsonwebtoken

### [User Service](./user-service.md)
- **Port:** 3002  
- **Rôle:** Gestion des profils utilisateurs, rôles, relations
- **Technologies:** Express.js, Sequelize, PostgreSQL

### [Message Service](./message-service.md)
- **Port:** 3003
- **Rôle:** Posts, commentaires, timeline, notifications
- **Technologies:** Express.js, Sequelize, Redis

### [File Service](./file-service.md)
- **Port:** 3004
- **Rôle:** Upload, traitement d'images, stockage de fichiers
- **Technologies:** Express.js, Multer, Sharp

## 🔗 Communication Inter-Services

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │────│ API Gateway │────│Auth Service │
└─────────────┘    └─────┬───────┘    └─────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
    ┌─────────▼───┐ ┌────▼────┐ ┌───▼────┐
    │User Service │ │Message  │ │File    │
    │             │ │Service  │ │Service │
    └─────────────┘ └─────────┘ └────────┘
```

## 🛡️ Patterns de Sécurité

- **JWT Tokens:** Authentification stateless entre services
- **Rate Limiting:** Protection au niveau Gateway et services
- **Input Validation:** Validation stricte avec Joi sur chaque service
- **Error Handling:** Gestion centralisée des erreurs

## 📊 Monitoring

Chaque service expose :
- **Health Check:** `/health` endpoint
- **Metrics:** `/metrics` pour Prometheus
- **Logs:** Structured logging avec Winston

## 🚀 Démarrage Rapide

```bash
# Démarrer tous les services
docker-compose -f docker-compose.microservices.yml up

# Démarrer un service spécifique
cd microservices/auth-service
npm run dev
```
