FROM node:20.11.1-alpine AS base
ENV SKIP_ENV_VALIDATION="true"
ENV DOCKER_OUTPUT=1
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm i -g pnpm@8.9
RUN ls
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .
RUN pnpm generate
RUN pnpm build

FROM node:20-alpine3.19 as release
WORKDIR /app
RUN npm i -g pnpm@8.9

RUN apk add --no-cache libc6-compat
RUN apk update


COPY --from=base /app/next.config.js .
COPY --from=base /app/package.json .
COPY --from=base /app/pnpm-lock.yaml .

COPY --from=base  /app/.next/standalone ./
COPY --from=base  /app/.next/static ./.next/static
COPY --from=base  /app/public ./public

COPY --from=base  /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=base  /app/prisma/migrations ./prisma/migrations
COPY --from=base  /app/node_modules/prisma ./node_modules/prisma
COPY --from=base  /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base  /app/node_modules/sharp ./node_modules/sharp

# Symlink the prisma binary
RUN mkdir node_modules/.bin
RUN ln -s /app/node_modules/prisma/build/index.js ./node_modules/.bin/prisma

# set this so it throws error where starting server
ENV SKIP_ENV_VALIDATION="false"

COPY  ./docker/start.sh ./start.sh

CMD ["sh", "start.sh"]
