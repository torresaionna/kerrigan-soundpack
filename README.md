# peonping-soundpack

![Hero](assets/hero.png)

A polished voice-pack kit for [peon-ping](https://github.com/PeonPing/peon-ping). Ships the **holographic notification overlay** and the **F5-TTS voice-cloning pipeline** — so every voice (Kerrigan, GLaDOS, Peon, Sheogorath, and 300+ more from the peon-ping registry) gets the same cinematic look and can be extended with new AI-generated lines.

## What you get

![Overview](assets/overview.png)

- **Two overlay themes** — swap with `bash tools/switch-theme.sh <theme>`:
  - **kerrigan** — Terran Ghost holographic transmission: cyan scanlines, sweep beam, HUD brackets, frequency readout.
  - **warcraft** — Horde war council: dark obsidian panel, orc-green glow, gold iron rivets, torch ember sweep, rune + chant status bar ("⚔ FOR THE HORDE", "ZUG ZUG").
- **Bundled Kerrigan pack** — 42 voice lines (14 original StarCraft + 28 AI-generated via F5-TTS).
- **Bundled peon_expanded scaffold** — 77 Warcraft-flavored labels across 7 CESP categories, ready to batch-generate via F5-TTS.
- **One-shot curated install** — pulls peon, glados, sopranos, duke_nukem, sheogorath, rick, tf2_engineer, sc_marine, sc_medic from the peon-ping registry with `--with-curated`.
- **Multi-voice TTS** — clone any voice from a ~10-second reference and generate new lines (or whole packs) on demand.

### Notification in action

![Notification Demo](assets/notification-demo.gif)

*Typewriter text animation with blinking cursor, holographic glow, and scan beam sweep — rendered for every pack.*

---

## Install

### Step 1 — Install peon-ping (if you don't have it)

```bash
curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash
```

### Step 2 — Clone and run

```bash
git clone https://github.com/torresaionna/kerrigan-soundpack.git
cd kerrigan-soundpack
bash install.sh
```

The interactive installer will:
1. Install the holographic overlay (applies globally to every peon-ping pack).
2. Install every bundled pack in `packs/` (currently Kerrigan).
3. Offer to pull the curated set of official voices from the peon-ping registry.
4. Ask you which voice to activate.

### Non-interactive flags

```bash
bash install.sh --no-prompt                        # overlay + bundled packs only
bash install.sh --with-curated                     # + curated registry packs
bash install.sh --use glados                       # set active voice non-interactively
bash install.sh --theme warcraft --use peon        # warcraft overlay + orc peon active
```

### Swap overlay themes without reinstalling

```bash
bash tools/switch-theme.sh warcraft     # orc war council overlay
bash tools/switch-theme.sh kerrigan     # ghost protocol holographic overlay
bash tools/switch-theme.sh auto         # pick based on active peon-ping pack
bash tools/switch-theme.sh --list       # list available themes
```

### Step 3 — Verify

```bash
peon preview session.start       # hear the current voice
peon notifications test           # see the holographic overlay
peon packs list                   # list installed voices
```

---

## Switching voices

All peon-ping commands work as usual — the overlay renders for every pack:

```bash
peon packs use sc_kerrigan
peon packs use glados
peon packs use peon
peon packs list                   # see everything installed
peon packs community              # browse the 300+ available voices
peon packs install <pack-name>    # grab any pack from the registry
```

Per-directory bindings still work too:
```bash
peon packs bind glados            # bind GLaDOS to the current working dir
```

---

## Claude Code one-shot install

Open Claude Code and paste:

```
Install the peonping-soundpack:

1. Install peon-ping if not already installed:
   curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash

2. Clone and install the pack:
   git clone https://github.com/torresaionna/kerrigan-soundpack.git ~/peonping-soundpack
   cd ~/peonping-soundpack && bash install.sh --with-curated --use sc_kerrigan

3. Route sound through the default output (not the Sound Effects device):
   set use_sound_effects_device to false in ~/.claude/hooks/peon-ping/config.json

4. Test:
   peon preview session.start
   peon notifications test
```

---

## Generate new voice lines (any voice)

The TTS pipeline uses [F5-TTS](https://github.com/SWivid/F5-TTS) to clone a voice from a short reference sample and synthesize new lines in that voice.

### Use an existing bundled voice (Kerrigan)

```bash
cd tts
bash generate.sh kerrigan "Scanning perimeter. All clear." PerimeterClear
```

The mp3 lands in `packs/sc_kerrigan/sounds/` and the script prints the JSON entry to paste into `packs/sc_kerrigan/openpeon.json`. Rerun `bash install.sh --no-prompt` to deploy.

### Add TTS support for another voice

Any peon-ping pack can be turned into a cloneable voice. The helper bootstraps a reference from a sound the pack already ships (supports mp3, wav, ogg).

```bash
# After installing (e.g.) glados via peon packs install glados:
cd tts
bash add-voice.sh glados                    # auto-picks longest sound
#   → writes reference/glados_ref.wav
#   → writes reference/glados_ref.txt (seeded with the label from openpeon.json)
# Open reference/glados_ref.txt and correct it to the EXACT transcript of the audio.

bash generate.sh glados "Still alive, just like the cake." StillAlive
```

### Batch-generate a whole pack

If you have a manifest with many labels but no sounds yet (like the bundled `peon_expanded`), generate everything in one shot:

```bash
bash tts/add-voice.sh peon                 # bootstrap reference from installed peon pack
# Edit tts/reference/peon_ref.txt to be the exact transcript.
bash tts/batch-generate.sh peon            # generates every missing sound, updates sha256 in manifest
bash install.sh --no-prompt --use peon_expanded
```

Note: first run downloads the F5-TTS model (~1-2GB) and can take 15+ min on first generation. Subsequent runs are fast.

### Manually add a voice

Drop two files into `tts/reference/`:
- `<voice>_ref.wav` — 5–15 second clean mono sample (24kHz works best)
- `<voice>_ref.txt` — exact transcript of the wav

Then `bash generate.sh <voice> "..." OutputName`.

To route the output into a different pack directory, add an entry to `VOICE_TO_PACK` near the top of `tts/generate.sh`.

---

## Repo layout

```
packs/
  sc_kerrigan/                 # Sarah Kerrigan — 42 sounds, shipped
  peon_expanded/               # Orc Peon expanded — 77 labels, TTS-generate to fill
overlay/
  mac-overlay-kerrigan.js      # Ghost Protocol holographic theme
  mac-overlay-warcraft.js      # Horde war council theme
tts/
  generate.sh                  # single-line TTS generator
  batch-generate.sh            # generate every missing sound in a manifest
  add-voice.sh                 # bootstrap a reference from any installed pack
  reference/
    kerrigan_ref.wav + .txt    # shipped reference
    # <voice>_ref.wav files created by add-voice.sh are gitignored by default
tools/
  switch-theme.sh              # hot-swap overlay themes
install.sh                     # installs overlay theme + bundled packs + curated selection
```

---

## Uninstall

```bash
peon packs remove sc_kerrigan    # or any other pack
peon update                      # reinstalling peon-ping restores its default overlay
```

---

## License

Sound files: CC-BY-NC-4.0 where applicable (see each pack's `openpeon.json`). Overlay and scripts: MIT.
