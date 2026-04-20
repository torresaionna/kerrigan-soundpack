#!/usr/bin/env bash
# Batch-generate every sound listed in a pack's openpeon.json that is missing
# from the pack's sounds/ directory. Uses tts/generate.sh under the hood.
#
# Usage:
#   bash tts/batch-generate.sh <voice>
#     e.g. bash tts/batch-generate.sh morpheus
#
# Requires:
#   tts/reference/<voice>_ref.wav
#   tts/reference/<voice>_ref.txt
#   packs/<mapped-pack>/openpeon.json  with label entries

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <voice>"
  echo "  e.g. $0 morpheus"
  exit 1
fi

VOICE="$1"

# Same voice→pack mapping as generate.sh
case "$VOICE" in
  kerrigan) PACK="sc_kerrigan" ;;
  peon)     PACK="peon_expanded" ;;
  *)        PACK="$VOICE" ;;
esac

MANIFEST="$REPO_DIR/packs/$PACK/openpeon.json"
SOUNDS_DIR="$REPO_DIR/packs/$PACK/sounds"

if [ ! -f "$MANIFEST" ]; then
  echo "Error: no manifest at $MANIFEST"; exit 1
fi
if [ ! -f "$SCRIPT_DIR/reference/${VOICE}_ref.wav" ]; then
  echo "Error: missing reference audio at tts/reference/${VOICE}_ref.wav"
  echo "Drop a ~10s clean mono sample of the voice there, plus a matching ${VOICE}_ref.txt transcript."
  exit 1
fi

echo "Batch-generating $VOICE lines into $SOUNDS_DIR ..."
echo ""

# Walk every category.sounds[] entry with a label but no mp3 on disk yet.
# Emit TSV: <out_name>\t<label>
pending="$(MANIFEST="$MANIFEST" SOUNDS_DIR="$SOUNDS_DIR" python3 <<'PY'
import json, os, sys
m = os.environ["MANIFEST"]
sd = os.environ["SOUNDS_DIR"]
with open(m) as f:
    data = json.load(f)
for cat in data.get("categories", {}).values():
    for s in cat.get("sounds", []):
        rel = s.get("file", "")
        label = s.get("label", "")
        if not rel or not label:
            continue
        if not rel.endswith(".mp3"):
            continue
        out_name = os.path.splitext(os.path.basename(rel))[0]
        dest = os.path.join(sd, os.path.basename(rel))
        if os.path.exists(dest):
            continue
        print(f"{out_name}\t{label}")
PY
)"

if [ -z "$pending" ]; then
  echo "Nothing to do — every sound in $MANIFEST already exists on disk."
  exit 0
fi

count="$(printf '%s\n' "$pending" | wc -l | tr -d ' ')"
echo "Generating $count sounds..."
echo ""

i=0
printf '%s\n' "$pending" | while IFS=$'\t' read -r out_name label; do
  i=$((i+1))
  echo "[$i/$count] $out_name :: $label"
  bash "$SCRIPT_DIR/generate.sh" "$VOICE" "$label" "$out_name" 2>&1 | tail -3
  echo ""
done

# Update sha256 hashes in the manifest for every generated sound.
echo "Updating sha256 hashes in manifest..."
MANIFEST="$MANIFEST" SOUNDS_DIR="$SOUNDS_DIR" python3 <<'PY'
import hashlib, json, os
m = os.environ["MANIFEST"]
sd = os.environ["SOUNDS_DIR"]
with open(m) as f:
    data = json.load(f)
changed = 0
for cat in data.get("categories", {}).values():
    for s in cat.get("sounds", []):
        rel = s.get("file", "")
        if not rel:
            continue
        path = os.path.join(sd, os.path.basename(rel))
        if not os.path.exists(path):
            continue
        with open(path, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        if s.get("sha256") != digest:
            s["sha256"] = digest
            changed += 1
with open(m, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"  updated {changed} sha256 entries")
PY

echo ""
echo "Done. Next:"
echo "  bash install.sh --no-prompt"
echo "  peon packs use $PACK && peon preview session.start"
