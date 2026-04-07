# Kerrigan Soundpack for peon-ping

![Kerrigan Soundpack](assets/hero.png)

Custom StarCraft Kerrigan voice pack with holographic notification overlay for [peon-ping](https://github.com/PeonPing/peon-ping).

## Features

![Overview](assets/overview.png)

- **42 voice lines** — 14 original StarCraft Kerrigan + 28 AI-generated via F5-TTS
- **Holographic overlay** — Terran Ghost comm transmission aesthetic with scanlines, pulsing cyan glow, sweep animation, and tactical HUD brackets
- **Cinematic icon** — Heart of the Swarm Kerrigan portrait

---

## Install (step by step)

### Step 1: Install peon-ping

If you don't have [peon-ping](https://github.com/PeonPing/peon-ping) installed yet:

```bash
curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash
```

### Step 2: Clone this repo

```bash
git clone https://github.com/torresaionna/kerrigan-soundpack.git
cd kerrigan-soundpack
```

### Step 3: Run the installer

```bash
bash install.sh
```

This copies the Kerrigan voice pack, holographic overlay, and icon into peon-ping.

### Step 4: Verify

```bash
peon preview session.start       # hear Kerrigan's voice
peon notifications test           # see the holographic overlay
peon status                       # confirm sc_kerrigan is active
```

---

## Install via Claude Code (one prompt)

Open Claude Code and paste this prompt:

```
Please install the Kerrigan soundpack for peon-ping:

1. First install peon-ping if not already installed:
   curl -fsSL https://raw.githubusercontent.com/PeonPing/peon-ping/main/install.sh | bash

2. Then clone and install the Kerrigan pack:
   git clone https://github.com/torresaionna/kerrigan-soundpack.git ~/kerrigan-soundpack
   cd ~/kerrigan-soundpack && bash install.sh

3. Set the sounds to play on the default audio device (not Sound Effects device):
   Update use_sound_effects_device to false in ~/.claude/hooks/peon-ping/config.json

4. Test it:
   peon preview session.start
   peon notifications test
```

---

## Generate new voice lines

Uses [F5-TTS](https://github.com/SWivid/F5-TTS) to clone Kerrigan's voice from the included reference audio.

```bash
cd ~/kerrigan-soundpack/tts
bash generate.sh "Your custom line here" OutputFileName
```

A Python venv is created automatically on first run. After generating, add the new sound entry to `pack/openpeon.json` in the appropriate category, then run `bash install.sh` again to update peon-ping.

---

## Sound categories

| Category | Count | Purpose |
|----------|-------|---------|
| session.start | 5 | New session begins |
| task.acknowledge | 11 | Agent starts working |
| task.complete | 7 | Agent finishes task |
| task.error | 7 | Something went wrong |
| input.required | 7 | Waiting for user input |
| user.spam | 7 | Too many rapid inputs |

## Uninstall

```bash
peon packs remove sc_kerrigan
```

To also remove the holographic overlay, reinstall peon-ping:

```bash
peon update
```
