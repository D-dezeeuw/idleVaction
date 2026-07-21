# E30 — Legends of Leisure
> Journey stage: Act III endless / release · Accommodation tier 21+ (endless) · New systems: achievements & collections (`×` bonuses), seasonal rotating destinations, statistics screen, accessibility pass, GitHub Pages deploy pipeline, balance golden-file · Story beat 30+ (*Legends of Leisure*) · Build-path emphasis: all four (per-archetype achievements)

**Epic goal:** Give the game an endless completionist meta and ship it. Add an achievements-and-collections system whose set bonuses feed a global `×`, rotating seasonal destinations for live-ops freshness, a statistics screen, a full accessibility pass, a GitHub Pages deploy pipeline, and a golden-file balance snapshot that locks the 20-hour arc.
**Player-visible outcome:** A trophy gallery and statistics screen; a stream of achievements and collection sets that each grant a small permanent `×`; limited-time seasonal destinations that rotate; a fully keyboard-navigable, screen-reader-friendly, reduced-motion-respecting UI; and a public build live at `user.github.io/idleVaction/`.
**Systems touched:** `data/achievements.js` (new), `data/seasonal.js` (new), `data/accommodation.js` (trophy tiers), `math.js` (`L_achieve` layer), `engine.js` (condition evaluator, seasonal rotation), `state.js` (achievements/stats persistence + migration), `ui.js` (stats screen, gallery, toasts, accessibility), `js/dev/harness.js` + golden file, `config.js`, `index.html`/Pages deploy.
**Math/balance notes:** Achievement/collection rewards feed a new `L_achieve = 1 + Σ rewards` layer; individual rewards are small (`×1.01–1.05`), full-set/meta bonuses are meaningful, aggregate is curved so 100% completion doesn't trivialize NG+. Seasonal destinations are bounded flat global `×`. Final harness run fits all 30 beats within ±15% of the docs/05 §1 targets, committed as the authoritative golden file; long-tail validated across several NG+/Legend cycles.

## E30-S1 — The Trophy Cabinet (data model)
_As a completionist, I want every achievement and collectible defined as data, so that the endgame's "gotta unlock them all" layer is declarative and endlessly extendable._  Declares the completionist meta as pure data.
- **E30-S1-T1** — Create the registry — Add `data/achievements.js`; each entry `{id,name,desc,condition,reward,hidden,tag}` where `reward` is a small permanent `×`.
- **E30-S1-T2** — Condition descriptors — Encode unlock conditions as data (`{stat:'lifetimeCash', gte:1e12}`, `{event:'guest:checkin', count:100}`) so the engine evaluates them generically.
- **E30-S1-T3** — Collection sets — Define collections (destinations visited, floatables owned, staff hired, guest types hosted); each set grants a set-completion `×`.
- **E30-S1-T4** — Seasonal destination data — Add `data/seasonal.js` with rotating destinations (Kingsday Cruise, Rainy-Season Retreat, Tulip Festival Isle) tagged with an active-window rule.
- **E30-S1-T5** — Reward scoping — Tag each achievement/collection reward with a scope so `math.js` applies it to the right layer (mostly a new `L_achieve`).
- **E30-S1-T6** — Milestone achievements — Add achievements for every major beat/tier/prestige event so the record mirrors the whole 30-beat journey.
- **E30-S1-T7** — Hidden/secret achievements — Author wry secret achievements ("Slept in the shed on purpose", "Fed a stroopwafel to a seagull") with `hidden:true`.
- **E30-S1-T8** — Flavor copy — Write Dutch-tourist names/descriptions for every achievement and collection.
- **E30-S1-T9** — Extensibility contract — Document the data shape so new seasonal/achievement content is a pure data add with no engine change.
- **E30-S1-T10** — Data validation — Add a dev assert that every achievement has a valid condition + reward + unique id; fail fast on malformed entries.

## E30-S2 — The Achievement Engine (core logic/engine)
_As a player earning trophies, I want achievements and collections to detect themselves and apply their bonuses live, so that unlocking one immediately and correctly boosts my empire._  The generic evaluation + bonus engine.
- **E30-S2-T1** — Condition evaluator — Implement a generic evaluator that checks each achievement's data condition against state/stats/events on the relevant ticks.
- **E30-S2-T2** — Event-driven unlocks — Subscribe to the pub/sub (`purchase`, `guest:checkin`, `story:beat`) so event-count achievements fire without polling everything.
- **E30-S2-T3** — Collection completion — Track set membership and, on completion, grant the set `×` and emit `collection:complete`.
- **E30-S2-T4** — Add `L_achieve` to the stack — Insert `L_achieve = 1 + Σ rewards` into `M_k`, additive-inside and multiplicative-across.
- **E30-S2-T5** — Seasonal activation — Compute which seasonal destinations are active from the calendar/`GAME_SPEED` clock or a manual rotation index, and activate/deactivate their `×`.
- **E30-S2-T6** — Idempotent unlocks — Ensure an achievement unlocks exactly once and its reward isn't double-counted after a reload.
- **E30-S2-T7** — Statistics aggregation — Maintain a `stats` rollup (lifetime cash, guests hosted, ascensions, Legends, playtime) that both achievements and the stats screen read.
- **E30-S2-T8** — Emit unlock events — Fire `achievement:unlock` with payload for the toast, the `aria-live` ticker, and the gallery.
- **E30-S2-T9** — Performance guard — Batch condition checks with dirty-flag stats so the evaluator stays cheap with hundreds of achievements at high `GAME_SPEED`.
- **E30-S2-T10** — Unit tests — Test condition evaluation, collection completion, `L_achieve` stacking, idempotency, and seasonal activation windows.

## E30-S3 — The Statistics Screen (UI / buttons)
_As a data-loving Dutchman, I want a statistics screen and an achievement gallery, so that I can admire every number my vacation empire has produced._  Exposes the meta as readable surfaces.
- **E30-S3-T1** — Stats screen — Add a "Statistics" panel to `ui.js` listing lifetime cash, guests hosted, ascensions, Legends, playtime, best Comfort, and total clicks.
- **E30-S3-T2** — Achievement gallery — Render a grid of achievement cards (unlocked vs. locked; hidden shown as "???") with name/desc/reward.
- **E30-S3-T3** — Collection tracker — Show each collection's progress bar ("17/24 destinations") and its completion bonus.
- **E30-S3-T4** — Seasonal banner — Display the currently active seasonal destination(s) with a countdown to the next rotation.
- **E30-S3-T5** — `L_achieve` readout — Show the aggregate achievement multiplier so players see the payoff of completionism.
- **E30-S3-T6** — Unlock toast — On `achievement:unlock`, show a toast with the trophy name and queue multiples so they don't overlap.
- **E30-S3-T7** — Filter/sort controls — Let players filter achievements (unlocked/locked/hidden) and sort collections by completion.
- **E30-S3-T8** — Aria-live wiring — Announce achievement unlocks and season changes through the accessibility ticker.
- **E30-S3-T9** — Empty-state polish — Add friendly empty states ("No trophies yet — try leaving the shed") for a fresh save.
- **E30-S3-T10** — Snapshot test — Render the stats + gallery from a mixed unlocked/locked fixture and assert layout and counts.

## E30-S4 — Achievements & Collections (the headline new thing)
_As an endgame player, I want a deep achievements-and-collections meta with real `×` rewards, so that after the story ends there's still a satisfying "complete the set" engine pulling me back._  The signature endless-content system.
- **E30-S4-T1** — Reward-magnitude model — Set rewards so individual achievements are small (`×1.01–1.05`) but the full set is a meaningful global `×`.
- **E30-S4-T2** — Tiered collection bonuses — Give collections escalating bonuses at 25/50/75/100% completion so partial progress still pays.
- **E30-S4-T3** — Meta-achievements — Add "earn N achievements" and "complete every collection" capstones with a large `×`.
- **E30-S4-T4** — Cross-system coverage — Ensure achievements span every system (generators, amenities, skills, paths, logistics, staff, island, prestige) so all playstyles earn them.
- **E30-S4-T5** — Progress feedback — Show "closest to unlocking" achievements on the main HUD so there's always a visible next trophy.
- **E30-S4-T6** — Retroactive granting — On load, re-evaluate all conditions so achievements a player already qualifies for unlock correctly.
- **E30-S4-T7** — Collection reward routing — Wire collection `×` into `L_achieve` and verify it stacks additively with individual achievement rewards.
- **E30-S4-T8** — Story tie-in — Fire recurring beat-30+ "Legends of Leisure" flavor as milestone achievements complete.
- **E30-S4-T9** — Balance the aggregate — Cap/curve total `L_achieve` so 100% completion is strong but doesn't trivialize NG+ pacing.
- **E30-S4-T10** — QA — Test retroactive grants, tiered thresholds, meta-achievement firing, and the aggregate-cap behavior.

## E30-S5 — Seasonal Destinations (amenity / small-wins cluster — live-ops)
_As a returning player, I want rotating seasonal destinations to visit, so that there's always fresh limited-time content long after the main climb is done._  The live-ops content stream.
- **E30-S5-T1** — Seasonal roster — Populate `data/seasonal.js` with a rotating set (Kingsday Cruise, Tulip Festival Isle, Rainy-Season Retreat, Sinterklaas Ski Chalet), each a themed destination `×` + unique amenity.
- **E30-S5-T2** — Rotation scheduler — Implement the active-window logic (real calendar or in-game rotation index) that swaps the active seasonal destination.
- **E30-S5-T3** — Wire as destinations — Reuse the destination system so each seasonal one is a flat global `×` and feeds the destinations collection.
- **E30-S5-T4** — Limited-time framing — Mark seasonal destinations available only during their window; grey out expired ones while keeping any earned collection credit.
- **E30-S5-T5** — Seasonal micro-cluster — Ship 2–3 cheap themed amenities per season (Kingsday orange floatie, tulip-lined cabana) with `costGrowth:1.5`, small `×` + Comfort.
- **E30-S5-T6** — Unlock cadence — Ensure a rotation reveals something new roughly weekly so live-ops stays lively.
- **E30-S5-T7** — Flavor copy — Wry Dutch-tourist seasonal descriptions ("Kingsday at sea: everything orange, including the sunburn").
- **E30-S5-T8** — UI integration — Surface the active season in the destination list and the S3 banner with a rotation countdown.
- **E30-S5-T9** — Save/migration — Persist visited seasonal destinations + collection credit; default empty for old saves; no free offline unlocks.
- **E30-S5-T10** — QA — Test rotation boundaries, expired-window greying, collection-credit retention, and determinism of the rotation index.

## E30-S6 — Trophy Suites (accommodation / progression step)
_As a completionist mogul, I want achievement-gated cosmetic accommodations, so that the shed→island ladder gains prestige capstone rungs that show off what I've earned._  Ties progression to completion, not cash.
- **E30-S6-T1** — Trophy-tier data — Add achievement-gated cosmetic accommodations (Trophy Suite, Founder's Villa, Hall-of-Legends Wing) beyond tier 21, unlocked by achievement count.
- **E30-S6-T2** — Achievement gates — Gate each on a collection/achievement milestone ("50 achievements → Trophy Suite") rather than Comfort alone.
- **E30-S6-T3** — Cosmetic Comfort bump — Give trophy tiers a modest persistent `accScore` so they're a small reward, not pure decoration.
- **E30-S6-T4** — Prestige-milestone tiers — Tie some rungs to ascension/Legend counts so long-haul prestige is visibly commemorated.
- **E30-S6-T5** — Reveal beats — Author wry reveal copy ("The Hall of Legends: a wing dedicated entirely to your poncho").
- **E30-S6-T6** — Cosmetic theming — Add palette/backdrop variants via framework-agnostic CSS; reduced-motion safe.
- **E30-S6-T7** — Ladder integration — Slot trophy tiers into `accommodation.js` without disturbing the numeric tier-21 endgame or the NG+ tiers from E29.
- **E30-S6-T8** — Balance — Keep trophy `accScore` small so completionists get flavor + a nod, not a power spike that skews the harness.
- **E30-S6-T9** — Save/migration — Persist unlocked trophy tiers, migrate saves, and re-evaluate gates retroactively on load.
- **E30-S6-T10** — QA — Verify gates require the right achievements, reveals fire once, and cosmetic swaps respect reduced-motion.

## E30-S7 — Achievements for Every Archetype (path / branch flavor)
_As a player devoted to one build, I want branch-specific achievements and collections, so that "the greatest vlogger who ever lived" is a documented, rewarded title._  Rewards lane loyalty.
- **E30-S7-T1** — Branch achievement sets — Author a collection per branch (Vlogger "Go Viral ×10"; Crypto "Survive 5 crashes"; Traveler "Visit 30 destinations"; Connoisseur "Own the full wine cellar").
- **E30-S7-T2** — Branch capstone titles — Grant a cosmetic title + `×` for completing a branch's full collection.
- **E30-S7-T3** — Hybrid achievements — Add achievements for maxing two branches in one run/tree, mirroring the hybrid-beat reward pattern.
- **E30-S7-T4** — Vlogger coverage — Achievements tied to Clout thresholds, combo streaks, and sponsor deals.
- **E30-S7-T5** — Crypto coverage — Achievements for Savvy passive milestones and surviving/profiting from market events.
- **E30-S7-T6** — Traveler coverage — Achievements for destinations, transport slots, and the E24 exclusive-destination set.
- **E30-S7-T7** — Connoisseur coverage — Achievements for exclusivity thresholds, appreciating-asset value, and hosting `old_money` guests.
- **E30-S7-T8** — Reward routing — Wire branch achievement/collection `×` into `L_achieve` and ensure branch parity (~within 10%).
- **E30-S7-T9** — Flavor copy — Write branch-voiced descriptions; wry and identity-specific.
- **E30-S7-T10** — QA — Load a save per branch and assert the correct branch achievements are trackable/unlockable and titles apply without leakage.

## E30-S8 — Final Fit to 20 Hours (balance & tuning)
_As the balancer signing off, I want the whole 30-beat curve to hit its targets with achievements and seasonal `×` folded in, so that the shipped game genuinely delivers the 20-hour arc._  Locks the pacing contract.
- **E30-S8-T1** — Full-arc harness run — Run `harness.js` beat 1→30 with the greedy-ROI + prestige policy and `L_achieve` active; capture actual `T(beat)`.
- **E30-S8-T2** — Compare to targets — Diff against the docs/05 §1 target table and list every beat outside ±15%.
- **E30-S8-T3** — Account for `L_achieve` — Ensure achievement multipliers are in the sim so the shipped curve matches what players actually experience.
- **E30-S8-T4** — Fit the misses — Iterate the largest-miss lever (per the docs/05 twelve-lever order) until all 30 beats are within tolerance.
- **E30-S8-T5** — Cadence validation — Confirm the 30–120s active-play time-to-next-purchase band holds across the full arc, including endgame.
- **E30-S8-T6** — Long-tail validation — Extend the sim through several NG+/Legend cycles and assert the tail keeps compressing and stays finite.
- **E30-S8-T7** — Seasonal-`×` sanity — Verify active seasonal destinations don't distort pacing (bounded flat `×`).
- **E30-S8-T8** — Golden-file snapshot — Regenerate and commit the authoritative golden balance file (the milestone curve) as the release baseline.
- **E30-S8-T9** — Regression guard — Add a test that diffs a fresh harness run against the golden file and fails on drift beyond tolerance.
- **E30-S8-T10** — Tuning doc update — Update `config.js` comments and the docs/05 lever notes to reflect the final shipped constants.

## E30-S9 — Preserving the Record (save / migration / offline)
_As a player with hundreds of hours logged, I want my achievements, stats, and collections to survive every reload and migration, so that my record is never lost and offline unlocks are honest._  Guarantees the record persists.
- **E30-S9-T1** — Extend state — Persist `state.achievements`, `state.collections`, `state.seasonal`, and the `stats` rollup as plain JSON.
- **E30-S9-T2** — Bump version + migration — Increment `state.version` and add a `MIGRATIONS[n]` seeding achievement/collection/stats defaults for old saves.
- **E30-S9-T3** — Retroactive unlock on migrate — On the first post-feature load, re-evaluate all conditions so long-time players get the trophies they've already earned.
- **E30-S9-T4** — Offline unlock correctness — Ensure achievements whose conditions are met during offline simulation unlock (and their `×` applies) via the same tick path.
- **E30-S9-T5** — Stats across resets — Verify lifetime stats accumulate through ascension/Legend resets and aren't wiped by run resets.
- **E30-S9-T6** — Seasonal persistence — Persist visited seasonal destinations + rotation index so a rotation crossing an offline window resolves deterministically.
- **E30-S9-T7** — Away summary — Add "trophies earned while away" to the "While you were away…" modal.
- **E30-S9-T8** — Export/import coverage — Confirm the base64 export string carries achievements/collections/stats and imports without loss.
- **E30-S9-T9** — Round-trip test — Save→stringify→parse→load and assert achievements, collections, stats, and `L_achieve` are identical.
- **E30-S9-T10** — Fixture migration test — Load a historical save from each version and assert achievements migrate and retroactively unlock correctly.

## E30-S10 — Ship It: Accessibility & GitHub Pages (QA / polish / release)
_As the release owner, I want a full accessibility pass and a working GitHub Pages deploy, so that idleVaction ships polished, usable by everyone, and live on the web._  The final release gate.
- **E30-S10-T1** — Aria-live pass — Audit every dynamic readout (earnings ticker, achievement/season toasts, offline summary) so screen readers announce changes politely without spam.
- **E30-S10-T2** — Keyboard navigation — Ensure every button, tab, modal, and the debug panel is reachable and operable by keyboard with a visible focus ring; trap focus in modals.
- **E30-S10-T3** — Reduced-motion pass — Verify every animation (guest check-in, confetti, count-ups, backdrop swaps) is gated behind `prefers-reduced-motion` and degrades to instant.
- **E30-S10-T4** — Semantic markup audit — Confirm semantic `<button>`s, headings, and landmarks throughout so the buttons-only UI is genuinely accessible.
- **E30-S10-T5** — Color-contrast check — Verify text/background contrast across all themes (island, trophy, seasonal palettes) meets WCAG AA.
- **E30-S10-T6** — GitHub Pages pipeline — Configure Pages to serve the repo root from `main`, verifying relative paths so it works at `user.github.io/idleVaction/`.
- **E30-S10-T7** — Deploy smoke test — Load the deployed site, start a new game, and verify save/load, ES-module loading over HTTPS, and the Spectre.css CDN link all resolve.
- **E30-S10-T8** — Production guards — Confirm the debug panel/harness sit behind the toggle and never auto-run in prod; strip dev-only logging.
- **E30-S10-T9** — Release checklist — Final pass: version stamp, changelog, export-string compatibility, backup-save rotation, and a fresh-save first-run sanity check.
- **E30-S10-T10** — Launch polish — Add the beat-30+ "Legends of Leisure" endgame celebration, a wry credits/about screen, and a "thanks for playing" hook toward NG+.

## Definition of Done (epic)
- [ ] `data/achievements.js` + collections defined with data conditions and scoped rewards; validation passes; hidden achievements work.
- [ ] The achievement engine detects unlocks (event + condition driven), completes collections, and feeds `L_achieve` idempotently, online and offline.
- [ ] Statistics screen and achievement gallery render with progress bars, filters, toasts, and `aria-live` announcements.
- [ ] Achievement/collection rewards are small individually but meaningful as sets; aggregate `L_achieve` is curved so 100% doesn't trivialize NG+.
- [ ] Seasonal destinations rotate on schedule, grey out when expired while retaining collection credit, and stay bounded flat `×`.
- [ ] Branch-specific achievement sets and titles exist within ~10% parity; trophy-tier cosmetic accommodations unlock by achievement/prestige milestones.
- [ ] Full-arc harness fits all 30 beats within ±15% of the docs/05 targets; golden file committed with a regression guard; long tail validated.
- [ ] Save migrates from all prior versions with retroactive unlocks; export/import and away-summary cover the new state.
- [ ] Accessibility pass complete (aria-live, keyboard, reduced-motion, semantic markup, WCAG AA contrast); production guards verified.
- [ ] GitHub Pages deploy is live and smoke-tested at `user.github.io/idleVaction/`; release checklist signed off.
