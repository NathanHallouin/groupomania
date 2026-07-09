/**
 * Smoke-test end-to-end de la stack Groupomania (via l'API Gateway).
 * -------------------------------------------------------------------
 * Exerce les parcours critiques et vérifie qu'ils répondent correctement.
 * Toutes les mutations sont AUTO-RESTAURÉES : le script est re-jouable sans
 * polluer les données (comptes de test seedés).
 *
 * Pré-requis : la stack doit tourner (infra + microservices + gateway).
 *   cd backend && docker compose up -d postgres redis && npm run dev
 *
 * Usage :
 *   node scripts/smoke-test.js            (défaut : http://localhost:3000/api)
 *   API_URL=http://host:3000/api node scripts/smoke-test.js
 *
 * Sort en code 0 si tout passe, 1 sinon.
 */
const API = process.env.API_URL || 'http://localhost:3000/api';

const ACCOUNTS = {
  admin: { email: 'admin@groupomania.com', password: 'Admin@2026' },
  marie: { email: 'marie@groupomania.com', password: 'Employe@2026' },
};

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}
function ko(name, detail) {
  failed++;
  console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
}
function check(name, cond, detail) {
  cond ? ok(name) : ko(name, detail);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* pas de corps JSON */
  }
  return { status: res.status, json };
}

async function login(acc) {
  const { json } = await api('POST', '/auth/login', { body: acc });
  return json?.data?.tokens?.accessToken;
}

async function section(title, fn) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  try {
    await fn();
  } catch (err) {
    ko(`${title} (exception)`, err.message);
  }
}

async function main() {
  console.log(`Smoke-test Groupomania → ${API}`);

  let adminToken;

  await section('Authentification', async () => {
    adminToken = await login(ACCOUNTS.admin);
    check('login admin', !!adminToken);

    const emp = await login(ACCOUNTS.marie);
    check('login employé', !!emp);

    const bad = await api('POST', '/auth/login', {
      body: { email: ACCOUNTS.admin.email, password: 'mauvais' },
    });
    check('mauvais mot de passe rejeté (401)', bad.status === 401, `status ${bad.status}`);

    const profile = await api('GET', '/auth/profile', { token: adminToken });
    check('GET /auth/profile (200)', profile.status === 200, `status ${profile.status}`);
  });

  await section('Utilisateurs & recherche (query params)', async () => {
    const list = await api('GET', '/users?limit=50', { token: adminToken });
    check('GET /users?limit=50 (200)', list.status === 200, `status ${list.status}`);
    check('liste non vide', Array.isArray(list.json?.data) && list.json.data.length > 0);

    const search = await api('GET', '/users/search?q=mar', { token: adminToken });
    check('GET /users/search?q=mar (200)', search.status === 200, `status ${search.status}`);

    const stats = await api('GET', '/users/stats', { token: adminToken });
    check('GET /users/stats (200)', stats.status === 200, `status ${stats.status}`);
  });

  await section('Messagerie & réactions', async () => {
    const channels = await api('GET', '/channels/user', { token: adminToken });
    check('GET /channels/user (200)', channels.status === 200, `status ${channels.status}`);
    const channelId = channels.json?.data?.channels?.[0]?.id;

    if (!channelId) {
      ko('aucun canal disponible pour tester les messages');
      return;
    }

    const list = await api('GET', `/messages/channel/${channelId}?limit=5`, { token: adminToken });
    check('GET /messages/channel/:id (200)', list.status === 200, `status ${list.status}`);

    const messageId = list.json?.data?.messages?.slice(-1)?.[0]?.id;
    if (!messageId) {
      ok('aucun message à réagir (canal vide) — étape réaction ignorée');
      return;
    }

    const add = await api('POST', `/messages/${messageId}/reactions`, {
      token: adminToken,
      body: { reactionType: 'like' },
    });
    check('ajout réaction (201)', add.status === 201, `status ${add.status}`);

    const del = await api('DELETE', `/messages/${messageId}/reactions/like`, { token: adminToken });
    check('retrait réaction (200)', del.status === 200, `status ${del.status}`);
  });

  await section('Administration (auto-restauré)', async () => {
    // Marie = id 2 (compte seedé). Promotion puis rétrogradation.
    const promote = await api('PUT', '/users/2', { token: adminToken, body: { role: 'admin' } });
    check('promouvoir employé → admin (200)', promote.status === 200, `status ${promote.status}`);

    const suspend = await api('PUT', '/users/2', { token: adminToken, body: { status: 'suspended' } });
    check('suspendre (200)', suspend.status === 200, `status ${suspend.status}`);

    const restore = await api('PUT', '/users/2', {
      token: adminToken,
      body: { role: 'employee', status: 'active' },
    });
    check('restauration rôle+statut (200)', restore.status === 200, `status ${restore.status}`);
  });

  await section('Réinitialisation de mot de passe (auto-restauré)', async () => {
    const TEMP = 'SmokeTemp@2026';
    const forgot = await api('POST', '/auth/forgot-password', {
      body: { email: ACCOUNTS.marie.email },
    });
    check('forgot-password (200)', forgot.status === 200, `status ${forgot.status}`);

    const url = forgot.json?.data?.resetUrl;
    const token = url ? url.split('token=')[1] : null;
    check('lien de reset fourni (dev)', !!token);
    if (!token) return;

    const reset = await api('POST', '/auth/reset-password', { body: { token, password: TEMP } });
    check('reset-password (200)', reset.status === 200, `status ${reset.status}`);

    const withTemp = await login({ email: ACCOUNTS.marie.email, password: TEMP });
    check('login avec le nouveau mot de passe', !!withTemp);

    // Restaure le mot de passe d'origine via un second cycle forgot/reset.
    const forgot2 = await api('POST', '/auth/forgot-password', {
      body: { email: ACCOUNTS.marie.email },
    });
    const token2 = forgot2.json?.data?.resetUrl?.split('token=')[1];
    if (token2) {
      await api('POST', '/auth/reset-password', {
        body: { token: token2, password: ACCOUNTS.marie.password },
      });
    }
    const restored = await login(ACCOUNTS.marie);
    check('mot de passe d’origine restauré', !!restored);
  });

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Résultat : ${passed} réussi(s), ${failed} échec(s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Échec du smoke-test :', err);
  process.exit(1);
});
