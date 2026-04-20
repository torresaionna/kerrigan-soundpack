#!/usr/bin/env bash
# peonping-soundpack installer
#   1. Installs the holographic overlay (applies to ALL peon-ping packs)
#   2. Installs every bundled pack under packs/
#   3. Optionally pulls a curated selection from the peon-ping registry
#   4. Lets you pick the active voice
#
# Usage:
#   bash install.sh                    # interactive (default)
#   bash install.sh --no-prompt        # install overlay + bundled packs only
#   bash install.sh --with-curated     # also install curated registry packs
#   bash install.sh --use <pack>       # set active pack non-interactively
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PEON_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/peon-ping"
PEON_BIN="$PEON_DIR/peon.sh"

# Curated set of high-quality official packs worth installing alongside Kerrigan.
# The holographic overlay will apply to every one of them.
CURATED_PACKS=(
  "sc_kerrigan"       # Sarah Kerrigan (StarCraft) — bundled
  "peon"              # Orc Peon (Warcraft) — the classic
  "glados"            # GLaDOS (Portal)
  "sopranos"          # Tony Soprano
  "duke_nukem"        # Duke Nukem
  "sheogorath"        # Sheogorath (Elder Scrolls)
  "rick"              # Rick Sanchez
  "tf2_engineer"      # TF2 Engineer
  "sc_marine"         # StarCraft Marine
  "sc_medic"          # StarCraft Medic
)

MODE="interactive"
USE_PACK=""
THEME=""    # kerrigan | warcraft | auto (default: auto-detect from active pack)
while [ $# -gt 0 ]; do
  case "$1" in
    --no-prompt)      MODE="quiet"; shift ;;
    --with-curated)   MODE="curated"; shift ;;
    --use)            USE_PACK="${2:-}"; shift 2 ;;
    --theme)          THEME="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

auto_theme_for_pack() {
  case "$1" in
    peon*|peasant*|wc2_*|orc*|abbot|aom_*|murloc|sheogorath|molag_bal) echo "warcraft" ;;
    *) echo "kerrigan" ;;
  esac
}

if [ ! -d "$PEON_DIR" ]; then
  echo "Error: peon-ping not found at $PEON_DIR"
  echo "Install peon-ping first:"
  echo "  curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash"
  exit 1
fi

# ── 1. Overlay theme (universal — applies to every pack) ──────────────────
# Pick theme: explicit --theme wins; else infer from --use pack; else default kerrigan.
if [ -z "$THEME" ]; then
  if [ -n "$USE_PACK" ]; then
    THEME="$(auto_theme_for_pack "$USE_PACK")"
  else
    THEME="kerrigan"
  fi
fi
THEME_FILE="$SCRIPT_DIR/overlay/mac-overlay-${THEME}.js"
if [ ! -f "$THEME_FILE" ]; then
  echo "Error: unknown overlay theme '$THEME' ($THEME_FILE missing)"
  echo "Available: $(ls "$SCRIPT_DIR/overlay/" | sed -n 's/^mac-overlay-\(.*\)\.js$/\1/p' | tr '\n' ' ')"
  exit 1
fi
echo "▸ Installing overlay theme: $THEME"
cp "$THEME_FILE" "$PEON_DIR/scripts/mac-overlay.js"

# ── 2. Bundled packs (everything under packs/) ─────────────────────────────
BUNDLED=()
for pack_dir in "$SCRIPT_DIR"/packs/*/; do
  [ -d "$pack_dir" ] || continue
  pack_name="$(basename "$pack_dir")"
  BUNDLED+=("$pack_name")
  echo "▸ Installing bundled pack: $pack_name"
  dest="$PEON_DIR/packs/$pack_name"
  mkdir -p "$dest/sounds"
  cp "$pack_dir/openpeon.json" "$dest/"
  [ -f "$pack_dir/icon.png" ] && cp "$pack_dir/icon.png" "$dest/"
  cp "$pack_dir/sounds/"*.mp3 "$dest/sounds/" 2>/dev/null || true
done

# ── 3. Curated registry packs (optional) ───────────────────────────────────
install_curated() {
  echo "▸ Installing curated packs from the peon-ping registry..."
  for p in "${CURATED_PACKS[@]}"; do
    # Skip if already bundled
    if printf '%s\n' "${BUNDLED[@]}" | grep -qx "$p"; then
      continue
    fi
    if [ -d "$PEON_DIR/packs/$p" ]; then
      echo "  · $p already installed, skipping"
      continue
    fi
    echo "  · $p"
    bash "$PEON_BIN" packs install "$p" >/dev/null 2>&1 || echo "    (failed — skipping)"
  done
}

case "$MODE" in
  curated) install_curated ;;
  interactive)
    read -r -p "Also install curated official voices (peon, glados, sopranos, duke_nukem, sheogorath, rick, tf2_engineer, sc_marine, sc_medic)? [y/N] " yn
    [[ "$yn" =~ ^[Yy]$ ]] && install_curated
    ;;
esac

# ── 4. Choose active pack ──────────────────────────────────────────────────
set_active() {
  bash "$PEON_BIN" packs use "$1" >/dev/null 2>&1 \
    && echo "▸ Active voice: $1"
}

if [ -n "$USE_PACK" ]; then
  set_active "$USE_PACK"
elif [ "$MODE" = "interactive" ]; then
  echo ""
  echo "Installed packs:"
  bash "$PEON_BIN" packs list | sed 's/^/  /'
  read -r -p "Active voice [sc_kerrigan]: " pick
  set_active "${pick:-sc_kerrigan}"
else
  set_active "sc_kerrigan"
fi

echo ""
echo "Done. Try:"
echo "  peon preview session.start       # hear the current voice"
echo "  peon notifications test           # see the holographic overlay"
echo "  peon packs use <name>             # switch voices anytime"
echo "  peon packs list                   # list installed voices"
