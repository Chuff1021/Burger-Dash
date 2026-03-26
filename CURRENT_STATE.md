# Burger Dash Current State

## Where The Project Stands
Burger Dash has a shippable runner foundation with multiple pushed batches across gameplay, chaser pressure, and burger-joint theming. However, the latest user feedback makes it clear that visual trust in the map is still not good enough.

## Confirmed Shipped Foundation
- Corridor-aware obstacle system is in place.
- Corridor-aware coin system is in place.
- Player and camera turns have been smoothed.
- Speed progression and high-speed feel have been tuned.
- A visible chaser/villain prototype exists.
- Burger-joint environment theming has started.
- Lane movement, hallway length, and jump fairness received a recent bug-fix pass.

## Live Repo Reality
- Branch: `main`
- Recent commits include:
  - `c7dae5d` feat: improve Burger Dash turn readability and corner guidance
  - `670f25c` fix: restore Burger Dash lane movement and turn pathing
- Project memory files are present locally but currently untracked in git.

## Highest-Value Current Focus
1. Visually debug the live map/corner geometry instead of guessing from code alone.
2. Fix any remaining wall pieces protruding into the turn path.
3. Improve coin and obstacle visual quality after map trust is restored.
4. Preserve the runner as the core experience while preparing the architecture for a later Build Mode.

## Current Risks
- The user still sees a wall physically blocking the turn, which means the map is not yet visually trustworthy.
- Earlier backlog state overstated the turn/opening fix as complete; that should now be treated as failed QA, not done work.
- Autonomous jobs can still drift unless project memory files are kept current.
- Blind environment iteration is lower value than rendered-scene inspection right now.

## Product Direction Update
The user explicitly approved a Roblox-like workflow where the current maze/map can be edited and then immediately run with the character, while keeping higher-end custom visuals rather than looking like Roblox. This is now an official product direction, but it remains **phase two** after current map correctness and core readability are fixed.
