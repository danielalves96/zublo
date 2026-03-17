#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

CURRENT_UID=$(id -u zublo 2>/dev/null || echo "")
CURRENT_GID=$(id -g zublo 2>/dev/null || echo "")

if [ "$CURRENT_UID" != "$PUID" ] || [ "$CURRENT_GID" != "$PGID" ]; then
    deluser zublo 2>/dev/null || true
    delgroup zublo 2>/dev/null || true
    addgroup -g "$PGID" zublo
    adduser -u "$PUID" -G zublo -S -D zublo
    chown -R zublo:zublo /pb
fi

chown -R zublo:zublo /pb/pb_data
exec su-exec zublo /pb/pocketbase "$@"
