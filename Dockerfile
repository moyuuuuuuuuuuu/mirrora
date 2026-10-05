FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
# Corepack uses Node's opt-in proxy support for the initial pnpm download.
RUN NODE_USE_ENV_PROXY=1 pnpm install --frozen-lockfile
COPY . .
ARG VITE_ASSET_BASE_URL=
RUN mkdir -p dist/bos-upload && pnpm build:h5

FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY scripts/configure-real-ip.sh /docker-entrypoint.d/25-configure-real-ip.sh
RUN chmod +x /docker-entrypoint.d/25-configure-real-ip.sh
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html
COPY --from=builder /app/dist/bos-upload /opt/bos-upload
EXPOSE 80
