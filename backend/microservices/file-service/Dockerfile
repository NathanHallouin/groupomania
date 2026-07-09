# Dockerfile multi-stage pour le File Service
FROM node:20-alpine AS base

# Installer les dépendances système pour Sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

WORKDIR /app

# Stage de développement
FROM base AS development

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer toutes les dépendances (dev + prod)
RUN npm ci

# Copier le code source
COPY src/ ./src/

# Exposer le port
EXPOSE 3004

# Créer le répertoire d'uploads
RUN mkdir -p uploads temp

# Commande de développement avec hot reload
CMD ["npm", "run", "dev"]

# Stage de build
FROM base AS build

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY src/ ./src/

# Compiler TypeScript
RUN npm run build

# Stage de production
FROM node:20-alpine AS production

# Installer seulement les dépendances système nécessaires
RUN apk add --no-cache vips-dev

WORKDIR /app

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fileservice -u 1001

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier le code compilé depuis le stage build
COPY --from=build /app/dist ./dist

# Créer les répertoires nécessaires
RUN mkdir -p uploads temp logs && \
    chown -R fileservice:nodejs uploads temp logs

# Changer vers l'utilisateur non-root
USER fileservice

# Exposer le port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Commande de production
CMD ["node", "dist/server.js"]
