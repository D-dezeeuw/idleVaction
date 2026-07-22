# UX-plan.md — the Holiday Overhaul 🏖️

> The design bible for idleVaction's visual & UX rework. One feeling drives every rule in this
> document: **you are on holiday, and the trip keeps surprising you.**
>
> Three commandments, from the design brief:
> 1. **Bare necessities only.** If it isn't needed *right now*, it isn't on screen.
> 2. **The future is a secret.** Nothing is advertised before it's earned — unlocks are adventures.
> 3. **Friendly, happy, inviting.** Warm colors, round shapes, playful type, celebration moments.
>
> Scope note: this plan is **UI/UX only**. The engine, economy, and the fitted 29705s harness
> invariant are untouched — every rule here is about *when and how* things appear, never *what
> they do*. All unlock conditions below are quoted from the shipped engine (`engine.js`/`ui.js`)
> and stay authoritative there; the UI only ever *reads* them.

---

## 1. The Holiday Design System

### 1.1 Palette — "Poolside at Golden Hour"

Light-first. The current dark navy reads "dashboard"; holidays read **sunlight**. The warm sand
background makes yellow and pink glow instead of shout.

| Swatch | Name | Hex | Role | Rules |
|---|---|---|---|---|
| 🟡 | **Sunshine** | `#FFC800` | Primary identity: progress fills, highlights, the comfort sun-meter, active tab | **Never** for text. Never large solid blocks behind text. |
| 🩷 | **Hot Pink** | `#FF2E88` | The action color: every primary CTA ("Check in", "Buy the deed", "Retire") | One pink CTA per card max. Text on pink is white — use the darkened `#D9186E` when white text needs AA contrast. |
| 🔵 | **Sky Blue** | `#45C4FF` | Support: travel/water accents, info states, gate-progress bars ("on the way to…") | Cool = "journey in progress". |
| 🟢 | **Apple Green** | `#7ED957` | Support: success, affordability ("you can buy this"), completed checkmarks | Green = go. An affordable button gets a green edge-glow, not a green fill (pink stays the CTA). |
| 🏖️ | Sand | `#FFF6E9` | Page background | Warm, never pure white. |
| 🐚 | Shell | `#FFFFFF` | Card background | Cards float on sand with a soft shadow. |
| 🌑 | Ink | `#2B1E16` | All body text | Warm near-black. Contrast on Sand/Shell ≥ 12:1. |
| 🪸 | Dune | `#8A7360` | Secondary text, captions | Only for de-emphasis, min 4.5:1 on Shell. |

Derived tints (10–15% opacity of the four brand hues) are allowed for card headers, chips and
meter tracks. **No other hues enter the game.** Locked/unknown things are rendered in Dune —
mystery is *neutral*, never colored (color is a reward).

Dark mode: out of scope for v1 (holiday = daylight). `prefers-color-scheme` can come later.

### 1.2 Typography — playful headline, easy body

Both free Google Fonts (OFL), loaded with one `<link>` — same class of dependency as the existing
Spectre.css CDN line.

| Use | Font | Why |
|---|---|---|
| Display / headings / big numbers | **Fredoka** (SemiBold) | Round, chunky, sunny — the letterforms smile. |
| Body / UI / buttons | **Nunito** (Regular / Bold) | Rounded terminals, superb small-size readability. |
| All numerals | `font-variant-numeric: tabular-nums` | Ticking money must not wiggle. |

Type scale: 28 / 20 / 16 / 14 / 12px. Nothing smaller than 12. Headings in Fredoka never exceed
two words + one emoji — holiday brevity.

### 1.3 Iconography — one vendored set + the emoji flavor layer

- **UI icons:** [Phosphor Icons](https://phosphoricons.com) (MIT license), **vendored** as a
  single inline SVG sprite (`assets/icons.svg`, ~40 curated glyphs). No CDN, works offline,
  keeps the project's zero-runtime-dependency rule intact. Style: *duotone*, tinted per palette.
  Icons are for **chrome**: tabs, actions, meters, locks, close buttons.
- **Emoji stay** for **content & flavor**: story beats, celebration toasts, amenity names, the
  goat. Emoji are the game's voice; icons are its furniture. Never mix roles.
- Every icon gets an `aria-label`; icons never appear without a text label except in the tab bar
  on mobile (where the label collapses to the icon + accessible name).

### 1.4 Shape & motion

- Radius 16px on cards, 999px (pill) on buttons/chips/tabs. Nothing sharp — sharp isn't holiday.
- Shadows: one soft ambient shadow (`0 4px 16px rgba(43,30,22,.08)`). No borders except the
  1px sand-line separating stacked list rows.
- Motion: 150–250ms ease-out. Three sanctioned animations only: (1) tab-dot pulse, (2) unlock
  "postcard flip", (3) confetti burst on era moments. Everything honors
  `prefers-reduced-motion` (already a house rule).

---

## 2. The Reveal Doctrine — rules for hiding the future

These are laws. Every feature in §5 cites them.

| # | Law | Meaning |
|---|---|---|
| **R1** | **Never name the unreached.** | Future accommodation rungs, tabs, panels, trophies show as `???` / a Dune-colored lock. No names, no numbers beyond the *very next* goal. (Already live: mystery ladder rungs, gated tabs, gated trophies.) |
| **R2** | **Locked ≠ advertised.** | We don't show greyed-out previews of future systems. If you can't touch it, it does not exist on screen. A lock icon is only shown when the *thing itself* was already introduced (e.g. next ladder rung). |
| **R3** | **One goal visible at a time.** | Each panel surfaces exactly one "next": the next tier, the next destination, the next building. Everything beyond is `???` or absent. |
| **R4** | **Celebrate arrivals.** | Every unlock is an *event* with a presentation tier (§4). The bigger the era shift, the bigger the moment. |
| **R5** | **The map grows, never shrinks.** | Once unlocked, a system stays reachable (in its tab). We hide the future, not the past. |
| **R6** | **Numbers are feelings.** | Wherever a number expresses *progress toward something*, render a bar/meter first and the digits second (small, in Dune). Raw digits only where the player spends (prices). |
| **R7** | **The HUD earns its chips.** | Header chips appear only when their currency exists in the player's life: Clout hidden until the vlogger path, Legacy until ascension is near, Energy until the tap tutorial, multiplier chip until it first exceeds ×1. Start: **Cash + Comfort only.** |
| **R8** | **Dev tools are invisible.** | Speed controls, debug, export/import fold into a Debug drawer behind the ⚙️ icon. A player never sees `10000×`. |

---

## 3. The Holiday Component Kit

The visual metaphor kit — every system maps to a travel object. This is what makes it *feel* like
a holiday instead of a spreadsheet:

| Component | Metaphor | Used for | Sketch |
|---|---|---|---|
| **Postcard** | A collectible postcard per accommodation tier — big emoji scene, tier name in Fredoka, wish-you-were-here caption (the existing flavor line). Unlocking a tier **flips the postcard over** (the one sanctioned flip animation). | Accommodation ladder, era modals, Family Album entries | `┌───────────┐`<br>`│ 🏨  ☀️ 🌊 │`<br>`│ 2-STAR    │`<br>`│ "greetings│`<br>`│  from…"   │`<br>`└───────────┘` |
| **Passport stamp** | Owned destinations render as inked stamps in a passport grid; unowned = one empty dotted outline (the next stamp), rest invisible (R1). | Destinations, premium collection | `╭─────╮`<br>`│MONACO│ ink-rotated ~-6°`<br>`╰─────╯` |
| **Luggage sticker** | Achievements = round/oval stickers slapped on a suitcase graphic. Locked = blank sticker outline `???` (only for already-visible categories). | Trophies screen | suitcase with stickers |
| **Boarding pass** | Transport & travel purchases render as a boarding-pass card (dashed perforation, big route arrow). | Transport, jets, NG+ ("boarding pass to New Game+") | `✂ - - - - - -`<br>`SHED → SUN` |
| **Polaroid** | Story beats & the Family Album render as polaroids: emoji scene on top, wry caption in the white strip. | Story panel, beat modals, lineage album | |
| **Sun-meter** | Comfort's progress bar is a sun that rises along an arc — the fill *is* the sunshine yellow. | Comfort (HUD + amenity panel) | `☀️ rising over a hill arc` |
| **Progress bar** | Pill-shaped, Sunshine fill on a sand track; Sky Blue variant for "on the way to a locked thing"; Green flash at 100%. Digits beneath in Dune, small (R6). | Every gate: comfort→next tier, taste gates, island currencies | `[███████░░░] 70%` |
| **Slider** | Real `<input type=range>` styled with a pink thumb ("beach ball"). | Concierge/staff/butler **budget dials** (replacing the 5%/10%/25%/50% preset buttons), bulk-buy quantity | `──────🔴───` |
| **Chip/tab pill** | Rounded pill; active = Sunshine fill + Ink text; new-content = pulsing green dot (already live). | Tab bar, HUD chips, filters | |
| **Celebration toast** | Card sliding from the top-right with a colored left rail (existing system, restyled): green rail = unlock, pink = story, yellow+confetti = celebrate. Batched: max 3 visible, rest queue (fixes toast stacking). | All notifications | |
| **Era modal** | Full-width postcard takeover with confetti, one Fredoka headline, one CTA. Replaces every `confirm()`/`prompt()` still in the code. | See modal inventory §4 | |

**Imagery policy:** no photo assets. Scenes are built from *large emoji compositions* on tinted
gradient skies (CSS only) — e.g. the Home tab header shows the current tier's postcard scene:
`🌧️🚌` at the shed → `🏨🌤️` at 2-star → `🏝️☀️⛵` on the island. The sky gradient warms as you
climb (grey-blue → sky blue → golden hour). Zero image files, infinitely scalable, on-theme.

---

## 4. Presentation tiers & the modal inventory

Every unlock is assigned a tier. **T1 is rare by design** — if everything celebrates, nothing does.

| Tier | Treatment | Frequency budget |
|---|---|---|
| **T1 — Era modal** | Full postcard takeover + confetti + one CTA. The game pauses for a breath. | ~10 times in a full playthrough |
| **T2 — Celebration toast** | Yellow rail, confetti burst on the toast itself, 6s. | A few per session |
| **T3 — Quiet toast** | Green rail "New: …", 4s. | Small wins |
| **T4 — Silent + dot** | The thing simply exists now; its tab gets the pulsing dot. | Everything else |

**T1 Era-modal inventory** (complete list — nothing else gets a modal):

1. **The Crossroads** (beat 6) — choose your branch. Four polaroids to pick from. *(Replaces the current inline card.)*
2. **First pool** (tier 6) — "There is a POOL."
3. **The Sail-Shaped Hotel** (tier 12) — velvet-rope era begins.
4. **Seven Stars & the patron** (beat 21).
5. **The Deed** (first `buyProperty`) — "You own the walls." *(Kevin from the front desk weeps.)*
6. **The Invitation** (beat 22).
7. **Retirement** (ascension) — the Family Album ceremony: retiree polaroid → epitaph → name-the-heir input. *(Replaces `prompt()`/`confirm()`.)*
8. **The Island Listing → SOLD** (beat 28 reveal, and purchase).
9. **First resort building** (beat 29) — "You host now."
10. **Legend** (first legendReset) + **New Game+** boarding pass.

Everything currently using browser `confirm()`/`prompt()` (island buy, legend reset, NG+, respec,
heir naming) migrates into these styled modals. The away-modal ("While You Were Away") gets the
postcard skin: "**Meanwhile, at the resort…**" with the earnings as a sun-meter fill.

---

## 5. The Journey — every phase, its unlocks, and its presentation

The player's trip in 12 stages. Per feature: **Unlock rule** (quoted from the shipped engine —
the UI never invents gates) → **Tier** (§4) → **Presentation**. Anything not listed for a stage
is *not on screen* during it (R2).

### Stage 0 — The Bus Stop *(minute 0)*
**On screen:** sand background, one polaroid (beat 1), the rain-check onboarding line, the Tap
button, the Shed postcard, Cash chip. **That's the whole game.** No tabs yet (a lone Home).
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Tap / umbrella | start | — | Big pink pill button, bottom bar. |
| First generator | affordable | T3 | Appears as the first card under the postcard. |
| Comfort chip + sun-meter | first Comfort > 0 | T4 | Sun-meter fades into the HUD (R7). |

### Stage 1 — The Soggy Years *(tiers 0–2 · beats 1–4)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Amenities panel | first amenity crosses `unlockComfort` | T3 | "New little luxury" toasts (already gated correctly — no future leaks). Items render as a shelf; only *reachable* items visible, next-locked as one `???` row (R3). |
| Bank / wallet | wallet ≥ ~70% full first time | T3 | Card appears with a fill-meter (wallet as a **money belt** graphic — a pill meter). |
| Ladder lookahead | always | — | Next rung named + comfort bar; then `??? needs Comfort ≥ X` ×2; then "…the road keeps climbing." (Live today; restyle as postcards.) |
| Income tab | 2nd generator tier unlocked | T4 | Tab bar appears (Home + Income) — the moment the game visibly *grows* (R5). |

### Stage 2 — First Wanderings *(tier 3+ / beat 5)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Destinations map | `story.seen(5) \|\| tier ≥ 3` | **T2** | **Travel tab is born** (dot pulses). Passport skin: owned = stamps, exactly one empty dotted outline = next stamp (R3). |
| Transport | with the map | T4 | Boarding-pass cards inside Travel. |

### Stage 3 — Stars & Splashes *(tiers 4–8 · beats 6–10)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| **The Crossroads** (branch choice) | beat 6 | **T1** | Era modal: four polaroids (vlogger/traveler/crypto/connoisseur), pick one. Growth tab is born with it. |
| Skills / Personal Growth | `bestComfort ≥ 20 \|\| tier ≥ 1` (early, quiet) | T4 | Lives in Growth; each skill = a pill meter with an emoji face. |
| Poolside | `flags.poolTease \|\| tier ≥ 6` | **T1** | "There is a POOL." Era modal, then a Home card with the floatie shelf. |
| Beachfront | `tier ≥ 7` | T2 | Home card; sky gradient in the header warms a step. |
| Wellness Wing | `tier ≥ 8` | T3 | Home card. |

### Stage 4 — Five-Star Life *(tiers 9–11 · beats 11–15)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Concierge (automation) | `tier ≥ 9 \|\| seen(13)` | T2 | Home card. Budget presets → **slider** (beach-ball thumb). Off by default, one toggle. |
| Creator Dashboard | `vlogger points > 0 \|\| seen(14) \|\| tier ≥ 11` | T2 | Income tab. **Branch rule:** only *your* branch's desk appears via points; the tier-11 fallback quietly adds the others late (engine already does this — the UI simply never previews them, R2). Clout chip joins the HUD here (R7). |
| Crypto Lounge | `crypto points > 0 \|\| seen(14) \|\| tier ≥ 11` | T2 | Income tab. Market events = toasts with 📈/📉 rails. |
| Gallery & Cellar | `connoisseur points > 0 \|\| seen(14) \|\| tier ≥ 11` | T2 | Income tab. Art/wine as framed cards (postcard variant). |
| Garage | `seen(15) \|\| tier ≥ 11 \|\| owns a car` | T2 | Travel tab; cars as boarding-pass cards with an equip toggle. |

### Stage 5 — Sea & Sky *(beats 16–17)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Marina | `seen(16) \|\| tier ≥ 11 \|\| owns a boat` | T2 | Travel tab. Sea destinations' stamps show a ⛵ watermark *only after* a boat exists (no teasing sea pages, R2). |
| Hangar | `seen(17) \|\| tier ≥ 11 \|\| owns a jet` | T2 | Travel tab. |
| Logistics capstone | own car+boat+jet | T2 | The three boarding passes fuse into one gold-edged pass. |

### Stage 6 — The Velvet Rope *(tiers 12–13 · beats 18–20)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Sail-Shaped Hotel | tier 12 (taste gate 30) | **T1** | Era modal. Taste gate renders as a Sky-Blue bar toward the rope, *only on the next rung* (R3). |
| Staff / the Butler | `seen(19) \|\| tier ≥ 13` | T2 | Income tab ("the household works for you"). Staff = polaroid portraits with a morale sun-meter each. Auto-buy budget = slider. |
| Household roles (E20) | staff era + cap | T3 | Appear one by one as affordable (R3), never as a full greyed roster. |

### Stage 7 — The Summit *(tiers 14–15 · beats 21–22)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Seven Stars + patron | beat 21 (`accTier 14`) | **T1** | Era modal; the patron gets a recurring silhouette polaroid ("no front desk at all"). |
| Exclusivity meter | connoisseur-active only | T4 | A velvet-rope meter in the Gallery card. Non-connoisseurs never see it (R2). |
| The Invitation | beat 22 | **T1** | Era modal; sets up the island *as mystery* — the modal shows a `???` island silhouette, not the listing. |

### Stage 8 — Owning It *(tiers 16–19 · beats 23–25)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Property (deeds) | `propertyUnlocked('bungalow') \|\| owns any` | **T1** on first deed | Home tab: deed = a framed **house postcard** with a pink "Buy the deed" CTA; upgrade tree renders as a garden path of nodes (indent → path). |
| Grounds + estate wing | villa/estate owned | T2 | Grounds clusters as garden cards; estate staff join the staff board. Synergy = one big sun-meter "×N". |
| Premium destinations | taste gate + (property \|\| exclusivity) | T2 each | Passport gains a **gold page**; five gold stamp slots appear *only once the first is unlockable* — then all five outlines show (a deliberate R1 exception: a collection page is a promise, and this one is already earned). |

### Stage 9 — Letting Go *(beat 26+)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Ascension / Retirement | `seen(26) \|\| count > 0` | **T1** | Legacy tab is born. Retirement ceremony modal: polaroid → epitaph → heir naming (replaces `prompt()`). Legacy chip joins the HUD (R7). |
| Family Album | first retirement | T4 | Polaroid wall in the Legacy tab. |
| Skill Tree | `ascension.count > 0` | T2 | Legacy tab; three branches as three postcard racks; locked nodes show name only when their `requires` parent is owned, else `???` (R1). |

### Stage 10 — The Island *(beats 28–29)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Island Listing | `seen(28) \|\| legacy ≥ 20` | **T1** | The listing = a real-estate brochure card (already built) restyled as a **glossy magazine spread**; 4 currency progress bars (already built) in the four brand colors. |
| SOLD / relocation | `buyIsland` | **T1** | Confetti era modal; header sky gradient hits full golden-hour permanently. |
| Resort buildings | island owned | **T1** first build, then T3 | Developer dashboard: buildings as postcard row, occupancy = sun-meter, upkeep in Dune. |
| Tier 21 | `requiresIsland` | T2 | The final postcard. |

### Stage 11 — Legend *(beat 30+)*
| Feature | Unlock rule | Tier | Presentation |
|---|---|---|---|
| Legend + meta-shop | `ascensions ≥ 3` | **T1** | Legacy tab; Legend points = 👑 chip. Shop = five gold luggage stickers. |
| New Game+ | 1 ascension or island | **T1** | A boarding pass: "SHED → SHED (but sunnier)". Confirm inside the modal. |
| Trophies & stats | first trophy | T4/T3 | Suitcase + stickers; locked stickers = blank outlines with `???` (only in already-open categories, R1). Seasonal destination = a rotating "in season now!" stamp with a Sky-Blue ribbon, island owners only. |

---

## 6. Global simplifications (the "bare necessities" pass)

1. **HUD diet (R7):** start with Cash + Comfort. Chips join as currencies enter the story. Tier
   name moves out of the HUD into the Home postcard header.
2. **Debug drawer (R8):** speed presets, Set×, Debug, Export/Import, Reset move behind ⚙️. The
   player bar keeps exactly: **Tap** · energy pill · **Save** dot (auto-save indicator, not a button).
3. **Toast batching:** max 3 stacked; overflow queues; identical types coalesce ("3 new little
   luxuries ✨"). Celebrations always jump the queue.
4. **One-goal panels (R3):** every list shows owned + next + one `???`. "Show all" is a quiet
   Dune link for completionists — collapsed by default.
5. **Card headers become scenes:** each card's h3 gets its emoji scene + tinted header band —
   scannable by shape and color, not by reading.
6. **Story = polaroid strip:** the Story card shows the *latest* polaroid only; tapping opens the
   album of seen beats (progress "Beat 12 / ???" — total count hidden until the final act, R1).

---

## 7. Accessibility & tone guardrails

- Contrast: AA minimum everywhere; Ink-on-Sand and Ink-on-Sunshine both pass AAA. White-on-pink
  only at ≥ 18px bold or on `#D9186E`.
- All meters keep `role="progressbar"` + aria values (already the house pattern).
- Focus rings: 2px Sky Blue, never removed. Tab bar is arrow-key navigable (`role="tablist"`).
- `prefers-reduced-motion`: confetti → a static ✨ frame; postcard flip → crossfade; dot pulse → solid.
- Tone: wry Dutch-tourist voice is part of the UX. Rules: self-deprecating, never mean; the
  player is teased, never insulted; money is absurd, never glorified. (The goat stays.)

---

## 8. Implementation roadmap

| Phase | Scope | Touches | Risk |
|---|---|---|---|
| **U1 — Theme** | Palette swap to light holiday tokens, Fredoka/Nunito, pill shapes, restyled tabs/toasts/buttons | `game.css`, `index.html` (font link) | None (pure CSS) |
| **U2 — Kit** | Sun-meter, postcard, stamp, sticker, boarding-pass, slider components; icon sprite vendored | `game.css`, `ui.js` render fns, `assets/icons.svg` | Low |
| **U3 — Reveal choreography** | HUD diet, debug drawer, toast batching, one-goal lists, T1 era-modal system replacing `confirm()`/`prompt()` | `ui.js`, small `index.html` | Low — engine untouched |
| **U4 — Journey polish** | Stage-by-stage matrix pass (§5): every unlock wired to its tier & metaphor; sky-gradient eras | `ui.js` | Low |
| **U5 — QA** | Playwright screenshot sweep per stage (the harness we already use), a11y pass, reduced-motion pass | dev only | — |

Definition of done per phase: `npm test` green (2604 checks — engine untouched), harness island
**29705s**, and a Playwright screenshot sweep at fresh/mid/late/mobile showing no future-content
leaks (grep the DOM for names of not-yet-unlocked systems — an automatable spoiler check).

---

*Everything in this plan hides the road ahead and celebrates every arrival — because the whole
game is the feeling of rounding a corner you didn't know was there, somewhere sunny.* 🌞
