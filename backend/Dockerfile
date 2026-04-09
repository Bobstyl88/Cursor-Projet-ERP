# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts && \
    npx prisma generate

# ── Stage 2: Build the application ──
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY . .

RUN npx prisma generate && \
    npm run build

# ── Stage 3: Development (used by docker-compose.dev.yml) ──
FROM node:20-alpine AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "start:dev"]

# ── Stage 4: Production ──
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache dumb-init && \
    addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=4000

USER nestjs

EXPOSE 4000

CMD ["dumb-init", "node", "dist/main.js"]
