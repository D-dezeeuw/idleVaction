# E26 — Who You Become
> Act III meta-loop · Tier n/a (persists across resets) · New system: `skilltree.js` (Physique / Character / Meta) · Story beat 27 (*Who You Become*) · Build-path emphasis: all (nodes synergize per branch)

**Epic goal:** Give Legacy a deep, permanent home — a three-branch skill tree of physique, character, and meta nodes that makes every future trip stronger and literally reshapes who the tourist is.
**Player-visible outcome:** A persistent, respec-able tree where Legacy buys ranked nodes (Sun-Kissed, Silver Tongue, Faster Metabolism…), with requires-gates, branch synergies, and tree→story flags.
**Systems touched:** `data/skilltree.js` (new), `prestige.js` (buy/respec/apply), `state.ascension.tree`, `math.js` (`L_tree`, `L_ascension`, `MILESTONE_STEP`), `data/story.js` beat 27 + tree flags, `config.TREE.*`, `ui.js`.
**Math/balance notes:** `costLegacy(rank)=nodeBase·nodeGrowth^rank`; node effects feed distinct stack layers (`L_tree` global `×`, `L_ascension` income `×`, `MILESTONE_STEP` 10→9→8); `requires:['sun_kissed>=3']` gates ordering; respec refunds `legacySpent` for a `TREE.respecFee` (0 before the Legend layer).

## E26-S1 — The Blueprint of a Better You (data model)
_As a player spending Legacy, I want every node's cost, effect, and prerequisites defined as clean data, so that the whole meta-game is a tunable table, not hard-coded logic._  A declarative node table makes the tree balanceable and moddable.
- **E26-S1-T1** — Node schema — Define the `skilltree.js` node shape `{ id, branch, name, flavor, nodeBase, nodeGrowth, maxRank, requires:[], effects:[{layer,scope,perRank}] }`.
- **E26-S1-T2** — Branch enum — Declare the three branches `PHYSIQUE`, `CHARACTER`, `META` with their display order and colors as data.
- **E26-S1-T3** — Physique node data — Enter Sun-Kissed, Iron Constitution, Athlete's Frame, Ageless, and Golden Ratio with the effects from `docs/04 §4.1`.
- **E26-S1-T4** — Character node data — Enter Silver Tongue, Magnetic, Compounding Interest, Wanderer's Instinct, and Unshakeable per `docs/04 §4.2`, folding E25's `compounding` into this table.
- **E26-S1-T5** — Meta node data — Enter Faster Metabolism, Legacy Investor, Head Start, and Second Wind per `docs/04 §4.3`.
- **E26-S1-T6** — Requires-gates — Author `requires` arrays (e.g. Golden Ratio `['sun_kissed>=3']`, Head Start `['legacy_investor>=1']`) so the tree has a meaningful order.
- **E26-S1-T7** — Effect-layer mapping — Tag each effect with its target layer: `L_tree` (Sun-Kissed, Golden Ratio), `L_ascension` (Compounding Interest, Legacy Investor), `MILESTONE_STEP` (Faster Metabolism), and run-seed (Ageless, Magnetic, Head Start, Second Wind).
- **E26-S1-T8** — Config.TREE constants — Move all per-node `nodeBase`/`nodeGrowth`/`maxRank` into `config.TREE` so retuning the meta-game is a data edit (per `docs/04 §7`).
- **E26-S1-T9** — Tree→story flag data — Define which node ranks set story flags (e.g. `tree.sun_kissed>=1 → flags.bronzed`, unlocking an alternate beat-12 line).
- **E26-S1-T10** — Content pass — Write all node names and wry Dutch flavor strings ("Iron Constitution — a stomach that survived that motel can survive anything").

## E26-S2 — Wiring Your Growth In (core logic / engine)
_As the engine, I want to buy, gate, respec, and apply node effects correctly, so that the tree reliably reshapes every run's math._  This is the rules engine that turns node data into permanent power.
- **E26-S2-T1** — costLegacy() — Implement pure `costLegacy(node,rank)=node.nodeBase·node.nodeGrowth^rank` in `math.js`.
- **E26-S2-T2** — buyNode() — In `prestige.js` write `buyNode(id)` that checks `requires`, checks `rank<maxRank`, debits `resources.legacy`, increments `ascension.tree[id]`, and re-applies effects.
- **E26-S2-T3** — requires-gate evaluator — Implement `meetsRequires(state,node)` parsing `'id>=n'` clauses against `ascension.tree`, returning locked/available.
- **E26-S2-T4** — Effect application pass — Write `applyTree(state)` that recomputes `L_tree`, `L_ascension`, `MILESTONE_STEP`, and run-seed values from current ranks; call it after buy, respec, ascend, and load.
- **E26-S2-T5** — MILESTONE_STEP override — Implement Faster Metabolism reducing the effective step 10→9→8… (floored, capped) and confirm `milestoneMult_k=2^floor(bought/step)` reads the overridden step.
- **E26-S2-T6** — Run-seed effects — Implement Ageless (start Body +5/rank), Magnetic (start Charisma pre-leveled), Head Start (start accommodation tier +1/rank), and Second Wind (first N minutes ×5), all applied during fresh-run reseed.
- **E26-S2-T7** — respec() — Implement `respec()` refunding all `legacySpent` back to `resources.legacy`, zeroing `ascension.tree`, charging `TREE.respecFee` (0 before Legend), and re-applying.
- **E26-S2-T8** — Cap & clamp — Enforce `maxRank` and clamp stacked effects (Silver Tongue against the cost floor, Second Wind duration) so nothing runs away.
- **E26-S2-T9** — Apply-on-load order — Ensure `applyTree` runs during load AFTER migration and BEFORE the first tick, so a loaded save immediately reflects tree power.
- **E26-S2-T10** — Purity & events — Keep cost/gate functions pure; emit `tree:changed` and `state:changed` on buy/respec so UI and story react from one signal.

## E26-S3 — The Constellation Screen (UI / buttons)
_As a player, I want to see my whole tree at a glance and buy ranks in one click, so that shaping who I become is legible and satisfying._  The tree screen makes the meta-game tangible.
- **E26-S3-T1** — Tree screen scaffold — Add a `#skillTree` view (Spectre.css cards/grid) with three branch columns, revealed by beat 27.
- **E26-S3-T2** — Node cards — Render each node as a card showing name, current rank/maxRank, next-rank cost, effect summary, and locked/available/maxed state.
- **E26-S3-T3** — Buy-rank buttons — Wire node buttons to `prestige.buyNode(id)` with a disabled state and reason when unaffordable or gated.
- **E26-S3-T4** — Requires visualization — Draw simple connector lines or "requires Sun-Kissed 3" badges so prerequisite order is obvious.
- **E26-S3-T5** — Effect tooltips — On hover/focus show current vs. next-rank effect ("Comfort ×1.15 → ×1.30") using `util.format`.
- **E26-S3-T6** — Legacy wallet header — Show available Legacy and total `legacySpent` at the top of the tree screen.
- **E26-S3-T7** — Respec button + modal — Add a Respec button with a confirm modal explaining the refund and any fee.
- **E26-S3-T8** — Branch synergy hints — Surface small "synergizes with Vlogger/Crypto/Traveler/Connoisseur" tags on the relevant nodes.
- **E26-S3-T9** — Keyboard & aria — Make node cards keyboard-focusable buttons with `aria` labels announcing rank and effect, per the accessibility floor.
- **E26-S3-T10** — Copy polish — Write branch headers ("Physique — the body you travel in / Character — the person you become / Meta — the trip itself") and tighten all UI strings to tone.

## E26-S4 — Becoming, Permanently (headline: the persistent, respec-able tree)
_As a returning player, I want my tree to persist across every reset and stay experimental via respec, so that "who I become" is a real, evolving identity._  The signature feature is a permanent, reshapeable self that outlives every trip.
- **E26-S4-T1** — Beat 27 unlock — Fire beat 27 (*Who You Become*) on the first ascension (`ascension.count≥1`), revealing the tree screen and explaining Legacy spending.
- **E26-S4-T2** — Persistence guarantee — Verify `ascension.tree` and its applied effects survive every ascension (it is meta), so the tree only ever grows.
- **E26-S4-T3** — Node detail panel — Build a focused detail panel (name, full flavor, per-rank table, requires, synergy, current effect) for the selected node.
- **E26-S4-T4** — Free early respec — Enable free respec before the Legend layer (E29) so players experiment; store `TREE.respecFee=0` until then.
- **E26-S4-T5** — Respec flow polish — Ensure respec refunds exactly `legacySpent`, resets all ranks, and instantly re-applies a zeroed tree without requiring an ascension.
- **E26-S4-T6** — First-spend coach-mark — On first tree open, add a one-time coach explaining branches, ranks, requires-gates, and respec.
- **E26-S4-T7** — "You've changed" story hook — When a milestone rank is bought (e.g. Sun-Kissed 1), surface a short narrative flourish tying the mechanic to the fantasy.
- **E26-S4-T8** — Tree-completion sense — Add a subtle progress readout ("14/19 nodes touched") so long-term players feel the tree filling in.
- **E26-S4-T9** — Harness exposure — Expose `buyNode`/`respec`/`applyTree` to `harness.js` so automated policies can invest Legacy optimally for pacing runs.
- **E26-S4-T10** — QA the persistence — Test buy → ascend → ranks/effects intact; respec → ascend → confirm zeroed; ensuring the tree never resets by accident.

## E26-S5 — The Physique Branch (permanent body — repurposed meta cluster)
_As a player, I want body-and-appearance nodes that make me tougher, tanner, and more photogenic forever, so that self-improvement is a mechanical throughline._  The Physique branch turns a soggy tourist into a bronzed, ageless one — permanently.
- **E26-S5-T1** — Sun-Kissed — Implement `L_tree` Comfort ×1.15/rank ("a permanent tan; you photograph better") and set its `nodeBase`/`nodeGrowth` in `config.TREE`.
- **E26-S5-T2** — Iron Constitution — Implement offline cap +2h/rank and energy regen +20%/rank, wiring into `OFFLINE_CAP` and the clicker energy system.
- **E26-S5-T3** — Athlete's Frame — Implement Body XP gain +25%/rank and clicker gain +15%/rank; verify it compounds with in-run Body leveling.
- **E26-S5-T4** — Ageless — Implement run-start Body pre-leveled +5/rank (a run-seed effect applied at reseed) so you never fully reset your health.
- **E26-S5-T5** — Golden Ratio — Implement exclusivity `×` +10%/rank (Connoisseur synergy) with its `requires:['sun_kissed>=3']` gate.
- **E26-S5-T6** — Per-rank tables — Set each node's `maxRank` and cost curve so the branch offers ~5–10 meaningful ranks before diminishing returns.
- **E26-S5-T7** — Story flags — Wire `sun_kissed>=1 → flags.bronzed` (the alternate beat-12 "bronzed" descriptor) per `docs/04 §5`.
- **E26-S5-T8** — Synergy validation — Confirm Golden Ratio's exclusivity boost actually multiplies the Connoisseur exclusivity layer, not a dead stat.
- **E26-S5-T9** — Balance pass — Tune Physique costs so a mid-game ascender can afford Sun-Kissed 1–2 on a first haul; log via harness.
- **E26-S5-T10** — Content + QA — Write flavor for all five nodes and test each effect end-to-end (buy → ascend → effect present in the new run).

## E26-S6 — The Character Branch (permanent mind — repurposed progression slot)
_As a player, I want personality nodes that make me a smoother, wiser, unrattleable traveler forever, so that my identity across resets is more than a tan._  The Character branch is the ordered spine of the tree, with the deepest requires-gates.
- **E26-S6-T1** — Silver Tongue — Implement all-costs −3%/rank (stacks with Communication, sharing the −60% clamp); "you talk down every price."
- **E26-S6-T2** — Magnetic — Implement run-start Charisma pre-leveled and Clout ×1.1/rank (run-seed + multiplier effect); Vlogger synergy.
- **E26-S6-T3** — Compounding Interest — Fold E25's seeded node in here as `L_ascension` income ×1.10/rank, ensuring the E25 rank data migrates cleanly.
- **E26-S6-T4** — Wanderer's Instinct — Implement destinations −20% cost/rank and +1 transport slot/rank; Traveler synergy.
- **E26-S6-T5** — Unshakeable — Implement crypto market crashes hurt −50%/rank, wiring into the market-event system; Crypto synergy.
- **E26-S6-T6** — Requires ordering — Author the branch's gate chain (e.g. Compounding `['magnetic>=1']`, Unshakeable `['compounding>=2']`) so the branch reads as a progression.
- **E26-S6-T7** — Discount-clamp interaction — Verify Silver Tongue + Communication jointly respect the −60% cost floor and never make purchases free.
- **E26-S6-T8** — Story flags — Wire a character flag (e.g. `magnetic>=2 → flags.charmer`) unlocking an alternate line in a social beat.
- **E26-S6-T9** — Balance pass — Tune Character costs/gates so the −3% and ×1.10 nodes feel strong but stay inside the multiply-across budget.
- **E26-S6-T10** — Content + QA — Write flavor for all five nodes and test the gate chain (a locked node cannot be bought; unlocking its prereq reveals it).

## E26-S7 — The Meta Branch & Branch Synergies (path / branch flavor)
_As a player, I want nodes that speed up the loop itself and lean into my chosen build, so that the tree lets me lock in an identity across resets while re-speccing my in-run path freely._  The Meta branch plus deliberate synergies make the tree path-agnostic yet identity-affirming.
- **E26-S7-T1** — Faster Metabolism — Implement `MILESTONE_STEP` 10→9→8…/rank (floored, capped e.g. at 6) so doublings come sooner; the dopamine accelerator.
- **E26-S7-T2** — Legacy Investor — Implement `legacyGain` ×1.15/rank so each trip teaches more; verify it multiplies the E25 payout formula.
- **E26-S7-T3** — Head Start — Implement run-start at accommodation tier +1/rank, ranked and capped per `docs/04 §7` so early beats still exist for narrative.
- **E26-S7-T4** — Second Wind — Implement first-N-minutes-of-a-run ×5 income/rank as a decaying run-seed buff for fast openings.
- **E26-S7-T5** — Meta gates — Author Meta `requires` (e.g. Head Start `['legacy_investor>=1']`) and the guardrail caps that keep fresh runs from trivially skipping content.
- **E26-S7-T6** — Synergy tagging — Formalize the four intended synergies (Golden Ratio↔Connoisseur, Magnetic↔Vlogger, Unshakeable↔Crypto, Wanderer's Instinct↔Traveler) as data-driven tags surfaced in the UI.
- **E26-S7-T7** — Path-agnostic proof — Confirm every branch of the tree is useful to every build path (no node is dead for a given branch) via a coverage check.
- **E26-S7-T8** — Identity-across-resets — Verify a player can keep a synergy identity (e.g. always buy Magnetic) while re-speccing in-run path points freely, per `docs/04 §5`.
- **E26-S7-T9** — Balance the guardrails — Tune Head Start/Ageless caps so narrative beats 1–10 still trigger on a fresh, heavily-invested run (harness beat-gate check).
- **E26-S7-T10** — Content + QA — Write Meta node flavor and synergy blurbs; test that Faster Metabolism's step change correctly speeds milestone doublings in a live run.

## E26-S8 — Balancing Who You Become (balance & tuning)
_As a designer, I want the tree's costs and effects tuned so investment feels rewarding without breaking the 20h curve, so that meta power accelerates re-runs on target._  This story fits `config.TREE.*` to the pacing contract.
- **E26-S8-T1** — Cost curves — Set each node's `nodeBase`/`nodeGrowth` so a first Legacy haul (~30) buys 2–4 early ranks and later ranks pace with sqrt growth.
- **E26-S8-T2** — maxRank pass — Assign `maxRank` per node so no single node dominates and the tree offers long-term goals.
- **E26-S8-T3** — Multiply-across audit — Confirm `L_tree`, `L_ascension`, and `MILESTONE_STEP` effects combine multiplicatively across layers, keeping totals inside `double` for the whole arc.
- **E26-S8-T4** — Re-run acceleration target — Verify a well-invested tree compresses ascension beats 26→28 toward the `docs/05 §1` targets (~11h→~15h) rather than trivializing them.
- **E26-S8-T5** — Respec-fee tuning — Decide `TREE.respecFee` (0 pre-Legend) and its post-Legend value so builds stay experimental early and meaningful late.
- **E26-S8-T6** — Guardrail caps — Tune Head Start/Ageless/Second Wind caps so fresh-run narrative content survives heavy investment (per `docs/04 §7`).
- **E26-S8-T7** — Synergy strength — Balance the four synergy nodes so choosing an identity is rewarding but not mandatory (no forced meta build).
- **E26-S8-T8** — Harness sweep — Run `harness.js` across several tree-investment policies (Physique-heavy, Character-heavy, Meta-heavy) and compare beat curves.
- **E26-S8-T9** — Faster-Metabolism sanity — Confirm the milestone-step reduction doesn't spike mid-game income beyond the cadence band in `docs/05 §5`.
- **E26-S8-T10** — Golden-file — Commit the tuned tree curve and a representative beat curve as golden files to catch future regressions.

## E26-S9 — Carrying Yourself Forward (save / migration / offline)
_As a long-time player, I want my tree ranks to persist, migrate, and apply correctly on every load, so that who I've become is never lost or misapplied._  Tree state is permanent — its persistence must be flawless.
- **E26-S9-T1** — Bump save version — Increment `state.version` and register the tree-fields migration in `state.js MIGRATIONS`.
- **E26-S9-T2** — Migrate E25 node — Move any existing `ascension.tree.compounding` rank into the new Character `compounding` node without loss or double-count.
- **E26-S9-T3** — Default missing tree — For saves predating the tree, initialize `ascension.tree={}` and leave Legacy untouched.
- **E26-S9-T4** — Serialize ranks — Ensure `ascension.tree` (id→rank map) is included in save and the base64 export.
- **E26-S9-T5** — Apply-on-load — Confirm `applyTree` runs after migration and before the first tick so loaded saves show correct `L_tree`/`L_ascension`/step immediately.
- **E26-S9-T6** — Offline correctness — Verify offline gains use the tree-boosted multipliers, with Second Wind decay handled correctly across an offline gap.
- **E26-S9-T7** — Offline-cap from tree — Ensure `OFFLINE_CAP` reads the Iron Constitution bonus so a returning player gets the extra hours they paid for.
- **E26-S9-T8** — Import guard — Reject malformed tree maps or unknown node ids on import (try/catch → keep current save; drop unknown keys safely).
- **E26-S9-T9** — Fixture saves — Add pre-tree and post-tree fixtures; assert migration idempotency and that ranks/effects round-trip through export/import.
- **E26-S9-T10** — Offline QA — Test that ascending, investing, going offline 12h, and returning applies tree effects exactly once with correct offline totals.

## E26-S10 — Polishing the Person (QA / polish / juice)
_As any player, I want the tree to be bug-free and delightful, so that shaping myself feels like the rewarding heart of the endgame._  Polish makes the tree the screen players love to return to.
- **E26-S10-T1** — Requires-cycle guard — Statically validate the node graph has no circular `requires` and every node is reachable; fail loudly in dev if not.
- **E26-S10-T2** — Affordability edges — Test buying a rank at exact Legacy, at Legacy−1 (blocked), and at maxRank (blocked) for every node.
- **E26-S10-T3** — Respec correctness — Test respec refunds exactly `legacySpent`, zeroes all ranks, re-applies a clean slate, and charges the correct fee.
- **E26-S10-T4** — Effect round-trip — Assert each node's effect appears in `M_k`/offline/story after buy and disappears after respec.
- **E26-S10-T5** — Number formatting — Verify per-rank costs and effect deltas format cleanly at high magnitudes via `util.format`.
- **E26-S10-T6** — Story-flag QA — Confirm tree flags (bronzed, charmer) toggle the correct alternate beat lines and revert on respec where applicable.
- **E26-S10-T7** — Tree juice — Add a subtle rank-up flourish (node-card pulse, aria-live "you've become…") respecting `prefers-reduced-motion`.
- **E26-S10-T8** — Debug-panel parity — Confirm the debug "grant Legacy / set node rank" tools call the same `applyTree` so QA cannot diverge from real play.
- **E26-S10-T9** — Regression tests — Add tests for `costLegacy` monotonicity, `meetsRequires` correctness, and multiply-across of the tree layers.
- **E26-S10-T10** — Endgame playtest — Do a full manual pass at `GAME_SPEED=100`: ascend, fill several nodes, respec, ascend again, confirming tone, clarity, and stability.

## Definition of Done (epic)
- [ ] `data/skilltree.js` defines all 14 nodes across Physique/Character/Meta with schema, `requires`, effects, and `config.TREE` constants.
- [ ] `costLegacy(rank)=nodeBase·nodeGrowth^rank`, `buyNode`, `meetsRequires`, `respec`, and `applyTree` are implemented and pure where required.
- [ ] Node effects correctly feed `L_tree`, `L_ascension`, `MILESTONE_STEP`, and run-seed values; the four branch synergies are live and tagged.
- [ ] Beat 27 reveals the tree on first ascension; the tree persists across every reset and never resets except by respec.
- [ ] Respec refunds exactly `legacySpent`, zeroes ranks, and re-applies without an ascension; `TREE.respecFee=0` before Legend.
- [ ] Tree→story flags (bronzed, charmer) toggle alternate beat lines; guardrail caps keep beats 1–10 reachable on a heavily-invested fresh run.
- [ ] Save version bumped; E25 `compounding` rank migrates cleanly; `applyTree` runs after migration and before first tick; offline uses tree multipliers and the Iron Constitution offline cap.
- [ ] Harness confirms beats 26→28 compress toward target (not trivialized); tuned tree curve committed as a golden file.
- [ ] No circular `requires`; affordability, respec, and effect round-trip edge cases pass; all node flavor proofread to tone.
