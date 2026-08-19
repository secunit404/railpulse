#!/usr/bin/env bash
#
# Verifies the container's file-ownership contract for the /app/data volume.
#
# Docker creates a missing bind-mount path on the host as root:root 0755. The
# container must still end up with a writable data directory, and every file it
# writes must be owned by PUID:PGID so the host user can read them.
#
# Uses a named volume with volume-subpath instead of a host bind mount: bind
# mounts on Docker Desktop for macOS go through a filesystem that ignores
# ownership, which hides exactly the bug this script exists to catch. A named
# volume always has real Linux permissions.
#
# Usage: IMAGE=railpulse:test scripts/test-docker-permissions.sh

set -uo pipefail

IMAGE="${IMAGE:-railpulse:test}"
VOLUME="railpulse_perm_test"
FAILURES=0

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

# Recreate the data directory inside the volume with the given ownership/mode.
#
# A stale file is left behind on purpose. Docker populates an *empty* named
# volume from the image and copies the image directory's ownership onto it,
# which would silently repair the very permissions under test. Non-empty
# volumes skip that step and behave like the bind mount they stand in for.
# The stale file also reproduces the real-world case: a data directory left
# root-owned by an earlier run of the container as root.
reset_data_dir() {
  local owner="$1" mode="$2"
  docker run --rm -v "$VOLUME":/v alpine sh -c \
    "rm -rf /v/data && mkdir -p /v/data/logs && touch /v/data/stale.txt && \
     chown -R $owner /v/data && chmod $mode /v/data"
}

# Run the image's entrypoint with a probe command that reports the resulting state.
run_container() {
  docker run --rm \
    --mount "type=volume,source=$VOLUME,target=/app/data,volume-subpath=data" \
    -e DATABASE_URL="file:/app/data/railpulse.db" \
    "$@" \
    "$IMAGE" sh -c 'echo "PROBE_UID=$(id -u):$(id -g)"; echo "PROBE_LOGS=$(stat -c %u:%g /app/data/logs)"; echo "PROBE_DB=$(stat -c %u:%g /app/data/railpulse.db)"; echo "PROBE_STALE=$(stat -c %u:%g /app/data/stale.txt)"' 2>&1
}

assert_contains() {
  local haystack="$1" needle="$2" label="$3"
  case "$haystack" in
    *"$needle"*) pass "$label" ;;
    *) fail "$label (expected to find '$needle')" ;;
  esac
}

docker volume rm -f "$VOLUME" >/dev/null 2>&1
docker volume create "$VOLUME" >/dev/null

echo
echo "Test 1: root-owned data dir, default PUID/PGID -> claimed by 1000:1000"
reset_data_dir "0:0" "755"
OUT=$(run_container)
assert_contains "$OUT" "PROBE_UID=1000:1000" "drops privileges to 1000:1000"
assert_contains "$OUT" "PROBE_LOGS=1000:1000" "logs dir owned by 1000:1000"
assert_contains "$OUT" "PROBE_DB=1000:1000" "database owned by 1000:1000"
assert_contains "$OUT" "PROBE_STALE=1000:1000" "pre-existing root-owned file reclaimed"

echo
echo "Test 2: root-owned data dir, PUID=1500 PGID=1500 -> claimed by 1500:1500"
reset_data_dir "0:0" "755"
OUT=$(run_container -e PUID=1500 -e PGID=1500)
assert_contains "$OUT" "PROBE_UID=1500:1500" "drops privileges to 1500:1500"
assert_contains "$OUT" "PROBE_LOGS=1500:1500" "logs dir owned by 1500:1500"
assert_contains "$OUT" "PROBE_DB=1500:1500" "database owned by 1500:1500"
assert_contains "$OUT" "PROBE_STALE=1500:1500" "pre-existing root-owned file reclaimed"

echo
echo "Test 3: explicit non-root 'user:' with a writable dir -> still works"
reset_data_dir "1000:1000" "755"
OUT=$(run_container --user 1000:1000)
assert_contains "$OUT" "PROBE_UID=1000:1000" "runs as the requested user"
assert_contains "$OUT" "PROBE_LOGS=1000:1000" "logs dir created"
assert_contains "$OUT" "PROBE_DB=1000:1000" "database created"

echo
echo "Test 4: explicit non-root 'user:' with an unwritable dir -> actionable error"
reset_data_dir "0:0" "755"
OUT=$(run_container --user 1000:1000)
assert_contains "$OUT" "/app/data is not writable" "explains the actual problem"
assert_contains "$OUT" "chown -R 1000:1000" "tells the user how to fix it"

docker volume rm -f "$VOLUME" >/dev/null 2>&1

echo
if [ "$FAILURES" -eq 0 ]; then
  printf '\033[32mAll checks passed\033[0m\n'
else
  printf '\033[31m%d check(s) failed\033[0m\n' "$FAILURES"
fi
exit "$((FAILURES > 0))"
