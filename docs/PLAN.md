# idleVaction — Master Plan Index

**From a cold, damp, soggy Dutch bus stop to a private island.** A player-directed idle
game (not a clicker) built to run on **GitHub Pages** with **no dependencies**, **localStorage**
saves, and **one CDN CSS framework** (Spectre.css). No monetization, ~**20 active hours** to the
summit, fully **tweakable** pacing.

> **Scale of this plan:** **30 epics × 10 stories × 10 tasks = 3,000 tasks**, all written out
> in `docs/epics/epic-01.md … epic-30.md`. (~85,000 words of detailed backlog.)

---

## How to read this plan

| Agile term | In this game | Where |
|---|---|---|
| **Phase / Epic** | A themed stage of the journey (30) | `docs/epics/epic-NN.md` |
| **Feature / Story** | A shippable slice of player value (10 per epic) | `E##-S#` |
| **To-do / Task** | A concrete build step (10 per story) | `E##-S#-T#` |

Full conventions: **[`docs/06-plan-format.md`](06-plan-format.md)**.

## Foundation documents (read these first)

1. **[`00-architecture.md`](00-architecture.md)** — vanilla ES-module architecture, file layout, game loop, save schema, offline model, GitHub Pages deployment, the "Spektrum" → Spectre.css decision.
2. **[`01-math-foundation.md`](01-math-foundation.md)** — the multi-level tier ladder, cost/production formulas, the multiplier stack (additive-within / multiplicative-across), Comfort, skills, paths, prestige — **with worked numeric examples**.
3. **[`02-storyline.md`](02-storyline.md)** — the ≥30-beat **branching** storyline (Traveler / Vlogger / Crypto / Connoisseur), reconverging so every build finishes.
4. **[`03-epics-overview.md`](03-epics-overview.md)** — the **canonical 30-epic list** (the source rows the detail files expand) + the accommodation ladder + system-introduction map + story-slot template.
5. **[`04-ascension-and-skill-tree.md`](04-ascension-and-skill-tree.md)** — ascension loop, Legacy currency, the permanent **physique/character** skill tree, second prestige layer.
6. **[`05-balancing-and-pacing.md`](05-balancing-and-pacing.md)** — the 20h pacing contract, the 12 tuning levers, the balance harness, softcaps, the fun-cadence spec, the BigNumber swap, and the **honest prototype balance status**.
7. **[`06-plan-format.md`](06-plan-format.md)** — the agile mapping & per-file structure.

## The 30 epics (phases)

| # | Epic | Stage / new system | Detail |
|---|---|---|---|
| 01 | Soggy Departure | core loop, cash, tier D1 | [epic-01](epics/epic-01.md) |
| 02 | The Bug-Infested Motel | amenities + Comfort | [epic-02](epics/epic-02.md) |
| 03 | The Roadside Hostel | social tiers, NPCs, bulk-buy | [epic-03](epics/epic-03.md) |
| 04 | The Backpacker Circuit | travel/destinations, path seeds | [epic-04](epics/epic-04.md) |
| 05 | One Star, Big Dreams | accommodation ladder, upgrades | [epic-05](epics/epic-05.md) |
| 06 | Continental Comforts | Comfort global multiplier | [epic-06](epics/epic-06.md) |
| 07 | Making a Splash ⭐ | the **POOL** — fun-showcase small wins | [epic-07](epics/epic-07.md) |
| 08 | Sun, Sand & Service | beach resort, service tiers | [epic-08](epics/epic-08.md) |
| 09 | Charm Offensive | skills I — Charisma & Communication | [epic-09](epics/epic-09.md) |
| 10 | Body & Soul | skills II — tan/fitness/spa | [epic-10](epics/epic-10.md) |
| 11 | Five-Star Frame of Mind | 5-star + concierge automation | [epic-11](epics/epic-11.md) |
| 12 | Lights, Camera, Clout | **Vlogger** path — Clout + combo | [epic-12](epics/epic-12.md) |
| 13 | Money Works While You Tan | **Crypto** path — passive + markets | [epic-13](epics/epic-13.md) |
| 14 | Acquired Taste | **Connoisseur** path — Taste/exclusivity | [epic-14](epics/epic-14.md) |
| 15 | Keys to the Coupe | logistics I — cars | [epic-15](epics/epic-15.md) |
| 16 | Sea Legs | logistics II — boats/yachts | [epic-16](epics/epic-16.md) |
| 17 | Wheels Up | logistics III — private jets | [epic-17](epics/epic-17.md) |
| 18 | The Sail-Shaped Hotel | 6-star ultra-luxury | [epic-18](epics/epic-18.md) |
| 19 | At Your Service | staff I — the butler / automation | [epic-19](epics/epic-19.md) |
| 20 | The Whole Household | staff II — full household | [epic-20](epics/epic-20.md) |
| 21 | Seven Stars | 7-star + exclusivity + reconvergence | [epic-21](epics/epic-21.md) |
| 22 | A Bungalow of One's Own | owned property begins | [epic-22](epics/epic-22.md) |
| 23 | Villa Vita | private villa + grounds + estate staff | [epic-23](epics/epic-23.md) |
| 24 | Where the Rich Hide | exclusive-destinations meta-game | [epic-24](epics/epic-24.md) |
| 25 | Letting Go | **ascension I** — Legacy | [epic-25](epics/epic-25.md) |
| 26 | Who You Become | permanent **skill tree** | [epic-26](epics/epic-26.md) |
| 27 | The Island Listing | buy the **private island** | [epic-27](epics/epic-27.md) |
| 28 | Building Paradise | develop the island / host guests | [epic-28](epics/epic-28.md) |
| 29 | Empire of Leisure | prestige layer 2 (Legend) + NG+ | [epic-29](epics/epic-29.md) |
| 30 | Legends of Leisure | endgame, achievements, **20h fit**, release | [epic-30](epics/epic-30.md) |

## The runnable prototype (proof the foundation works)

A vertical slice implementing the core of the above lives at repo root and **runs today**:

- `index.html` + `css/game.css` + `js/**` — vanilla ES modules, Spectre.css from CDN, no build.
- Implements: the tick loop, 8-tier income ladder, amenities/Comfort, the 5 skills, 4 paths,
  the 30 story beats with the branch choice, accommodation ladder, **ascension + Legacy + the
  permanent skill tree**, **offline progress**, save/load/export/import/migrate, a **GAME_SPEED**
  pacing control, a debug/grant panel, and an optional clicker.
- **Run it:** `npm run serve` then open `http://localhost:8080` (or push to GitHub Pages).
- **Verify the math headlessly:** `npm test` → runs `js/dev/selftest.mjs` (the balance harness),
  which prints the story-beat time curve and asserts economy growth, ladder climb, ascension,
  tree, save round-trip, and offline correctness. Currently **all pass**.

> The prototype is a *foundation demo*, not a finished balanced build — see the honest
> **§9 balance status** in `docs/05`. Exact 20h tuning is E30, with the harness already in place.

## Design pillars (traceability)

- **Player-directed, not a clicker** → paths + skills + amenities are all optional focuses; the
  clicker only feeds combo & a tiny trickle (never the fastest path). *(E04, E09–E14; `engine.click`)*
- **Small win every turn** → hundreds of cheap amenities on a ~45–90s cadence. *(E02, E07, E08, E10; `docs/05 §5`)*
- **Multi-layered upgrades** → milestones · per-tier upgrades · paths · skills · Comfort · ascension · tree. *(`docs/01 §3`)*
- **Ascension + permanent skill tree** → physique/character changes that persist. *(E25, E26; `docs/04`)*
- **Solid, balanced, tweakable math** → every number in `config.js`; harness fits the curve. *(`docs/01`, `docs/05`)*
- **No monetization, ~20h, adjustable pacing** → generous offline + `GAME_SPEED` + debug panel. *(`docs/05 §8`)*
