# 06 — Plan Format (Agile mapping)

The plan is expressed in agile terms, mapped to this game:

- **Phase = Epic** — a themed chunk of the journey (30 total, `docs/epics/epic-NN.md`).
- **Feature = Story** — a shippable slice of player-facing value (10 per epic).
- **To-do = Task** — a concrete engineering/design/content step (10 per story).

**Totals:** 30 epics × 10 stories × 10 tasks = **3,000 tasks**.

## ID scheme

- Epic: `E##` (E01…E30).
- Story: `E##-S#` (S1…S10).
- Task: `E##-S#-T#` (T1…T10).

## Per-epic file structure (every `epic-NN.md` follows this)

```
# E## — <Epic Title>
> Journey stage · Accommodation tier · New system(s) · Story beats · Build-path emphasis

**Epic goal:** 1–2 sentences.
**Player-visible outcome:** what's newly possible after this epic.
**Systems touched:** which modules/data (generators, amenities, skills, story, prestige…).
**Math/balance notes:** the key constants/curves this epic introduces or tunes.

## E##-S1 — <Story Title>
_As a <who>, I want <what>, so that <why>._  <one-line value statement>
- **E##-S1-T1** — <task> — <short description of the concrete work>
- … T2…T10
(repeat S1…S10)

## Definition of Done (epic)
bullet checklist.
```

## Content conventions

- Tasks are a healthy mix of **engineering** (data, formulas, save, UI wiring),
  **content** (story text, amenity flavor, upgrade names), **balance** (constants, harness
  runs), and **QA** (tests, edge cases). A good story has all four kinds across its 10 tasks.
- Every task description says *what* and *why/how*, not just a noun.
- Numbers reference the constants in `config.js` (e.g. "set `GEN.growth[3]=1.10`") so the plan
  stays consistent with `docs/01`/`docs/05`.
- Later epics may reference earlier IDs as dependencies.

## How this maps to delivery

Epics are roughly release-sized. A sensible shipping order = epic order, but the engine
(E01–E03 core) unlocks most systems early so later epics are largely **content + tuning + one
new system each**, which is why 3,000 tasks is realistic rather than 3,000 hard problems.
