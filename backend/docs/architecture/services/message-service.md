# Message Service

## 🎯 Vue d'ensemble

Le service de messages gère tout l'écosystème de contenu social de Groupomania : posts, commentaires, réactions, timeline et notifications. Il constitue le cœur de l'interaction sociale de la plateforme.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               MESSAGE SERVICE (Port 3003)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Posts    │  │ Comments    │  │ Reactions   │        │
│  │   & CRUD    │  │ & Replies   │  │ & Likes     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Timeline   │  │Notifications│  │  Content    │        │
│  │   & Feed    │  │   & Alerts  │  │ Moderation  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
           │                        │
    ┌──────▼──────┐         ┌──────▼──────┐
    │ PostgreSQL  │         │    Redis    │
    │groupomania_ │         │ Timelines   │
    │  messages   │         │ & Caching   │
    └─────────────┘         └─────────────┘
```

## 🚀 Fonctionnalités

### 📝 Gestion des Posts
- **CRUD Complet:** Création, lecture, mise à jour, suppression
- **Types de Contenu:** Texte, images, liens, videos
- **Rich Text:** Support Markdown et formatage
- **Mentions:** @utilisateur avec notifications
- **Hashtags:** Système de tags pour categorisation
- **Visibilité:** Public, amis, privé

### 💬 Système de Commentaires
- **Commentaires Imbriqués:** Réponses multi-niveaux
- **Édition/Suppression:** Gestion complète des commentaires
- **Notifications:** Alertes automatiques
- **Modération:** Système de signalement

### ❤️ Réactions et Interactions
- **Likes/Dislikes:** Système de réactions simple
- **Réactions Étendues:** Emojis et réactions personnalisées
- **Partages:** Reshare de posts
- **Favoris:** Sauvegarde de posts

### 📰 Timeline et Feed
- **Timeline Personnalisée:** Algorithme de recommandation
- **Feed en Temps Réel:** Mise à jour automatique
- **Filtres:** Par type, date, popularité
- **Pagination Infinie:** Scroll infini optimisé

### 🔔 Notifications
- **Types Multiples:** Mentions, likes, commentaires, follows
- **Temps Réel:** WebSocket ou Server-Sent Events
- **Préférences:** Configuration par utilisateur
- **Historique:** Système de notification persistant

## 🗂️ Structure du Projet

```
microservices/message-service/
├── src/
│   ├── config/
│   │   ├── config.ts           # Configuration générale
│   │   ├── database.ts         # Configuration PostgreSQL
│   │   └── redis.ts            # Configuration Redis
│   ├── controllers/
│   │   ├── postController.ts   # Gestion des posts
│   │   ├── commentController.ts # Gestion commentaires
│   │   ├── reactionController.ts # Réactions et likes
│   │   ├── timelineController.ts # Timeline et feed
│   │   └── notificationController.ts # Notifications
│   ├── middleware/
│   │   ├── auth.ts             # Middleware JWT
│   │   ├── validation.ts       # Validation données
│   │   ├── rateLimit.ts        # Rate limiting
│   │   ├── moderation.ts       # Modération contenu
│   │   └── cache.ts           # Middleware cache
│   ├── models/
│   │   ├── Post.ts             # Modèle post
│   │   ├── Comment.ts          # Modèle commentaire
│   │   ├── Reaction.ts         # Modèle réaction
│   │   ├── Notification.ts     # Modèle notification
│   │   ├── Hashtag.ts          # Modèle hashtag
│   │   └── UserMention.ts      # Modèle mention
│   ├── routes/
│   │   ├── posts.ts            # Routes posts
│   │   ├── comments.ts         # Routes commentaires
│   │   ├── reactions.ts        # Routes réactions
│   │   ├── timeline.ts         # Routes timeline
│   │   └── notifications.ts    # Routes notifications
│   ├── services/
│   │   ├── postService.ts      # Logique métier posts
│   │   ├── commentService.ts   # Logique commentaires
│   │   ├── reactionService.ts  # Logique réactions
│   │   ├── timelineService.ts  # Génération timeline
│   │   ├── notificationService.ts # Gestion notifications
│   │   ├── moderationService.ts # Modération automatique
│   │   └── cacheService.ts     # Gestion cache
│   ├── utils/
│   │   ├── contentParser.ts    # Parsing markdown/mentions
│   │   ├── timelineAlgorithm.ts # Algorithme feed
│   │   ├── validation.ts       # Schémas validation
│   │   └── logger.ts           # Configuration logs
│   ├── app.ts                  # Configuration Express
│   └── server.ts               # Point d'entrée
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🛣️ Endpoints API

### Posts
```typescript
GET    /posts              # Timeline globale/personnalisée
POST   /posts              # Créer un post
GET    /posts/:id          # Récupérer un post
PUT    /posts/:id          # Modifier un post
DELETE /posts/:id          # Supprimer un post
GET    /posts/:id/comments # Commentaires d'un post
```

### Commentaires
```typescript
POST   /posts/:id/comments      # Ajouter commentaire
GET    /comments/:id            # Récupérer commentaire
PUT    /comments/:id            # Modifier commentaire
DELETE /comments/:id            # Supprimer commentaire
POST   /comments/:id/replies    # Répondre à un commentaire
```

### Réactions
```typescript
POST   /posts/:id/like          # Liker un post
DELETE /posts/:id/like          # Unliker un post
POST   /posts/:id/reaction      # Réaction avec emoji
GET    /posts/:id/reactions     # Liste des réactions
POST   /posts/:id/share         # Partager un post
```

### Timeline et Feed
```typescript
GET    /timeline              # Timeline personnalisée
GET    /timeline/global       # Timeline globale
GET    /timeline/following    # Posts des utilisateurs suivis
GET    /timeline/trending     # Posts tendances
GET    /search/posts          # Recherche dans les posts
```

### Notifications
```typescript
GET    /notifications          # Liste notifications
PUT    /notifications/:id/read # Marquer comme lu
DELETE /notifications/:id      # Supprimer notification
GET    /notifications/unread   # Nombre non lues
PUT    /notifications/mark-all-read # Tout marquer lu
```

### Hashtags et Mentions
```typescript
GET    /hashtags              # Hashtags populaires
GET    /hashtags/:tag/posts   # Posts par hashtag
GET    /mentions/me           # Mes mentions
```

## 📊 Modèles de Données

### Post
```typescript
interface Post {
  id: string;
  authorId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  attachments: string[];    // URLs fichiers
  mentions: string[];       // IDs utilisateurs mentionnés
  hashtags: string[];       // Tags
  visibility: 'public' | 'friends' | 'private';
  isEdited: boolean;
  editedAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId?: string; // Pour les réponses
  content: string;
  mentions: string[];
  likesCount: number;
  repliesCount: number;
  isEdited: boolean;
  editedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Reaction
```typescript
interface Reaction {
  id: string;
  userId: string;
  targetId: string;         // Post ou Comment ID
  targetType: 'post' | 'comment';
  type: 'like' | 'dislike' | 'love' | 'laugh' | 'angry' | 'sad';
  createdAt: Date;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  type: 'mention' | 'like' | 'comment' | 'follow' | 'share';
  targetId: string;         // Post/Comment/User ID
  targetType: string;
  message: string;
  isRead: boolean;
  readAt: Date;
  createdAt: Date;
}
```

## ⚙️ Configuration

### Variables d'Environnement
```env
# Server
PORT=3003
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=groupomania_messages
DB_USERNAME=groupomania_user
DB_PASSWORD=groupomania_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=2

# Timeline
TIMELINE_PAGE_SIZE=20
MAX_TIMELINE_ITEMS=1000
TIMELINE_CACHE_TTL=300

# Content
MAX_POST_LENGTH=5000
MAX_COMMENT_LENGTH=1000
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,mp4,pdf

# Notifications
NOTIFICATION_BATCH_SIZE=100
REAL_TIME_NOTIFICATIONS=true
```

### Configuration Redis
```typescript
const cacheConfig = {
  timelines: { ttl: 300 },      // 5 minutes
  posts: { ttl: 1800 },         // 30 minutes
  trending: { ttl: 3600 },      // 1 hour
  notifications: { ttl: 86400 } // 24 hours
};
```

## 📰 Algorithme de Timeline

### Scoring des Posts
```typescript
class TimelineAlgorithm {
  calculatePostScore(post: Post, user: User): number {
    let score = 0;
    
    // Fraîcheur (plus récent = meilleur score)
    const ageHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - ageHours);
    
    // Engagement (likes, comments, shares)
    score += post.likesCount * 2;
    score += post.commentsCount * 3;
    score += post.sharesCount * 4;
    
    // Relation avec l'auteur
    if (user.following.includes(post.authorId)) {
      score *= 1.5;
    }
    
    // Interactions passées
    if (user.hasInteractedWith(post.authorId)) {
      score *= 1.2;
    }
    
    return score;
  }
}
```

### Types de Timeline
- **Following:** Posts des utilisateurs suivis
- **Global:** Tous les posts publics, triés par popularité
- **Trending:** Posts avec forte engagement récent
- **Personnalisée:** Algorithme ML basé sur les interactions

## 🔔 Système de Notifications

### Types de Notifications
```typescript
enum NotificationType {
  MENTION = 'mention',           // @username dans un post/comment
  LIKE = 'like',                // Like sur post/comment
  COMMENT = 'comment',          // Nouveau commentaire
  REPLY = 'reply',              // Réponse à un commentaire
  FOLLOW = 'follow',            // Nouvel abonné
  SHARE = 'share'               // Partage de post
}
```

### Service de Notifications
```typescript
class NotificationService {
  async createNotification(data: CreateNotificationData) {
    // Créer en base
    const notification = await Notification.create(data);
    
    // Envoyer en temps réel (WebSocket)
    await this.sendRealTimeNotification(notification);
    
    // Mettre à jour cache Redis
    await this.updateNotificationCache(data.recipientId);
    
    return notification;
  }
  
  async sendBulkNotifications(notifications: CreateNotificationData[]) {
    // Traitement par batch pour performance
    const chunks = this.chunkArray(notifications, 100);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(n => this.createNotification(n)));
    }
  }
}
```

## 🛡️ Modération de Contenu

### Modération Automatique
```typescript
class ModerationService {
  async moderateContent(content: string): Promise<ModerationResult> {
    const checks = await Promise.all([
      this.checkProfanity(content),
      this.checkSpam(content),
      this.checkMaliciousLinks(content),
      this.checkLength(content)
    ]);
    
    return {
      isAllowed: checks.every(check => check.passed),
      flags: checks.filter(check => !check.passed),
      severity: this.calculateSeverity(checks)
    };
  }
}
```

### Règles de Modération
- **Profanité:** Détection de mots inappropriés
- **Spam:** Détection de contenu répétitif
- **Liens Malicieux:** Vérification des URLs
- **Longueur:** Respect des limites de caractères
- **Flood Protection:** Limitation du nombre de posts par minute

## 🚦 Cache et Performance

### Stratégies de Cache
```typescript
class MessageCacheService {
  // Cache timeline personnalisée
  async cacheUserTimeline(userId: string, posts: Post[]): Promise<void>;
  
  // Cache post populaire
  async cachePopularPost(postId: string, post: Post): Promise<void>;
  
  // Cache compteurs (likes, comments)
  async updateCounterCache(postId: string, type: string, delta: number): Promise<void>;
  
  // Invalidation intelligente
  async invalidateRelatedCaches(postId: string): Promise<void>;
}
```

### Optimisations
- **Pagination Cursor-based:** Performance sur grandes listes
- **Eager Loading:** Chargement optimisé des relations
- **Counter Caching:** Cache des compteurs de likes/comments
- **Timeline Pre-computation:** Calcul anticipé des timelines

## 📊 Métriques et Analytics

### Métriques Collectées
```typescript
interface MessageMetrics {
  postsCreated: number;
  commentsCreated: number;
  likesGiven: number;
  sharesCount: number;
  mentionsCount: number;
  avgEngagementRate: number;
  topHashtags: string[];
  activeUsers: number;
}
```

### Analytics en Temps Réel
- Engagement rate par post
- Trending hashtags
- Pics d'activité
- Performance des algorithmes

## 🚀 Démarrage

### Développement Local
```bash
cd microservices/message-service
npm install
npm run dev
```

### Base de Données
```sql
CREATE DATABASE groupomania_messages;
CREATE USER groupomania_user WITH PASSWORD 'password';
GRANT ALL ON DATABASE groupomania_messages TO groupomania_user;
```

### Docker
```bash
docker build -t groupomania-message-service .
docker run -p 3003:3003 --env-file .env groupomania-message-service
```

## 🧪 Tests

### Suite de Tests
```bash
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests d'intégration
npm run test:algorithm     # Tests algorithme timeline
npm run test:performance   # Tests de performance
```

### Tests Spécifiques
- Algorithme de timeline
- Modération de contenu
- Notifications en temps réel
- Cache et performance
- API endpoints

## 🔮 Évolutions Futures

- [ ] Algorithme ML pour recommandations
- [ ] Support des stories (contenu temporaire)
- [ ] Polls et sondages interactifs
- [ ] Live streaming integration
- [ ] Advanced content search (Elasticsearch)
- [ ] AI-powered content moderation
- [ ] Real-time collaborative editing
