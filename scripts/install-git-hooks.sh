#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO_ROOT/.git/hooks"
TEMPLATE_DIR="$REPO_ROOT/scripts/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  printf "Error: .git/hooks not found. Are you in a git repository?\n" >&2
  exit 1
fi

install_hook() {
  local name="$1"
  local src="$TEMPLATE_DIR/$name"
  local dest="$HOOKS_DIR/$name"

  if [ ! -f "$src" ]; then
    printf "Error: hook template not found: %s\n" "$src" >&2
    exit 1
  fi

  cp "$src" "$dest"
  chmod +x "$dest"
  printf "Installed hook: %s\n" "$name"
}

install_hook "post-commit"
