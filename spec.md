# KidsLearn - English & Hindi

## Current State
- App has 6 classes: Nursery, KG, Class 1, Class 2, Class 3, Class 4
- Each class has class-specific subjects
- Class 1 has: alphabet, numbers (1-20), animals, fruits, spelling, math (+/-)
- Class 2 has: alphabet, numbers (1-20), animals, bodyparts, spelling, math (+/-)
- Class 3 has: alphabet, numbers, animals, spelling, math3 (+/-/×), fruits
- Class 4 has: alphabet, numbers, animals, spelling, math4 (advanced ×), bodyparts
- NumbersGame shows numbers 1-20 only
- MathGame for Class 4 has no ÷ division
- No background music in the app
- Rhymes only in Nursery/KG - no musical rhymes section

## Requested Changes (Diff)

### Add
- **Class 1 Numbers**: Show numbers 1-100 (not just 1-20). Add a dedicated `numbers100` subject showing all 100 numbers with names.
- **Class 2 Tables**: Add multiplication tables 1-10 (1×1=1 ... 10×10=100) as a new subject `tables` for Class 2.
- **Class 3 Math**: Add + and - sums (already has math3), plus number names 1-100 as a new subject `numbernames` for Class 3.
- **Class 4 Advanced Math**: Add ÷ division problems to Class 4 math alongside +, -, × (new subject `math4adv`).
- **Background Music**: Light, pleasant children's background music using Web Audio API synthesizer that plays softly in all screens.
- **Musical Rhymes**: Enhance RhymesGame with musical melody playback — each rhyme gets a synthesized tune that plays when reading the rhyme.

### Modify
- Class 1 subjects: Replace `numbers` with `numbers100` subject showing 1-100
- Class 2 subjects: Add `tables` as a new subject (keep existing)
- Class 3 subjects: Add `numbernames` subject (number names 1-100 in English/Hindi), keep math3 for +/- sums
- Class 4 subjects: Replace `math4` with `math4adv` that includes ÷ division
- kidsData.ts: Add NUMBERS_100 array (1-100), number name data, division problems, table data
- MathGame: Support ÷ operator
- Add background music toggle button in header

### Remove
- Nothing removed

## Implementation Plan
1. Update `kidsData.ts`:
   - Add NUMBERS_100: array of 100 numbers with word names and emojis
   - Add NUMBER_NAMES_100: number + name data for Class 3 number names game
   - Add MATH_PROBLEMS_CLASS4_ADV: includes ÷ division problems
   - Add MULTIPLICATION_TABLES: table data for 1-10
   - Update CLASSES: class1 uses `numbers100`, class2 adds `tables`, class3 adds `numbernames`, class4 uses `math4adv`
   - Update ALL_SUBJECTS: add `numbers100`, `tables`, `numbernames`, `math4adv` definitions

2. Create `NumbersGame100.tsx`: Scrollable grid showing numbers 1-100 with number names, quiz mode
3. Create `TablesGame.tsx`: Shows multiplication tables 1-10, interactive quiz
4. Create `NumberNamesGame.tsx`: Shows number 1-100 with English/Hindi name, quiz
5. Update `MathGame.tsx`: Add ÷ division support
6. Update `App.tsx`: Wire new subjects, add background music using Web Audio API, music toggle button
7. Update `RhymesGame.tsx`: Add simple melody synthesizer that plays when a rhyme is active
