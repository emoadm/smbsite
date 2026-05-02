#!/usr/bin/env bash
# Deploy SMBsite to Fly.io with NEXT_PUBLIC_* values forwarded as Docker build args.
# These are inlined into the client bundle by `next build` and must be present
# at build time (Fly secrets only expose at runtime).
#
# Reads values from .env.production.local (gitignored) on your machine.
# Usage: ./scripts/deploy-fly.sh [extra flyctl args...]

set -euo pipefail

ENV_FILE=".env.production.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. This script reads NEXT_PUBLIC_* values from there." >&2
  exit 1
fi

# Extract values without echoing them (avoid leaking to terminal scrollback).
# `required=true` fails if the var is missing or empty; `required=false` returns "".
get_var() {
  local key="$1"
  local required="${2:-false}"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  if [[ -z "$val" && "$required" == "true" ]]; then
    echo "ERROR: $key not set in $ENV_FILE (required)" >&2
    exit 1
  fi
  printf '%s' "$val"
}

# shellcheck disable=SC2155
declare TURNSTILE_SITE PLAUSIBLE_DOMAIN COOKIEYES_SITE
TURNSTILE_SITE=$(get_var "NEXT_PUBLIC_TURNSTILE_SITE_KEY" true)
PLAUSIBLE_DOMAIN=$(get_var "NEXT_PUBLIC_PLAUSIBLE_DOMAIN" false)
COOKIEYES_SITE=$(get_var "NEXT_PUBLIC_COOKIEYES_SITE_KEY" false)

[[ -z "$PLAUSIBLE_DOMAIN" ]] && echo "[deploy-fly] note: NEXT_PUBLIC_PLAUSIBLE_DOMAIN empty — analytics will be inert" >&2
[[ -z "$COOKIEYES_SITE" ]] && echo "[deploy-fly] note: NEXT_PUBLIC_COOKIEYES_SITE_KEY empty — cookie banner will be inert" >&2

echo "[deploy-fly] flyctl deploy with NEXT_PUBLIC_* build args (values redacted)"

flyctl deploy \
  --strategy rolling \
  --remote-only \
  --build-arg "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$TURNSTILE_SITE" \
  --build-arg "NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$PLAUSIBLE_DOMAIN" \
  --build-arg "NEXT_PUBLIC_COOKIEYES_SITE_KEY=$COOKIEYES_SITE" \
  "$@"
