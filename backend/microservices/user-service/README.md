# Groupomania User Service

Service de gestion des utilisateurs avec fonctionnalités avancées pour la plateforme Groupomania.

## 🚀 Fonctionnalités

### Gestion des Utilisateurs
- **CRUD complet** : Création, lecture, mise à jour, suppression d'utilisateurs
- **Profils étendus** : Bio, téléphone, localisation, date de naissance, hiérarchie
- **Gestion d'avatars** : Upload, redimensionnement automatique (thumbnail/medium/large)
- **Préférences utilisateur** : Thème, langue, notifications, confidentialité

### Sécurité et Authentification
- **Authentification JWT** : Validation des tokens du Auth Service
- **Autorisation par rôles** : Admin, Manager, Employee
- **Contrôle d'accès** : Propriétaire ou admin pour les modifications
- **Rate limiting** : Protection contre le spam et les attaques

### Fonctionnalités Avancées
- **Recherche avancée** : Filtres par nom, département, rôle, statut
- **Pagination** : Navigation efficace dans les listes d'utilisateurs
- **Statistiques** : Métriques pour les administrateurs
- **Image processing** : Redimensionnement et optimisation avec Sharp
- **Validation robuste** : Validation complète des données avec express-validator

## 🛠️ Technologies

- **Runtime** : Node.js avec TypeScript
- **Framework** : Express.js
- **Base de données** : PostgreSQL avec Sequelize ORM
- **Authentification** : JWT (depuis Auth Service)
- **Upload** : Multer + Sharp pour traitement d'images
- **Validation** : express-validator
- **Sécurité** : helmet, cors, rate limiting
- **Logging** : Winston

## 📁 Structure du Projet

```
src/
├── config/         # Configuration de l'application
├── controllers/    # Contrôleurs REST
├── middleware/     # Middlewares personnalisés
├── models/         # Modèles Sequelize
├── routes/         # Définition des routes
├── services/       # Services métier
├── types/          # Interfaces TypeScript
├── utils/          # Utilitaires
├── app.ts          # Configuration Express
└── server.ts       # Point d'entrée
```

## 🚦 API Endpoints

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs avec pagination et filtres
- `GET /api/users/search` - Recherche d'utilisateurs
- `GET /api/users/stats` - Statistiques (admin uniquement)
- `GET /api/users/departments` - Liste des départements
- `GET /api/users/:userId` - Détails d'un utilisateur
- `PUT /api/users/:userId` - Mise à jour du profil
- `POST /api/users/:userId/avatar` - Upload d'avatar
- `DELETE /api/users/:userId/avatar` - Suppression d'avatar

### Health Check
- `GET /health` - Statut du service

## 🔧 Configuration

Variables d'environnement :

```env
# Serveur
PORT=3002
NODE_ENV=development

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=groupomania_users
DB_USER=postgres
DB_PASSWORD=password
DB_SYNC=true

# JWT (doit correspondre au Auth Service)
JWT_ACCESS_SECRET=access-secret-key-very-long-and-secure

# Upload de fichiers
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
UPLOAD_DESTINATION=./uploads/avatars

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:4200
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Services externes
AUTH_SERVICE_URL=http://localhost:3001
FILE_SERVICE_URL=http://localhost:3004
MESSAGE_SERVICE_URL=http://localhost:3003
```

## 🏃‍♂️ Commandes

```bash
# Installation des dépendances
npm install

# Développement
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test

# Linting
npm run lint
```

## 📊 Modèle de Données

### User
```typescript
interface UserAttributes {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  position?: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive' | 'pending';
  avatar?: {
    thumbnail: string;
    medium: string;
    large: string;
  };
  bio?: string;
  phone?: string;
  location?: string;
  birthDate?: Date;
  hireDate?: Date;
  manager?: number;
  preferences: UserPreferences;
  lastLogin?: Date;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
}
```

### UserPreferences
```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    messages: boolean;
  };
  privacy: {
    showEmail: boolean;
    showDepartment: boolean;
    showLastLogin: boolean;
  };
}
```

## 🔐 Sécurité

- **Authentification** : Tous les endpoints nécessitent un token JWT valide
- **Autorisation** : Contrôle d'accès basé sur les rôles et la propriété
- **Validation** : Validation stricte des données d'entrée
- **Rate Limiting** : Protection contre les attaques par déni de service
- **Headers sécurisés** : Helmet.js pour les headers HTTP
- **CORS** : Configuration stricte des origines autorisées

## 🖼️ Gestion des Images

Le service inclut un système avancé de gestion d'avatars :

- **Formats supportés** : JPEG, PNG, WebP
- **Redimensionnement automatique** :
  - Thumbnail : 64x64px
  - Medium : 200x200px  
  - Large : 400x400px
- **Optimisation** : Compression et conversion WebP
- **Validation** : Vérification du type et de la taille
- **Nettoyage** : Suppression automatique des anciens avatars

## 🚀 Déploiement

Le service est conçu pour fonctionner en microservice :

1. **Dépendances** : Auth Service pour l'authentification
2. **Base de données** : PostgreSQL dédiée
3. **Stockage** : Système de fichiers local (évolutif vers S3/CloudStorage)
4. **Communication** : REST API avec validation JWT inter-services

## 📈 Monitoring

- **Logs structurés** : Winston avec rotation
- **Health checks** : Endpoint de santé pour monitoring
- **Métriques** : Prêt pour Prometheus/Grafana
- **Erreurs** : Gestion centralisée avec stack traces

---

**User Service** fait partie de l'écosystème microservices Groupomania, offrant une gestion complète et sécurisée des utilisateurs avec des fonctionnalités modernes d'upload d'images, de préférences personnalisées et d'analytics administratives.
