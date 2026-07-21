# 02 — Branching Storyline (≥ 30 levels)

The story is a **spine of 30+ beats** that the player unlocks by hitting **Comfort /
accommodation / path thresholds**, with **branch choices** that steer flavor and grant
mechanical divergence — while always **reconverging** so no build gets stranded. Story is
pure data (`js/data/story.js`): each beat is `{id, requires, text, choices[], grants,
unlocks}`. Choices set `story.flags` and nudge `story.branch`, which colors later beats and
gates a few branch-exclusive perks. The main path is always completable on any build.

---

## The premise

You are a broke, perpetually-drizzled-on tourist from the **cold, damp, soggy Netherlands**.
Armed with a poncho, a stroopwafel, and irrational optimism, you claw your way from a
**bug-infested shed of a motel** up the entire ladder of human vacation luxury to a **private
island**, upgrading everything — where you sleep, how you travel, your body, your charm, and
eventually the staff who cater to your every whim.

## The three-act, four-branch structure

```
ACT I  — SOGGY BEGINNINGS (beats 1–10)   shared spine; branch seeds planted
              │
              ├── choose emphasis (soft, reversible) ──►
ACT II — THE CLIMB (beats 11–22)                  four flavored lanes, reconverging hubs
      ┌───────────┬───────────┬────────────┬────────────┐
   Traveler    Vlogger      Crypto      Connoisseur
   (breadth)   (clout)     (passive)    (taste)
      └───────────┴───────────┴────────────┴────────────┘
              │  reconvergence: "The Invitation" (beat 22)
ACT III — THE SUMMIT (beats 23–30+)   private bungalow → villa → island → legacy → NG+
```

Branches are **emphasis, not exile**: picking "Vlogger" at beat 11 makes vlogger beats
richer and grants a vlogger-only cosmetic + small `×`, but every player still passes the same
30 gates. This satisfies "overarching branching storyline, min 30 levels" without fragmenting
the 20-hour experience.

---

## The 30-beat spine (each = a story level with a gate & a reward)

| # | Beat title | Gate (unlocks when…) | Grants / hook | Epic |
|---|---|---|---|---|
| 1 | *Rain Check* | new game | Netherlands intro; first cash trickle; the shed | 1 |
| 2 | *Guests With Six Legs* | Comfort ≥ C1 | fumigation upgrade; first amenity | 2 |
| 3 | *Checkout Time* | Acc tier ≥ 1 | leave the shed → the motel; travel unlocked | 2–3 |
| 4 | *The Hostel Bunk* | Comfort ≥ C3 | social tiers seed; meet recurring NPCs | 3 |
| 5 | *First Passport Stamp* | own 1 destination | World-Traveler seed; transport tier | 4 |
| 6 | *Wi-Fi & Ambition* | Clout > 0 OR Savvy > 0 | **branch seeds**: camera vs. wallet vs. wine | 4–5 |
| 7 | *One Star, Big Dreams* | Acc tier ≥ 4 | 1-star hotel; amenities bloom | 5 |
| 8 | *Continental Breakfast* | Comfort ≥ C7 | 2-star; pool teased | 6 |
| 9 | *Making a Splash* | Acc tier ≥ 6 | **pool unlocked** (floatables!) | 7 |
| 10 | *Poolside Persona* | Charisma L ≥ 5 | ACT I close; pick your emphasis | 8–9 |
| 11 | *Fork in the Lobby* | Comfort ≥ C10 | **BRANCH CHOICE** → set `story.branch` | 9 |
| 12 | *The Body You Travel In* | Body L ≥ 8 | tanning/fitness/spa loop opens | 10 |
| 13 | *Five-Star Frame of Mind* | Acc tier ≥ 10 | 5-star; concierge | 11 |
| 14 | *Going Viral* (V) / *Whale Watching* (C) / *Grand Tour* (T) / *Provenance* (Co) | path pts ≥ P1 | branch-flavored beat; branch `×` | 12–14 |
| 15 | *Keys to the Coupe* | own a car | private logistics I (cars) | 15 |
| 16 | *Sea Legs* | own a boat | private logistics II (boats) | 16 |
| 17 | *Wheels Up* | own a jet | private logistics III (planes) | 17 |
| 18 | *The Sail-Shaped Hotel* | Acc tier ≥ 14 | 6-star (Burj-style) | 18 |
| 19 | *At Your Service* | hire first butler | staff I; task automation seed | 19 |
| 20 | *The Whole Household* | staff ≥ 5 | staff II; deeper automation | 20 |
| 21 | *Seven Stars* | Acc tier ≥ 16 | 7-star experience; exclusivity meter | 21 |
| 22 | *The Invitation* | Comfort ≥ C20 | **reconvergence**; a mysterious patron | 21–22 |
| 23 | *A Bungalow of One's Own* | Acc tier ≥ 18 | private bungalow | 22 |
| 24 | *Villa Vita* | Acc tier ≥ 20 | private villa; grounds & staff wing | 23 |
| 25 | *Where the Rich Hide* | Taste L ≥ 25 | exclusive destinations (Monaco/Dubai/Maldives…) | 24 |
| 26 | *Letting Go* | meet ascension ROI | **ASCENSION unlocked**; Legacy explained | 25 |
| 27 | *Who You Become* | ascend ≥ 1 | permanent **skill tree** (physique/character) | 26 |
| 28 | *The Island Listing* | Legacy ≥ L1 | **private island** purchasable | 27 |
| 29 | *Building Paradise* | own island | island development; your own resort | 28 |
| 30 | *Empire of Leisure* | Comfort ≥ C30 | prestige layer 2; **New Game+** | 29–30 |
| 30+ | *Legends of Leisure* | endless | recurring legend beats, seasonal destinations | 30 |

`C1…C30` are the Comfort thresholds; they line up with the accommodation ladder and are
listed in `config.STORY_GATES`. Beats 26–30 are the ascension/endgame loop and are
**repeatable-with-variation** (New Game+ reshuffles destinations, raises gates).

---

## Branch definitions (`story.branch`)

Each branch = a flavor + one persistent perk + branch-only beat variants at 14/18/22.
All four still reach beat 30.

- **`traveler` — The Grand Tourist.** Perk: destinations `−15%` cost, `+1` transport slot.
  Fantasy: "been everywhere, seen everything." Beat variants emphasize maps, stamps, logistics.
- **`vlogger` — The Luxury Vlogging Backpacker.** Perk: `Clout` gain `×1.25`, active-play
  combo stronger. Fantasy: audience, sponsors, "storytime by the infinity pool."
- **`crypto` — The Poolside Lounger.** Perk: Savvy passive `×1.3`, market-event upside `+`.
  Fantasy: laptop-on-a-lounger, "money works while I tan."
- **`connoisseur` — The Old-Money Aesthete.** Perk: luxury tiers `+25%` Comfort, exclusivity `×`.
  Fantasy: quiet, expensive taste; the antithesis of the loud vlogger.

**Combination builds are first-class:** because branches are emphasis + reversible focus
(you can re-spec `paths` points), a player can be a *"crypto-funded vlogging world traveler"*
— the story just leans on whichever `flags` are strongest. A handful of **hybrid beats**
(e.g. beat 14 unlocks an extra line if two paths ≥ P1) reward mixing.

---

## Choice → flag → consequence (data example)

```js
{
  id: 11, title: "Fork in the Lobby",
  requires: { comfort: 'C10' },
  text: "The concierge slides four brochures across the marble...",
  choices: [
    { label: "Point the camera at yourself",  set: { branch:'vlogger'   }, grant:{ clout: 500 } },
    { label: "Open the trading app",          set: { branch:'crypto'    }, grant:{ savvyXp: 800 } },
    { label: "Book the next six countries",   set: { branch:'traveler'  }, grant:{ destinations: 1 } },
    { label: "Ask about the wine list",       set: { branch:'connoisseur'}, grant:{ tasteXp: 800 } },
  ],
  grants: { pathPoints: 10 },        // everyone gets baseline progress
  unlocks: ['beat:12', 'ui:branchBadge']
}
```

Story never blocks the economy: if a player ignores story, beats still auto-satisfy from
normal progression (gates are Comfort/tier/level based). Story is the **narrative skin** over
the math spine — motivating, flavor-rich, branch-aware, and always completable.

## Writing/tone guide (for all beat text)

Wry, warm, self-deprecating, very Dutch-abroad. Weather jokes early, absurd-luxury jokes late.
Each beat ≤ ~90 words. Always end on a hook toward the next unlock ("…but the concierge
mentioned the *rooftop* pool is members-only"). Beat text is data → fully localizable later.
