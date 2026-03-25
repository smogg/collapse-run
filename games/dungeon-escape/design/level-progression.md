# Level Progression Design

## Core Constants

- Grid: 10x10
- Squad: always 10 units
- Tile types introduced gradually
- One new mechanic per level (or one per 2 levels)

---

## Chapter 1: Learning the Ropes

### Level 1 — The Straight Shot

**New**: Path tiles, basic movement, win condition

A wide-open corridor. Entrance left, exit right. No turrets. No obstacles. The player just needs to lay a straight path and press start. Everyone survives. This is pure onboarding — learn to place tiles, see units move, understand the goal.

- Turrets: none
- Walls: top and bottom borders only (3-row corridor)
- Tiles: 10 path
- Required escapes: 8/10
- Lesson: "place tiles to connect IN to OUT, press start"

### Level 2 — First Blood

**New**: Rapid turret (Arrow Trap)

Same corridor shape but now there's a single Arrow Trap in the middle. The straight path goes through its range. Units take damage but most survive if the path is direct. The player sees HP bars drop for the first time and understands turrets are the threat.

- Turrets: 1 rapid
- Walls: top/bottom borders, corridor shape
- Tiles: 12 path
- Required escapes: 7/10
- Lesson: "turrets shoot your units, HP matters"

### Level 3 — The Detour

**New**: Routing choices (walls create two paths)

A wall barrier splits the corridor with two gaps — one near the turret, one far. The straight-through-the-turret path is short but costly. The detour is longer but safer. Player learns that path choice matters more than path length.

- Turrets: 1 rapid
- Walls: horizontal barrier with 2 gaps
- Tiles: 14 path
- Required escapes: 7/10
- Lesson: "longer path can be safer — routing IS the game"

### Level 4 — Iron Skin

**New**: Armor tiles

Same layout as level 3 but the safe gap is now walled off. The player must go through the dangerous zone. But they get armor tiles for the first time. Placing armor on the cells inside turret range halves the damage. The turret is beatable with smart armor placement.

- Turrets: 1 rapid
- Walls: barrier with 1 gap (forced through turret)
- Tiles: 12 path, 3 armor
- Required escapes: 7/10
- Lesson: "armor tiles reduce damage — place them where it hurts"

### Level 5 — Crossfire

**New**: Two turrets, overlapping ranges

Two Arrow Traps with overlapping fields of fire. The overlap zone is deadly — units in it take double damage. The player must route to minimize time in the overlap, using armor tiles on the worst cells.

- Turrets: 2 rapid
- Walls: light obstacles creating routing options
- Tiles: 16 path, 3 armor
- Required escapes: 6/10
- Lesson: "overlapping turret ranges are far more dangerous than single turrets"

---

## Chapter 2: Heavy Hitters

### Level 6 — The Ballista

**New**: Heavy turret (Ballista)

Introduces the Ballista — slow firing but hits hard (5 damage per shot). One Ballista covers a long corridor. The player needs to understand the difference: rapid turrets chip away, heavy turrets chunk. A single heavy hit on a weakened unit is a kill.

- Turrets: 1 heavy
- Walls: L-shaped corridor
- Tiles: 16 path, 2 armor
- Required escapes: 7/10
- Lesson: "heavy turrets hit hard — don't linger in their range"

### Level 7 — Protection Ward

**New**: Protection tiles

A heavy turret guards the only viable path. Armor alone isn't enough because the Ballista does 5 per hit. Protection tiles flat-reduce damage by 1, which stacks with armor's 50% reduction. On a protection tile, a 5-damage hit becomes 4. On an armor tile, it becomes 2.5. On both... well, they can't stack on one cell, but the player learns to think about which reduction helps where.

- Turrets: 1 heavy, 1 rapid
- Walls: forced S-curve path
- Tiles: 14 path, 3 armor, 2 protection
- Required escapes: 6/10
- Lesson: "protection tiles flat-reduce damage — best against rapid fire"

### Level 8 — Mixed Arms

**New**: Combining rapid + heavy turrets strategically

A rapid turret and heavy turret placed so that the optimal path clips both ranges. The rapid turret's zone wants armor (many small hits halved). The heavy turret's zone wants protection (fewer big hits reduced by flat amount). The player must think about WHICH defensive tile goes WHERE.

- Turrets: 1 rapid, 1 heavy
- Walls: barrier maze with 2 routes
- Tiles: 16 path, 3 armor, 3 protection
- Required escapes: 6/10
- Lesson: "match your defensive tiles to the turret type"

---

## Chapter 3: Terrain

### Level 9 — Muddy Ground

**New**: Mud terrain (pre-placed, slows units to 50% speed)

Mud tiles are placed by the level designer (not the player). Units that walk over mud slow down, spending more time in turret range. The obvious shortest path goes through mud right under a turret — devastating. The longer path avoids mud entirely.

- Turrets: 1 rapid
- Terrain: mud patch (4-5 cells)
- Walls: moderate obstacles
- Tiles: 18 path, 2 armor
- Required escapes: 6/10
- Lesson: "mud slows you down — sometimes the long way is faster"

### Level 10 — Mud and Fire

**New**: Combining mud with heavy turret

A Ballista overlooks a mud zone. Units stuck in mud take 2-3 heavy hits instead of 1. The player must either avoid the mud (using more tiles for a longer path) or armor up the mud cells. Tile budget is tight — can't do both.

- Turrets: 1 heavy, 1 rapid
- Terrain: mud patch in heavy turret range
- Walls: branching corridors
- Tiles: 16 path, 3 armor, 2 protection
- Required escapes: 5/10
- Lesson: "mud + heavy turret = death zone. plan around it or invest heavily"

### Level 11 — Cursed Ground

**New**: Cursed ground terrain (1 damage per tick while standing on it)

Cursed ground deals passive damage to units walking over it — no turret needed. It's a "soft wall" that the player CAN route through but at a cost. Combined with turrets, it creates layered damage that forces creative routing.

- Turrets: 1 rapid
- Terrain: cursed ground strip, mud patch
- Walls: moderate
- Tiles: 18 path, 3 armor, 2 protection
- Required escapes: 6/10
- Lesson: "the floor itself can hurt you"

---

## Chapter 4: Traps

### Level 12 — Spike Corridor

**New**: Spike traps (burst damage when a unit steps on them)

Spike traps are pre-placed cells that deal a burst of damage (3) when a unit enters them. Unlike turrets, they hit once per unit and can't be avoided by being fast. The player can route around them or tank through with armor.

- Turrets: 1 rapid
- Traps: 3 spike cells
- Walls: corridor with branches
- Tiles: 16 path, 4 armor, 2 protection
- Required escapes: 6/10
- Lesson: "traps hit once but they hit everyone — route around them if you can"

### Level 13 — The Gauntlet

**New**: Spike + turret + mud combination

A proper puzzle. Mud zone under a turret on one path, spikes on the other. Neither path is free. The player needs to decide: which damage source can I mitigate better with my available tiles?

- Turrets: 1 rapid, 1 heavy
- Traps: 4 spike cells
- Terrain: mud patch
- Tiles: 18 path, 4 armor, 3 protection
- Required escapes: 5/10
- Lesson: "every path has a cost — find the cheapest one"

### Level 14 — Flame Jets

**New**: Flame jet traps (periodic burst, like turrets but ground-based)

Flame jets activate every N ticks and deal area damage to all units on them. Unlike spikes (one-hit), flame jets keep firing. Unlike turrets, they can't be blocked by armor positioning since the unit IS on the damage source. Protection tiles adjacent to flame jets are the counter.

- Turrets: 1 rapid
- Traps: 2 flame jets, 2 spike cells
- Terrain: mud near flame jet
- Tiles: 16 path, 3 armor, 4 protection
- Required escapes: 5/10
- Lesson: "flame jets keep firing — don't let your units sit on them"

---

## Chapter 5: The Deep Dungeon

### Level 15 — Warden's Hall

**New**: 3 turrets on one map (resource management)

Three turrets spread across a wide-open space with scattered walls. The player has lots of path tiles but limited defensive tiles. They must decide which turret zones get the armor and which they just run through and eat the damage.

- Turrets: 2 rapid, 1 heavy
- Traps: none
- Terrain: none
- Tiles: 22 path, 3 armor, 2 protection
- Required escapes: 5/10
- Lesson: "you can't protect everything — triage your defenses"

### Level 16 — The Maze

**New**: Complex wall layout with many routing options

Dense wall maze with 3+ viable paths through 2 turrets. Short paths are deadly, long paths use too many tiles. The puzzle is finding the right path that balances length, exposure, and tile cost.

- Turrets: 1 rapid, 1 heavy
- Traps: 2 spike cells
- Terrain: 1 mud patch
- Tiles: 20 path, 4 armor, 3 protection
- Required escapes: 5/10
- Lesson: "the best path isn't the shortest or the longest"

### Level 17 — No Mercy

**New**: Tight tile budget (real scarcity)

A seemingly simple layout but the player has barely enough path tiles to connect entrance to exit. Every tile must count. No room for detours. Defensive tiles must be placed perfectly.

- Turrets: 2 rapid, 1 heavy
- Traps: 2 spike cells
- Terrain: cursed ground strip
- Tiles: 14 path, 2 armor, 1 protection
- Required escapes: 4/10
- Lesson: "when tiles are scarce, every placement is life or death"

### Level 18 — The Final Escape

**New**: Everything combined, multiple solutions

The culmination. Every mechanic appears. 3 turrets, mud, cursed ground, spikes, flame jets. Multiple viable routes but none are safe. The player must use everything they've learned — routing, armor placement, protection placement, tile economy.

- Turrets: 2 rapid, 1 heavy
- Traps: 3 spike cells, 1 flame jet
- Terrain: mud patch, cursed ground
- Tiles: 22 path, 4 armor, 4 protection
- Required escapes: 4/10
- Lesson: "you've learned everything. now survive."

---

## Mechanic Introduction Order

| Level | New Mechanic | Turret Types | Terrain | Traps |
|-------|-------------|-------------|---------|-------|
| 1 | Path tiles, movement | — | — | — |
| 2 | Rapid turret | rapid | — | — |
| 3 | Routing choices | rapid | — | — |
| 4 | Armor tiles | rapid | — | — |
| 5 | Overlapping ranges | rapid ×2 | — | — |
| 6 | Heavy turret | heavy | — | — |
| 7 | Protection tiles | heavy + rapid | — | — |
| 8 | Mixed arms tactics | rapid + heavy | — | — |
| 9 | Mud terrain | rapid | mud | — |
| 10 | Mud + heavy synergy | heavy + rapid | mud | — |
| 11 | Cursed ground | rapid | cursed + mud | — |
| 12 | Spike traps | rapid | — | spikes |
| 13 | Combination puzzle | rapid + heavy | mud | spikes |
| 14 | Flame jets | rapid | mud | flame + spikes |
| 15 | Resource management | rapid ×2 + heavy | — | — |
| 16 | Complex routing | rapid + heavy | mud | spikes |
| 17 | Tight budget | rapid ×2 + heavy | cursed | spikes |
| 18 | Everything | rapid ×2 + heavy | mud + cursed | spikes + flame |

---

## Difficulty Curve Philosophy

- **Levels 1-4**: One new thing per level, generous budgets, high survival thresholds (7-8/10). The player should win every level on first or second try.
- **Levels 5-8**: Combinations begin. Budgets tighten slightly. Thresholds drop to 6/10. Some retry expected.
- **Levels 9-11**: Terrain adds a new axis. The player must think about unit SPEED, not just HP. 5-6/10 threshold.
- **Levels 12-14**: Traps add unavoidable damage. Routing becomes about choosing which damage to accept. 5/10 threshold.
- **Levels 15-18**: Everything together. Real puzzles. 4-5/10 threshold. Multiple attempts expected. Victory feels earned.
