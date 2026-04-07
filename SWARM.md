# Burger Dash Swarm Company

## Company Mission
Build Burger Dash into a polished, testable, modern, fun fast-food endless runner with continuous parallel development.

## Creative Direction
- Theme: modern fast-food burger joint
- Mood: colorful, punchy, playful, high-energy
- Visual language: neon signage, menu boards, fryer glow, warm reds/yellows, teal accents, glossy surfaces
- Core pressure mechanic: a villain/chaser behind the player

## Operating Mode
Hybrid autopilot.

Agents may:
- implement scoped feature batches automatically
- update project docs and backlog
- commit locally after meaningful progress

Agents must pause before:
- deleting files
- architecture rewrites
- deploy-affecting changes
- replacing core gameplay foundation files from scratch

## Non-Negotiable Engineering Guardrail
**Do NOT rewrite `js/game.js`, `js/track.js`, or `js/player.js` from scratch.**

These files contain the working Temple Run core loop and direction/turn system. They are the foundation.

Allowed:
- additive changes
- localized edits
- imports / helper modules
- hook points
- tuning
- visual/game-feel improvements

Not allowed without explicit approval:
- wholesale replacements
- major architecture inversion
- removal of the current turn system, camera-follow foundation, or direction state machine

## Company Org Chart

### 1. Orchestrator / Producer / Product Director
Owns:
- vision
- prioritization
- backlog ordering
- integration sequencing
- user-facing summaries
- converting feedback into tasks

### 2. Gameplay Core Pod
Owns:
- corridor obstacles
- corridor collectibles
- collision and fairness
- turn feel
- speed progression
- checkpoint logic
- combo/power-up foundations

Primary files:
- `js/game.js`
- `js/track.js`
- `js/player.js`
- `js/obstacles.js`
- `js/collectibles.js`

### 3. Chaser / Enemy Pod
Owns:
- villain concept and implementation
- pursuit pressure system
- catch-up/cool-down rules
- chase distance on mistakes
- death/capture sequence

Primary files:
- `js/game.js`
- `js/effects.js`
- `js/audio.js`
- future: `js/chaser.js`

### 4. Characters Pod
Owns:
- character select screen
- unlock/progression
- selected character persistence
- model pipeline
- abilities framework

Primary files:
- `js/characters.js`
- `js/player.js`
- `js/save.js`
- `index.html`
- `css/style.css`

### 5. Environment / Theme Pod
Owns:
- burger-joint corridor dressing
- neon signage
- kitchen props
- wall/ceiling art direction
- lighting/theme passes

Primary files:
- `js/track.js`
- future: `js/environment.js`, `js/props.js`

### 6. Game Feel / Audio Pod
Owns:
- SFX and procedural music improvements
- coin/hit/landing effects
- speed lines
- checkpoint celebration feedback
- villain audio cues

Primary files:
- `js/effects.js`
- `js/audio.js`
- `js/game.js`

### 7. UI / UX Pod
Owns:
- title screen polish
- HUD clarity
- menu flow
- settings UX
- character select UX
- mobile touch target quality

Primary files:
- `index.html`
- `css/style.css`
- `js/game.js`

### 8. Performance / PWA Pod
Owns:
- optimization strategy
- pooling/culling plans
- adaptive quality
- offline/PWA readiness
- iPhone performance targets

Primary files:
- `sw.js`
- `manifest.json`
- `vercel.json`
- performance-sensitive JS modules

### 9. QA / Integration Pod
Owns:
- smoke testing
- regression detection
- balancing notes
- testability review
- release/test summaries

Primary artifacts:
- `SHIPLOG.md`
- checklist notes
- backlog cleanup

## Work Priority Ladder
### P0 — Must Be Fun
1. Obstacles
2. Coins
3. Smooth turn feel
4. Camera smoothing
5. Speed tuning
6. Game-feel polish
7. Chaser prototype

### P1 — Identity
1. Character select
2. Burger-joint environment pass
3. villain personality polish
4. character abilities groundwork

### P2+
Power-ups, combo system, audio expansion, track variety, performance/PWA polish.

## Definition of Done for a Batch
A batch should:
- keep the game playable
- preserve the current turn foundation
- be quickly testable by the user
- update `BACKLOG.md` status
- update `SHIPLOG.md` with what changed
- avoid unnecessary wide-scope edits

## Human Feedback Loop
When user feedback arrives:
1. add it to `FEEDBACK.md`
2. convert it into explicit backlog items
3. prioritize anything affecting “fun”, readability, or identity first

## Escalate Before Acting
Pause and ask before:
- deleting old files
- moving major systems across files
- changing save format incompatibly
- enabling production service worker behavior
- altering deployment configuration
