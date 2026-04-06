#!/usr/bin/env bash
# Install Kerrigan custom pack + holographic overlay into peon-ping
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PEON_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/peon-ping"

if [ ! -d "$PEON_DIR" ]; then
  echo "Error: peon-ping not found at $PEON_DIR"
  echo "Install peon-ping first: curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash"
  exit 1
fi

echo "Installing Kerrigan pack..."
mkdir -p "$PEON_DIR/packs/sc_kerrigan/sounds"
cp "$SCRIPT_DIR/pack/openpeon.json" "$PEON_DIR/packs/sc_kerrigan/"
cp "$SCRIPT_DIR/pack/icon.png" "$PEON_DIR/packs/sc_kerrigan/"
cp "$SCRIPT_DIR/pack/sounds/"*.mp3 "$PEON_DIR/packs/sc_kerrigan/sounds/"

echo "Installing holographic overlay..."
cp "$SCRIPT_DIR/overlay/mac-overlay.js" "$PEON_DIR/scripts/mac-overlay.js"

echo "Switching to sc_kerrigan..."
bash "$PEON_DIR/peon.sh" packs use sc_kerrigan

echo ""
echo "Installed! Test with:"
echo "  peon preview session.start"
echo "  peon notifications test"
