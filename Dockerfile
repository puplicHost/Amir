FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
# Prisma CLI + engines are needed for the explicit boot migration step.
COPY --from=deps /app/node_modules ./node_modules
# Upload dirs must exist and be writable by the non-root runtime user
# (named volumes adopt this ownership on first mount).
RUN mkdir -p /app/storage /app/public/uploads \
  && addgroup -S appuser && adduser -S appuser -G appuser \
  && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1)) && echo ok"
# Explicit boot step (NOT part of the image build): apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node .output/server/index.mjs"]
