# 04 — Ascension & the Permanent Skill Tree

Ascension is the "reset for permanent power" loop that gives an idle game its long tail.
Ours is themed as **shedding your old self** — each reset is a *new trip, wiser and more
transformed than the last*. The permanent tree is literally **who you become**: physique and
character changes that stick across every future vacation.

---

## 1. The loop at a glance

```
   play a run ──► accumulate lifetimeCash & Comfort ──► ASCEND
        ▲                                                  │
        │                                                  ▼
   start fresh run  ◄── spend Legacy on permanent  ◄── earn Legacy (sqrt of run)
   (but permanently  Skill Tree (physique/character)
    stronger)
```

- **Reset each ascension — a HARD reset, everything restarts at 0:** cash, comfort,
  generators (including their lifetime-cash reveal thresholds), amenities, accommodation,
  run-skill levels, path points, the bank-account ladder, destinations, crypto,
  concierge, **story** (beats/branch/flags — you re-live the trip and may pick a
  different path), and **all run stats including `lifetimeCash`** (so Savvy's
  `√lifetimeCash` passive re-paces from zero).
- **The ONLY things that cross an ascension:** the abilities bought with ascension
  points — `ascension.tree` + the unspent **Legacy** itself (plus **Legend**, Epic 29's
  second layer, when it ships) — and non-power bookkeeping: settings, meta timestamps,
  and the gate-deflated `lifetimeCashThisTree` accounting counter. "Later runs feel
  plusher" flows ONLY through tree abilities (Ageless, Magnetic, Head Start…), never
  through the ascension count itself — the old `×(1+0.25·count)` Comfort bonus is gone.
- **Ascended runs are re-paced, not re-trivialized** (`docs/math-proof.md §12`): phase
  gates cost `×base^(√count·(tier/span)²)` (`config.ASCEND_GATE`) — early tiers barely
  scale (a fresh ascension feels powerful), the island carries the full factor. Fitted:
  every ascension ≥ **8h**, on the Phase-C flat plateau (measured runs 1–3: 10h56m → 10h13m → 9h34m — runs 2+ hold 0.85–1.10× run 1; the pre-refit arc for the record: 8h37m, 9h13m,
  10h08m, 10h37m, 11h18m, 11h30m).

## 1b. Retirement & the Lineage (the narrative frame for ascension)

Ascension is presented as a **retirement**: the named character you played retires where
their run ended, and you choose to continue as their **son, daughter, or heir** — named
by you — starting from nothing. Over many ascensions this builds a **family lineage**
across generations. (Design amendment; task breakdown in `docs/epics/epic-25.md` §E25-A.)

Why this frame is *mechanically honest* — every hard-reset rule above becomes diegetic:

| Mechanic (already shipped) | Fiction |
|---|---|
| HARD reset — cash/skills/story/bank all restart at 0 | A new **person**: the child has no money, no reputation, no tan, and hasn't lived the story yet |
| Story re-fires; the branch is re-chosen each run | The child re-lives the journey **their own way** — a vlogger's daughter may become a connoisseur |
| Only tree abilities cross (`ascension.tree`) | **Upbringing** — what the family actually passes down (Ageless = good genes, Magnetic = the family charm, Head Start = born in a better hotel, Silver Tongue = raised haggling) |
| Legacy currency (√ payout) | The **inheritance** — literally named Legacy since E25 |
| Phase gates rise `×base^(√count·…)` | **The family bar rises** — each generation aims higher than the last; the shed is still cheap, the island expects more |
| The wallet-cap ladder resets | The heir opens their own first bank account (Soggy Money Belt, again) |
| E29 Legend layer (resets Legacy + tree) | A **dynasty** ends; a new family name begins |

**Design rules (binding):**
1. **Cosmetic-only.** Son/daughter/heir and names change flavor text and pronouns ONLY —
   never a stat, cost, or multiplier. Anything mechanical must stay a tree ability, or it
   violates the §1 hard-reset contract (and couples narrative choice to balance).
2. **The lineage album is bookkeeping, not power.** `state.lineage` (current character +
   a capped album of retired ones: name, pronoun, generation, branch lived, peak tier,
   run length, epitaph) joins settings/meta on the ascension keep-list — it must never be
   read by `math.js`/`engine.js` income paths, and the selftest [86] keep-list audit
   extends to assert exactly that.
3. **Retirement is wherever the run ended.** Retiring ON the island is the completed
   life; retiring earlier is recorded honestly in the epitaph ("made it to the 3-star
   pool; never doubted the poncho"). No penalty either way — the album celebrates, never
   scolds.
4. **Names are player text.** Length-capped, markup-stripped, skippable — a wry Dutch
   default-name pool (Willem has been waiting since the bank flavor) fills the gap.

## 2. When can you ascend?

- **First unlock:** story beat 26 ("Letting Go"), which triggers once the player crosses the
  ascension **ROI break-even** (`legacyGain ≥ 1` and run age ≥ a floor so nobody ascends by
  accident). Before that the option is hidden.
- **After that:** any time. The UI shows a live "**ascend now → +N Legacy**" readout and an
  **ROI hint** ("optimal ascension ≈ 45 min from now at current growth").

## 3. Legacy earned (the prestige curve)

```
legacyGain(run) = floor( LEGACY_K · sqrt( lifetimeCashThisTree / LEGACY_SCALE ) ) − legacyBanked
```

- Square-root (`^0.5`) is the genre-standard anti-runaway curve: **4× the run → 2× the
  reward**, so ascending is always worthwhile yet self-limiting.
- `lifetimeCashThisTree` accumulates across ascensions until a *Legend* reset (layer 2)
  — credited in **run-1-equivalent (gate-deflated) cash**: `engine.gainCash` adds
  `banked / base^(√count)` (`math.ascCashNorm`), so the ascension gate's price inflation
  can never feed back into the Legacy payout. Every run contributes ~equal weight and
  total Legacy follows the designed **√N** arc (`docs/math-proof.md §12.3` measured the
  snowball this prevents).
- Tunables: `LEGACY_K` (payout scale), `LEGACY_SCALE` (how much run-1-equivalent cash
  per Legacy), and the exponent (`0.5` default; `0.55–0.6` for faster tails).

**Worked example:** `LEGACY_K=1, LEGACY_SCALE=1e10` (retuned from `1e6` with the hard
reset — at `1e6` the fitted ~8.5h run paid ~1,183 Legacy, i.e. 56 of the tree's 79 total
ranks in one go, see `docs/math-proof.md §12.1`).
- The fitted first run banks `≈1.4e12` → `sqrt(1.4e12/1e10)=sqrt(140)≈11.8` → **+11
  Legacy** — two or three rank-1 abilities. The tree is a many-ascension arc, metered by
  the geometric node costs, not a single jackpot.
- Four such runs → `sqrt(560)≈23.7` total → each doubling of runs ~×1.4 the total. Good stretch.

## 4. The permanent Skill Tree

A directed tree of nodes; each node has ranks; ranks cost Legacy geometrically:
`costLegacy(rank) = nodeBase · nodeGrowth^rank`. Nodes are grouped into **branches that mirror
the fantasy of self-transformation**:

### 4.1 PHYSIQUE branch (body/appearance changes that persist)
| Node | Effect / rank | Flavor |
|---|---|---|
| **Sun-Kissed** | `L_tree` Comfort ×1.15 | permanent tan; you photograph better |
| **Iron Constitution** | offline cap +2h; energy regen +20% | you can lounge longer |
| **Athlete's Frame** | Body XP gain +25%; clicker gain +15% | fitness compounds |
| **Ageless** | run starts with Body pre-leveled +5/rank | you never fully reset your health |
| **Golden Ratio** | exclusivity `×` +10% (Connoisseur synergy) | classical good looks open doors |

### 4.2 CHARACTER branch (personality/mind changes that persist)
| Node | Effect / rank | Flavor |
|---|---|---|
| **Silver Tongue** | all costs −3% (stacks w/ Communication, capped) | you talk down every price |
| **Magnetic** | run starts with Charisma pre-leveled; Clout ×1.1 | people gravitate to you |
| **Compounding Interest** | `L_ascension` income ×1.10 | wisdom pays dividends |
| **Wanderer's Instinct** | destinations −20% cost; +1 transport slot | you always know the good spots |
| **Unshakeable** | crypto market crashes hurt −50% | nothing rattles you |

### 4.3 META branch (the loop itself)
| Node | Effect / rank | Flavor |
|---|---|---|
| **Faster Metabolism** | milestone step 10→9→8… | doublings come sooner |
| **Legacy Investor** | `legacyGain` ×1.15 | each trip teaches you more |
| **Head Start** | begin run at accommodation tier +1/rank | skip the shed eventually |
| **Second Wind** | first N minutes of a run ×5 income | fast openings |
| **Jack of All Trades** | open +1 extra path per rank after committing (max 3 → all four roads) | one life, many trades — the earned exception to one-road-per-life |

**Jack of All Trades — the earned path-mixing exception.** The committed-path contract
(`docs/01 §5`: one road per life, chosen at the beat-6 crossroads, nudges/focus no-op
elsewhere) is deliberately absolute for early lineages; this node is the ONLY way to mix
roads within one life. Each rank lets a committed run **open** one extra path — claimed
by the first Focus purchase into it (a stray nudge can never spend the slot) — after
which that side-road earns points, walks its own staged track, and stacks its unique
stage bonuses alongside the primary's. Depth by construction: prerequisites span **all
three branches** (`sun_kissed:1` + `silver_tongue:1` + `legacy_investor:1` = 15 Legacy)
plus its own 5/10/20 rank costs — ~20 Legacy minimum against the metered ~11.8·√N arc,
i.e. around **ascension 3** for a dedicated saver, 4–5 for a spread build, never run 1.
The primary crossroads stays single (Jack adds side-roads, never a second story voice),
the cross-path hybrid flavors (travel-vlog & co.) become its cosmetic payoff, and the
stage-bonus layer stays bounded (at rank 3 the ceiling is the fixed sum of all four
data tracks — `docs/math-proof.md §13`).

Nodes gate one another (`requires: ['sun_kissed>=3']`) so the tree has meaningful order and
respec-worthy decisions. **Respec** allowed for a Legacy fee (or free before layer-2 unlock)
so builds stay experimental.

## 5. Interaction with build paths & branches

The persistent tree is **path-agnostic on purpose** — but several nodes deliberately synergize
with a branch (Golden Ratio↔Connoisseur, Magnetic↔Vlogger, Unshakeable↔Crypto, Wanderer's
Instinct↔Traveler). This lets a player **lock in an identity across resets** while still being
free to re-spec their in-run path. Physique/character changes are also reflected in **story
flags** — e.g. `tree.sun_kissed>=1` unlocks a cosmetic "bronzed" descriptor and an alternate
line in beat 12.

## 6. Second prestige layer — **Legend** (Epic 29, optional, late)

When a player has ascended many times, they may perform a **Legend reset**: wipe Legacy and the
tree for **Legend points** (same sqrt template, one level up:
`legendGain = floor(LEGEND_K · sqrt(totalLegacyEverEarned / LEGEND_SCALE))`). Legend buys a small
set of **meta-meta multipliers** (global `×`, cheaper tree, permanent GAME-lore unlocks) and
seeds **New Game+** (beat 30+), which raises all story gates and reshuffles destinations for
replay. Strictly optional and past the 20h main arc — it exists for the players who want 200h.

## 7. Balance guardrails

- No prestige layer may make a *fresh* run trivially skip content: **Head Start** and
  **Ageless** are ranked and capped so early beats still exist for narrative.
- Legacy multipliers feed `L_ascension` (one layer of the stack) — they multiply, but because
  everything is `sqrt`-gated the total stays inside `double` for the whole intended arc.
- All tree constants live in `config.TREE` — retuning the entire meta-game is a data edit.
