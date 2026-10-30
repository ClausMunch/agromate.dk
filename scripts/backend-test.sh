#!/bin/sh
set -eu
export DOCKER_CONFIG="${DOCKER_CONFIG:-/home/munch/.hermes/cache/scratch/agromate/docker-config}"
mkdir -p "$DOCKER_CONFIG"
case "${1:-sqlite}" in
 sqlite) docker compose run --rm --no-deps -e APP_ENV=testing -e CACHE_STORE=array -e SESSION_DRIVER=array -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: app vendor/bin/phpunit ;;
 mysql) docker compose run --rm -e APP_ENV=testing -e CACHE_STORE=array -e SESSION_DRIVER=array app vendor/bin/phpunit ;;
 *) echo 'Usage: sh scripts/backend-test.sh [sqlite|mysql]' >&2; exit 2 ;;
esac
