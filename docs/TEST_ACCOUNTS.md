# Comptes de test — Groupomania

Comptes pré-créés pour tester toutes les interfaces selon les **rôles de compte**.

L'application définit **deux rôles au niveau du compte** (`auth-service` / JWT) :

| Rôle       | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `admin`    | Accès complet : administration, gestion des utilisateurs, modération. |
| `employee` | Utilisateur standard (employé).                                    |

> Les rôles `moderator` / `member` / `read_only` que l'on croise dans le code
> concernent l'appartenance **à un canal de messagerie**, pas le compte lui-même.
> Ils se règlent depuis l'interface, une fois connecté.

## Identifiants

| Rôle       | Email                     | Mot de passe    | Nom            | Département     |
| ---------- | ------------------------- | --------------- | -------------- | --------------- |
| **admin**  | `admin@groupomania.com`   | `Admin@2026`    | Alice Martin   | Direction       |
| employee   | `marie@groupomania.com`   | `Employe@2026`  | Marie Dubois   | Marketing       |
| employee   | `lucas@groupomania.com`   | `Employe@2026`  | Lucas Bernard  | Développement   |

Deux employés sont fournis pour pouvoir tester les échanges (messagerie, canaux,
mentions) entre plusieurs utilisateurs.

> ⚠️ **Comptes de test uniquement** — mots de passe volontairement simples, à ne
> jamais utiliser en production.

## (Re)créer les comptes

Les comptes sont insérés directement dans les bases via un script idempotent
(re-jouable sans risque de doublon) :

```bash
cd backend
node scripts/seed-test-accounts.js
```

Le script :

- hache les mots de passe avec **bcrypt** (12 rounds), comme le modèle `User` ;
- crée si nécessaire les types ENUM et les tables `users` (schéma identique aux
  modèles Sequelize, donc compatible avec le `sync({ alter: true })` des services) ;
- insère les comptes dans **`groupomania_auth`** (login + rôle porté par le JWT)
  **et** **`groupomania_users`** (profil enrichi affiché dans l'app).

Variables d'environnement surchargables (valeurs par défaut entre parenthèses) :
`DB_HOST` (localhost), `DB_PORT` (5432), `DB_USER` (postgres), `DB_PASSWORD`
(password), `AUTH_DB` (groupomania_auth), `USER_DB` (groupomania_users).

## Pré-requis pour se connecter

Le login passe par le backend. Il faut donc que l'infrastructure et les services
tournent :

1. **Infra** (PostgreSQL + Redis) via Docker :
   ```bash
   cd backend && docker compose up -d postgres redis
   ```
2. **Frontend** :
   ```bash
   cd frontend && npm run dev      # http://localhost:5173
   ```
3. **Backend** (API Gateway + microservices) :
   ```bash
   cd backend && npm run dev
   ```

> ✅ **État actuel** : la stack complète tourne (frontend + gateway + 4
> microservices + Postgres/Redis) et le login est **vérifié bout-en-bout** via le
> gateway. Ces comptes permettent de se connecter depuis l'UI (http://localhost:5173).
> Voir [`STATUS.md`](./STATUS.md) pour le détail.
