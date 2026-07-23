# 08 — The Living-World pass (12 points)

**Goal:** the fitted economy is the *foundation* (pinned, guarded, never silently moved).
This pass layers the genre's missing *life* on top — variance, timing decisions, constrained
replays, generosity, compare-pressure, juice — and validates every layer with **multiple
simulated test runs** (the scenario/persona instruments from `js/dev/scenarios.mjs`).

Where the list comes from: the reference-game comparison (Egg Inc, Antimatter Dimensions,
Idle Slayer, Progress Knight). What they all have that idleVaction still lacks after the
Phase A–F/audit work: **lumpy, felt moments** (windfalls, surges, jackpots), **timing/choice
decisions inside a run**, **constrained replay variety**, **generous returns**, **a rival to
pace against**, and **sound**.

## The doctrine (how this coexists with "the harness never moves")

1. **Foundation pins stay bit-identical.** Every mechanic lands **neutral-by-default**
   (rate 0 / off / opt-in), exactly like Phase C's mechanism commits — `npm test` goldens
   (greedy island 39440s ±1, casual-tourist 76800s ±1200, parity, plateau) must pass
   untouched after every wave.
2. **One coordinated flip.** A single balance wave (the `@balance-tuner`) turns the knobs
   on, fits them with scenario sweeps across **multiple seeds**, re-pins the goldens **once**
   (the Phase-C precedent), and adds **band instruments** so the living layer is guarded the
   same way the foundation is:
   - *quiet* runs (living layer off) keep the old bit-identical pins — the foundation;
   - *living* runs (default player experience) are pinned to **bands**, not bits:
     greedy-living island within 0.90–1.02× of quiet; casual-living inside 18–23h;
     booster persona ≤ +12% over casual; every challenge completable; plateau holds.
3. **Determinism is non-negotiable.** All randomness uses the seeded cursor rng
   (`util.rng`, the crypto-market pattern): offline replay == online, saves reproduce.

## The 12 points

| # | Point | Steals from | Mechanic | Neutrality class |
|---|---|---|---|---|
| 1 | **Trip Events** (serendipity deck) | Idle Slayer's portals, Egg Inc's events | Seeded scheduler (marketTick pattern) draws bounded, timed, global flavor events (Happy Hour ×N for 90s, windfalls sized by wallet room, tap-power windows, destination-sale windows) every ~6–12 min after beat 3. | `EVENTS.rate 0` ⇒ scheduler never draws; settings toggle; quiet instruments run events-off |
| 2 | **The Golden Goat 🐐** | Egg Inc's drones | The recurring goat wanders across the screen (rare event type); tapping it pays a bounded windfall + flavor. Untapped = wanders off, no loss. | Requires a tap — the harness never taps (E10 contract) |
| 3 | **Vacation Weather** | world-texture (Egg Inc day/night) | Seeded ambient weather (sunny/cloudy/showers/heatwave/golden-hour) shown as a HUD chip + sky tint; **income-neutral by construction** — weather only biases which events roll and flavors tap/energy, never the income stack. | Display + event-mix only |
| 4 | **Sunscreen Boosts** | Egg Inc's boosts | Player-fired timed multipliers with game-time cooldowns (Splash Out ×3 income / Deep Focus ×5 skill XP / Camera Day ×3 clout), all through one shared timed-effects registry with a hard product cap. | Never auto-fired; harness never fires them |
| 5 | **Splurge Moments** | Progress Knight's allocation choices | Occasional two-option choice cards (spend a wallet fraction for a timed × vs bank a Comfort/path chunk); expire quietly if ignored — ignoring is always the neutral baseline. | Choice-gated; expiry = no-op |
| 6 | **Souvenir Stand** | Egg Inc's generosity | Wallet overflow (today: pure `overflowLost`) and first destination visits mint **souvenirs** — a capped keepsake currency that survives ascension; spent on a shelf of cosmetics + tiny capped perks (`L_souvenir ≤ ×1.25`). Away time is never worthless again. | Minting is passive but spendings are opt-in; layer ×1 until bought |
| 7 | **Ascension Challenges** | Antimatter Dimensions' challenges | From ascension 1: optionally embark with one handicap (Rainy Season: Comfort effect halved · Lost Luggage: amenities ×3 cost · Budget Airline: wallet caps halved · Cash Only: Savvy+crypto off · Skeleton Crew: no concierge/staff). Completing (reach a target tier that life) mints a permanent Keepsake perk (one bounded `L_keepsake` layer, ≤ ×1.3 total). | Opt-in at ascend; run 1 untouched |
| 8 | **Legacy Honeymoon** | every reference game's lumpy prestige | Ascending grants "the Inheritance High": a decaying income surge (starts ~×4, fades over ~12 game-min) through the same effects registry — prestige *feels* explosive while the plateau invariant still holds. | Post-ascension only; run-1 goldens untouched |
| 9 | **Trophy Road** | AD's achievement multiplier | The 57 in-run trophies stop paying 0: a new bounded `L_trophy = 1 + min(cap, Σ small rewards)` layer (separate from meta `L_achieve`). **This is the one deliberate golden-mover** — sized and re-pinned in the balance wave. | Golden-mover (re-pin once) |
| 10 | **Petra, the Pace Ghost** | racing ghosts / PK's visible ladder | A rival NPC whose itinerary is the casual-tourist golden curve baked as data; the UI shows "Petra reached the 2-star at 4h07m — you're 12m ahead ✈️" + a toast when you pass her. Regenerated by a dev tool whenever the casual golden re-pins. | Display-only |
| 11 | **Postcards Home** | community share culture | One-tap copyable postcard (emoji text block: trip day, tier, magnitude, path, trophies, goats greeted) + a gentle no-penalty day-streak stamp. | Display-only |
| 12 | **The Sound of Summer** | Egg Inc / Idle Slayer juice | Dependency-free WebAudio synth (`js/audio.js`): buy blip, milestone chime, tier-up fanfare, goat bleat, event jingle, ascension swell. Volume + mute in settings; autoplay-policy safe. | Cosmetic |

## Delivery waves (each commits with goldens green)

- **W1 — infrastructure:** timed-effects registry (shared by 1/4/5/7/8) + Trip Events
  scheduler + Weather + Goat, all rates 0/off. Offline replay parity tests.
- **W2 — player agency:** Sunscreen Boosts + Splurge Moments on the registry, neutral.
- **W3 — meta loop:** Souvenir Stand + Ascension Challenges + Legacy Honeymoon, neutral.
- **W4 — presentation:** Trophy Road plumbing (rewards 0), Petra ghost, Postcards, audio.
- **W5 — the flip (@balance-tuner):** turn all knobs on, fit with multi-seed scenario
  sweeps, size Trophy Road, re-pin goldens once, land the band instruments, update
  docs/05 §9 + math-proof appendix. Reviewed on the **simulation dashboard**
  (`docs/09-sim-dashboard.md`, `npm run report` → `tools/dashboard/`): quiet-vs-living
  runs across seeds, per-tier deviation vs the pre-flip baseline, band verdicts — then
  regenerate the committed sample report and the `GOLDEN` block in the same commit as
  the re-pin.
- **W6 — verification (@verifier):** full suite + harness + demo sweep + Verified-commit
  check, fix what surfaces, push.

## Safety classes (why nothing here can run away)

Every new income effect is one of: a **timed flat ×** with a hard product cap and a
duration bound (events, boosts, honeymoon, splurges); a **capped additive layer** over a
finite roster (souvenirs ≤ ×1.25, keepsakes ≤ ×1.3, trophies ≤ cap); or **display-only**
(weather, ghost, postcards, sound). None is a positive power of cash — the same safe
classes as `L_dest`/`L_amenity` (docs/math-proof.md §3/§4). All schedulers are seeded,
cursor-based, and advance in game-time only.
