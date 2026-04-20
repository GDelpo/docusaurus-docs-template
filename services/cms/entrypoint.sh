#!/bin/sh
set -e

# Fix bind-mount permissions at startup (runs as root before dropping to appuser).
# docs-source is a host bind mount — ownership depends on the host directory.
# /app itself is created by the Dockerfile as root; appuser needs to write rebuild.log there.
chown -R appuser:appuser /app/docs-source 2>/dev/null || true
chown appuser:appuser /app 2>/dev/null || true

exec gosu appuser "$@"
