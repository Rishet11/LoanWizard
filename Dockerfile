FROM node:20-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=development
ENV NEXT_PUBLIC_ML_MODE=mock
ENV NEXT_PUBLIC_USE_MOCK_PERCEPTION=true
ENV ML_SERVICE_URL=https://rishet11-loanwizard-ml.hf.space
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/perception/package.json ./packages/perception/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts --prod=false

COPY packages ./packages
COPY apps/web ./apps/web

EXPOSE 3000

CMD ["sh", "-c", "pnpm --dir apps/web db:generate && pnpm --dir apps/web dev -H 0.0.0.0 -p 3000"]
