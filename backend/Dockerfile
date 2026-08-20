# syntax=docker/dockerfile:1

# node:24 to match the machine the tests pass on (v24.8.0). An image on a
# different major is a variable nobody wants to debug from a deploy log.
FROM node:24-alpine AS builder

WORKDIR /app

# bcrypt compiles from source; alpine ships no toolchain.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------

FROM node:24-alpine AS runtime

WORKDIR /app

# dumb-init as PID 1: Node does not reap children or forward SIGTERM by
# default, so without it a platform's graceful-shutdown signal is ignored and
# the container is killed mid-request.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# devDependencies are kept deliberately. The TypeORM CLI, ts-node and
# typescript are what run migrations as the release step, and a release
# command that cannot migrate makes the image useless for deployment.
COPY package*.json ./
RUN apk add --no-cache --virtual .build python3 make g++ \
 && npm ci \
 && npm cache clean --force \
 && apk del .build

COPY --from=builder /app/dist ./dist
# The migrations are needed as source: the CLI runs them through ts-node.
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/data-source.ts ./src/data-source.ts
COPY tsconfig.json ./

# Never root. `node` already exists in the base image.
USER node

EXPOSE 3000

# `dist/main.js`, not `dist/main`. The extension is explicit because the
# shorthand has failed to resolve in this repo's own tooling before.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
