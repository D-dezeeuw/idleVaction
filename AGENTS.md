# AGENTS.md — idleVaction agent & model-routing playbook

This file tells coding agents how to work on **idleVaction** (a dependency-free vanilla-JS
idle game — see `docs/PLAN.md` for the full 3,000-task plan). It defines the **model-routing
policy**, how to run/verify the project, and how **commit verification** works so pushes land
as **Verified** on GitHub.

> Claude Code loads `CLAUDE.md`, which imports this file (`@AGENTS.md`). Other agents that read
> `AGENTS.md` directly get the same instructions.

---

## 1. Model-routing policy (who runs on what)

The build is deliberately **multi-model**: match the model to the task, not one model for
everything. There are three roles.

| Role | Model | When | How to invoke |
|---|---|---|---|
| **Orchestrator** | **Opus 4.8** (`claude-opus-4-8`) | The driving session. Plans, decomposes epics, dispatches subagents, integrates results, and owns architecture + the math/economy decisions. Stays in the loop between phases. | This is the top-level session model — set it with `/model claude-opus-4-8`. |
| **Implementer** | **Sonnet 5** (`claude-sonnet-5`) | The ~85% mechanical, well-specified build work: authoring data (generators, amenities, story beats), wiring data into the engine, UI buttons, straightforward tests. High volume, near-Opus coding quality at lower cost. | `@implementer` subagent (`.claude/agents/implementer.md`). |
| **Verifier / verification-fixer** | **Fable 5** (`claude-fable-5`) | Verification **and** the fixes it surfaces: run the suite + harness, adversarially check economy/math/save/offline correctness, fix failures, and ensure commits will show **Verified**. The most capable model, because a wrong "looks fine" here ships a broken economy. | `@verifier` subagent (`.claude/agents/verifier.md`) or the `/verify` skill. |

Plus one specialist that stays on the strong reasoning model:

| Role | Model | When | How to invoke |
|---|---|---|---|
| **Balance-tuner** | **Opus 4.8** (`claude-opus-4-8`) | The correctness-critical ~15%: the multiplier stack, cost/production curves, the soft-capped milestone, ascension/prestige accounting, precision/BigNumber, and fitting the ~20h curve with the harness. Do **not** hand this to the Sonnet implementer. | `@balance-tuner` subagent (`.claude/agents/balance-tuner.md`) or the `/balance-harness` skill. |

**The loop in one line:** Opus 4.8 orchestrates → fans out `@implementer` (Sonnet 5) for the
build and `@balance-tuner` (Opus 4.8) for the math → `@verifier` (Fable 5) verifies and fixes →
Opus 4.8 integrates and pushes. Why this split (with the cost/quality reasoning) is in
`docs/PLAN.md` and the analysis history; the short version: Opus-level correctness where it
counts, Sonnet pricing across the mechanical bulk, Fable rigour on the final gate.

---

## 2. Run & verify

No build step, no runtime dependencies. `package.json` (`type: module`) exists only for these
local tools; GitHub Pages serves the static files directly.

```bash
npm test          # js/dev/selftest.mjs — asserts economy growth, ladder, ascension, save, offline
npm run harness   # js/dev/harness.mjs  — prints the ~20h pacing curve (island time, peak magnitude)
npm run demo      # js/dev/demo.mjs     — scripted strategy playthroughs (see the header for flags)
npm run report    # js/dev/report.mjs   — scenario suite → tools/dashboard/data/report.json
npm run serve     # python3 -m http.server 8080 — play at :8080, dashboard at /tools/dashboard/
```

For any change that touches pacing, generate a report and eyeball the **simulation
dashboard** (progression vs the golden line/bands, per-tier deviation, paths, skills —
`docs/09-sim-dashboard.md`) before and after; the selftest pins enforce, the dashboard
explains.

**Definition of done for any change:** `npm test` is green, and if you touched any balance
constant (`GEN.*`, `COMFORT.*`, `MILESTONE_*`, `ACC.*`, `LEGACY_*`), `npm run harness` still
lands the island near the ~20h target with peak `log10(cash)` safely under ~290 (see
`docs/math-proof.md`). Run the `@verifier` (Fable 5) before pushing anything non-trivial.

---

## 3. Commit verification (Verified vs Unverified on GitHub)

GitHub marks each commit **Verified** or **Unverified**. In this environment a commit is
Verified when it is **signed and its committer email is `noreply@anthropic.com`** (the identity
the signing key is registered to). The repo's stop-hook enforces this on every push: it flags
any commit in `origin/<branch>..HEAD` whose committer email isn't `noreply@anthropic.com`.

**Set the identity once (already configured in this repo's clones):**
```bash
git config user.email noreply@anthropic.com
git config user.name  Claude
```

### Git flow — feature branch → local merge to `main` (NO rebase-merge, NO PR)
Land every phase with a plain **local merge**, not GitHub's rebase/squash-merge and not a PR.
The per-phase flow is:

1. **Feature branch** — work on the designated branch, based on the latest `main`.
2. **Implementation** — build the phase.
3. **Verification & testing** — `npm test` green, `npm run harness` in-band (see §2).
4. **Bug fixing** — fix whatever verification surfaces; re-verify.
5. **Commit the feature branch and push** — `git push -u origin <branch>`.
6. **Merge to `main`, commit and push:**
   ```bash
   git checkout main && git fetch origin main && git merge --ff-only origin/main
   git merge --no-ff <branch> -m "Merge <phase> to main"   # explicit merge commit
   git push origin main
   ```
7. **Re-sync the feature branch** onto the new `main` for the next phase:
   `git checkout <branch> && git merge --ff-only main` (fast-forward; no force-push needed).

**Why local merge (not rebase-merge):** merging locally keeps every landed commit's committer as
`noreply@anthropic.com`, so both the feature commits **and** the merge commit are **signed and
Verified** (the signing key is registered to that email) — on the feature branch *and* on
`main`. GitHub's rebase/squash-merge instead re-writes committers to the merging account and
web-flow-signs, which desyncs the feature branch from `main` (forcing force-pushes) and trips the
stop-hook's `origin/<branch>..HEAD` committer check with false positives. The local flow keeps
`origin/<branch>..HEAD` empty after each merge and the hook quiet, with no history rewrites.

- **Never** `--amend`/`rebase`/`reset-author` a commit already on `origin/main` — rewriting
  merged history forks your branch off `main`.

### Fixing an Unverified commit that *you* authored (not yet merged)
Only when the flagged commit is your own unpushed feature-branch work:
```bash
# tip commit:
git commit --amend --no-edit --reset-author
# earlier commits on the branch:
git rebase --exec "git commit --amend --no-edit --reset-author" origin/<branch>
# then:
git push -u origin <branch>       # force-with-lease if you rewrote history
```
The `@verifier` agent / `/verify` skill runs this check as part of its pre-push pass.

### Follow-up work after a branch is merged
For new work, continue on the same branch re-synced onto the latest `main` (step 7 above),
commit the fresh work, and push. Don't stack new commits on stale, already-merged history.

---

## 4. Conventions

- **Architecture / math / plan:** `docs/00`–`docs/07`, `docs/math-proof.md`, `docs/PLAN.md`.
- **All balance numbers live in `js/config.js`** — tune there, never hardcode in engine code.
- **Subagents:** `.claude/agents/*.md`. **Skills:** `.claude/skills/*/SKILL.md`. Both are
  committed to the repo so they load in Claude Code cloud/web/iOS sessions (personal
  `~/.claude/*` tools do **not** transfer to cloud sessions).
- Keep changes dependency-free and GitHub-Pages-static. No bundler, no npm runtime deps.
