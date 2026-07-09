-- PostgreSQL dump for Groupomania development database
-- Generated for PostgreSQL 13+

-- Create database (run separately if needed)
-- CREATE DATABASE groupomania_development;
-- \c groupomania_development;

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "Users" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin BOOLEAN DEFAULT FALSE,
    "emailHash" VARCHAR(255) NOT NULL UNIQUE,
    lock_until TIMESTAMP NULL,
    login_attempts INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS "Messages" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500) NULL,
    likes INTEGER DEFAULT 0,
    users_liked JSON DEFAULT '[]'::json,
    users_disliked JSON DEFAULT '[]'::json,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES "Users"(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON "Users"("emailHash");
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON "Messages"(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON "Messages"("createdAt");

-- Sample admin user (password: AdminPassword123!)
-- Hash generated with bcrypt rounds=12
INSERT INTO "Users" (email, name, surname, password, admin, "emailHash", "createdAt", "updatedAt") 
VALUES (
    'admin@groupomania.com',
    'Admin',
    'Groupomania',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8NlVjqg.8G',
    TRUE,
    'c8b8c8b8c8b8c8b8c8b8c8b8c8b8c8b8',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Sample messages
INSERT INTO "Messages" (user_id, title, content, "createdAt", "updatedAt") 
VALUES 
    (1, 'Bienvenue sur Groupomania!', 'Premier message de test sur notre nouveau réseau social d''entreprise.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 'Annonce importante', 'N''oubliez pas la réunion de demain à 14h en salle de conférence.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Update sequence if needed
SELECT setval(pg_get_serial_sequence('"Users"', 'id'), COALESCE(MAX(id), 1)) FROM "Users";
SELECT setval(pg_get_serial_sequence('"Messages"', 'id'), COALESCE(MAX(id), 1)) FROM "Messages";
