ARG ALPINE_VERSION=3.21
ARG NODE_VERSION=22.16.0

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ENV SKIP_ENV_VALIDATION="true"
ENV DOCKER_OUTPUT=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apk update && apk add --no-cache libc6-compat

WORKDIR /app
RUN npm i -g corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml prisma/ ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS release

ARG APP_VERSION

ENV NODE_ENV=production
ENV DOCKER_OUTPUT=1

WORKDIR /app

RUN apk update \
    && apk add --no-cache libc6-compat \
    && rm -rf /var/cache/apk/*

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/prisma/migrations ./prisma/migrations

# set this so it throws error where starting server
ENV SKIP_ENV_VALIDATION="false"
ENV APP_VERSION=${APP_VERSION}

COPY ./start.sh ./start.sh

CMD ["sh", "start.sh"]
