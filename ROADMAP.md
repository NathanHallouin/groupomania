# Roadmap — Approfondissement des features existantes

Cette roadmap ne propose **pas de nouveaux produits** : elle vise à **approfondir
les fonctionnalités déjà développées** dans Groupomania (authentification,
profils, messagerie, fichiers, temps réel), à combler les angles morts et à
finir de câbler ce qui n'existe aujourd'hui que côté backend ou côté modèle.

> **✅ Prérequis (P0) — FAIT.** Le backend démarre désormais : les 5 microservices
> tournent (3000-3004), le login est vérifié bout-en-bout via le gateway, et les
> comptes de test permettent de se connecter depuis l'UI. Détail des corrections
> dans [`docs/STATUS.md`](docs/STATUS.md). Les épics ci-dessous sont maintenant
> exécutables et testables.

Légende effort : 🟢 petit · 🟡 moyen · 🔴 gros — Impact : ⭐ à ⭐⭐⭐

---

## 1. Temps réel — brancher ce qui existe déjà côté backend

**État actuel.** Le `message-service` expose un `websocketService` **complet**
(socket.io) : `send_message`, `edit_message`, `delete_message`, `add_reaction` /
`remove_reaction`, `join_channel` / `leave_channel`, `typing_start/stop`, plus les
events sortants (`message_created/updated/deleted`, `reaction_added/removed`,
`member_joined/left`, `user_typing`, `notification`). **Mais le frontend n'a
aucune dépendance `socket.io-client`** : la messagerie fonctionne en HTTP/polling
uniquement.

**Approfondir.**
- ✅ **FAIT** — `socket.io-client` ajouté, couche socket authentifiée par JWT
  (`api/socket.ts`) + hook `useChannelSocket` (join/leave, écoute des events,
  déconnexion auto au logout).
- ✅ **FAIT** — Messages en direct : sur event `message_created/updated/deleted`
  et `reaction_*`, la `ChannelPage` recharge via le loader react-router.
- ✅ **FAIT** — Indicateur « en train d'écrire… » (`typing_start/stop` →
  `user_typing`), affiché dans la `ChannelPage`.
- 🟡⭐⭐ Présence en ligne / hors-ligne par utilisateur (dérivée des connexions socket).
- 🟡⭐⭐ Réception/patch optimiste (append local) au lieu du rechargement complet.
- 🟢⭐ Proxifier le WebSocket via le gateway (aujourd'hui connexion directe à `:3003`).

> **Vérifié bout-en-bout** (2 clients socket + JWT réel) : connexion authentifiée
> (bon/mauvais token), `join_channel`, indicateur de saisie **et** message reçus
> **en direct** par l'autre client ; le message est persisté et relu via
> `GET /api/messages/channel/:id`.

---

## 2. Messagerie & canaux — exploiter toute la richesse du modèle

**État actuel.** Modèles très complets : `Channel` (`public/private/direct/group`,
`active/archived/deleted`, `canUserPost`/`canUserView`), `ChannelMember`
(rôles `admin/moderator/member/read_only`), `Message` (types
`text/image/file/link/system`, statut `sent/delivered/read/deleted`,
`canEdit`/`canDelete`), `Reaction` (6 types). Frontend : liste + page canal +
création + édition/suppression, réactions **côté API seulement**.

**Approfondir.**
- ✅ **FAIT** — **Réactions** : composant `ReactionBar` (affichage groupé des 6
  types + picker d'emoji, ajout/bascule/retrait) branché sur l'API et rafraîchi
  en temps réel. Le backend n'autorise qu'une réaction par utilisateur/message
  (l'UI bascule automatiquement).
- 🟡⭐⭐ **Messages directs (DM)** : le type `direct` existe ; ajouter le parcours
  « écrire à un utilisateur » depuis un profil / la liste.
- 🟡⭐⭐ **Modération de canal** : gérer les membres, promouvoir modérateur,
  `read_only`, archiver/supprimer (les méthodes `canUser*` existent déjà).
- 🟢⭐⭐ **Accusés de lecture** : exploiter le statut `sent/delivered/read`.
- 🟡⭐⭐ **@Mentions** : composer avec autocomplétion + surlignage
  (les préférences `notifications.mentions` existent déjà).
- 🟢⭐ **Épingler / éditer** : indiquer « modifié », historique léger.
- 🟢⭐ **Sécurité XSS** : `sanitize-html` est présent — vérifier qu'il est bien
  appliqué au rendu et à l'entrée.

> **Corrections apportées (chaîne canaux/messages/réactions).** Ces chemins étaient
> cassés — désormais fonctionnels et vérifiés :
> - **création de canal** (`POST /api/channels` → 200) : `ownerId` non renseigné,
>   `type` incohérent validateur↔enum du modèle → aligné (`public/private/direct/group`),
>   rollback tenté après commit → corrigé, include `members→user`/`creator`
>   inexistants retirés ;
> - **envoi de message** : droit d'écriture basé sur une colonne `canWrite`
>   inexistante → dérivé du `role` (read_only exclu) ;
> - **réactions** : colonne `reactionType` → `type` (le nom réel), include `user`
>   inexistant retiré, et `toSocketJSON` expose maintenant le tableau `reactions` ;
> - **lecture messages/canaux** : includes d'associations cross-service
>   (`author`, `user`) retirés (l'identité vit dans un autre service).
> - **enrichissement auteur** ✅ : hook `useUsersMap` (cache React Query) côté
>   frontend → les messages affichent le nom/avatar de l'auteur (join `authorId`
>   ↔ profil user-service), au lieu du seul `authorId`.
> - **Gateway — bug critique corrigé** : `sanitizeObject` appelait
>   `obj.hasOwnProperty()` sur `req.query` (prototype `null` en Express 5) →
>   **toute requête avec query params renvoyait 500** (pagination, recherche, et
>   même le chargement des messages `?limit=50`). Remplacé par
>   `Object.prototype.hasOwnProperty.call`.

---

## 3. Pièces jointes & fichiers — connecter le `file-service`

**État actuel.** `file-service` : modèle `File` (types, statut, `SecurityLevel`),
`FileShare` (permissions de partage), `imageProcessingService` (sharp), upload
(multer), validation `file-type`/`mime-types`, `node-cron` (nettoyage). Frontend :
**seul l'avatar** utilise l'upload (`users.ts` → `sharp` multi-tailles). Les
messages de type `image/file/link` ne sont pas alimentés.

**Approfondir.**
- 🔴⭐⭐⭐ Joindre des fichiers/images à un message (drag & drop + progression),
  reliés aux types `image`/`file` déjà prévus.
- 🟡⭐⭐ Aperçus (miniatures via `imageProcessingService`) et galerie par canal.
- 🟡⭐⭐ **Partage de fichiers** : exposer `FileShare` (permissions, expiration).
- 🟢⭐⭐ Respect des `SecurityLevel` / `canAccess(userId, role)` (déjà codé côté modèle).
- 🟢⭐ Déballage de liens (`link`) : titre/vignette (Open Graph).

---

## 4. Authentification — finir les parcours à moitié présents

**État actuel.** `register`, `login`, `logout`, `refresh`, `profile`,
`change-password`, `verify-token`. Le modèle porte **déjà** `emailVerificationToken`,
`passwordResetToken`/`passwordResetExpires`, verrouillage
(`loginAttempts`/`lockUntil`), et `nodemailer` est installé — **mais aucun endpoint
ni écran** pour la vérification d'email et la réinitialisation de mot de passe.

**Approfondir.**
- 🟡⭐⭐⭐ **Mot de passe oublié / reset** : endpoints `forgot`/`reset` + emails
  (`nodemailer`) + écrans — les champs `passwordReset*` existent déjà.
- 🟡⭐⭐ **Vérification d'email** : envoi + endpoint de confirmation
  (`emailVerificationToken` déjà présent).
- 🟢⭐⭐ Feedback UI du **verrouillage de compte** (5 tentatives / 2 h déjà codé).
- 🟢⭐ Gestion propre de l'expiration du refresh token (auto-refresh silencieux).
- 🟡⭐ (Optionnel) MFA / TOTP par-dessus le socle existant.

---

## 5. Utilisateurs, profils & annuaire — valoriser le modèle enrichi

**État actuel.** `user-service` : profil riche (`position`, `bio`, `phone`,
`location`, `birthDate`, `hireDate`, `manager`, `preferences` JSON, `status`),
avatar multi-tailles, `search`, `departments`, `stats`. Frontend : `UsersPage`,
`UserProfilePage`, `ProfilePage`, `SettingsPage`.

**Approfondir.**
- 🟡⭐⭐ **Annuaire filtrable** (par département/rôle/statut) + tri, à partir de
  `search`/`departments`/`stats` déjà exposés.
- 🟡⭐⭐ **Organigramme** : exploiter le lien `manager` (Manager/DirectReports déjà associés).
- 🟢⭐⭐ Compléter l'édition de profil (tous les champs du modèle : bio, tel, localisation…).
- 🟢⭐⭐ **Complétude du profil** (`isProfileComplete`/`checkProfileCompleteness` déjà codés) : jauge de progression.
- 🟢⭐ Confidentialité : appliquer réellement `preferences.privacy` (showEmail/showDepartment/showLastLogin).

---

## 6. Administration & modération — donner corps au rôle `admin`

**État actuel.** Rôle `admin` porté par le JWT ; `user-service` expose `stats` et
`status` (`active/inactive/suspended/pending`) ; les modèles Message/Channel ont
des règles admin/moderator. Aucune interface d'administration dédiée.

**Approfondir.**
- 🔴⭐⭐⭐ **Tableau de bord admin** : gestion des utilisateurs (activer/suspendre via
  `status`, changer de rôle), vue d'ensemble via `stats`.
- 🟡⭐⭐ Modération transverse des messages (suppression, `read_only`) en s'appuyant
  sur `canDelete`/`canEdit`.
- 🟢⭐ Journal d'audit léger (les logs `winston` sont déjà en place).

---

## 7. Recherche — d'une recherche par page à une recherche transverse

**État actuel.** Recherche locale sur `ChannelsPage` et `UsersPage` ; endpoints
`users/search`, `channels/search`, `messages/search` ; barre de recherche présente
dans le `Header` (non branchée globalement).

**Approfondir.**
- 🟡⭐⭐ Recherche **globale** depuis le Header (utilisateurs + canaux + messages).
- 🟢⭐⭐ Filtres & facettes (département, type de canal, auteur, date `date-fns`).
- 🟡⭐ Recherche plein-texte Postgres (index GIN) sur messages.

---

## 8. UX transverse — finir ce qui est déclaré mais pas implémenté

**État actuel.** `preferences` porte `theme` (`light`/`dark`) et `language` (`fr`)
et un bloc `notifications`, mais il n'y a ni bascule de thème, ni i18n, ni centre
de notifications, alors que l'event socket `notification` est déjà émis.

**Approfondir.**
- 🟡⭐⭐ **Centre de notifications** (in-app + préférences déjà modélisées).
- 🟢⭐⭐ **Bascule de thème** clair/sombre reliée à `preferences.theme` (Tailwind `dark:`).
- 🟡⭐ **i18n** (fr/en) reliée à `preferences.language`.
- 🟢⭐ États de chargement/erreur/vide homogènes (React Query déjà en place).
- 🟢⭐ Accessibilité (focus, ARIA, navigation clavier) sur les composants `ui/`.

---

## 9. Qualité, tests & observabilité

**État actuel.** `jest` configuré partout mais **aucun test** (front ni back) ;
`winston` + rotation de logs présents ; `eslint`/`prettier`/`husky` configurés.

**Approfondir.**
- 🔴⭐⭐⭐ Tests : unitaires (services/contrôleurs), intégration (auth + messagerie),
  e2e sur les parcours clés.
- 🟡⭐⭐ CI (lint + build + tests) sur PR.
- 🟢⭐⭐ Endpoints `/health` par service + métriques de base.
- 🟢⭐ Durcissement CORS/Helmet/rate-limit (paquets déjà installés).

---

## Séquencement proposé

| Phase | Objectif | Épics |
| ----- | -------- | ----- |
| **P0 — Débloquer** ✅ | Faire booter le backend | ~~Prérequis~~ **FAIT** (`docs/STATUS.md`) |
| **P1 — Rendre la messagerie vivante** 🚧 | Le cœur du produit en temps réel | ✅ §1 Temps réel · ✅ chaîne canaux/messages réparée · ✅ §2 Réactions · ✅ auteur des messages (nom/avatar) · ✅ gateway query params réparé · reste §2 DM/modération, §8 notifications |
| **P2 — Comptes complets** | Parcours d'auth de bout en bout | §4 Auth (reset/verify), §5 Profils |
| **P3 — Contenus riches** | Fichiers & recherche | §3 Pièces jointes, §7 Recherche |
| **P4 — Pilotage** | Admin, modération, qualité | §6 Admin, §9 Tests/CI |

> Chaque épic est **ancré sur des modèles/endpoints déjà présents** : il s'agit
> majoritairement de **câbler et finir**, pas de repartir de zéro.
