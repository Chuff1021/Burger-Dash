# Burger Dash Swarm Task Board

## Pod Workstreams

### Orchestrator / Producer
- keep priorities aligned with user direction
- maintain docs/backlog/shipping notes
- avoid duplicate work across pods
- summarize only meaningful movement

### Gameplay Core Pod
Current focus:
- refine corridor obstacle fairness
- refine coin placement readability
- smooth camera transitions around turns
- tune speed progression

### Chaser / Enemy Pod
Current focus:
- define villain silhouette and mechanic
- implement first pursuit prototype
- tie chase distance to hits / mistakes / recovery

### Characters Pod
Current focus:
- audit existing `characters.js`
- wire character select markup already in `index.html`
- connect localStorage state via `save.js`

### Environment / Theme Pod
Current focus:
- shift corridor from generic brick to modern burger-joint aesthetic
- add signage, props, and warm lighting accents

### Game Feel / Audio Pod
Current focus:
- strengthen coin/hit/landing/turn feedback
- improve speed sensation
- prepare villain audio hooks

### UI / UX Pod
Current focus:
- title/game-over/HUD polish
- mobile readability and touch affordances
- settings and character select flow polish

### Performance / PWA Pod
Current focus:
- identify heavy systems early
- suggest pooling/culling opportunities
- preserve iPhone playability

### QA / Integration Pod
Current focus:
- create test checklist for every major gameplay batch
- note regressions after each iteration

## Global Constraints
- Do not rewrite `js/game.js`, `js/track.js`, or `js/player.js` from scratch.
- No deletions without explicit approval.
- No deploy-affecting changes without explicit approval.
