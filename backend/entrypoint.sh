#!/bin/sh
set -e

DATA_DIR="/app/data"
LOG_DIR="$DATA_DIR/logs"
APP_USER="node"
APP_GROUP="node"
APP_HOME="/home/node"
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

# Re-point the bundled app user at the requested PUID/PGID so that everything
# written to the mounted volume is owned by the host user. -o permits ids that
# already exist in the image, which keeps PUID=0 and other collisions working.
apply_puid_pgid() {
    if [ "$(id -g "$APP_USER")" != "$PGID" ]; then
        groupmod -o -g "$PGID" "$APP_GROUP"
    fi
    if [ "$(id -u "$APP_USER")" != "$PUID" ]; then
        usermod -o -u "$PUID" "$APP_USER"
    fi
}

# Docker creates a missing bind-mount path on the host as root:root, so the
# volume is not writable by the app user until we claim it here.
claim_data_dir() {
    mkdir -p "$LOG_DIR"
    chown -R "$PUID:$PGID" "$DATA_DIR"
    chown -R "$PUID:$PGID" "$APP_HOME"
}

# Reached as the unprivileged runtime user. If the volume still is not writable
# there is nothing left to try, so explain exactly what to run on the host.
verify_data_dir_writable() {
    uid="$(id -u)"
    gid="$(id -g)"

    if mkdir -p "$LOG_DIR" 2>/dev/null && [ -w "$DATA_DIR" ] && [ -w "$LOG_DIR" ]; then
        return 0
    fi

    echo "ERROR: $DATA_DIR is not writable by uid=$uid gid=$gid." >&2
    echo "" >&2
    echo "The directory mounted at $DATA_DIR is owned by another user, and this" >&2
    echo "container has no permission to change it." >&2
    echo "" >&2
    echo "Fix the ownership of the mounted directory on the host:" >&2
    echo "    sudo chown -R $uid:$gid /path/to/your/railpulse/data" >&2

    if [ -z "${RAILPULSE_PRIVILEGES_DROPPED:-}" ]; then
        echo "" >&2
        echo "Alternatively, remove the 'user:' setting from your compose file and" >&2
        echo "set PUID=$uid and PGID=$gid instead. The container then starts as root," >&2
        echo "claims the volume, and drops to that user by itself." >&2
    fi

    exit 1
}

# Started as root: set up permissions, then re-run this script as the app user.
if [ "$(id -u)" -eq 0 ]; then
    apply_puid_pgid
    claim_data_dir

    if [ "$PUID" -ne 0 ] || [ "$PGID" -ne 0 ]; then
        export RAILPULSE_PRIVILEGES_DROPPED=1
        exec gosu "$APP_USER" "$0" "$@"
    fi
fi

verify_data_dir_writable

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting server..."
# If arguments are provided, execute them instead of the default command
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec node dist/index.js
fi
