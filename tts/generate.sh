#!/usr/bin/env bash
# Generate a new voice line for any bundled pack using F5-TTS.
#
# Usage:
#   ./generate.sh <voice> "Text to say" OutputName
#     e.g. ./generate.sh kerrigan "Scanning perimeter." PerimeterClear
#
# Voice name maps to the pack directory via voice_to_pack() below.
# "kerrigan" → packs/sc_kerrigan/; any other name is used as-is.
#
# A reference sample pair must exist:
#   tts/reference/<voice>_ref.wav
#   tts/reference/<voice>_ref.txt   (exact transcript of the wav)
#
# The output mp3 lands in packs/<pack-for-voice>/sounds/.
# <voice> maps to a pack name via the table below. Extend it for new voices.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REF_DIR="$SCRIPT_DIR/reference"

# Voice name → bundled pack directory under packs/
# Add cases when you bundle a new voice. (Bash 3.2-compatible — no assoc arrays.)
voice_to_pack() {
  case "$1" in
    kerrigan) echo "sc_kerrigan" ;;
    peon)     echo "peon_expanded" ;;
    *)        echo "$1" ;;  # fallback: voice name == pack name
  esac
}

if [ $# -lt 3 ]; then
  cat <<EOF
Usage: $0 <voice> "Text to say" OutputName
  e.g. $0 kerrigan "Scanning perimeter." PerimeterClear

Available voices with reference audio:
EOF
  for f in "$REF_DIR"/*_ref.wav; do
    [ -f "$f" ] || continue
    v="$(basename "$f" _ref.wav)"
    txt="$REF_DIR/${v}_ref.txt"
    if [ -f "$txt" ]; then
      echo "  $v   ($(head -c 60 "$txt")...)"
    else
      echo "  $v   [missing ${v}_ref.txt]"
    fi
  done
  exit 1
fi

VOICE="$1"
GEN_TEXT="$2"
OUT_NAME="$3"

# Validate inputs — alphanumeric + underscore only (prevent path traversal)
if [[ ! "$VOICE" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Error: voice must be alphanumeric/underscore only (got: $VOICE)"; exit 1
fi
if [[ ! "$OUT_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Error: OutputName must be alphanumeric/underscore only (got: $OUT_NAME)"; exit 1
fi

REF_AUDIO="$REF_DIR/${VOICE}_ref.wav"
REF_TEXT_FILE="$REF_DIR/${VOICE}_ref.txt"
if [ ! -f "$REF_AUDIO" ]; then
  echo "Error: missing reference audio: $REF_AUDIO"
  echo "Create one with: bash $SCRIPT_DIR/add-voice.sh <peon-pack-name>"
  exit 1
fi
if [ ! -f "$REF_TEXT_FILE" ]; then
  echo "Error: missing reference transcript: $REF_TEXT_FILE"
  echo "Write the exact words spoken in ${VOICE}_ref.wav into that file."
  exit 1
fi
REF_TEXT="$(cat "$REF_TEXT_FILE")"

# Resolve target pack directory
PACK_NAME="$(voice_to_pack "$VOICE")"
OUTDIR="$REPO_DIR/packs/$PACK_NAME/sounds"
mkdir -p "$OUTDIR"

# Create/activate venv if needed
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  pip install -r "$SCRIPT_DIR/requirements.txt"
else
  source "$VENV_DIR/bin/activate"
fi

TMP_WAV="/tmp/${OUT_NAME}.wav"
FINAL_MP3="$OUTDIR/${OUT_NAME}.mp3"

echo "Voice:  $VOICE  →  pack: $PACK_NAME"
echo "Line:   $GEN_TEXT"
echo "Output: $FINAL_MP3"

# Pass arguments via env (no shell interpolation into Python)
GEN_TEXT="$GEN_TEXT" REF_AUDIO="$REF_AUDIO" REF_TEXT="$REF_TEXT" TMP_WAV="$TMP_WAV" \
python3 -c '
import os
from f5_tts.api import F5TTS
tts = F5TTS()
tts.infer(
    ref_file=os.environ["REF_AUDIO"],
    ref_text=os.environ["REF_TEXT"],
    gen_text=os.environ["GEN_TEXT"],
    file_wave=os.environ["TMP_WAV"],
)
print("WAV generated")
'

TMP_WAV="$TMP_WAV" FINAL_MP3="$FINAL_MP3" \
python3 -c '
import os
from pydub import AudioSegment
tmp = os.environ["TMP_WAV"]
out = os.environ["FINAL_MP3"]
wav = AudioSegment.from_wav(tmp)
wav.export(out, format="mp3", bitrate="192k")
print(f"MP3: {out} ({len(wav)/1000:.1f}s)")
'

HASH=$(shasum -a 256 "$FINAL_MP3" | cut -d' ' -f1)
echo ""
echo "Add this entry to packs/${PACK_NAME}/openpeon.json in the appropriate category:"
echo "  {\"file\": \"sounds/${OUT_NAME}.mp3\", \"label\": \"$GEN_TEXT\", \"sha256\": \"$HASH\"}"
echo ""
echo "Then run: bash install.sh --no-prompt"
