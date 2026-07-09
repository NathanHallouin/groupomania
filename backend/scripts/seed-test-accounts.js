/**
 * Seed test accounts (par rôle) — Groupomania
 * -------------------------------------------------------------
 * Crée des comptes de test dans les bases `auth-service` et `user-service`
 * afin de pouvoir tester toutes les interfaces (rôles `employee` et `admin`).
 *
 * Le script est IDEMPOTENT (re-jouable) et AUTONOME : il crée les types ENUM
 * et les tables `users` si elles n'existent pas encore, en respectant le schéma
 * des modèles Sequelize (createdAt/updatedAt en camelCase, `sync({ alter: true })`
 * de l'auth-service laissera donc la table intacte).
 *
 * Usage :
 *   node scripts/seed-test-accounts.js
 *
 * Variables d'env (valeurs par défaut alignées sur les .env / docker-compose) :
 *   DB_HOST=localhost  DB_PORT=5432  DB_USER=postgres  DB_PASSWORD=password
 *   AUTH_DB=groupomania_auth  USER_DB=groupomania_users
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const CFG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};
const AUTH_DB = process.env.AUTH_DB || 'groupomania_auth';
const USER_DB = process.env.USER_DB || 'groupomania_users';

/** Comptes de test — mot de passe en clair (haché à l'insertion). */
const ACCOUNTS = [
  {
    id: 1,
    email: 'admin@groupomania.com',
    password: 'Admin@2026',
    firstName: 'Alice',
    lastName: 'Martin',
    department: 'Direction',
    position: 'Administratrice',
    role: 'admin',
  },
  {
    id: 2,
    email: 'marie@groupomania.com',
    password: 'Employe@2026',
    firstName: 'Marie',
    lastName: 'Dubois',
    department: 'Marketing',
    position: 'Chargée de communication',
    role: 'employee',
  },
  {
    id: 3,
    email: 'lucas@groupomania.com',
    password: 'Employe@2026',
    firstName: 'Lucas',
    lastName: 'Bernard',
    department: 'Développement',
    position: 'Développeur',
    role: 'employee',
  },
];

const DEFAULT_PREFS = {
  theme: 'light',
  language: 'fr',
  notifications: { email: true, push: true, mentions: true, messages: true },
  privacy: { showEmail: false, showDepartment: true, showLastLogin: false },
};

async function ensureEnum(client, name, values) {
  const labels = values.map((v) => `'${v}'`).join(', ');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE "${name}" AS ENUM (${labels});
      END IF;
    END $$;`);
}

async function seedAuthDb(hashes) {
  const client = new Client({ ...CFG, database: AUTH_DB });
  await client.connect();
  try {
    await ensureEnum(client, 'enum_users_role', ['employee', 'admin']);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        "department" VARCHAR(255) NOT NULL DEFAULT 'General',
        "role" "enum_users_role" NOT NULL DEFAULT 'employee',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "emailVerificationToken" VARCHAR(255),
        "passwordResetToken" VARCHAR(255),
        "passwordResetExpires" TIMESTAMP WITH TIME ZONE,
        "lastLogin" TIMESTAMP WITH TIME ZONE,
        "loginAttempts" INTEGER NOT NULL DEFAULT 0,
        "lockUntil" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`);

    for (const acc of ACCOUNTS) {
      await client.query(
        `INSERT INTO "users"
           ("id","email","password","firstName","lastName","department","role","isActive","emailVerified","loginAttempts","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,0,NOW(),NOW())
         ON CONFLICT ("email") DO UPDATE SET
           "password"=EXCLUDED."password",
           "firstName"=EXCLUDED."firstName",
           "lastName"=EXCLUDED."lastName",
           "department"=EXCLUDED."department",
           "role"=EXCLUDED."role",
           "isActive"=true,
           "emailVerified"=true,
           "loginAttempts"=0,
           "lockUntil"=NULL,
           "updatedAt"=NOW();`,
        [acc.id, acc.email, hashes[acc.email], acc.firstName, acc.lastName, acc.department, acc.role]
      );
    }
    await client.query(`SELECT setval(pg_get_serial_sequence('"users"','id'), (SELECT MAX("id") FROM "users"));`);
    console.log(`  ✓ ${AUTH_DB}: ${ACCOUNTS.length} comptes (login) insérés/mis à jour`);
  } finally {
    await client.end();
  }
}

async function seedUserDb() {
  const client = new Client({ ...CFG, database: USER_DB });
  await client.connect();
  try {
    await ensureEnum(client, 'enum_users_role', ['employee', 'admin']);
    await ensureEnum(client, 'enum_users_status', ['active', 'inactive', 'suspended', 'pending']);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        "department" VARCHAR(255) NOT NULL,
        "position" VARCHAR(255),
        "role" "enum_users_role" NOT NULL DEFAULT 'employee',
        "status" "enum_users_status" NOT NULL DEFAULT 'active',
        "avatar" VARCHAR(255),
        "bio" TEXT,
        "phone" VARCHAR(255),
        "location" VARCHAR(255),
        "birthDate" DATE,
        "hireDate" DATE,
        "manager" INTEGER REFERENCES "users"("id"),
        "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "lastLogin" TIMESTAMP WITH TIME ZONE,
        "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
        "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`);

    for (const acc of ACCOUNTS) {
      await client.query(
        `INSERT INTO "users"
           ("id","email","firstName","lastName","department","position","role","status","preferences","isEmailVerified","isProfileComplete","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,true,true,NOW(),NOW())
         ON CONFLICT ("email") DO UPDATE SET
           "firstName"=EXCLUDED."firstName",
           "lastName"=EXCLUDED."lastName",
           "department"=EXCLUDED."department",
           "position"=EXCLUDED."position",
           "role"=EXCLUDED."role",
           "status"='active',
           "isEmailVerified"=true,
           "isProfileComplete"=true,
           "updatedAt"=NOW();`,
        [acc.id, acc.email, acc.firstName, acc.lastName, acc.department, acc.position, acc.role, DEFAULT_PREFS]
      );
    }
    await client.query(`SELECT setval(pg_get_serial_sequence('"users"','id'), (SELECT MAX("id") FROM "users"));`);
    console.log(`  ✓ ${USER_DB}: ${ACCOUNTS.length} profils insérés/mis à jour`);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('→ Hachage des mots de passe (bcrypt, 12 rounds)…');
  const hashes = {};
  for (const acc of ACCOUNTS) {
    hashes[acc.email] = await bcrypt.hash(acc.password, 12);
  }

  console.log('→ Seed de la base auth-service…');
  await seedAuthDb(hashes);

  console.log('→ Seed de la base user-service…');
  try {
    await seedUserDb();
  } catch (err) {
    console.warn(`  ⚠ user-service ignoré (${err.message}). Le login fonctionne quand même via auth-service.`);
  }

  console.log('\n✅ Comptes de test prêts :');
  for (const acc of ACCOUNTS) {
    console.log(`   [${acc.role.padEnd(8)}] ${acc.email}  —  mot de passe: ${acc.password}`);
  }
}

main().catch((err) => {
  console.error('❌ Échec du seed :', err.message);
  process.exit(1);
});
