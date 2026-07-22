# idleVaction 🏝️

Bored at the poolside, have a companion! Help your companion traveler in this epic idle
adventure along its holiday route. From bug-infested motels, to lush luxurious 7-star villas
and private islands. How far can you make it?

You start as a broke, perpetually-drizzled-on tourist from the cold, damp, soggy Netherlands —
armed with a poncho, a stroopwafel, and irrational optimism — and claw your way up the entire
ladder of human vacation luxury to your **own private island**, upgrading everything: where you
sleep, how you travel, your body, your charm, and eventually the staff who cater to your every whim.

It's a **player-directed idle game** (not a clicker): you choose what to focus on and which
direction to grow — a simple world traveler, a luxurious vlogging backpacker, a crypto poolside
lounger, an old-money connoisseur, or any blend. No monetization, no forced waits, ~20 active
hours to the summit, and fully adjustable pacing.

---

## 📐 The plan

The full design + implementation plan is in **[`docs/PLAN.md`](docs/PLAN.md)** — an agile backlog
of **30 phases (epics) × 10 features (stories) × 10 to-dos (tasks) = 3,000 tasks**, plus the
foundation docs:

- **[Architecture](docs/00-architecture.md)** — vanilla ES modules, GitHub Pages, localStorage, no deps, Spectre.css.
- **[Math foundation](docs/01-math-foundation.md)** — the multi-level tier ladder, multiplier stack, Comfort, prestige — with worked examples.
- **[Storyline](docs/02-storyline.md)** — the ≥30-beat branching narrative (Traveler / Vlogger / Crypto / Connoisseur).
- **[Epics overview](docs/03-epics-overview.md)** — the canonical 30-epic list.
- **[Ascension & skill tree](docs/04-ascension-and-skill-tree.md)** — reset-for-power + permanent physique/character nodes.
- **[Balancing & pacing](docs/05-balancing-and-pacing.md)** — the 20h contract, tuning levers, the balance harness.

## ▶️ The prototype (it runs today)

A vertical slice of the design lives at the repo root — vanilla JS, one CDN stylesheet, no build:

```bash
# play it locally
npm run serve      # then open http://localhost:8080
#   (or just push to GitHub Pages — it's all static files)

# verify the economy headlessly
npm test           # js/dev/selftest.mjs → asserts (basics, run, ascension, save, offline)
npm run harness    # js/dev/harness.mjs → prints the pacing curve (greedy ROI island ≈ 8h15m,
                   #   a hard lower bound — casual/idle play lands the ~20h arc)
```

It implements the core loop: the 8-tier income ladder, amenities + Comfort, five personal-growth
skills, four build paths, the 30 story beats with the branching choice, the accommodation ladder
(shed → island), **ascension + Legacy + the permanent skill tree**, generous **offline progress
bounded by the bank-account wallet** (upgrade your account — Soggy Money Belt to Platinum Plus
Ultra and beyond — to hold more; away income fills the wallet instead of leapfrogging the game),
save/load/export/import with versioned migration, a **speed control** for pacing/testing, a debug
panel, and an optional clicker (for small between-tick gains — never the fastest path).

> The economy is **fitted to the ~20-hour target**: the greedy-optimal ROI harness lands the
> Private Island at **~8h15m** — a hard lower bound, so casual/idle play is ~20h+ — with the
> story beats spread monotonically across the run and cash magnitude kept safely inside
> `double`. Every balance number lives in `js/config.js`. Getting here meant finding and
> fixing a finite-time singularity **and** an unbounded offline-income lump — the full
> investigations are in [`docs/math-proof.md`](docs/math-proof.md) (§1–§6, §11); the
> golden curve and remaining polish (even gate spacing, playtest) are in `docs/05 §9`.

## 🗂️ Repo layout

```
index.html            # entry (Spectre.css CDN + our ES modules)
css/game.css          # our styles (framework-agnostic)
js/                   # config · util · math · state · engine · prestige · ui · main + data/*
js/dev/selftest.mjs   # headless balance harness / test suite
docs/                 # the full 3,000-task plan + foundation docs
```

No runtime dependencies. `package.json` (`type: module`) exists only for local tooling
(`node --check`, `npm test`); GitHub Pages ignores it and serves the static files directly.
