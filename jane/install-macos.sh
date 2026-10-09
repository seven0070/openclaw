#!/usr/bin/env bash
# Jane macOS installation and validation helper.
# It never edits OpenClaw configuration without the existing interactive setup
# confirmation, and never prints credentials.
set -euo pipefail

apply=0
if [[ "${1:-}" == "--apply" ]]; then
  apply=1
elif [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--apply]" >&2
  exit 64
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$root"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command node
require_command openclaw
require_command ollama

echo "Node: $(node --version)"
echo "OpenClaw: $(openclaw --version)"
echo "Ollama: $(ollama --version 2>/dev/null || true)"

if (( apply )); then
  echo "Pulling qwen3:4b from Ollama."
  ollama pull qwen3:4b
else
  echo "Validation mode: model download and configuration changes are disabled."
fi

if ! ollama list | awk 'NR > 1 { print $1 }' | grep -qx 'qwen3:4b'; then
  echo "qwen3:4b is not installed. Re-run with --apply on the owner's machine." >&2
  exit 1
fi

node jane/doctor.mjs

if (( apply )); then
  echo "The next command shows its config diff and requires an explicit confirmation."
  node jane/setup-openclaw.mjs
fi

cat <<'EOF'
Next manual validation (not performed by this script):
  1. Pair an authenticated owner approval client.
  2. Start the Gateway and open its desktop/Control UI.
  3. Select Jane, create a task, inspect Jane audit history, and verify a sensitive action prompts once.
  4. Complete jane/HARDWARE-VALIDATION.md on this exact Mac.
EOF
