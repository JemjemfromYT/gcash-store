FROM node:24-slim

WORKDIR /app

RUN corepack enable

# --- 1. Install deps in a cacheable layer ---
# Copy only the manifests so this layer only re-runs when deps actually change,
# not on every code edit. This makes redeploys much faster and more reliable.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/store/package.json ./artifacts/store/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile

# --- 2. Copy the rest of the source and build ---
COPY . .

RUN pnpm --filter @workspace/store run build
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

# Run db push at startup, but DO NOT crash the container if it fails.
# A failing db push was previously killing the container, which made Railway
# fall back to the previously-good deployment and made it look like new code
# never shipped. We log the failure and start the server anyway.
CMD ["sh", "-c", "pnpm --filter @workspace/db run push || echo '[startup] WARNING: db push failed, starting server anyway'; pnpm --filter @workspace/api-server run start"]
