# Squad Builder Design

## Core Idea

Before each level, the player customizes their squad of 10 units. Every unit starts identical (same HP, same speed, no special properties). The player spends a limited pool of **buff points** to modify individual units. They also set the **march order** — which unit goes first, which goes last.

This turns the game from pure routing into routing + squad composition. The path is the map problem. The squad is the people problem.

---

## Why This Works

The current game has one lever: tile placement. That's the puzzle. But once you solve the path, you always get the same result. Squad building adds a second lever that interacts with the first:

- A tank at the front absorbs turret focus while others pass safely
- A fast scout at the back rushes through before the turret can retarget
- Armored units can take the dangerous route while fragile ones can't

The same path plays differently depending on who walks it and in what order.

---

## The Buff System

### Budget

Each level gives the player a fixed number of **buff points** (e.g., 6 points for early levels, 10+ for later ones). Points are spent before the level starts and reset each level. No persistence between levels — each level is a self-contained puzzle.

### Available Buffs

Each buff costs 1-3 points and is applied to a single unit.

#### Speed Boost (1 point)
- Unit moves 50% faster
- Good for: rushing through danger zones, reducing turret exposure time
- Risk: fast units spread out, so they're alone when hit (no "crowd dilution" of turret focus)

#### Tough Hide (1 point)
- Unit gains +4 HP (from 12 to 16)
- Good for: surviving one or two extra turret hits
- Simple, reliable, never wasted

#### Armor Plating (2 points)
- Unit takes 50% less damage from all sources
- Good for: surviving heavy turret zones or prolonged exposure
- Expensive but powerful on the right unit

#### Taunt / Tank (2 points)
- Turrets ALWAYS target this unit first when it's in range, regardless of position
- The unit draws fire away from everyone behind it
- Good for: protecting the group by sacrificing one
- Risk: the tank will die. That's the point. The question is whether the others survive because of it.

#### Shield (2 points)
- Unit has a shield that absorbs the first 6 points of damage, then breaks
- Unlike armor plating (permanent reduction), the shield is a burst of protection that runs out
- Good for: surviving one big heavy turret hit or a spike trap + turret combo

#### Healer (3 points)
- This unit passively heals the unit directly in front of it for 1 HP per second
- Only works while both units are alive and adjacent on the path
- Good for: sustaining a tank or keeping a cluster alive through extended exposure
- Requires careful march order planning

---

## March Order

The player arranges all 10 units in a line. Unit #1 enters the path first, unit #10 enters last. Spawn interval between units is fixed per level.

### Why Order Matters

Turrets target the **furthest-along unit in range** (the one closest to escaping). This means:

1. **The front unit always gets shot first.** Once it leaves range or dies, the turret retargets the next unit.
2. **A tank at the front absorbs all the fire** while units behind it pass through safely — until the tank dies.
3. **A fast unit at the front** rushes out of range quickly, but then the second unit gets targeted earlier.
4. **A healer behind a tank** keeps the tank alive longer, buying more safe passage for the group.
5. **Fragile buffed units in the middle** of the pack are safest because the front takes fire and the back hasn't entered range yet.

### Ordering UI

Simple drag-and-drop list. Each unit shows:
- Position number (1 = first in, 10 = last in)
- Applied buffs as icons
- Current HP and speed
- A portrait/color so units are visually distinguishable on the map

---

## How It Interacts With Path Building

The squad is built BEFORE the path. The player sees the level layout and turret ranges, designs their squad, then builds the path. This order matters because:

- If you have a tank, you might route through a turret zone knowing the tank will absorb it
- If you have fast units, a long path matters less because they cross it quickly
- If you have a healer pair, you want a path where they stay close together (no sharp turns that separate them)

Alternatively, path building could come first and squad building second. This lets the player think: "I built a path through the heavy turret zone, so I need a tank at the front and armor plating on units 2-3."

**Recommendation: let the player switch freely between squad view and path view before starting the wave.** No forced order. Some players think path-first, some think squad-first.

---

## Buff Interactions and Combos

### Tank + Healer (5 points)
The classic combo. Tank draws fire, healer keeps them alive. The tank survives longer, protecting 3-4 more units than it would alone. Expensive (5 points) but can save 3-4 units that would otherwise die.

### Speed Boost + Shield (3 points)
A fast unit with a shield. Rushes through danger, shield absorbs the few hits it takes. Good for ensuring at least one unit definitely survives — a "guaranteed escape" build.

### Armor Plating + Tough Hide (3 points)
A damage sponge. Takes half damage AND has extra HP. Not a tank (doesn't draw fire) but extremely survivable. Good for a unit you expect to take moderate sustained damage.

### Multiple Speed Boosts (cheap, 1 point each)
Making 3-4 units fast is cheap. They zip through turret range, taking maybe 1-2 hits each. Works great against rapid turrets (less exposure time), less effective against heavy turrets (one hit still chunks hard).

### No Buffs (0 points, saved budget)
A valid strategy. If the path avoids most danger, the buff points are wasted. Better to spend them only where the path requires it.

---

## Design Constraints

### Keep It Simple
- Max 4-5 buff types total in the game
- Each unit can have at most 2 buffs (prevents overwhelming complexity)
- Buff points per level should allow buffing 3-5 units (not all 10)
- The player should NOT be able to buff their way out of a bad path. Path is still king.

### Buffs Must Not Replace Path Thinking
The worst outcome is if the player can just max-buff their squad and send them through any random path. Buffs should be a 20-30% survival improvement, not a 100% one. The path is still the primary puzzle. The squad is the secondary optimization.

### Determinism
All buff effects are deterministic. No random crits, no proc chances. Tank always draws fire. Shield always absorbs exactly 6 damage. Speed boost is always +50%. The player can predict exactly what happens.

---

## Level Integration

Each level's JSON definition gains:

```json
{
  "buffPoints": 6,
  "maxBuffsPerUnit": 2,
  "availableBuffs": ["speed", "tough", "armor", "tank", "shield"]
}
```

Early levels restrict available buffs to teach them one at a time:
- Level 1-3: no buffs (path only)
- Level 4: speed boost unlocked
- Level 5: tough hide unlocked
- Level 6: tank unlocked
- Level 7: armor plating unlocked
- Level 8: shield unlocked
- Level 9: healer unlocked
- Level 10+: all buffs available

Buff points scale with difficulty: early levels give 4-6, later levels give 8-12.

---

## Visual Representation

During the wave, buffed units should be visually distinct:
- **Speed**: motion lines / lighter color
- **Tough**: slightly larger circle
- **Armor**: metallic border ring
- **Tank**: red glow + larger size, "shield" icon above
- **Shield**: blue bubble around unit (fades when broken)
- **Healer**: green pulse connecting to unit ahead

March order is shown as numbered labels on each unit during the wave.

---

## Open Questions

1. **Should the player see a damage preview?** Before starting the wave, show estimated damage per unit based on path + turret positions. This helps learning but reduces the "discovery" aspect.

2. **Should buffs persist across a chapter?** Current design resets each level. An alternative: give the player a fixed team for a chapter (5 levels) with permanent buffs, adding resource management across levels.

3. **Should there be debuffs?** Some terrain could debuff units — cursed ground could disable shields, mud could negate speed boosts. This adds counterplay depth but also complexity.

4. **How does the healer work on turns?** When the path turns a corner, the healer and its target might be on cells that aren't adjacent in grid space but are adjacent in path order. Heal by path adjacency, not grid adjacency.
