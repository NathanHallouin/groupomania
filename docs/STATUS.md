# État du projet

_Dernière mise à jour : 2026-07-09_

## ✅ Dépendances

Toutes les librairies ont été mises à jour vers leurs dernières versions dans les
7 `package.json` (frontend, backend racine, et les 5 microservices), puis
réinstallées.

**Exception — TypeScript épinglé à `6.0.3`** (au lieu de `7.0.2`) : TS 7 (nouveau
compilateur) n'est pas encore supporté par le toolchain (`typescript-eslint@8`
plafonne à `<6.1.0`, ainsi que `ts-node` / `ts-node-dev`). `6.0.3` est la dernière
version compatible. Conséquence : ajout de `"ignoreDeprecations": "6.0"` dans les
6 `tsconfig.json` du backend (TS 6 transforme en erreurs les options `baseUrl` et
`moduleResolution: node` utilisées par le projet).

## ✅ Ce qui tourne (stack complète)

| Élément                     | Port | Statut | Détail                                     |
| --------------------------- | ---- | ------ | ------------------------------------------ |
| Frontend (Vite)             | 5173 | ✔️     | http://localhost:5173                      |
| API Gateway                 | 3000 | ✔️     | proxy + auth JWT vers les microservices    |
| auth-service                | 3001 | ✔️     | login / register / refresh / profile       |
| user-service                | 3002 | ✔️     | profils, annuaire, stats, départements     |
| message-service             | 3003 | ✔️     | messages, canaux, WebSocket                |
| file-service                | 3004 | ✔️     | bootstrap créé (health + upload)           |
| PostgreSQL (Docker/Colima)  | 5432 | ✔️     | conteneur `groupomania-postgres`           |
| Redis (Docker/Colima)       | 6379 | ✔️     | conteneur `groupomania-redis`              |
| Comptes de test             | —    | ✔️     | Voir [`TEST_ACCOUNTS.md`](./TEST_ACCOUNTS.md) |

Bases créées : `groupomania_auth`, `groupomania_users`, `groupomania_messages`,
`groupomania_files`, `groupomania_dev` (rôle `postgres` / `password`).

**Vérifié bout-en-bout** (via le gateway `:3000`, préfixe `/api`) :
`POST /api/auth/login` → JWT réel · `GET /api/users`, `/api/users/stats`,
`/api/users/departments`, `/api/channels/user`, `/api/auth/profile` → **200**.
Login admin **et** employé OK.

## 🔧 Backend débloqué — corrections apportées (P0 de la roadmap)

Le backend ne démarrait pas à cause de bugs de code préexistants (indépendants de
la mise à jour des libs : Express 5 / redis 5 / express-rate-limit 8 étaient déjà
déclarés). Corrigés :

| Domaine | Correction |
| ------- | ---------- |
| **Express 5** | Routes catch-all `'*'` remplacées par des handlers sans path (gateway, message, user) ; `req.query` en lecture seule → `Object.defineProperty` (gateway `sanitize`, message errorHandler) |
| **redis v5** | `import { createClient }` (export nommé) au lieu de `Redis.createClient` (gateway) |
| **express-rate-limit v8** | `keyGenerator` IPv6-safe via `ipKeyGenerator` (gateway, message) |
| **auth-service** | `ts-node.esm:false` + dev en `ts-node-dev --transpile-only` |
| **user-service** | dev en `ts-node-dev --transpile-only` (erreurs de types Express, sans impact runtime) |
| **file-service** | **service incomplet** : `server.ts` + `app.ts` créés (health + upload) ; `modelPaths` cassé retiré ; FK inter-services vers `users` supprimées ; `fs-extra` ajouté ; associations dédupliquées ; dev en `ts-node-dev` |
| **message-service** | associations `sequelize-typescript` dupliquées → `initializeAssociations` neutralisé |
| **API Gateway** | auth **stubée** (token simulé) + cibles de proxy **décalées d'un port** → proxys réels vers auth/users/messages/channels/files (préfixe `/api`, bodies POST via `fixRequestBody`) |
| **Secret JWT** | 3 valeurs divergentes entre services → **un secret partagé** aligné dans tous les `.env` (auth signe / gateway+services vérifient) |

> Les microservices tournent en **`ts-node-dev --transpile-only`** (mode dev déjà
> utilisé par le projet) : le typecheck strict n'est pas bloquant au runtime. Des
> erreurs de types subsistent pour `npm run build` (couvertes par l'épic Qualité
> §9 de la [roadmap](../ROADMAP.md)).
