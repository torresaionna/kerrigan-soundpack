#!/usr/bin/env bash
# Bootstrap a TTS reference for a peon-ping pack by copying one of its existing
# sounds. You'll still need to write the transcript into <voice>_ref.txt.
#
# Usage:
#   ./add-voice.sh <peon-pack-name> [sound-basename] [voice-alias]
#     e.g. ./add-voice.sh glados             # auto-pick the longest sound
#     e.g. ./add-voice.sh glados StillAlive  # pick a specific sound file
#     e.g. ./add-voice.sh sc_kerrigan GotAJobToDo kerrigan  # alias the voice

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REF_DIR="$SCRIPT_DIR/reference"
PEON_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/peon-ping"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <peon-pack-name> [sound-basename] [voice-alias]"
  exit 1
fi

PACK="$1"
REQUESTED_SOUND="${2:-}"
VOICE_ALIAS="${3:-$PACK}"

PACK_SOUNDS_DIR="$PEON_DIR/packs/$PACK/sounds"
if [ ! -d "$PACK_SOUNDS_DIR" ]; then
  echo "Error: pack '$PACK' not installed at $PACK_SOUNDS_DIR"
  echo "Install it first: peon packs install $PACK"
  exit 1
fi

# Validate aliases
if [[ ! "$VOICE_ALIAS" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Error: voice alias must be alphanumeric/underscore only"; exit 1
fi

# Pick the source mp3
if [ -n "$REQUESTED_SOUND" ]; then
  SRC="$PACK_SOUNDS_DIR/${REQUESTED_SOUND}.mp3"
  if [ ! -f "$SRC" ]; then
    # Try without the .mp3 suffix already in the name
    SRC="$PACK_SOUNDS_DIR/${REQUESTED_SOUND}"
  fi
  if [ ! -f "$SRC" ]; then
    echo "Error: $REQUESTED_SOUND not found in $PACK_SOUNDS_DIR"
    exit 1
  fi
else
  # Auto-pick the longest mp3 (best reference quality)
  SRC="$(find "$PACK_SOUNDS_DIR" -maxdepth 1 -name '*.mp3' -exec ls -S {} + 2>/dev/null | head -1)"
  if [ -z "$SRC" ]; then
    echo "Error: no mp3 files in $PACK_SOUNDS_DIR"; exit 1
  fi
fi

mkdir -p "$REF_DIR"
DEST_WAV="$REF_DIR/${VOICE_ALIAS}_ref.wav"
DEST_TXT="$REF_DIR/${VOICE_ALIAS}_ref.txt"

# Convert mp3 → wav via ffmpeg (F5-TTS wants wav)
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg required (brew install ffmpeg)"; exit 1
fi
echo "▸ Converting $(basename "$SRC") → ${VOICE_ALIAS}_ref.wav"
ffmpeg -y -i "$SRC" -ar 24000 -ac 1 "$DEST_WAV" >/dev/null 2>&1

# Try to grab the label from openpeon.json as a transcript seed
MANIFEST="$PEON_DIR/packs/$PACK/openpeon.json"
FILENAME="$(basename "$SRC")"
SEED_TEXT=""
if [ -f "$MANIFEST" ] && command -v python3 >/dev/null 2>&1; then
  SEED_TEXT="$(MANIFEST="$MANIFEST" FNAME="$FILENAME" python3 -c '
import json, os
with open(os.environ["MANIFEST"]) as f:
    data = json.load(f)
fname = os.environ["FNAME"]
for cat in data.get("categories", {}).values():
    for s in cat.get("sounds", []):
        if s.get("file", "").endswith(fname):
            print(s.get("label", ""))
            raise SystemExit
' 2>/dev/null || true)"
fi

if [ ! -f "$DEST_TXT" ]; then
  printf '%s\n' "$SEED_TEXT" > "$DEST_TXT"
fi

echo "▸ Wrote:  $DEST_WAV"
echo "▸ Wrote:  $DEST_TXT  (seed: \"$SEED_TEXT\")"
echo ""
echo "Next:"
echo "  1. Open $DEST_TXT and correct it to be the EXACT transcript of the audio."
echo "  2. Generate a line:  bash $SCRIPT_DIR/generate.sh $VOICE_ALIAS \"Your new line\" OutputName"
