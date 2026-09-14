#!/usr/bin/env bash
# Deploy the stack on the VPS from images already built by CI.
#
#   IMAGE_TAG=<git sha> bash scripts/deploy.sh
#
# Run from the repo checkout on the server (the one holding the production
# .env). CI calls it over SSH after pushing the images to GHCR, and it is also
# the rollback tool: re-run it with an older tag and the previous images come
# back without a rebuild.
set -euo pipefail

cd "$(dirname "$0")/.."

# Which production overlay this host uses. The default suits a host that
# already runs nginx (the current server); set PROD_OVERLAY=docker-compose.prod.yml
# on a host that wants the bundled Caddy instead. Picking the wrong one is not
# a subtle failure — Caddy would fight nginx for ports 80 and 443.
PROD_OVERLAY="${PROD_OVERLAY:-docker-compose.nginx.yml}"

# ghcr.io/<owner>/<repo>-api and -web, as pushed by .github/workflows/ci.yml.
IMAGE_PREFIX="${IMAGE_PREFIX:-ghcr.io/ivan-chaos/cigarettebuddy}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

export API_IMAGE="${IMAGE_PREFIX}-api:${IMAGE_TAG}"
export WEB_IMAGE="${IMAGE_PREFIX}-web:${IMAGE_TAG}"

if [ ! -f .env ]; then
  echo "No .env here. Production configuration (DOMAIN, POSTGRES_*, TURN_*) is" >&2
  echo "created by hand on the server — see 'First deploy' in the README." >&2
  exit 1
fi

if [ ! -f "$PROD_OVERLAY" ]; then
  echo "No $PROD_OVERLAY in $(pwd) — set PROD_OVERLAY to the right overlay." >&2
  exit 1
fi

compose() {
  docker compose \
    -f docker-compose.yml \
    -f "$PROD_OVERLAY" \
    -f docker-compose.registry.yml \
    "$@"
}

echo "==> Deploying ${API_IMAGE} / ${WEB_IMAGE} (${PROD_OVERLAY})"
compose pull

# --wait blocks until every service is healthy (and the one-shot `migrate` has
# exited 0), so a failed migration or a container that cannot start makes the
# deploy fail rather than leaving a half-updated stack behind.
if ! compose up -d --remove-orphans --wait --wait-timeout 300; then
  echo "==> Deploy failed; current state and recent logs follow" >&2
  compose ps >&2 || true
  compose logs --tail 80 migrate api web >&2 || true
  exit 1
fi

compose ps

# Every deploy leaves the previous SHA-tagged images behind, and they stay
# tagged, so `docker image prune` would never touch them. Drop ours by name
# instead of pruning globally — this host runs other stacks too.
for repo in "${IMAGE_PREFIX}-api" "${IMAGE_PREFIX}-web"; do
  docker image ls "$repo" --format '{{.Tag}}' \
    | grep -vx -e "$IMAGE_TAG" -e latest \
    | while read -r old; do
        docker image rm "${repo}:${old}" >/dev/null 2>&1 || true
      done
done

echo "==> Deployed ${IMAGE_TAG}"
