# CLAUDE.md

Guide pour travailler efficacement sur ce dépôt. À lire avant toute modification.

## Règles de contribution (IMPORTANT)

- **Ne jamais mentionner Claude / Anthropic** dans les messages de commit, les
  descriptions de PR, ni comme co‑auteur (`Co-Authored-By`). Aucune ligne
  « Generated with Claude Code ». _(Appliqué aussi via `.claude/settings.json` →
  `attribution` vide + `includeCoAuthoredBy: false`.)_
- Messages de commit **en français**, concis, à l'impératif ou en résumé.
- Ne **commit/push que si l'utilisateur le demande**.
- Ne jamais committer de secrets : les `.env` sont gitignorés (seuls les
  `.env.example` sont versionnés).

## Vue d'ensemble

Réseau social d'entreprise, **monorepo** :

| Dossier | Stack |
| ------- | ----- |
| `frontend/` | React 19, TypeScript, Vite, Tailwind, React Query, Zustand, React Router |
| `backend/`  | Microservices Node/TypeScript, Express 5, Sequelize, PostgreSQL, Redis |

Le backend est un **workspace npm** (`backend/package.json` → `microservices/*`).

### Microservices (backend/microservices/)

| Service | Port | Rôle | Base |
| ------- | ---- | ---- | ---- |
| api-gateway | 3000 | Point d'entrée unique, proxy + auth JWT | — |
| auth-service | 3001 | login / register / refresh / profil | `groupomania_auth` |
| user-service | 3002 | profils, annuaire, stats | `groupomania_users` |
| message-service | 3003 | messages, canaux, WebSocket (socket.io) | `groupomania_messages` |
| file-service | 3004 | upload, images, partage | `groupomania_files` |

Le **frontend** appelle uniquement le gateway : `http://localhost:3000/api` (voir
`frontend/.env` → `VITE_API_URL`). Chaque service sert ses routes sous `/api/<x>`.

## Lancer le projet

Pré-requis : Node ≥ 20, Docker (Colima OK).

```bash
# 1. Infra (PostgreSQL + Redis)
cd backend && docker compose up -d postgres redis

# 2. Comptes de test (idempotent) — voir docs/TEST_ACCOUNTS.md
node scripts/seed-test-accounts.js

# 3. Backend (les 5 microservices en parallèle via concurrently)
cd backend && npm run dev

# 4. Frontend
cd frontend && npm run dev   # http://localhost:5173
```

Comptes de test : `admin@groupomania.com` / `Admin@2026` (admin),
`marie@groupomania.com` / `Employe@2026` (employé). Détails : `docs/TEST_ACCOUNTS.md`.

## Commandes utiles

| But | Commande |
| --- | -------- |
| Dev backend (tous services) | `cd backend && npm run dev` |
| Dev un seul service | `cd backend && npm run dev:gateway` (ou `:auth`, `:user`, `:message`, `:file`) |
| Dev frontend | `cd frontend && npm run dev` |
| Lint / format backend | `cd backend && npm run lint` · `npm run format` |
| Lint frontend | `cd frontend && npm run lint` |
| Build | `npm run build` (backend et frontend) |

## Conventions & pièges connus

- **Express 5** : pas de route catch‑all `'*'` (utiliser un handler `app.use((req,res)=>…)`) ;
  `req.query` est en **lecture seule** → ne pas réassigner, utiliser
  `Object.defineProperty(req, 'query', { value, writable: true, configurable: true })`.
- **express-rate-limit v8** : tout `keyGenerator` custom basé sur l'IP doit passer
  par `ipKeyGenerator(req.ip || '')` (compat IPv6).
- **Dev en `ts-node-dev --transpile-only`** : le typecheck n'est pas bloquant au
  runtime. Des erreurs de types peuvent subsister pour `npm run build` — les
  corriger progressivement (épic Qualité de la roadmap).
- **TypeScript épinglé à 6.0.3** (TS 7 pas encore supporté par le toolchain) ;
  `ignoreDeprecations: "6.0"` dans les tsconfig backend.
- **JWT** : un **secret partagé** entre services. auth signe avec `JWT_ACCESS_SECRET`,
  les autres vérifient avec `JWT_ACCESS_SECRET` (services) ou `JWT_SECRET` (gateway) ;
  garder ces valeurs identiques dans tous les `.env`.
- **Microservices = bases séparées** : pas de FK PostgreSQL inter‑services
  (les références à `users` depuis file-service sont logiques, pas des contraintes DB).
- **Modèles** : message-service et file-service utilisent `sequelize-typescript`
  (associations par décorateurs) — ne pas les redéclarer manuellement (conflit d'alias).

## Documentation

- `ROADMAP.md` — feuille de route (approfondissement des features existantes).
- `docs/STATUS.md` — état courant + historique des corrections.
- `docs/TEST_ACCOUNTS.md` — comptes de test par rôle + seed.
