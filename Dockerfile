FROM node:20-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV NEXT_PUBLIC_ML_MODE=mock
ENV NEXT_PUBLIC_USE_MOCK_PERCEPTION=true
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/perception/package.json ./packages/perception/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm --filter @loan-wizard/web db:generate
RUN pnpm --filter @loan-wizard/web build

EXPOSE 3000

CMD ["pnpm", "--dir", "apps/web", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
