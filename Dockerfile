FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY shared ./shared
COPY server ./server
RUN mkdir -p /app/.cache/emoji && chown -R node:node /app/.cache
ENV NODE_ENV=production API_HOST=127.0.0.1 API_PORT=8788 EMOJI_CACHE_DIR=/app/.cache/emoji
USER node
CMD ["node", "--import", "tsx", "server/index.ts"]
