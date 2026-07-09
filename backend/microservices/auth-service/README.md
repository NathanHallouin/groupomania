# Auth Service - Groupomania

Service d'authentification pour l'application Groupomania, développé avec Node.js, TypeScript, Express et PostgreSQL.

## 🚀 Fonctionnalités

- ✅ Inscription et connexion utilisateur
- ✅ Authentification JWT (Access + Refresh tokens)
- ✅ Hashage sécurisé des mots de passe avec bcrypt
- ✅ Protection contre les attaques par force brute
- ✅ Verrouillage de compte après tentatives échouées
- ✅ Validation complète des données d'entrée
- ✅ Gestion des rôles utilisateur (employee, admin)
- ✅ Rate limiting
- ✅ Sécurité renforcée avec Helmet
- ✅ Logging des erreurs et audit

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🔧 Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd microservices/auth-service
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration des variables d'environnement**
   ```bash
   cp .env.example .env
   # Éditer le fichier .env avec vos paramètres
   ```

4. **Créer la base de données PostgreSQL**
   ```sql
   CREATE DATABASE groupomania_auth;
   CREATE USER groupomania WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE groupomania_auth TO groupomania;
   ```

## 🚀 Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm run build
npm start
```

### Tests
```bash
npm test
npm run test:coverage
```

## 📡 API Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription utilisateur |
| POST | `/api/auth/login` | Connexion utilisateur |
| POST | `/api/auth/refresh` | Rafraîchir les tokens |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/profile` | Profil utilisateur |
| PUT | `/api/auth/change-password` | Changer mot de passe |
| GET | `/api/auth/verify-token` | Vérifier token |

### Health Check

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | État du service |

## 📝 Format des données

### Inscription
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@groupomania.com",
  "password": "SecurePass123!",
  "department": "IT"
}
```

### Connexion
```json
{
  "email": "john.doe@groupomania.com",
  "password": "SecurePass123!"
}
```

### Réponse d'authentification
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@groupomania.com",
      "department": "IT",
      "role": "employee",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

## 🔒 Sécurité

### Validation des mots de passe
- Minimum 8 caractères
- Au moins une minuscule
- Au moins une majuscule  
- Au moins un chiffre
- Au moins un caractère spécial
- Ne doit pas contenir d'informations personnelles

### Protection contre les attaques
- Rate limiting (100 req/15min global, 5 req/15min auth)
- Verrouillage après 5 tentatives échouées (2h)
- Headers de sécurité avec Helmet
- Validation stricte des entrées
- Hash sécurisé avec bcrypt (12 rounds)

### JWT
- Access token: 15 minutes
- Refresh token: 7 jours
- Secrets configurables via variables d'environnement

## 🏗️ Architecture

```
src/
├── config/         # Configuration
├── controllers/    # Contrôleurs
├── middleware/     # Middlewares
├── models/         # Modèles Sequelize  
├── routes/         # Routes Express
├── services/       # Services métier
├── types/          # Types TypeScript
└── utils/          # Utilitaires
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
Les logs sont disponibles dans la console en mode développement et peuvent être configurés pour différents niveaux et formats.

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | 3001 |
| `NODE_ENV` | Environnement | development |
| `DB_HOST` | Host PostgreSQL | localhost |
| `DB_PORT` | Port PostgreSQL | 5432 |
| `DB_NAME` | Nom base de données | groupomania_auth |
| `DB_USER` | Utilisateur DB | postgres |
| `DB_PASSWORD` | Mot de passe DB | password |
| `JWT_ACCESS_SECRET` | Secret access token | (généré) |
| `JWT_REFRESH_SECRET` | Secret refresh token | (généré) |
| `JWT_ACCESS_EXPIRY` | Durée access token | 15m |
| `JWT_REFRESH_EXPIRY` | Durée refresh token | 7d |

## 🐳 Docker

```bash
# Build
docker build -t groupomania-auth .

# Run
docker run -p 3001:3001 --env-file .env groupomania-auth
```

## 📈 Performance

- Connection pooling PostgreSQL (max 10 connexions)
- Compression gzip des réponses
- Cache des tokens JWT en mémoire
- Optimisation des requêtes Sequelize

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

En cas de problème ou de question :

1. Vérifier la documentation
2. Consulter les issues GitHub
3. Créer une nouvelle issue avec le template approprié

---

**Développé avec ❤️ pour Groupomania**
