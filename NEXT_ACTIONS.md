# Burger Dash Next Actions

## Execute In This Order
1. Visually inspect the actual rendered map/corner geometry.
2. Fix any wall piece still protruding into the hallway/turn path.
3. Verify the turn reads correctly in the live build before broader polish.
4. Improve coin and obstacle visual quality once map trust is restored.
5. Resume chaser/UI identity polish only after the corridor geometry is visibly correct.
6. Explore Build Mode / editable-map direction only after the current runner is trustworthy.

## Immediate Safe Tasks
- Capture visual evidence of the bad turn geometry from the running build.
- Identify which wall/frame/floor-guide piece is intruding into the turn.
- Treat the current turn-opening work as failed QA until the live build is visibly correct.
- Keep fixes localized to geometry/path readability.
- Avoid broad decorative churn until the turn bug is genuinely resolved.

## Stop Conditions
Pause and escalate if the next step requires:
- deleting files
- rewriting `js/game.js`, `js/track.js`, or `js/player.js`
- deploy-affecting changes
- incompatible save format changes

## Notes
The new Build Mode idea is promising and should stay on the roadmap, but the immediate job is to make the current map visibly correct and fun to run.
