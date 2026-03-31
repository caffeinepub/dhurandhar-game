# Dhurandhar Game

## Current State
Full side-scrolling Free Fire-style action game with:
- Heroes: Humza Ali Mazari, Ajay Sanyal
- 4 boss villains: Rehman Dakait, SP Aslam Choudhury, Major Iqbal, Jameel Jamali
- Enemies flee and fight back
- Bomb mechanic (B key / 💣 button)
- Minimap with flashing boss markers
- Mobile joystick + FIRE/JUMP/WPN/BOMB buttons
- Level system with war escalation sky/effects
- Copyright bar: Priyanka Sharma / priyankadsharma11@gmail.com
- Characters drawn on canvas as human figures, some clarity issues reported

## Requested Changes (Diff)

### Add
- 20 distinct levels to complete the game
- Different background environment per level (5 distinct environment themes cycling across 20 levels)
- Different enemy types per level group
- Each level harder than the last
- Bosses spread across levels (boss at every 5th level: 5, 10, 15, 20)

### Modify
- Characters must be drawn as full, clear, single-piece human figures using the uploaded reference images
- All characters must stand on the ground, not fly or split
- Level count cap at 20 to complete the main goal
- Backgrounds must vary per level: morning city (1-4), dusk city (5-8), night war-torn (9-12), desert/village (13-16), final battle zone (17-20)

### Remove
- Nothing to remove

## Implementation Plan
1. Expand level system to 20 levels with distinct environment per level group
2. 5 background themes: morning amber city, golden dusk city, war-torn night city, dusty desert bazaar, final battle red/smoke
3. Enemy scaling: more enemies, faster, higher HP each level
4. Boss assignment: Rehman at L5, SP Aslam at L10, Major Iqbal at L15, Jameel Jamali at L20
5. Draw characters using generated image assets (/assets/generated/char-*.png) loaded as Image objects on canvas — ensures real human figures, clear and sharp
6. Fix character rendering: load images, draw at correct position, no splitting
7. Keep all existing controls, bomb mechanic, minimap, copyright
