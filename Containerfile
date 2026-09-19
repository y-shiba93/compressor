FROM node:24.14.0-bookworm-slim

ARG PNPM_VERSION=10.33.0
RUN npm install --global "pnpm@${PNPM_VERSION}"

WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src ./src
COPY public ./public

EXPOSE 4173
CMD ["pnpm", "ui", "--", "--host", "0.0.0.0"]
