FROM caddy:2.10.2 AS caddy

FROM node:24.14.0-bookworm-slim

ARG PNPM_VERSION=10.33.0
RUN npm install --global "pnpm@${PNPM_VERSION}"

WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src ./src
COPY public ./public
COPY Caddyfile /etc/caddy/Caddyfile
COPY container-entrypoint.sh /usr/local/bin/container-entrypoint
COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
RUN chmod +x /usr/local/bin/container-entrypoint

EXPOSE 80 443
CMD ["container-entrypoint"]
