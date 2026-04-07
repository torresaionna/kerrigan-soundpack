# Kerrigan Soundpack for peon-ping

![Kerrigan Soundpack](assets/hero.png)

Custom StarCraft Kerrigan voice pack with holographic notification overlay for [peon-ping](https://github.com/PeonPing/peon-ping).

## Features

![Overview](assets/overview.png)

- **42 voice lines** — 14 original StarCraft Kerrigan + 28 AI-generated via F5-TTS
- **Holographic overlay** — Terran Ghost comm transmission aesthetic with scanlines, pulsing cyan glow, sweep animation, and tactical HUD brackets
- **Cinematic icon** — Heart of the Swarm Kerrigan portrait

### Notification in action

![Notification Demo](assets/notification-demo.gif)

*Typewriter text animation with blinking cursor, holographic glow, and scan beam sweep*

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

## Sound Preview

Preview all 42 voice lines with `peon preview --list` after installing, or click any sound below to listen on GitHub:

<details>
<summary><b>session.start</b> — 5 sounds</summary>

| Sound | Line |
|-------|------|
| [KerriganReporting](pack/sounds/KerriganReporting.mp3) | "Lieutenant Kerrigan reporting" |
| [ImReady](pack/sounds/ImReady.mp3) | "I'm ready" |
| [SystemsReady](pack/sounds/SystemsReady.mp3) | "All systems ready. Awaiting your orders." |
| [GhostOnline](pack/sounds/GhostOnline.mp3) | "Ghost online. Ready for action." |
| [ChannelOpen](pack/sounds/ChannelOpen.mp3) | "Channel open. What are your orders?" |

</details>

<details>
<summary><b>task.acknowledge</b> — 11 sounds</summary>

| Sound | Line |
|-------|------|
| [IGotcha](pack/sounds/IGotcha.mp3) | "I gotcha" |
| [ThinkingSameThing](pack/sounds/ThinkingSameThing.mp3) | "Thinking the same thing" |
| [BeAPleasure](pack/sounds/BeAPleasure.mp3) | "It'd be a pleasure" |
| [IReadYou](pack/sounds/IReadYou.mp3) | "I read you" |
| [OnIt](pack/sounds/OnIt.mp3) | "On it. Consider it done." |
| [TargetAcquired](pack/sounds/TargetAcquired.mp3) | "Target acquired. Moving in." |
| [Analyzing](pack/sounds/Analyzing.mp3) | "Analyzing the situation. Stand by." |
| [Understood](pack/sounds/Understood.mp3) | "Understood. Moving to intercept." |
| [CopyThat](pack/sounds/CopyThat.mp3) | "Copy that. Engaging now." |
| [WayAheadOfYou](pack/sounds/WayAheadOfYou.mp3) | "Way ahead of you." |
| [ConsiderItHandled](pack/sounds/ConsiderItHandled.mp3) | "Consider it handled." |

</details>

<details>
<summary><b>task.complete</b> — 7 sounds</summary>

| Sound | Line |
|-------|------|
| [ImReady](pack/sounds/ImReady.mp3) | "I'm ready" |
| [WaitingOnYou](pack/sounds/WaitingOnYou.mp3) | "I'm waiting on you" |
| [TaskDone](pack/sounds/TaskDone.mp3) | "Task complete. What's next?" |
| [MissionComplete](pack/sounds/MissionComplete.mp3) | "Mission complete. Ready for debriefing." |
| [AreaSecure](pack/sounds/AreaSecure.mp3) | "Area secure. Awaiting new directives." |
| [ObjectiveComplete](pack/sounds/ObjectiveComplete.mp3) | "Objective complete. What else you got?" |
| [CleanKill](pack/sounds/CleanKill.mp3) | "Clean kill. No complications." |

</details>

<details>
<summary><b>task.error</b> — 7 sounds</summary>

| Sound | Line |
|-------|------|
| [Death1](pack/sounds/Death1.mp3) | "Ah!" |
| [Death2](pack/sounds/Death2.mp3) | "Ah!" |
| [SomethingWrong](pack/sounds/SomethingWrong.mp3) | "Something went wrong. We have a problem." |
| [ErrorDetected](pack/sounds/ErrorDetected.mp3) | "Error detected. Recalibrating." |
| [WeHaveAProblem](pack/sounds/WeHaveAProblem.mp3) | "We have a problem here." |
| [DamnIt](pack/sounds/DamnIt.mp3) | "Damn it. That was not supposed to happen." |
| [SystemFailure](pack/sounds/SystemFailure.mp3) | "System failure. Rerouting." |

</details>

<details>
<summary><b>input.required</b> — 7 sounds</summary>

| Sound | Line |
|-------|------|
| [WhatNow](pack/sounds/WhatNow.mp3) | "What now?" |
| [WaitingOnYou](pack/sounds/WaitingOnYou.mp3) | "I'm waiting on you" |
| [NeedInput](pack/sounds/NeedInput.mp3) | "I need your input, commander." |
| [StandingBy](pack/sounds/StandingBy.mp3) | "Standing by for further instructions." |
| [TalkToMe](pack/sounds/TalkToMe.mp3) | "Talk to me. What do you need?" |
| [OrdersCommander](pack/sounds/OrdersCommander.mp3) | "Orders, commander?" |
| [WaitingForSignal](pack/sounds/WaitingForSignal.mp3) | "Waiting for your signal." |

</details>

<details>
<summary><b>user.spam</b> — 7 sounds</summary>

| Sound | Line |
|-------|------|
| [EasilyAmused](pack/sounds/EasilyAmused.mp3) | "Easily amused, huh?" |
| [Telepath](pack/sounds/Telepath.mp3) | "Doesn't take a telepath to know what you're thinking" |
| [AnnoyingPeople](pack/sounds/AnnoyingPeople.mp3) | "You get off on annoying people, don't you?" |
| [GotAJobToDo](pack/sounds/GotAJobToDo.mp3) | "I've got a job to do" |
| [DontPushIt](pack/sounds/DontPushIt.mp3) | "Don't push it." |
| [PatienceWearing](pack/sounds/PatienceWearing.mp3) | "My patience is wearing thin." |
| [LastWarning](pack/sounds/LastWarning.mp3) | "This is your last warning." |

</details>

## Uninstall

```bash
peon packs remove sc_kerrigan
```

To also remove the holographic overlay, reinstall peon-ping:

```bash
peon update
```
