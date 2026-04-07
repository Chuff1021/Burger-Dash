# Burger Dash Backlog

## Guardrails
- Do not rewrite `js/game.js`, `js/track.js`, or `js/player.js` from scratch.
- Build on top of the working Temple Run foundation.
- Pause before deletions, architecture rewrites, or deploy-affecting changes.

## Active Program

### P0 — Core Gameplay
- [x] Corridor obstacle system using `hurdle.glb` and `cement_roadblock.glb`
- [x] Spawn rules per road segment with increasing density by speed/distance
- [x] Collision detection against player state (jump/slide/hit)
- [x] Coin system using `coin.glb`
- [x] Coin line/arc patterns on corridor path
- [x] Coin collect VFX + score/coin increment
- [x] Smooth turn transitions for player rotation
- [x] Smooth turn transitions for camera orbit
- [x] Turn body lean / banking feedback
- [x] Speed curve tuning from early to late run
- [x] Speed-line effect at higher speeds
- [x] Hit shake / hit feedback
- [x] Landing dust / obstacle hit particles
- [x] Chaser/villain prototype behind player
- [x] Chase pressure logic tied to mistakes and recovery
- [ ] Turn readability / corridor opening visual fix
- [x] Better pre-turn player freedom / feel
- [ ] Fix blocked turn opening bug
- [ ] Fix turn transition / commit logic at corners
- [ ] Fix deterministic missed-turn death boundary
- [x] Extend hallway length / visibility
- [x] Fix jump collision fairness bug
- [x] Restore left/right lane movement inside corridors
- [ ] Coin visual quality pass
- [ ] Obstacle visual quality pass

### P0.5 — Brand & Theme Direction
- [x] Modern fast-food burger joint environment pass
- [x] Neon/menu-board signage pass
- [x] Burger-joint prop dressing pass
- [x] Theme palette and lighting polish

### P1 — Characters & Theme
- [ ] Character select screen wiring
- [ ] 3D rotating preview
- [ ] Lock/unlock progression using coins
- [ ] Selected character persistence
- [ ] Character loading pipeline for GLTF models
- [ ] Burger/kitchen corridor props and signage
- [ ] Warm themed lighting pass
- [ ] Character abilities activation framework

### P2 — Build Mode Foundation
- [ ] Convert corridor/track logic into data-driven map pieces
- [ ] Define saved map schema for straights, turns, obstacles, coins, checkpoints, and themes
- [ ] Support hand-authored map playback using the same runner systems
- [ ] Preserve endless mode by generating the same map-piece format procedurally
- [ ] Design MVP Build Mode interaction flow for kid-friendly editing/testing

### P3 — Systems
- [ ] Magnet power-up
- [ ] Shield power-up
- [ ] Score multiplier power-up
- [ ] Jetpack power-up
- [ ] Combo meter and decay timer

### P4 — Audio / Drama
- [ ] Expanded SFX map
- [ ] Better BGM loop strategy
- [ ] Pursuing monster prototype
- [ ] Checkpoint celebration loop
- [ ] Death sequence polish

### P5 — Visual Variety
- [ ] Theme cycling system
- [ ] Parallax skyline through openings
- [ ] Dynamic/flickering neon lights
- [ ] Hit FX post stack ideas

### P6 — Performance / PWA
- [ ] Object pooling plan for obstacles/coins/VFX
- [ ] Adaptive quality strategy
- [ ] Re-enable service worker safely
- [ ] iPhone PWA test checklist

## Suggested Implementation Order
1. Obstacles
2. Coins
3. Smooth turns
4. Speed/game feel
5. Character select
6. Theme dressing
7. Audio expansion
8. Performance/PWA
