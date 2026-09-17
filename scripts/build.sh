#!/bin/sh
# Build dsh-asr-voice: compile host half (src/ → lib/, tsc) + client half
# (src/client/ → lib/client.js, tsdown).
#
# Both halves are type-checked on every build: the host half by the emitting
# tsc pass below, the client half by an explicit `tsc -p tsconfig.client.json
# --noEmit` before tsdown runs. tsdown bundles without type-checking, so
# without that step a client type error would be invisible here — and since
# lib/ is committed (DSH installs from a pinned GitHub source and never runs
# build scripts), the bad artifact would ship to both npm and the pinned
# source. The client pass is what makes "committed lib/" mean "matches src/".
#
# Dependency resolution mirrors the dsh-plugin junction-link pattern:
# node_modules holds a junction/symlink into a pre-installed dependency tree
# (a DSH checkout, or a sibling plugin that already installed the same
# @deepseek-ai client/host packages + react/tsdown/typescript), so tsc
# type-checks against the same packages the running dsh ships — no network.
set -eu

ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

# --- Ensure a modern Node (>=22) is first on PATH --------------------------
# The shell's default node may be old (e.g. nvm default v14); the floor is 22
# (not tsdown's 18): the host half's realtime cloud ASR / cloud TTS use the
# global WebSocket (src/realtime-dashscope.ts, src/realtime-tts.ts), which is
# only stable from Node 22 — same floor as package.json `engines`. Keep in sync.
node_ok() {
  [ -x "$1" ] && "$1" -e "process.exit(Number(process.version.slice(1).split('.')[0]) < 22 ? 1 : 0)" 2>/dev/null
}
if ! node_ok "$(command -v node 2>/dev/null || echo /nonexistent)"; then
  for cand in \
    "$HOME/AppData/Local/nvm" \
    "/d/Program/nvm" \
    "/c/Program Files/nodejs" \
    "/usr/local/bin"; do
    [ -d "$cand" ] || continue
    for d in "$cand"/v2*; do
      if node_ok "$d/node"; then
        PATH="$d:$PATH"
        break 2
      fi
    done
  done
fi
command -v node >/dev/null 2>&1 || { echo "build: no node found (need Node >=22)" >&2; exit 1; }
echo "=== Node $(node -v) ==="

# --- Locate a dependency root with tsc/tsdown + @deepseek-ai packages -----
DEP_ROOT=""
if [ -d "$ROOT/node_modules/.bin" ] && [ -d "$ROOT/node_modules/@deepseek-ai" ]; then
  # Preferred: this plugin's own installed dependency tree (pnpm install).
  DEP_ROOT="$ROOT"
elif [ -n "${DSH_CHECKOUT:-}" ] && [ -d "$DSH_CHECKOUT/packages" ]; then
  DEP_ROOT="$DSH_CHECKOUT"
elif [ -n "${DSH_HOME:-}" ] && [ -d "$DSH_HOME/source/current" ]; then
  DEP_ROOT="$DSH_HOME/source/current"
elif [ -d "${HOME:-}/.dsh/source/current" ]; then
  DEP_ROOT="$HOME/.dsh/source/current"
elif command -v dsh >/dev/null 2>&1; then
  DSH_BIN=$(readlink -f "$(command -v dsh)" 2>/dev/null || command -v dsh)
  DEP_ROOT=$(cd "$(dirname "$DSH_BIN")/../../.." 2>/dev/null && pwd)
fi

if [ -z "$DEP_ROOT" ] || [ ! -d "$DEP_ROOT/node_modules/.bin" ]; then
  echo "build: cannot locate a dependency tree with tsc/tsdown (run pnpm install here, or set DSH_CHECKOUT / DSH_HOME)" >&2
  exit 1
fi

if [ ! -e "$DEP_ROOT/node_modules/tsdown" ] || [ ! -d "$DEP_ROOT/node_modules/@deepseek-ai" ]; then
  echo "build: dependency tree at $DEP_ROOT lacks tsdown/@deepseek-ai packages" >&2
  exit 1
fi

# --- Ensure node_modules junction/symlink ----------------------------------
if [ ! -e "node_modules/.bin/tsc" ]; then
  echo "=== Linking build dependencies (dep root: $DEP_ROOT) ==="
  rm -rf node_modules
  mkdir -p node_modules
  if command -v cmd >/dev/null 2>&1; then
    # Windows: junction (no admin needed)
    cmd //c "mklink /J node_modules \"$(cygpath -w "$DEP_ROOT/node_modules")\"" >/dev/null
  else
    ln -s "$DEP_ROOT/node_modules" node_modules
  fi
  if [ ! -e "node_modules/.bin/tsc" ]; then
    echo "build: failed to link node_modules" >&2
    exit 1
  fi
fi

TSC="node_modules/.bin/tsc"
TSCDOWN="node_modules/.bin/tsdown"

# Client type-check runs first, before anything is emitted: if it fails, lib/ is
# left exactly as it was instead of ending up half-rebuilt (new host JS + stale
# client.js) — the state most likely to be committed by mistake.
echo "=== Type-checking client half ($("$TSC" --version)) ==="
"$TSC" -p tsconfig.client.json --noEmit

echo "=== Compiling host half ($("$TSC" --version)) ==="
"$TSC" -p tsconfig.host.json
rm -f lib/tsconfig.tsbuildinfo

echo "=== Compiling client half (tsdown) ==="
"$TSCDOWN"

echo "=== Build complete: lib/ (host) + lib/client.js (browser), both type-checked ==="
