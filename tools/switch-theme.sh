#!/usr/bin/env bash
# Hot-swap the peon-ping notification overlay theme.
#
# Usage:
#   bash tools/switch-theme.sh <theme>
#     e.g. bash tools/switch-theme.sh warcraft
#     e.g. bash tools/switch-theme.sh kerrigan
#   bash tools/switch-theme.sh auto       # pick based on active peon-ping pack
#   bash tools/switch-theme.sh --list     # list available themes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OVERLAY_DIR="$REPO_DIR/overlay"
PEON_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/peon-ping"
PEON_OVERLAY="$PEON_DIR/scripts/mac-overlay.js"

list_themes() {
  for f in "$OVERLAY_DIR"/mac-overlay-*.js; do
    [ -f "$f" ] || continue
    n="$(basename "$f" .js)"
    echo "  ${n#mac-overlay-}"
  done
}

# Pack → theme auto-mapping
auto_theme_for_pack() {
  case "$1" in
    peon*|peasant*|wc2_*|orc*|abbot|aom_*|murloc|sheogorath|molag_bal)
      echo "warcraft" ;;
    *)
      echo "kerrigan" ;;
  esac
}

if [ $# -lt 1 ] || [ "$1" = "--list" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Usage: $0 <theme>|auto|--list"
  echo "Available themes:"
  list_themes
  exit 0
fi

THEME="$1"
if [ "$THEME" = "auto" ]; then
  ACTIVE="$(bash "$PEON_DIR/peon.sh" status 2>/dev/null | awk '/active pack/ {print $NF; exit}')"
  if [ -z "$ACTIVE" ]; then
    # Fallback — read config.json default_pack
    ACTIVE="$(python3 -c 'import json,os;print(json.load(open(os.path.expanduser("'"$PEON_DIR"'/config.json"))).get("default_pack",""))' 2>/dev/null || true)"
  fi
  if [ -z "$ACTIVE" ]; then
    echo "Error: could not determine active pack. Pass a theme name explicitly."
    exit 1
  fi
  THEME="$(auto_theme_for_pack "$ACTIVE")"
  echo "▸ active pack: $ACTIVE → theme: $THEME"
fi

SRC="$OVERLAY_DIR/mac-overlay-${THEME}.js"
if [ ! -f "$SRC" ]; then
  echo "Error: theme '$THEME' not found ($SRC missing)"
  echo "Available:"
  list_themes
  exit 1
fi

if [ ! -d "$PEON_DIR" ]; then
  echo "Error: peon-ping not installed at $PEON_DIR"
  exit 1
fi

cp "$SRC" "$PEON_OVERLAY"
echo "▸ Installed overlay theme: $THEME"
echo "  (copied $SRC → $PEON_OVERLAY)"
echo ""
echo "Try it:  peon notifications test"
