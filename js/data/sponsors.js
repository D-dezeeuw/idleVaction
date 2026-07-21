// data/sponsors.js — timed, OPT-IN Clout multipliers (E12 "Lights, Camera, Clout").
// Row shape: { id, name, mult, durationSec, cooldownSec?, requires, flavor }. A deal
// must be explicitly ACCEPTED (engine.acceptSponsor) — nothing here auto-applies, and
// only one can ever be active at a time (state.sponsors.active is a single slot, never
// an array — see config.SPONSOR's comment). `cooldownSec` overrides config.SPONSOR.
// cooldownSec per row (a bigger mult earns a longer cooldown, mirrors the pool cocktail
// chain's per-row costGrowth override convention in data/amenities.js). `requires`
// gates which deals can even be OFFERED — escalating Clout/Charisma thresholds so
// stronger deals arrive deeper into the vlogger economy (E12-S7-T7 "scale sponsors with
// charisma/branch").
export const SPONSORS = [
  { id: 'energy_drink', name: 'Sugar-Free Energy Drink Co.', mult: 1.5, durationSec: 60,
    requires: {},
    flavor: 'Tastes like a 9-volt battery. Pays like one too, briefly.' },
  { id: 'luggage_brand', name: 'Discount Luggage Brand', mult: 2, durationSec: 90,
    requires: { clout: 50 },
    flavor: '"As seen in one (1) group chat." Your poncho gets a cameo.' },
  { id: 'crypto_exchange', name: 'Definitely-Not-A-Scam Exchange', mult: 3, durationSec: 45, cooldownSec: 300,
    requires: { clout: 200, charisma: 3 },
    flavor: 'They pay extremely well. Nobody asks in what.' },
];
