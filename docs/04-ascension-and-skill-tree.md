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

- **Run currencies** (reset each ascension): cash, comfort, generators, amenities,
  accommodation, run-skill levels, path points.
- **Meta currencies** (persist forever): **Legacy** (spent on tree), **Legend** (Epic 29
  second layer), unlocked story branches, stats.

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
- `lifetimeCashThisTree` accumulates across ascensions until a *Legend* reset (layer 2).
- Tunables: `LEGACY_K` (payout scale), `LEGACY_SCALE` (how much cash per Legacy), and the
  exponent (`0.5` default; `0.55–0.6` for faster tails).

**Worked example:** `LEGACY_K=1, LEGACY_SCALE=1e6`.
- Run reaches `lifetimeCash=1e9` → `sqrt(1e9/1e6)=sqrt(1000)=31.6` → **+31 Legacy**.
- Push to `1e10` → `sqrt(1e4)=100` → **+100 Legacy**. 10× the cash → ~3.2× the Legacy. Good stretch.

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
