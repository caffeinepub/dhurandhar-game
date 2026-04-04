# KidsLearn - English & Hindi Learning App for Kids (Nursery to Class 4)

## Current State
New project — no existing application files.

## Requested Changes (Diff)

### Add
- Kids learning app supporting English and Hindi, for classes Nursery, KG, Class 1, Class 2, Class 3, Class 4
- Home screen with class selector (colorful cards for each class)
- Subject areas per class: Alphabet (English & Hindi), Numbers, Shapes, Colors, Animals, Basic Math, Spelling, Phonics
- Interactive learning games:
  - Alphabet tracing / letter matching game
  - Number counting game with animated objects
  - Spelling quiz (tap the correct letter)
  - Shape and color matching drag-and-drop
  - Animal sound quiz (tap the animal that makes the sound)
  - Basic addition/subtraction quiz for Class 1-4
  - Hindi Varnamala learning (अ आ इ...)
  - Hindi word matching game
- Rewards system: stars earned per completed activity, badges/trophies for milestones
- Progress tracking: per class, per subject, percentage completed
- Parent dashboard: view child's progress, completed lessons, earned badges
- Bilingual UI: all text labels and instructions in both English and Hindi
- Colorful, child-friendly UI with large buttons, bright colors, animated characters/mascots
- Sound effects and encouraging voice feedback ("Great job!", "शाबाश!")
- Leaderboard / achievements screen

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend (Motoko):
   - Store student profiles (name, class, age)
   - Store progress per student per subject/activity
   - Store earned stars and badges
   - Parent dashboard data access (read progress)
   - Leaderboard (top students by stars)

2. Frontend (React + TypeScript):
   - Home/landing screen with app name, mascot, and class selection
   - Class selector screen (Nursery, KG, 1, 2, 3, 4) with colorful cards
   - Subject menu screen per class (icons for each subject)
   - Individual activity/game screens for each subject
   - Rewards/badge screen
   - Progress screen
   - Parent dashboard screen
   - Bilingual toggle (EN/HI) that switches all UI text
   - Animated mascot character encouraging kids
   - Responsive, touch-friendly layout
