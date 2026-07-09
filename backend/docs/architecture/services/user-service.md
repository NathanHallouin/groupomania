# User Service

## 🎯 Vue d'ensemble

Le service utilisateur gère tous les aspects liés aux profils utilisateurs, aux relations sociales et aux préférences dans l'écosystème Groupomania. Il fournit une API complète pour la gestion des utilisateurs au-delà de l'authentification.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                USER SERVICE (Port 3002)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Profile   │  │ Relations   │  │ Preferences │        │
│  │ Management  │  │ & Following │  │ & Settings  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Search    │  │   Avatar    │  │ Activity    │        │
│  │ & Discovery │  │ Management  │  │  Tracking   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
           │                        │
    ┌──────▼──────┐         ┌──────▼──────┐
    │ PostgreSQL  │         │    Redis    │
    │groupomania_ │         │   Cache     │
    │   users     │         │  Profiles   │
    └─────────────┘         └─────────────┘
```

## 🚀 Fonctionnalités

### 👤 Gestion des Profils
- **CRUD Profil:** Création, lecture, mise à jour, suppression
- **Informations Complètes:** Données personnelles et professionnelles
- **Avatar Management:** Upload et gestion des photos de profil
- **Validation Données:** Validation stricte des informations

### 🤝 Relations Sociales
- **Suivi d'Utilisateurs:** System de follow/unfollow
- **Listes d'Amis:** Gestion des connexions
- **Recommandations:** Suggestions d'utilisateurs à suivre
- **Graphe Social:** Analyse des relations

### 🔍 Recherche et Découverte
- **Recherche Utilisateurs:** Par nom, email, département
- **Filtres Avancés:** Par rôle, département, localisation
- **Autocomplétion:** Suggestions en temps réel
- **Pagination:** Gestion de grandes listes

### ⚙️ Préférences
- **Paramètres Utilisateur:** Configuration personnalisée
- **Notifications:** Préférences de notification
- **Confidentialité:** Contrôle de la visibilité du profil
- **Thème Interface:** Dark/Light mode

## 🗂️ Structure du Projet

```
microservices/user-service/
├── src/
│   ├── config/
│   │   ├── config.ts           # Configuration générale
│   │   ├── database.ts         # Configuration PostgreSQL
│   │   └── redis.ts            # Configuration Redis
│   ├── controllers/
│   │   ├── userController.ts   # CRUD utilisateurs
│   │   ├── profileController.ts # Gestion profils
│   │   ├── relationController.ts # Relations sociales
│   │   └── searchController.ts  # Recherche utilisateurs
│   ├── middleware/
│   │   ├── auth.ts             # Middleware JWT
│   │   ├── validation.ts       # Validation données
│   │   ├── permission.ts       # Contrôle d'accès
│   │   └── cache.ts           # Middleware cache
│   ├── models/
│   │   ├── User.ts             # Modèle utilisateur
│   │   ├── UserProfile.ts      # Profil détaillé
│   │   ├── UserRelation.ts     # Relations entre users
│   │   ├── UserPreference.ts   # Préférences
│   │   └── UserActivity.ts     # Activité utilisateur
│   ├── routes/
│   │   ├── users.ts            # Routes utilisateurs
│   │   ├── profiles.ts         # Routes profils
│   │   ├── relations.ts        # Routes relations
│   │   └── search.ts           # Routes recherche
│   ├── services/
│   │   ├── userService.ts      # Logique métier users
│   │   ├── profileService.ts   # Gestion profils
│   │   ├── relationService.ts  # Relations sociales
│   │   ├── searchService.ts    # Service de recherche
│   │   └── cacheService.ts     # Gestion cache
│   ├── utils/
│   │   ├── validation.ts       # Schémas validation
│   │   ├── imageUtils.ts       # Traitement images
│   │   └── logger.ts           # Configuration logs
│   ├── app.ts                  # Configuration Express
│   └── server.ts               # Point d'entrée
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🛣️ Endpoints API

### Profils Utilisateurs
```typescript
GET    /users              # Liste utilisateurs (paginée)
GET    /users/:id          # Profil utilisateur par ID
PUT    /users/:id          # Mettre à jour profil
DELETE /users/:id          # Supprimer utilisateur
GET    /users/me           # Profil utilisateur connecté
PUT    /users/me           # Mettre à jour son profil
```

### Gestion Avatar
```typescript
POST   /users/:id/avatar   # Upload avatar
DELETE /users/:id/avatar   # Supprimer avatar
GET    /users/:id/avatar   # Récupérer avatar
```

### Relations Sociales
```typescript
POST   /users/:id/follow   # Suivre un utilisateur
DELETE /users/:id/follow   # Ne plus suivre
GET    /users/:id/followers # Liste des followers
GET    /users/:id/following # Liste des suivis
GET    /users/:id/friends   # Liste des amis
```

### Recherche et Découverte
```typescript
GET    /search/users        # Rechercher utilisateurs
GET    /search/suggestions  # Suggestions d'utilisateurs
GET    /search/autocomplete # Autocomplétion
```

### Préférences
```typescript
GET    /users/me/preferences     # Récupérer préférences
PUT    /users/me/preferences     # Mettre à jour préférences
GET    /users/me/privacy         # Paramètres confidentialité
PUT    /users/me/privacy         # Modifier confidentialité
```

### Statistiques et Activité
```typescript
GET    /users/:id/stats     # Statistiques utilisateur
GET    /users/:id/activity  # Activité récente
GET    /users/me/dashboard  # Dashboard personnel
```

## 📊 Modèles de Données

### User (Base)
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'admin' | 'moderator';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserProfile (Détaillé)
```typescript
interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  department: string;
  position: string;
  location: string;
  phoneNumber: string;
  birthDate: Date;
  avatarUrl: string;
  coverImageUrl: string;
  website: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserRelation
```typescript
interface UserRelation {
  id: string;
  followerId: string;     // Qui suit
  followingId: string;    // Qui est suivi
  status: 'active' | 'blocked';
  createdAt: Date;
}
```

### UserPreference
```typescript
interface UserPreference {
  id: string;
  userId: string;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    follows: boolean;
    messages: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    allowFollows: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## ⚙️ Configuration

### Variables d'Environnement
```env
# Server
PORT=3002
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=groupomania_users
DB_USERNAME=groupomania_user
DB_PASSWORD=groupomania_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=1

# File Storage
UPLOAD_PATH=./uploads/avatars
MAX_FILE_SIZE=5MB
ALLOWED_FORMATS=jpg,jpeg,png,webp

# Cache
CACHE_TTL=3600 # 1 hour
PROFILE_CACHE_TTL=1800 # 30 minutes

# Search
SEARCH_PAGE_SIZE=20
MAX_SEARCH_RESULTS=100
```

### Configuration Redis Cache
```typescript
const cacheConfig = {
  profiles: { ttl: 1800 },      // 30 minutes
  userLists: { ttl: 600 },      // 10 minutes
  searchResults: { ttl: 300 },  // 5 minutes
  suggestions: { ttl: 3600 }    // 1 hour
};
```

## 🔍 Service de Recherche

### Recherche Textuelle
```typescript
interface SearchQuery {
  query: string;
  filters?: {
    department?: string;
    role?: string;
    location?: string;
    isActive?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sort?: 'relevance' | 'name' | 'recent';
}
```

### Suggestions d'Utilisateurs
```typescript
class UserSuggestionService {
  async getSuggestions(userId: string): Promise<User[]> {
    // Algorithme basé sur :
    // - Collègues du même département
    // - Amis d'amis
    // - Interactions récentes
    // - Centres d'intérêt communs
  }
}
```

## 🤝 Gestion des Relations

### Types de Relations
```typescript
enum RelationType {
  FOLLOWING = 'following',    // Suivi simple
  FRIEND = 'friend',         // Amitié mutuelle
  BLOCKED = 'blocked'        // Utilisateur bloqué
}
```

### Graphe Social
```typescript
class SocialGraphService {
  async getFollowers(userId: string): Promise<User[]>;
  async getFollowing(userId: string): Promise<User[]>;
  async getMutualFriends(userId1: string, userId2: string): Promise<User[]>;
  async getConnectionPath(from: string, to: string): Promise<User[]>;
}
```

## 🖼️ Gestion des Avatars

### Upload et Traitement
```typescript
class AvatarService {
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Validation du fichier
    this.validateImageFile(file);
    
    // Redimensionnement (150x150, 300x300)
    const thumbnails = await this.createThumbnails(file);
    
    // Sauvegarde
    const avatarUrl = await this.saveAvatar(userId, thumbnails);
    
    // Mise à jour du profil
    await this.updateUserProfile(userId, { avatarUrl });
    
    return avatarUrl;
  }
}
```

### Formats Supportés
- **Formats:** JPEG, PNG, WebP
- **Taille Max:** 5MB
- **Dimensions:** Auto-resize to 300x300
- **Thumbnails:** 50x50, 150x150, 300x300

## 🚦 Mise en Cache

### Stratégie de Cache
```typescript
class UserCacheService {
  // Cache profil complet
  async getCachedProfile(userId: string): Promise<UserProfile | null>;
  
  // Cache liste d'utilisateurs
  async getCachedUserList(key: string): Promise<User[] | null>;
  
  // Invalidation cache
  async invalidateUserCache(userId: string): Promise<void>;
  
  // Cache recherche
  async cacheSearchResults(query: string, results: User[]): Promise<void>;
}
```

### Keys de Cache
- `user:profile:{userId}` - Profil utilisateur
- `user:followers:{userId}` - Liste followers
- `user:following:{userId}` - Liste following
- `search:users:{hash}` - Résultats recherche

## 📊 Statistiques Utilisateur

### Métriques Collectées
```typescript
interface UserStats {
  profileViews: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesReceived: number;
  commentsCount: number;
  lastActivity: Date;
  joinDate: Date;
  profileCompleteness: number; // %
}
```

## 🚀 Démarrage

### Développement Local
```bash
cd microservices/user-service
npm install
npm run dev
```

### Base de Données
```sql
-- Initialisation PostgreSQL
CREATE DATABASE groupomania_users;
CREATE USER groupomania_user WITH PASSWORD 'password';
GRANT ALL ON DATABASE groupomania_users TO groupomania_user;
```

### Docker
```bash
docker build -t groupomania-user-service .
docker run -p 3002:3002 --env-file .env groupomania-user-service
```

## 🧪 Tests

### Tests Disponibles
```bash
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests d'intégration
npm run test:api           # Tests endpoints API
```

### Couverture de Tests
- Modèles et validations
- Services métier
- Endpoints API
- Cache et performance
- Relations sociales

## 🔮 Évolutions Futures

- [ ] Système de badges et achievements
- [ ] Recommendations ML-based
- [ ] Graph database pour relations complexes
- [ ] Real-time presence status
- [ ] Advanced search with Elasticsearch
- [ ] User activity feed
- [ ] Integration with external directories (LDAP/AD)
