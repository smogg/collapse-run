# Adaptive Browser Game — Concrete Concept

## Working Title

**"Collapse Run"**

---

## Core Loop

* Player controls a moving block on a collapsing path
* Path forms ahead procedurally
* Tiles fall behind player
* Goal: survive as long as possible

Loop:

* move → avoid gaps → fail → instant restart (<2s)

---

## Controls

* Desktop: A/D or ← →
* Mobile: swipe or hold left/right

---

## Visual Design

* Minimalist
* Dark background (#111)
* Player: bright neon cube
* Tiles: light gray → crack → fall
* Effects:

  * particle debris on collapse
  * screen shake on near-miss
  * trail behind player

---

## Core Mechanics

* Forward auto-movement (constant speed)
* Path width varies dynamically
* Obstacles:

  * gaps
  * moving blockers
  * timed collapse tiles

---

## Adaptive System (key differentiator)

### Inputs tracked

* time to death
* number of retries
* movement jitter (input noise)
* streak duration

### Difficulty parameters

* speed
* gap frequency
* obstacle density
* tile stability time

### Logic

* dying <10s → reduce difficulty
* surviving >45s → increase difficulty
* repeating patterns → inject variation

---

## Procedural Variation

* Pattern types:

  * zigzag gaps
  * alternating narrow paths
  * sudden wide safe zones

* Modifiers (short bursts):

  * low gravity (floaty movement)
  * speed boost
  * inverted controls (rare)

---

## Monetization Hooks

* Rewarded ad:

  * revive once per run
* Interstitial:

  * every 2–3 runs
* Optional:

  * double score after ad

---

## Retention Mechanics

* Score-based progression
* Daily challenge seed
* Streak system (consecutive runs)

---

## Technical Stack

* Phaser + TypeScript + Vite
* Canvas/WebGL
* CrazyGames SDK v3

---

## SDK Integration Points

* init SDK on load
* gameplayStart() on run start
* gameplayStop() on fail
* rewardedAd() on revive

---

## Performance Targets

* <20MB initial load
* 60 FPS mobile
* minimal assets (<10 sprites)

---

## Game Narrative / Theme

* Setting: abstract digital void collapsing in real-time
* Player = "core fragment" escaping system failure
* World = unstable simulation continuously breaking apart
* Tone: minimal, slightly tense, no explicit story text

---

## Concrete Gameplay Specification

### Player

* Shape: cube (1:1 ratio)
* Constant forward movement (Z-axis illusion)
* Horizontal movement only (X-axis)
* Acceleration: instant (no inertia)

### World

* Infinite path generated ahead of player
* Path consists of tiles (grid-based)
* Tiles have states:

  * stable
  * cracking (visual warning ~300ms)
  * falling (removed from collision)

### Camera

* Slight top-down angle (~30°)
* Smooth follow with slight lag (adds motion feel)

---

## Level Generation Rules

### Base Path

* Width: 3–7 tiles
* Always guarantees at least one valid path forward

### Gap Rules

* Min gap width: 1 tile
* Max gap width: depends on difficulty (1–3 tiles)
* Never chain impossible jumps

### Pattern Library

* straight narrow corridor
* zigzag path
* split path → merges
* sudden wide safe zone

Patterns are selected and blended continuously

---

## Failure Conditions

* player falls below path → immediate fail
* no health system
* no delay on death

---

## Restart Flow

* instant restart (<1.5s)
* same control context
* no menus

---

## Adaptive Difficulty (Concrete Rules)

### Metrics

* runDuration
* deathsLast5Runs
* avgInputVariance

### Adjustments

* if runDuration < 10s:

  * decrease gap frequency
  * slow speed by 5–10%

* if runDuration > 45s:

  * increase obstacle density
  * increase speed gradually

* if deathsLast5Runs > 4:

  * inject safe segment (5–8s no danger)

---

## Modifiers (Timed Events)

Triggered every 20–40s randomly:

* low gravity (longer airtime feel)
* speed burst (+20% for 5s)
* unstable tiles (faster collapse)

Duration: 5–8s

---

## Scoring System

* score = distance traveled
* multiplier increases every 15s survived
* reset on death

---

## Ad Integration Points (Exact)

* Interstitial:

  * after every 2 deaths

* Rewarded:

  * on death → "revive"
  * revive = reposition on last safe tile
  * max 1 revive per run

---

## Visual Specification (Concrete)

* Background: #111111

* Player: neon color (#00FFAA or similar)

* Tiles:

  * stable: #CCCCCC
  * cracking: #FFAA00
  * falling: fade + drop animation

* Effects:

  * particle burst on tile break
  * trail behind player (alpha fade)
  * camera shake on near fall

---

## Audio (Minimal)

* movement hum loop
* tile crack sound
* fall sound
* revive sound cue

---

## Technical Constraints

* deterministic generation per run
* no external assets required for MVP
* all gameplay must work without SDK enabled

---

## Success Criteria

* avg session > 5 min
* restart time < 2s
* retention > 25% D1 (platform-driven)

---

## Kill Criteria

* players quit < 3 runs
* no improvement in survival time
* feels repetitive within 2 minutes

---

## Expansion Paths

* multiplayer ghost runs
* skins (purely visual)
* themed maps

---

## Core Insight

Not a game about levels.
A system that continuously tunes challenge to keep the player at the edge of failure.
