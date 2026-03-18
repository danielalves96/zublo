# ============================================================
# Stage 1: Build frontend
# ============================================================
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /app/web

COPY apps/web/package.json apps/web/bun.lock ./
RUN bun install

COPY apps/web/ .

# Vite outputs to ../backend/pb_public (relative to apps/web)
RUN mkdir -p /app/backend/pb_public && bun run build

# ============================================================
# Stage 2: Final image
# ============================================================
FROM alpine:3.20

ARG PB_VERSION=0.25.9
ARG TARGETARCH
ARG UID=1000
ARG GID=1000

RUN apk add --no-cache ca-certificates unzip wget su-exec

# Download PocketBase for the target architecture
RUN set -eux; \
    case "$TARGETARCH" in \
        amd64)  PB_ARCH="amd64"  ;; \
        arm64)  PB_ARCH="arm64"  ;; \
        arm*)   PB_ARCH="armv7"  ;; \
        *)      echo "Unsupported arch: $TARGETARCH" && exit 1 ;; \
    esac; \
    wget -q \
        "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
        -O /tmp/pb.zip; \
    unzip /tmp/pb.zip pocketbase -d /pb; \
    rm /tmp/pb.zip; \
    chmod +x /pb/pocketbase

WORKDIR /pb

# Copy backend files (hooks, migrations)
COPY apps/backend/pb_hooks    ./pb_hooks
COPY apps/backend/pb_migrations ./pb_migrations

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/backend/pb_public ./pb_public

# Persistent data directory (mounted as volume at runtime)
RUN mkdir -p pb_data

# Create non-root user with configurable UID/GID
RUN addgroup -g "$GID" zublo && \
    adduser -u "$UID" -G zublo -S -D zublo && \
    chown -R zublo:zublo /pb

# Entrypoint runs as root to fix volume permissions, then drops to zublo
COPY apps/backend/entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

EXPOSE 9597

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:9597/api/health || exit 1

ENTRYPOINT ["/pb/entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:9597"]
