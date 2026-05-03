# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* must be present at build time — Next inlines them into the
# client bundle. These are NOT secrets (visible in browser anyway) but ARE
# environment-specific. Pass via `flyctl deploy --build-arg KEY=value`.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG NEXT_PUBLIC_COOKIEYES_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ENV NEXT_PUBLIC_COOKIEYES_SITE_KEY=$NEXT_PUBLIC_COOKIEYES_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Phase 2.1 (D-02): download MaxMind GeoLite2-City.mmdb at build time.
# License key is supplied via --mount=type=secret to keep it out of the
# image history. EULA forbids redistribution -> file is not committed.
# Refresh cadence = on every deploy (sufficient per D-02; weekly scheduled
# rebuild can be added later if drift becomes measurable).
#
# node:20-alpine ships without curl, so we install it just-in-time on the
# builder stage (not the runner — the runner does not need curl at runtime).
RUN apk add --no-cache curl
RUN --mount=type=secret,id=MAXMIND_LICENSE_KEY \
    MAXMIND_LICENSE_KEY="$(cat /run/secrets/MAXMIND_LICENSE_KEY)" && \
    curl -fsSL "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz" \
    | tar -xz --strip-components=1 --wildcards "*/GeoLite2-City.mmdb" && \
    mv GeoLite2-City.mmdb /app/GeoLite2-City.mmdb

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache postgresql-client tini && corepack enable
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Standalone output bundles only what's needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Worker uses tsx + script — copy node_modules + scripts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/package.json ./package.json
# Phase 2.1 (D-02): copy the GeoLite2 mmdb from the builder stage.
# Worker reads it via @maxmind/geoip2-node Reader.open() at process start.
# Path matches src/lib/geoip.ts default (process.cwd() + '/GeoLite2-City.mmdb').
COPY --from=builder /app/GeoLite2-City.mmdb ./GeoLite2-City.mmdb

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
# Default = web; overridden for worker by fly process group
CMD ["node", "server.js"]
