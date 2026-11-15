FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./prisma/migrations
COPY --from=build /app/scripts/start.sh ./start.sh
COPY --from=build /app/healthcheck.js ./healthcheck.js
USER node
EXPOSE 3001
CMD ["sh", "./start.sh"]