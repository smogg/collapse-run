# Web Game Profit Framework — CrazyGames / Similar HTML5 Platforms

## Purpose

A practical framework for designing a browser game that has a realistic shot at strong engagement, platform featuring, and ad revenue on CrazyGames and similar HTML5 portals.

---

## What actually drives profit

Profit on browser-game portals is mostly a function of:

* **click-through to gameplay**
* **time to first interaction**
* **average playtime / session length**
* **retention / replay rate**
* **natural ad opportunities**
* **platform featuring / ranking**

The platform economics are simple:

* longer sessions = more ad opportunities
* better engagement = better ranking / more homepage exposure
* better ranking = more traffic

---

## Platform truths to design around

### CrazyGames

* Game must get the player into gameplay **immediately**; if not, a maximum of **1 click** is allowed.
* Readability and controls must work inside responsive iframes and mobile sizes.
* Initial download should be **≤ 50 MB**, and **≤ 20 MB** if you want mobile homepage eligibility.
* Their ranking / selection system explicitly considers metrics like **play counts, average playtime, retention, conversion, votes**.
* Revenue share eligibility requires: **CrazyGames SDK integration**, no external ads, no other portal branding, and enough originality.

### Similar portal logic (Poki / GameDistribution)

* Rewarded video is a standard monetization primitive.
* Session length matters because it creates more mid-roll opportunities.
* GameDistribution explicitly frames success around three layers:

  * **core gameplay**
  * **look and feel**
  * **in-game features / meta**

---

## Strategic conclusion

Do **not** start with story, lore, or content volume.

Start with a machine that maximizes this sequence:

1. player understands the game instantly
2. player acts within seconds
3. player fails fairly
4. restart is frictionless
5. each retry teaches something
6. short-term rewards appear before boredom
7. meta/progression keeps the loop from flattening

That is the product.

---

## The 7-part framework

## 1. Pick a portal-native genre

Choose genres that already fit browser behavior:

* arcade survival
* racing / stunt retry loops
* physics sandbox / destruction
* puzzle with endless or seeded variation
* idle / incremental with short active bursts
* .io-lite or asynchronous competitive loops

Avoid as your first attempt:

* dialogue-heavy narrative games
* complex strategy with long onboarding
* art-heavy exploration games
* deep economy games requiring 10+ minutes before payoff

Reason:

* browser players are impatient
* portals reward immediate conversion to gameplay
* ad monetization works better with repeatable loops and natural stops

---

## 2. Define a ruthless core loop

The loop must fit in one sentence:

* **verb + obstacle + reward**

Examples:

* drift through gates, avoid crashing, extend combo
* place pieces, merge bigger objects, chase higher score
* move, shoot, loot, escape
* draw a path, solve, advance

Good loop criteria:

* readable in 3–5 seconds
* one primary input model
* one obvious failure state
* one visible success metric
* restart in under 2 seconds

If you need a tutorial paragraph, the loop is already weak.

---

## 3. Engineer the first 60 seconds

The first minute matters more than the next ten.

### Target structure

* **0–5s:** game visible, no confusion, player can act
* **5–15s:** first win / micro-success
* **15–30s:** first tension spike
* **30–45s:** first failure or near-failure
* **45–60s:** instant restart plus proof of progress

### Design rules

* no long menu
* no account wall
* no exposition
* no non-interactive intro
* no settings screen before action

Your first minute should answer:

* what do I do?
* what am I avoiding / chasing?
* why try again?

---

## 4. Build monetization into pacing, not on top of it

Ads should land on **natural pause points**, not arbitrary interruptions.

### Good placements

* game over
* level complete
* boss / wave complete
* revive decision
* reward claim

### Best primitives

* **rewarded revive**
* **rewarded multiplier**
* **interstitial after complete run / several deaths**

### Bad placements

* immediate ad on first session
* ad before player understands the game
* ad during concentration peaks
* deceptive UI around ads

Monetization rule:

* the player must feel the ad is either expected or useful.

---

## 5. Add a thin meta layer early

Core loop alone rarely holds long enough.

Add a light meta system that increases repeat play without bloating complexity:

* score chase
* daily challenge seed
* unlockable skins / vehicles / themes
* missions / achievements
* streaks
* simple upgrade track
* auto-generated level variation

This should answer:

* why one more run?
* why come back tomorrow?

Do **not** start with a giant progression tree.
A thin meta that is visible and earned quickly is better.

---

## 6. Optimize look-and-feel for clarity, not spectacle

Browser portal hits do not need elite art.
They need:

* clean silhouettes
* obvious hazards and goals
* responsive animation
* strong feedback on input / hit / fail / reward
* fast loading assets

### Visual priorities

1. readability
2. responsiveness
3. consistency
4. style

### Audio priorities

1. immediate action feedback
2. fail / success cues
3. mute control
4. non-annoying loop music

Expensive visuals do not fix weak game feel.
Feedback does.

---

## 7. Design for featuring and ranking signals

On CrazyGames, exposure is downstream of engagement stats.
That means the game should be built to improve:

* conversion to gameplay
* average playtime
* retention
* votes / sentiment
* performance stability

Translate that into product requirements:

* start instantly
* run smoothly on ordinary hardware
* avoid crashes and physics weirdness on high refresh-rate monitors
* work in iframe sizes and mobile if supported
* maintain originality in name, assets, and overall presentation

---

## What to measure from day one

If you build without instrumentation, you are guessing.

Track at minimum:

* page load → gameplay start conversion
* time to first input
* time to first fail
* average session length
* runs per session
* revive accept rate
* rewarded ad accept rate
* return rate (day 1 / day 7 if possible)
* % of players reaching second minute

### Interpretation

* low start conversion = onboarding / load / confusion problem
* low time to first input = good
* ultra-fast deaths + no retries = unfair or unreadable
* many retries + growing survival time = promising
* long sessions + low returns = needs meta / goals

---

## Decision framework for concept selection

Score each concept 1–5 on these axes:

* instant readability
* one-hand / simple controls
* fair failure loop
* restart speed
* replayability
* natural ad breaks
* light meta potential
* procedural variation potential
* mobile friendliness
* asset-light production

Kill concepts that score poorly on:

* instant readability
* restart speed
* replayability
* natural ad breaks

---

## Recommended product shape for a first profitable attempt

The strongest first bet is usually:

* **simple arcade / physics / racing / merge loop**
* **2D or 2.5D**
* **one-session score chase**
* **procedural variation**
* **rewarded revive**
* **daily challenge / missions**

Why:

* cheap to build
* easy to tune
* portal-native
* ad-friendly
* works with vibe-coding and rapid iteration

---

## Concrete framework the developer should follow

### Phase 1 — prove the loop

Ship a prototype with:

* only one mechanic
* one fail condition
* one visible score
* restart under 2s
* no meta except score

Success threshold:

* it feels good enough that retries happen naturally

### Phase 2 — prove session depth

Add:

* procedural variation
* clearer feedback
* 1 rewarded revive
* 1–2 mission types

Success threshold:

* sessions stop feeling identical
* revive feels valuable

### Phase 3 — prove retention

Add:

* daily challenge
* unlockables / cosmetics
* simple progression bar / mission ladder

Success threshold:

* player has a reason to return, not just replay immediately

### Phase 4 — prove portal fit

Harden for:

* iframe readability
* mobile or desktop-specific UX
* fast loading
* SDK integration
* stable performance

---

## Hard filters before greenlighting any concept

A concept should be rejected if:

* it takes more than 5 seconds to understand
* it needs text to be fun
* failure feels random
* art demands are too high for fast iteration
* the first ad opportunity appears too late
* it cannot support either procedural variation or meta
* restart is not near-instant

---

## Best single design principle

**Design for "one more run," not for "what a cool idea."**

Portal games make money when they convert curiosity into repeated action.
Not when they impress another developer.

---

## Recommended next-step brief format for the actual game concept

When choosing the actual game, define it in this exact structure:

* fantasy / fantasy wrapper
* core verb
* fail state
* success metric
* first 60-second flow
* procedural variation system
* meta system
* monetization points
* technical constraints
* instrumentation events
* kill criteria

That is the brief a developer can build from.
