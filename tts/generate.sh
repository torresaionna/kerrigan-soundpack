#!/usr/bin/env bash
# Generate new Kerrigan voice lines using F5-TTS
# Usage: ./generate.sh "Line to generate" OutputName
#   e.g. ./generate.sh "Scanning perimeter. All clear." PerimeterClear

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REF_AUDIO="$SCRIPT_DIR/reference/kerrigan_ref.wav"
REF_TEXT="I've got a job to do. Doesn't take a telepath to know what you're thinking. You get off on annoying people, don't you?"
OUTDIR="$SCRIPT_DIR/../pack/sounds"

if [ $# -lt 2 ]; then
  echo "Usage: $0 \"Text to say\" OutputName"
  echo "  e.g. $0 \"Scanning perimeter. All clear.\" PerimeterClear"
  exit 1
fi

GEN_TEXT="$1"
OUT_NAME="$2"

# Validate OUT_NAME: alphanumeric and underscore only (prevent path traversal / injection)
if [[ ! "$OUT_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Error: OutputName must be alphanumeric/underscore only (got: $OUT_NAME)"
  exit 1
fi

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

echo "Generating: \"$GEN_TEXT\" -> $OUT_NAME"

# Pass arguments safely via environment variables (no shell interpolation into Python)
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

# Convert to mp3
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

echo "Done! Add to openpeon.json manually:"
HASH=$(shasum -a 256 "$FINAL_MP3" | cut -d' ' -f1)
echo "  {\"file\": \"sounds/${OUT_NAME}.mp3\", \"label\": \"$GEN_TEXT\", \"sha256\": \"$HASH\"}"
