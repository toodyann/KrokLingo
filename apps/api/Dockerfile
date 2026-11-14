# API image for hosts that run containers (Fly.io, Railway, Cloud Run…). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t kroklingo-api .
# Node 22 runs the TypeScript sources directly, so there is no build step.
FROM node:22.23.5-slim

ENV NODE_ENV=production
WORKDIR /app

# workspace manifests first, so dependency installation is cached between source changes
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
# npm ci checks the lockfile against every workspace, so the web manifest is needed (not its code)
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @kroklingo/api --omit=dev && npm cache clean --force

COPY packages/shared packages/shared
COPY apps/api apps/api

USER node
ENV PORT=8787
EXPOSE 8787
CMD ["node", "apps/api/src/server.ts"]
