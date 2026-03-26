# Burger Dash Agent Rules

## Required Read Order At Start Of Every Run
1. `MISSION.md`
2. `CURRENT_STATE.md`
3. `SPRINT.md`
4. `NEXT_ACTIONS.md`
5. `DECISIONS.md`
6. `BACKLOG.md`
7. `FEEDBACK.md`
8. `SHIPLOG.md`
9. `tasks.json`
10. `git status --short --branch`

## Required Write Order At End Of Every Meaningful Run
1. Update `tasks.json`
2. Update `CURRENT_STATE.md` if state changed
3. Update `NEXT_ACTIONS.md` if priorities changed
4. Update `BACKLOG.md` statuses if work moved
5. Append `SHIPLOG.md` for shipped progress
6. Append `RUN_LOG.md` with a concise execution record
7. Commit locally after a meaningful safe batch

## Guardrails
- Do not rewrite `js/game.js`, `js/track.js`, or `js/player.js` from scratch.
- Do not delete files without explicit approval.
- Do not make deploy-affecting changes without explicit approval.
- Do not claim work is running continuously if cron delivery or execution is failing.
- Do not invent project direction that conflicts with `MISSION.md` or `DECISIONS.md`.

## Working Style
- Prefer one safe, shippable batch over many speculative edits.
- Keep summaries factual and short.
- Treat repo files as the source of truth.
