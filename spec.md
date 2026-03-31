# Dhurandhar Battle Royale Game

## Current State
New project — no existing code. Starting from scratch.

## Requested Changes (Diff)

### Add
- Full battle royale-style action game inspired by the Dhurandhar movie
- Central hub/lobby screen with character selection, mode selection, and game entry
- Aerial drop intro: players choose landing spot on the city island map
- Side-scrolling, street-level city environment with parallax backgrounds matching Dhurandhar movie aesthetic (South Asian urban streets, warm amber/golden sky, Hindi shop signs, auto-rickshaws, dust haze)
- Shrinking safe zone (blue circle that closes in over time, forcing player movement)
- Weapon pickup system: rifles, SMGs, shotguns, sniper rifles, throwables scattered across buildings
- Two playable heroes: Humza Ali Mazari (blue tactical jacket, plate carrier vest, beard, AK-47) and Ajay Sanyal (olive army uniform, gold aviator sunglasses, military cap, M4A1)
- Four boss villains as primary enemies: Rehman Dakait (red dupatta, face scar, bandolier, shotgun), SP Aslam Choudhury (police cap, gold badge, mustache, pistol), Major Iqbal (army beret, silver star, scoped AK-47), Jameel Jamali (large turban, white beard, pistol + knife)
- Regular enemy grunts: keffiyeh face wraps, tactical vests, AK-47s (Pakistani militant style)
- Three authentic NPCs: Indian Army soldier (olive uniform), Indian woman (orange sari, bindi), Indian civilian man (saffron kurta, Gandhi cap) — provide boss location hints via speech bubbles
- Bomb mechanic: throw bombs at buildings to destroy them and defeat hidden enemies; buildings catch fire and collapse
- Minimap with boss/enemy position markers
- Progressive levels: each boss kill advances level, sky color escalates (amber → blood-red), smoke columns appear, level titles ("Border Tension Rising" → "WAR BREAKS OUT" → "TOTAL WARFARE" → "FINAL BATTLE")
- Mobile touch controls: virtual joystick (bottom-left), FIRE / ACT / WPN / 💣 buttons (bottom-right)
- Desktop controls: WASD movement, mouse aim/shoot, B for bomb
- Synthesized in-browser audio: background music, gunshots, hit sounds, bomb explosions, boss alerts, NPC chimes, win/death tones
- Mute/unmute toggle (🔊) in HUD
- Copyright notice bar: "© 2026 Dhurandhar Game. All Rights Reserved. Created by Priyanka Sharma (priyankadsharma11@gmail.com)"
- Canvas watermark with owner name/email
- Health bar, ammo counter, level indicator, score in HUD
- Character attributes system: Humza (high durability), Ajay (high awareness/speed)
- Win condition: defeat all 4 bosses; endless waves continue after

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Minimal Motoko backend (no persistent state needed — game is purely frontend)
2. Generate character art assets using AI image generation for all 6 characters + environment
3. Frontend game built as single React component with Canvas API:
   a. Hub screen (character select, mode select, START)
   b. Aerial drop intro animation
   c. Main game loop: requestAnimationFrame, time-based movement
   d. Parallax city background renderer (3 layers)
   e. Player entity: movement, jumping, shooting, bomb throw
   f. Enemy entities: grunt AI (flee + fight back when cornered), boss AI (hidden in buildings)
   g. NPC entities: static with proximity speech bubbles
   h. Shrinking safe zone circle
   i. Weapon pickup spawns
   j. Bomb mechanic with building destruction
   k. Minimap renderer
   l. Mobile virtual joystick + action buttons
   m. HUD (health, ammo, level, score)
   n. Level progression logic with cinematic splash
   o. Audio synthesis using Web Audio API
   p. Copyright notice bar and canvas watermark
