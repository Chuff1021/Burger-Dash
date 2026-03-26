# Burger Dash Decisions

## Locked Decisions
- Burger Dash is a burger-joint endless runner, not a generic corridor runner.
- A visible villain/chaser behind the player is a core product requirement.
- The current core movement and turn foundation stays in place.
- `js/game.js`, `js/track.js`, and `js/player.js` must not be rewritten from scratch.
- Progress should happen through additive, localized, testable batches.
- Fun and readability outrank new features.
- Character select and progression are important, but secondary to core-run quality.
- Burger Dash should evolve toward a data-driven map system that can support a kid-friendly Build Mode / editable-map workflow after the runner is trustworthy.
- The project should keep custom/premium visuals and not drift toward a Roblox-like visual style.
- Repo-backed memory is the authority, not chat context.

## Operating Decision
Every autonomous cycle must read and then update the project memory files before it ends.
