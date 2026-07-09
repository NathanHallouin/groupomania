# Guide de Déploiement - Architecture Microservices

## 🎯 Vue d'ensemble

Ce guide détaille les procédures de déploiement de l'architecture microservices Groupomania en environnements de développement, staging et production.

## 🏗️ Environnements

### Développement Local
- **Docker Compose** pour orchestration locale
- **Services individuels** pour développement spécifique
- **Base de données locale** PostgreSQL + Redis

### Staging
- **Docker Swarm** ou **Kubernetes**
- **Base de données managée** (AWS RDS, GCP CloudSQL)
- **Load balancer** et monitoring

### Production
- **Kubernetes cluster** avec haute disponibilité
- **Services managés** (Base de données, cache, monitoring)
- **CDN** et optimisations performances
- **Backup automatique** et disaster recovery

## 🐳 Déploiement Docker

### Prérequis
```bash
# Docker et Docker Compose
docker --version  # >= 24.0
docker-compose --version  # >= 2.20

# Node.js pour développement local
node --version  # >= 20.0
npm --version   # >= 10.0
```

### Configuration Environnement
```bash
# Copier les fichiers d'environnement
cp .env.example .env
cp microservices/auth-service/.env.example microservices/auth-service/.env
cp microservices/user-service/.env.example microservices/user-service/.env
cp microservices/message-service/.env.example microservices/message-service/.env
cp microservices/file-service/.env.example microservices/file-service/.env

# Éditer les configurations
vim .env  # Configuration globale
```

### Déploiement Complet
```bash
# Build et démarrage de tous les services
docker-compose -f docker-compose.microservices.yml up --build

# En arrière-plan
docker-compose -f docker-compose.microservices.yml up -d --build

# Vérification des services
docker-compose -f docker-compose.microservices.yml ps
```

### Déploiement Sélectif
```bash
# Infrastructure seule (DB + Redis)
docker-compose -f docker-compose.microservices.yml up postgres redis

# Services spécifiques
docker-compose -f docker-compose.microservices.yml up api-gateway auth-service

# Scaling d'un service
docker-compose -f docker-compose.microservices.yml up --scale user-service=3
```

## ⚙️ Configuration par Environnement

### Développement (.env.development)
```env
# Global
NODE_ENV=development
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
POSTGRES_PASSWORD=development_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security (Non-production secrets)
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret

# Services URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MESSAGE_SERVICE_URL=http://localhost:3003
FILE_SERVICE_URL=http://localhost:3004
```

### Staging (.env.staging)
```env
# Global
NODE_ENV=staging
LOG_LEVEL=info

# Database (RDS/CloudSQL)
DB_HOST=staging-db.region.rds.amazonaws.com
DB_PORT=5432
DB_SSL=true

# Redis (ElastiCache/MemoryStore)
REDIS_HOST=staging-redis.region.cache.amazonaws.com
REDIS_PORT=6379
REDIS_TLS=true

# CDN
CDN_ENABLED=true
CDN_BASE_URL=https://staging-cdn.groupomania.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

### Production (.env.production)
```env
# Global
NODE_ENV=production
LOG_LEVEL=warn

# Database (Highly Available)
DB_HOST=prod-db-cluster.region.rds.amazonaws.com
DB_PORT=5432
DB_SSL=true
DB_CONNECTION_POOL_MAX=20

# Redis Cluster
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=prod-redis-1.region.cache.amazonaws.com:6379,prod-redis-2.region.cache.amazonaws.com:6379

# Security (Secrets Manager)
JWT_SECRET=${AWS_SECRET_JWT}
JWT_REFRESH_SECRET=${AWS_SECRET_JWT_REFRESH}

# Performance
COMPRESSION_ENABLED=true
CACHE_TTL=3600
```

## ☸️ Déploiement Kubernetes

### Namespace et Configuration
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: groupomania
  labels:
    name: groupomania
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: groupomania-config
  namespace: groupomania
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  DB_HOST: "postgres-service"
  REDIS_HOST: "redis-service"
```

### Services et Deployments
```yaml
# k8s/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: groupomania
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: groupomania/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        envFrom:
        - configMapRef:
            name: groupomania-config
        - secretRef:
            name: groupomania-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: groupomania
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Ingress Controller
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: groupomania-ingress
  namespace: groupomania
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.groupomania.com
    secretName: groupomania-tls
  rules:
  - host: api.groupomania.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 80
```

## 🗄️ Base de Données

### PostgreSQL Cluster
```yaml
# k8s/postgres.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: groupomania
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised
  
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      
  bootstrap:
    initdb:
      database: groupomania
      owner: groupomania_user
      secret:
        name: postgres-credentials
        
  storage:
    size: 1Ti
    storageClass: fast-ssd
    
  monitoring:
    enabled: true
```

### Redis Cluster
```yaml
# k8s/redis.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: groupomania
spec:
  clusterSize: 6
  clusterVersion: v7.0
  persistenceEnabled: true
  
  redisExporter:
    enabled: true
    image: oliver006/redis_exporter
    
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

## 🔧 Scripts de Déploiement

### Script de Déploiement Automatique
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-development}
VERSION=${2:-latest}

echo "🚀 Déploiement Groupomania - Environment: $ENVIRONMENT, Version: $VERSION"

case $ENVIRONMENT in
  "development")
    echo "📦 Déploiement en développement..."
    docker-compose -f docker-compose.microservices.yml down
    docker-compose -f docker-compose.microservices.yml build
    docker-compose -f docker-compose.microservices.yml up -d
    ;;
    
  "staging")
    echo "🔧 Déploiement en staging..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap-staging.yaml
    kubectl apply -f k8s/secrets-staging.yaml
    kubectl apply -f k8s/
    kubectl set image deployment/api-gateway api-gateway=groupomania/api-gateway:$VERSION -n groupomania
    ;;
    
  "production")
    echo "🎯 Déploiement en production..."
    
    # Backup avant déploiement
    ./scripts/backup.sh production
    
    # Rolling update
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap-production.yaml
    kubectl apply -f k8s/secrets-production.yaml
    kubectl apply -f k8s/
    
    # Update images
    kubectl set image deployment/api-gateway api-gateway=groupomania/api-gateway:$VERSION -n groupomania
    kubectl set image deployment/auth-service auth-service=groupomania/auth-service:$VERSION -n groupomania
    kubectl set image deployment/user-service user-service=groupomania/user-service:$VERSION -n groupomania
    kubectl set image deployment/message-service message-service=groupomania/message-service:$VERSION -n groupomania
    kubectl set image deployment/file-service file-service=groupomania/file-service:$VERSION -n groupomania
    
    # Attendre le rollout
    kubectl rollout status deployment/api-gateway -n groupomania
    kubectl rollout status deployment/auth-service -n groupomania
    kubectl rollout status deployment/user-service -n groupomania
    kubectl rollout status deployment/message-service -n groupomania
    kubectl rollout status deployment/file-service -n groupomania
    ;;
    
  *)
    echo "❌ Environment non supporté: $ENVIRONMENT"
    echo "Environments disponibles: development, staging, production"
    exit 1
    ;;
esac

echo "✅ Déploiement terminé avec succès!"
```

### Health Check Post-Déploiement
```bash
#!/bin/bash
# scripts/health-check.sh

ENVIRONMENT=${1:-development}

case $ENVIRONMENT in
  "development")
    BASE_URL="http://localhost:3000"
    ;;
  "staging")
    BASE_URL="https://staging-api.groupomania.com"
    ;;
  "production")
    BASE_URL="https://api.groupomania.com"
    ;;
esac

echo "🔍 Vérification de la santé des services..."

# API Gateway
echo -n "API Gateway: "
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health

# Services individuels
for service in auth user message file; do
  echo -n "$service Service: "
  curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/$service/health
done

echo ""
echo "✅ Vérification terminée"
```

## 📊 Monitoring et Logging

### Prometheus Configuration
```yaml
# monitoring/prometheus.yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'groupomania-services'
    static_configs:
      - targets: ['api-gateway:3000', 'auth-service:3001', 'user-service:3002', 'message-service:3003', 'file-service:3004']
    metrics_path: /metrics
    scrape_interval: 30s
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Groupomania Microservices",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}} - {{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Microservices

on:
  push:
    branches: [main, staging, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api-gateway, auth-service, user-service, message-service, file-service]
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t groupomania/${{ matrix.service }}:${{ github.sha }} ./microservices/${{ matrix.service }}
          docker tag groupomania/${{ matrix.service }}:${{ github.sha }} groupomania/${{ matrix.service }}:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          ./scripts/deploy.sh production ${{ github.sha }}
```

## 🔒 Secrets Management

### Kubernetes Secrets
```bash
# Création des secrets
kubectl create secret generic groupomania-secrets \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=jwt-refresh-secret=$JWT_REFRESH_SECRET \
  --from-literal=db-password=$DB_PASSWORD \
  --namespace=groupomania

# Avec fichier
kubectl create secret generic groupomania-config \
  --from-env-file=.env.production \
  --namespace=groupomania
```

### AWS Secrets Manager Integration
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: groupomania
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: groupomania-secrets
  namespace: groupomania
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: groupomania-secrets
  data:
  - secretKey: jwt-secret
    remoteRef:
      key: groupomania/jwt-secret
```

## 🚀 Commandes Utiles

### Docker
```bash
# Logs des services
docker-compose logs -f api-gateway
docker-compose logs --tail=100 auth-service

# Rebuild d'un service
docker-compose build auth-service
docker-compose up -d auth-service

# Cleanup
docker system prune -a
docker volume prune
```

### Kubernetes
```bash
# Logs
kubectl logs -f deployment/api-gateway -n groupomania
kubectl logs -l app=auth-service -n groupomania --tail=100

# Debug
kubectl describe pod <pod-name> -n groupomania
kubectl exec -it <pod-name> -n groupomania -- /bin/bash

# Scaling
kubectl scale deployment auth-service --replicas=5 -n groupomania

# Rollback
kubectl rollout undo deployment/api-gateway -n groupomania
```

## 🔮 Évolutions Futures

- [ ] GitOps avec ArgoCD
- [ ] Service Mesh (Istio/Linkerd)
- [ ] Canary deployments
- [ ] Blue-green deployments  
- [ ] Multi-cloud deployment
- [ ] Edge computing integration
