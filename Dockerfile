FROM node:24-slim

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install
RUN pnpm --filter @workspace/store run build
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

CMD ["sh", "-c", "pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run start"]
