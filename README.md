# Kerrigan Soundpack for peon-ping

![Kerrigan Soundpack](assets/hero.png)

Custom StarCraft Kerrigan voice pack with holographic notification overlay for [peon-ping](https://github.com/PeonPing/peon-ping).

## Features

![Overview](assets/overview.png)

- **24 voice lines** — 14 original StarCraft Kerrigan + 10 AI-generated via F5-TTS
- **Holographic overlay** — Terran Ghost comm transmission aesthetic with scanlines, pulsing cyan glow, sweep animation, and tactical HUD brackets
- **Cinematic icon** — Heart of the Swarm Kerrigan portrait

## Install

Requires [peon-ping](https://github.com/PeonPing/peon-ping) to be installed first.

```bash
git clone https://github.com/aichensii/kerrigan-soundpack.git
cd kerrigan-soundpack
bash install.sh
```

## Generate new voice lines

```bash
cd tts
bash generate.sh "Your custom line here" OutputFileName
```

This uses F5-TTS to clone Kerrigan's voice from the reference audio. A Python venv is created automatically on first run.

After generating, add the new sound entry to `pack/openpeon.json` in the appropriate category.

## Sound categories

| Category | Count | Purpose |
|----------|-------|---------|
| session.start | 3 | New session begins |
| task.acknowledge | 7 | Agent starts working |
| task.complete | 4 | Agent finishes task |
| task.error | 4 | Something went wrong |
| input.required | 4 | Waiting for user input |
| user.spam | 4 | Too many rapid inputs |
