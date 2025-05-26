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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma/ ./

RUN pnpm install

COPY . .

RUN pnpm build

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS release

ENV NODE_ENV=production
WORKDIR /app

RUN apk update \
    && apk add --no-cache libc6-compat \
    && rm -rf /var/lib/apt/lists/* \
	&& rm -rf /var/cache/apk/*

COPY --from=base /app/next.config.js .
COPY --from=base /app/package.json .
COPY --from=base /app/pnpm-lock.yaml .
COPY --from=base /app/pnpm-workspace.yaml .

COPY --from=base  /app/.next/standalone ./
COPY --from=base  /app/.next/static ./.next/static
COPY --from=base  /app/public ./public

COPY --from=base  /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=base  /app/prisma/migrations ./prisma/migrations
COPY --from=base  /app/node_modules/prisma ./node_modules/prisma
COPY --from=base  /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base  /app/node_modules/sharp ./node_modules/sharp

RUN npm i -g corepack@latest \
    && corepack enable \
    && mkdir node_modules/.bin \
    && ln -s /app/node_modules/prisma/build/index.js ./node_modules/.bin/prisma

# set this so it throws error where starting server
ENV SKIP_ENV_VALIDATION="false"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY ./start.sh ./start.sh

CMD ["sh", "start.sh"]
