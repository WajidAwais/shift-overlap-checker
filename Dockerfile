FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund && npx prisma generate

FROM base
ENV NODE_ENV=production \
    PORT=3000 \
    CHECKPOINT_DISABLE=1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json app.js server.js overlap.js reports.js ./
COPY prisma ./prisma
COPY --from=client /app/client/dist ./client/dist
USER node
EXPOSE 3000
# Apply migrations, optionally load the fictional demo rota, then serve.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && if [ \"$SEED_DEMO_DATA\" = true ]; then node prisma/seed.js; fi && exec node server.js"]
