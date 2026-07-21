# E27 — The Island Listing
> Act III summit · Accommodation tier 20 (Private Island) · New system: island acquisition (multi-currency mega-cost), island as new home base, logistics/staff relocation · Story beat 28 (*The Island Listing*) · Build-path emphasis: all

**Epic goal:** Deliver the dream purchase — a private island — as the single biggest sink in the game, calibrated to ~1–2 ascensions of saving, that becomes the player's new home base.
**Player-visible outcome:** A real-estate "listing" screen with a multi-currency mega-price and per-currency progress; buying it moves your home base to the island and relocates your logistics and staff.
**Systems touched:** `data/accommodation.js` (tier 20), `data/amenities.js` (island starter cluster), `engine.js` (multi-currency purchase, relocation), `state.accommodation`, `state.island`, `resources` (cash/comfort/clout/legacy), `data/story.js` beat 28, `config.ISLAND.*`, `prestige.js META_KEYS`, `ui.js`.
**Math/balance notes:** multi-resource price `{cash, comfort, clout, legacy}` calibrated to ~1–2 ascensions of saving; biggest `ACC` step (`ACC_BASE·ACC_GROWTH^20`, `ACC_GROWTH≈2.6`); gate on Legacy ≥ L1 + beat 28; one-way purchase; logistics/staff relocate as data flags, not re-buys; island ownership promoted to a META key so it survives ascension.

## E27-S1 — The Brochure (data model)
_As a player who's seen every hotel, I want the island defined as a real, ownable listing with a real price, so that the dream is a concrete goal on the board._  The island is data — a tier, a multi-currency price, and a relocation manifest.
- **E27-S1-T1** — Island accommodation entry — Add tier 20 "Private Island" to `data/accommodation.js` with `accScore=ACC_BASE·ACC_GROWTH^20`, the biggest Comfort jump on the ladder.
- **E27-S1-T2** — Multi-currency price datum — Define `ISLAND.price = { cash, comfort, clout, legacy }` in `config.js` as the mega-cost, each currency a real, felt fraction of the total.
- **E27-S1-T3** — Listing content — Author the wry Dutch-tourist listing copy ("Private Island, 40 hectares, one (1) confused goat, no Wi-Fi yet — motivated seller").
- **E27-S1-T4** — Relocation manifest — Declare `ISLAND.relocate = ['logistics','staff','signatureAmenities']` listing what moves to the island rather than being re-bought.
- **E27-S1-T5** — Home-base flag — Add `state.accommodation.homeBase` (default `'mainland'`) so the game can distinguish renting rooms from owning the island.
- **E27-S1-T6** — Island starter amenities — Define a small island starter cluster (dock, generator, freshwater well, goat pen) in `data/amenities.js` tagged `island` for the arrival cluster (S5).
- **E27-S1-T7** — Story beat 28 data — Add beat 28 (*The Island Listing*) with `requires:{ legacy:'L1' }`, wry text, and `unlocks:['ui:islandListing']`.
- **E27-S1-T8** — Gate constant L1 — Add `ISLAND.legacyGate` (L1) to `config.js` and tie it into `STORY_GATES` so the listing appears only when Legacy ≥ L1.
- **E27-S1-T9** — Ownership schema — Define `state.island = { owned:false, purchasedAt:null, relocated:false }` to track the one-way acquisition and relocation state.
- **E27-S1-T10** — Content pass — Write per-currency price labels ("They want cash, clout, a lifetime of comfort, and proof you've grown") in tone.

## E27-S2 — Making an Offer (core logic / engine)
_As a player saving up, I want a correct multi-currency purchase that only fires when I can truly afford all of it, so that the biggest buy in the game is safe and unambiguous._  The acquisition is a multi-resource transaction — it must be all-or-nothing.
- **E27-S2-T1** — canAffordIsland() — Implement a pure check that every currency in `ISLAND.price` is individually satisfied by `state.resources`, returning per-currency shortfalls.
- **E27-S2-T2** — buyIsland() transaction — Implement an all-or-nothing debit of cash/comfort/clout/legacy, set `island.owned=true`, `island.purchasedAt=now`, and emit `island:purchased`.
- **E27-S2-T3** — Comfort-as-cost handling — Decide and implement how spending Comfort works (spend the meter down vs. require a threshold) and document the choice in `config.js`.
- **E27-S2-T4** — Legacy-as-cost handling — Debit `resources.legacy` without touching `ascension.tree` ranks, so buying the island costs banked Legacy but never un-does the E26 tree.
- **E27-S2-T5** — One-way guard — Prevent any code path from un-owning the island; the purchase is permanent and no-refund, guarded and tested.
- **E27-S2-T6** — Set home base — On purchase set `accommodation.homeBase='island'` and `accommodation.tier=20`, updating the Comfort and unlock derivations.
- **E27-S2-T7** — Relocation execution — Implement `relocateToIsland()` that moves logistics (car/boat/jet) and staff to the island as flags, granting an island bonus rather than requiring re-purchase.
- **E27-S2-T8** — Post-purchase unlocks — Emit `unlock` for the island starter amenities (S5) and the beat-29 hook toward E28 island development.
- **E27-S2-T9** — Idempotency — Guard `buyIsland()` against double-fire so a rapid double-click cannot double-debit or double-relocate.
- **E27-S2-T10** — Purity & events — Keep `canAffordIsland` pure and route all state changes through emitted events so UI/story/stats update from one signal.

## E27-S3 — The Listing Screen (UI / buttons)
_As a dreaming tourist, I want a listing that shows exactly how close I am on every currency, so that saving for the island is a clear, motivating grind._  The listing turns a huge multi-currency price into four legible progress bars and one triumphant button.
- **E27-S3-T1** — Listing screen scaffold — Add an `#islandListing` view (Spectre.css card, real-estate brochure styling) revealed by beat 28.
- **E27-S3-T2** — Per-currency progress bars — Render four bars (cash/comfort/clout/legacy) showing `have/need` via `util.format`, updating each render tick.
- **E27-S3-T3** — "Make an Offer" button — Wire the CTA to `engine.buyIsland()`, enabled only when `canAffordIsland` is fully satisfied.
- **E27-S3-T4** — Shortfall readout — When not affordable, show the biggest blocking currency ("You're about two ascensions of clout short") to guide the player.
- **E27-S3-T5** — ETA hint — Show a rough time-to-afford estimate per currency at current income, mirroring the ascension ROI-hint pattern.
- **E27-S3-T6** — Brochure flavor — Render the listing copy, emoji/CSS "photos," and the "motivated seller" gag inside the card.
- **E27-S3-T7** — Confirm modal — Gate the offer behind a confirm modal ("Spend it all — cash, clout, comfort, and a chunk of who you've become — for a goat and a beach?").
- **E27-S3-T8** — Purchased state — After purchase, swap the listing for a "SOLD — welcome home" state and a "Set foot on the island" continue button.
- **E27-S3-T9** — Keyboard & aria — Make bars and button accessible and announce affordability changes via `aria-live`.
- **E27-S3-T10** — Copy polish — Write all bar labels, shortfall lines, and the SOLD state in the wry tone, keeping the confirm honest about the multi-currency cost.

## E27-S4 — Welcome Home (headline: buying the island → new home base)
_As a player, I want buying the island to be the game's biggest moment and to actually change where "home" is, so that the purchase feels transformative, not cosmetic._  The signature feature is the relocation — your whole operation moves to paradise.
- **E27-S4-T1** — Purchase moment — On `island:purchased`, trigger a big "keys to paradise" summary modal recapping what was spent and what you now own.
- **E27-S4-T2** — Home-base switch — Make `homeBase='island'` visibly change the game's framing (header, backdrop, "home" references) so the mainland era is clearly over.
- **E27-S4-T3** — Relocation sequence — Play a short "the movers arrive" flow that walks through logistics and staff relocating (data flags flipping) with narrative flavor.
- **E27-S4-T4** — Island Comfort jump — Verify tier 20's `accScore` delivers the largest single Comfort increase on the ladder, felt immediately post-purchase.
- **E27-S4-T5** — Relocation bonus — Grant the promised island-logistics/staff bonus (a global `×` or Comfort boost) so relocating is a reward, not a lateral move.
- **E27-S4-T6** — Beat-29 hook — End the moment with a hook toward E28 ("the island is yours — now what will you build on it?").
- **E27-S4-T7** — First-time-only framing — Store `story.flags.islandOwned` so the arrival spectacle plays exactly once.
- **E27-S4-T8** — Persist home base — Ensure `homeBase`/`island.owned`/`island.relocated` persist so the island is home on every future load.
- **E27-S4-T9** — Promote island to meta — Add `state.island` and `homeBase` to `prestige.js META_KEYS` (accommodation itself stays a run key) so ascension keeps the island as home while the run economy still resets; document the decision.
- **E27-S4-T10** — QA the moment — Test the full purchase → relocation → home-base → beat-29 flow at `GAME_SPEED=100`, confirming it plays once and leaves a coherent state.

## E27-S5 — Setting Up Camp (amenity / small-wins cluster)
_As a new island owner, I want a handful of cheap, silly island basics to buy right away, so that arriving in paradise keeps the familiar small-win rhythm before the big E28 development._  The arrival cluster keeps the "new thing every minute" cadence alive on day one of island life.
- **E27-S5-T1** — Dock — Add a dock amenity (`tag:'island'`, `costGrowth:1.5`, small Comfort + travel `×`) as the first island buy.
- **E27-S5-T2** — Generator — Add a generator ("the island had no power; now it hums") giving Comfort and enabling later island buildings.
- **E27-S5-T3** — Freshwater well — Add a well amenity with a small Comfort bump and a wry "no more shipping bottled water" line.
- **E27-S5-T4** — Goat pen — Add a goat-pen amenity canonizing the listing's "one confused goat" for pure flavor plus a tiny Comfort.
- **E27-S5-T5** — Beach hammock — Add a hammock ("your first island nap, hard-earned") with Comfort and a nod to Iron Constitution's lounging.
- **E27-S5-T6** — Solar upgrade — Add a solar array as a step-up from the generator (higher Comfort, tiny global `×`).
- **E27-S5-T7** — Wire purchase flow — Reuse the generic `engine.buyAmenity(id)` with no bespoke code, feeding `amenityScore` into `ComfortRaw`.
- **E27-S5-T8** — Comfort contribution — Verify the island cluster feeds the saturating Comfort cap correctly and doesn't spike past the softcap.
- **E27-S5-T9** — Cadence pass — Tune costs so the cluster is affordable every ~60–90s of active post-purchase play per `docs/05 §5`; confirm via harness.
- **E27-S5-T10** — Content + QA — Write Dutch-tourist flavor for each item and test zero-cash blocking, rapid buys, and Comfort recompute with no free offline items.

## E27-S6 — The Tier That Ends the Ladder (accommodation / progression step)
_As a player, I want the island to be the top of the accommodation ladder with a fittingly enormous gate and payoff, so that reaching it feels like the summit of the whole climb._  Tier 20 is the ladder's crown — the biggest gate, the biggest jump.
- **E27-S6-T1** — Ladder capstone — Register tier 20 as the top of `data/accommodation.js`, above the Private Estate (tier 19), updating `ownedTiers` on purchase.
- **E27-S6-T2** — Comfort gate — Wire the island's unlock to require both the Legacy gate (L1) and a Comfort threshold consistent with `STORY_GATES`.
- **E27-S6-T3** — Biggest ACC step — Confirm `ACC_GROWTH≈2.6` makes tier 20 the largest `accScore` on the ladder and verify the Comfort math handles the jump without overflow.
- **E27-S6-T4** — Unlock reveal — Emit `unlock` and a ladder-topping flourish when the island becomes ownable, and again when owned.
- **E27-S6-T5** — Tier-vs-ownership distinction — Clarify in code and UI that tiers 0–19 were rented rooms while tier 20 is owned property (ties to `homeBase`).
- **E27-S6-T6** — Downstream gate readiness — Ensure reaching tier 20 satisfies the E28 "own island" prerequisite (beat 29) cleanly.
- **E27-S6-T7** — Ladder UI — Update the accommodation ladder view to show the island as the crowned final rung with the mainland tiers behind it.
- **E27-S6-T8** — Balance the gate — Tune the Comfort/Legacy gate so the island unlocks around the ~15h beat-28 target from `docs/05 §1`.
- **E27-S6-T9** — Migration of ladder — Ensure old saves gain the tier-20 entry without altering their current tier.
- **E27-S6-T10** — Content + QA — Write the "top of the ladder" copy and test that no accommodation tier can be skipped past or bought out of order into the island.

## E27-S7 — Everyone Moves to the Island (path / branch flavor)
_As a player of any branch, I want my specific empire — fleet, studio, rig, or collection — to relocate to the island, so that the move honors the identity I built._  Branch-aware relocation makes paradise feel like the payoff of your particular climb.
- **E27-S7-T1** — Traveler relocation — Move the traveler's fleet (cars/boats/jet) to the island with a "home port" bonus, tying to Wanderer's Instinct.
- **E27-S7-T2** — Vlogger relocation — Relocate the vlogger's studio/content setup ("infinity-pool storytime, but it's YOUR pool now") with a Clout flavor nod.
- **E27-S7-T3** — Crypto relocation — Move the crypto rig to a solar-powered island setup ("mining rig, meet the sun"), tying to the island generator/solar amenities.
- **E27-S7-T4** — Connoisseur relocation — Relocate the art/wine collection to a climate-controlled island cellar, tying to Golden Ratio/exclusivity.
- **E27-S7-T5** — Branch-variant beat 28 text — Add branch-specific listing/arrival lines so each fantasy gets its own paradise moment.
- **E27-S7-T6** — Hybrid nod — Add a bonus line/flourish when multiple branches were emphasized ("your island has a marina, a studio, a server closet, and a cellar — of course it does").
- **E27-S7-T7** — Per-branch relocation bonus — Grant a small branch-appropriate `×`/Comfort on relocation so each identity is rewarded, balanced across branches.
- **E27-S7-T8** — No branch stranded — Verify all four branches can afford the island at comparable times via the harness, so the summit isn't branch-biased.
- **E27-S7-T9** — Staff relocation flavor — Give the household staff (E19/E20) island-move flavor ("the butler has always wanted to see the sea").
- **E27-S7-T10** — Content QA — Proofread all branch relocation variants for tone and the ≤ 90-word limit; confirm a neutral fallback exists.

## E27-S8 — Pricing Paradise (balance & tuning)
_As a designer, I want the island priced at ~1–2 ascensions of saving across four currencies, so that it's the game's biggest, most-earned purchase without being an impossible wall._  This story calibrates the mega-cost to the pacing contract.
- **E27-S8-T1** — Total-cost target — Set `ISLAND.price` so the combined cost equals ~1–2 full ascensions of accumulation at the beat-28 era (~15h).
- **E27-S8-T2** — Per-currency split — Balance the cash/comfort/clout/legacy weights so no single currency trivializes or solely blocks the purchase; every branch contributes.
- **E27-S8-T3** — Cash weight — Tune the cash portion against the tier-ladder income at tier 19 so cash is the "grind" component.
- **E27-S8-T4** — Comfort weight — Tune the Comfort cost so it's a meaningful spend of a near-maxed meter, not a rounding error.
- **E27-S8-T5** — Clout weight — Set the Clout portion so vloggers feel their currency matters and non-vloggers can still reach it via baseline Clout.
- **E27-S8-T6** — Legacy weight — Set the Legacy portion so it costs banked Legacy without forcing a tree wipe (interacts with S2-T4).
- **E27-S8-T7** — Harness run — Run `harness.js` to the island purchase and confirm beat 28 lands within ±15% of the ~15h target.
- **E27-S8-T8** — 1-vs-2-ascension check — Verify the island is reachable in ~1 ascension by an optimized player and ~2 by a casual one, matching the design.
- **E27-S8-T9** — Anti-cheese — Ensure no single overweighted currency (e.g. Savvy passive cash) lets a player skip the intended saving period.
- **E27-S8-T10** — Golden-file — Commit the tuned island price and beat-28 timing as golden files to lock the mega-sink against future regressions.

## E27-S9 — Keeping Paradise (save / migration / offline)
_As a player, I want island ownership to persist through updates, ascensions, and offline gaps, so that the biggest purchase in the game can never be lost._  The island is meta and permanent — its persistence is sacred.
- **E27-S9-T1** — Bump save version — Increment `state.version` and register the island-fields migration in `state.js MIGRATIONS`.
- **E27-S9-T2** — Migration function — Add `state.island={owned:false,purchasedAt:null,relocated:false}` and `accommodation.homeBase='mainland'` to old saves without altering progress.
- **E27-S9-T3** — Island as meta key — Add `state.island` (and `homeBase`) to `prestige.js META_KEYS` so ascension keeps the island while run accommodation still resets.
- **E27-S9-T4** — Serialize island state — Ensure `state.island` and `homeBase` are in `JSON.stringify` save and the base64 export string.
- **E27-S9-T5** — Offline-toward-island — Verify offline cash/clout accumulate toward the island price so a returning player sees correct progress on all bars.
- **E27-S9-T6** — Purchase-then-close safety — Autosave immediately after `buyIsland()` so a crash cannot lose the island or replay the multi-currency debit.
- **E27-S9-T7** — Post-ascension island — Test that ascending after owning the island keeps `island.owned=true` and `homeBase='island'` while the run economy resets.
- **E27-S9-T8** — Import guard — Reject malformed `island` blocks on import (try/catch → keep current save) so a bad paste can't grant or revoke the island.
- **E27-S9-T9** — Fixture saves — Add pre-island and post-island fixtures; assert migration idempotency and that ownership round-trips through export/import.
- **E27-S9-T10** — Offline QA — Test buying the island, going offline 12h, and returning: ownership intact, relocation intact, offline totals correct, no double-debit.

## E27-S10 — The Keys Fit (QA / polish / juice)
_As any player, I want the island purchase to be flawless and euphoric, so that the climax of the whole climb lands without a single rough edge._  Polish makes buying the island the moment players screenshot.
- **E27-S10-T1** — Partial-affordability edges — Test that being short on exactly one currency blocks the buy with the right shortfall message, and that hitting all four exactly enables it.
- **E27-S10-T2** — All-or-nothing audit — Assert `buyIsland()` never partially debits (e.g. spends cash then fails on clout); the transaction is atomic.
- **E27-S10-T3** — Double-click test — Confirm rapid "Make an Offer" clicks purchase and relocate exactly once (re-entrancy guard from S2-T9).
- **E27-S10-T4** — Number formatting — Verify the four price bars and shortfall ETAs render cleanly at high magnitudes via `util.format`.
- **E27-S10-T5** — One-way audit — Assert no path un-owns the island and that ascension preserves it (meta-key check from S9-T3).
- **E27-S10-T6** — Relocation integrity — Assert logistics/staff flags flip exactly once and grant their bonuses once, even across re-loads.
- **E27-S10-T7** — "Keys to paradise" juice — Add a celebratory, reduced-motion-respecting arrival flourish (SOLD stamp, aria-live "welcome home") synced to the summary modal.
- **E27-S10-T8** — Debug-panel parity — Confirm the debug "grant currencies / force island" tools call the same `buyIsland()` so QA cannot diverge from real play.
- **E27-S10-T9** — Regression tests — Add tests for `canAffordIsland` per-currency logic, atomic debit, and meta-persistence across ascension.
- **E27-S10-T10** — Climax playtest — Do a full manual save-up-and-buy pass at `GAME_SPEED=100`, checking tone, clarity, the relocation flow, and the beat-29 hook into E28.

## Definition of Done (epic)
- [ ] Tier 20 "Private Island" exists in `data/accommodation.js` as the ladder capstone with the biggest `accScore` step (`ACC_GROWTH≈2.6`).
- [ ] `ISLAND.price` is a four-currency mega-cost (cash/comfort/clout/legacy) calibrated to ~1–2 ascensions of saving; every branch contributes.
- [ ] `canAffordIsland`/`buyIsland` are atomic (all-or-nothing), one-way (no refund), idempotent, and debit Legacy without touching the tree.
- [ ] Purchase sets `homeBase='island'`, relocates logistics/staff via flags with a bonus, and fires the "keys to paradise" moment plus the beat-29 hook.
- [ ] Island ownership is promoted to a META key so it survives ascension while run accommodation still resets.
- [ ] Listing screen shows four progress bars, shortfall + ETA hints, confirm modal, and a SOLD state; hidden before beat 28 (Legacy ≥ L1).
- [ ] Island starter amenity cluster (dock/generator/well/goat pen/hammock/solar) hits the ~60–90s cadence and feeds the Comfort softcap.
- [ ] Save version bumped; migration adds island fields idempotently; offline accumulates toward the price; post-ascension island persistence verified.
- [ ] Harness confirms beat 28 within ±15% of the ~15h target and the 1–2 ascension reachability; tuned price committed as a golden file.
