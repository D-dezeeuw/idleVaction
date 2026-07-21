---
name: verify
description: >-
  Run idleVaction's full verification pass on the strongest model and fix what it surfaces —
  the test suite, the balance harness, JS syntax, and the commit-verification (Verified-on-
  GitHub) check. Use before pushing or opening a PR, whenever a balance constant changed, or
  when the stop-hook flags uncommitted or Unverified work. Trigger words: verify, pre-push,
  green the build, check before push, make commits Verified.
model: claude-fable-5
effort: high
allowed-tools: Read, Edit, Bash
---

# /verify — pre-push verification & fix

Run this as the final gate before pushing. Be adversarial: assume the change is subtly wrong
until the numbers prove otherwise. Fix what you find; don't weaken assertions to pass.

## 1. Code checks
```bash
npm test                 # must be ALL PASS
npm run harness          # only if a balance constant changed — see check below
```
- `npm test` (`js/dev/selftest.mjs`) must end in **ALL PASS**. On failure, find the real cause
  and fix it.
- If any of `GEN.*`, `COMFORT.*`, `MILESTONE_*`, `ACC.*`, `LEGACY_*` in `js/config.js` changed,
  run `npm run harness` and confirm: island near the ~20h target, monotone beat curve, and
  **peak `log10(cash)` well under ~290** (no return of the finite-time singularity / `double`
  overflow — see `docs/math-proof.md`).
- `node --check <file>` for every `.js`/`.mjs` you touched.

## 2. Commit-verification check (Verified on GitHub)
Every commit you authored in `origin/<branch>..HEAD` must have committer email
`noreply@anthropic.com`.
```bash
git config user.email noreply@anthropic.com && git config user.name Claude   # if unset
BR=$(git branch --show-current)
git log --format='%h  %ce  %s' "origin/$BR..HEAD"                             # audit
# Fix your OWN unpushed commits only:
git commit --amend --no-edit --reset-author                                  # tip commit
git rebase --exec "git commit --amend --no-edit --reset-author" "origin/$BR" # earlier commits
```
**Never** `--amend`/`rebase` a squash-merge commit already on `origin/main` (committer
`GitHub <noreply@github.com>`) — it's GitHub's, and rewriting merged history is wrong. To keep
future merges Verified, use **"Rebase and merge"** instead of "Squash and merge". Full
explanation: `AGENTS.md §3`.

## 3. Report
Print PASS/FAIL per check with the concrete numbers (harness island time + peak log10, or the
failing assertion). If you fixed something, say what and why. Only report success when every
check is green and all commits are verifiable.
