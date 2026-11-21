#!/bin/sh
set -eu

node /workspace/src/server.js --host 127.0.0.1 --port 4173 &
node_pid=$!

cleanup() {
  kill "$node_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
