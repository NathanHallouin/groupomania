# Message Service - Groupomania

Microservice de messagerie temps réel pour l'application Groupomania.

## 🚀 Fonctionnalités

### 💬 Messagerie
- Messages texte, images et fichiers
- Réponses et fils de discussion
- Mentions d'utilisateurs (@username)
- Aperçus de liens automatiques
- Historique d'édition des messages

### 🔄 Temps Réel
- WebSocket avec Socket.IO
- Notifications en temps réel
- Indicateurs de frappe
- Statuts de présence
- Synchronisation multi-appareils

### 📺 Gestion des Canaux
- Canaux publics et privés
- Système de rôles et permissions
- Modération avancée
- Gestion des membres
- Archives et recherche

### ⚡ Réactions et Interactions
- 6 types de réactions (👍 ❤️ 😂 😮 😢 😡)
- Compteurs en temps réel
- Gestion des doublons

### 🔍 Recherche
- Recherche full-text dans les messages
- Filtres par canal, auteur, date
- Recherche dans les mentions
- Historique de recherche

## 🛠️ Technologies

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de données**: PostgreSQL + Sequelize ORM
- **Cache**: Redis
- **WebSocket**: Socket.IO
- **Validation**: express-validator
- **Sécurité**: Helmet, CORS, Rate Limiting
- **Upload**: Multer
- **Logger**: Winston

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Auth Service (pour l'authentification JWT)

## 🔧 Installation

1. **Cloner et installer les dépendances**
```bash
cd microservices/message-service
npm install
```

2. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditer le fichier .env avec vos paramètres
```

3. **Configurer la base de données**
```bash
# Créer la base de données
createdb groupomania_messages

# Optionnel: Importer des données de test
npm run db:seed
```

4. **Démarrer Redis**
```bash
redis-server
```

## 🚀 Utilisation

### Développement
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📡 API Endpoints

### Messages
```
POST   /api/messages                    # Créer un message
GET    /api/messages/:id                # Obtenir un message
PUT    /api/messages/:id                # Modifier un message
DELETE /api/messages/:id                # Supprimer un message
GET    /api/messages/channel/:channelId # Messages d'un canal
GET    /api/messages/search             # Rechercher des messages
```

### Réactions
```
POST   /api/messages/:id/reactions         # Ajouter une réaction
DELETE /api/messages/:id/reactions/:type   # Supprimer une réaction
```

### Canaux
```
POST   /api/channels                    # Créer un canal
GET    /api/channels/:id                # Obtenir un canal
PUT    /api/channels/:id                # Modifier un canal
DELETE /api/channels/:id                # Supprimer un canal
GET    /api/channels/user               # Canaux de l'utilisateur
GET    /api/channels/search             # Rechercher des canaux
```

### Gestion des membres
```
POST   /api/channels/:id/join              # Rejoindre un canal
POST   /api/channels/:id/leave             # Quitter un canal
POST   /api/channels/:id/members           # Ajouter un membre
DELETE /api/channels/:id/members/:userId   # Retirer un membre
PUT    /api/channels/:id/members/:userId/role # Modifier le rôle
```

## 🔗 Événements WebSocket

### Client → Serveur
- `join_channel` - Rejoindre un canal
- `leave_channel` - Quitter un canal
- `send_message` - Envoyer un message
- `edit_message` - Modifier un message
- `delete_message` - Supprimer un message
- `add_reaction` - Ajouter une réaction
- `remove_reaction` - Supprimer une réaction
- `typing_start` - Commencer à taper
- `typing_stop` - Arrêter de taper

### Serveur → Client
- `message_created` - Nouveau message
- `message_updated` - Message modifié
- `message_deleted` - Message supprimé
- `reaction_added` - Réaction ajoutée
- `reaction_removed` - Réaction supprimée
- `user_typing` - Utilisateur en train de taper
- `user_stopped_typing` - Utilisateur a arrêté de taper
- `notification` - Notification générale

## 🏗️ Architecture

```
src/
├── config/           # Configuration de l'application
├── controllers/      # Contrôleurs HTTP
├── middleware/       # Middlewares Express
├── models/          # Modèles Sequelize
├── routes/          # Routes Express
├── services/        # Services métier
├── types/           # Types TypeScript
├── utils/           # Utilitaires
├── app.ts           # Application Express
└── server.ts        # Point d'entrée
```

## 🔐 Authentification

Le service utilise les tokens JWT émis par l'Auth Service. Chaque requête doit inclure:

```
Authorization: Bearer <jwt_token>
```

## 📊 Monitoring

### Health Check
```
GET /api/health
```

### Métriques Redis
Les statistiques Redis sont disponibles via le service:
- Nombre de connexions actives
- Utilisateurs en ligne
- Cache hit/miss ratio

## 🚦 Rate Limiting

- **Global**: 1000 requêtes/15min par IP
- **Messages**: 60 messages/minute par utilisateur
- **Recherche**: 100 recherches/minute
- **Upload**: 10 fichiers/minute

## 🐳 Docker

```bash
# Construire l'image
docker build -t groupomania-message-service .

# Démarrer avec docker-compose
docker-compose up message-service
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests WebSocket
npm run test:websocket

# Couverture de code
npm run test:coverage
```

## 📝 Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `NODE_ENV` | Environnement | `development` |
| `PORT` | Port du serveur | `3003` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `groupomania_messages` |
| `JWT_SECRET` | Clé secrète JWT | - |
| `REDIS_HOST` | Hôte Redis | `localhost` |
| `REDIS_PORT` | Port Redis | `6379` |

## 🤝 Intégration

### Avec Auth Service
- Validation des tokens JWT
- Récupération des informations utilisateur

### Avec User Service
- Résolution des mentions
- Profils utilisateur dans les messages

### Avec Notification Service
- Envoi de notifications push
- Alertes par email

## 📈 Performance

- **Cache Redis**: Messages récents et canaux actifs
- **Pagination**: Toutes les listes sont paginées
- **Indexation**: Index optimisés pour les recherches
- **Compression**: Gzip activé
- **WebSocket**: Gestion efficace des connexions

## 🛡️ Sécurité

- Validation stricte des entrées
- Protection CSRF
- Rate limiting adaptatif
- Sanitisation du contenu
- Permissions granulaires

## 📚 Documentation API

La documentation Swagger est disponible à:
```
http://localhost:3003/api-docs
```

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de connexion PostgreSQL**
   - Vérifier que PostgreSQL est démarré
   - Contrôler les paramètres de connexion dans `.env`

2. **Redis non disponible**
   - Le service fonctionne sans Redis (cache désactivé)
   - Démarrer Redis: `redis-server`

3. **WebSocket ne fonctionne pas**
   - Vérifier les paramètres CORS
   - Contrôler les proxy/firewalls

### Logs
```bash
# Logs d'application
tail -f logs/application.log

# Logs d'erreurs
tail -f logs/error.log

# Logs d'accès
tail -f logs/access.log
```

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](../../LICENSE) pour plus de détails.
