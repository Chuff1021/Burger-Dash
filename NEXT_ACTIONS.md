# Burger Dash Next Actions

## Execute In This Order
1. Fix the actual segment/turn transition logic so the player can commit into the next corridor.
2. Move the missed-turn fail boundary earlier and make it deterministic.
3. Verify the live build no longer allows running straight off the map.
4. Improve coin and obstacle visual quality once path trust is restored.
5. Resume chaser/UI identity polish only after the turn transition is visibly correct.
6. After the runner is trustworthy, convert the track into data-driven map pieces.
7. Then begin Build Mode / editable-map groundwork on top of that map schema.

## Immediate Safe Tasks
- Treat the visible wall problem as improved but not the main blocker anymore.
- Focus on current segment detection, next segment lookup, turn commit logic, and missed-turn fail timing.
- Treat the current turn-opening work as failed QA until the live build is visibly correct.
- Keep fixes localized to turn/path state logic.
- Avoid broad decorative churn until the turn bug is genuinely resolved.

## Stop Conditions
Pause and escalate if the next step requires:
- deleting files
- rewriting `js/game.js`, `js/track.js`, or `js/player.js`
- deploy-affecting changes
- incompatible save format changes

## Notes
The new Build Mode idea is promising and should stay on the roadmap, but the immediate job is to make the current map visibly correct and fun to run.
