# Gimme Golf — Look & Feel Guide

## Brand Direction

Gimme Golf should feel like a modern golf companion app with roots in the classic scorecard aesthetic.

The design should balance:
- traditional golf structure
- modern mobile clarity
- premium but approachable styling
- strong readability outdoors
- enough personality to support game modes like Chaos, Novelty, and Power Ups

The visual tone should feel:
- calm
- clean
- sporty
- slightly elevated
- easy to scan in sunlight
- respectful of golf traditions without looking old-fashioned

## Core Design Principles

### 1. Scorecard First
The app should visually borrow from:
- printed golf scorecards
- course signage
- clubhouse pairing sheets
- tournament leaderboards

This means:
- grid logic
- clear rows and columns
- strong numeric hierarchy
- labels that feel structured and tidy

### 2. Modern Interaction
Even though the visual inspiration is classic, the interaction design should feel modern:
- large tap targets
- clear selected states
- stacked mobile cards
- obvious call-to-action buttons
- minimal typing
- fast one-handed use

### 3. Calm, Not Loud
Avoid neon colors, overly saturated accents, or cartoonish styling in the core app UI.

Special modes like Chaos, Party, and Power Ups can have accent badges and highlights, but the main shell should still feel grounded.

### 4. Outdoor Readability
The UI must work well:
- in bright daylight
- on a phone held at waist or chest height
- during quick glances between shots

That means:
- high contrast
- generous spacing
- clear hierarchy
- restrained use of subtle gray text
- minimal low-contrast decorative elements

---

## Visual Style

### Overall Feel
- clean white or warm paper-toned backgrounds
- deep green primary accents
- soft muted neutrals
- scorecard-inspired dividers and paneling
- modern card layout with subtle rounded corners
- restrained use of shadows
- crisp typography

### Shape Language
- rounded corners, but not overly bubbly
- recommend border radius:
  - cards: 16px
  - buttons: 14px
  - pills/badges: 999px
- use borders more than heavy shadows
- shadows should be soft and minimal

### Texture / Surface
Base UI should feel like:
- polished scorecard paper
- matte clubhouse signage
- clean iPhone app surfaces

Optional:
- a very subtle paper tint or scorecard background tone for secondary surfaces
- avoid fake grass textures or novelty golf graphics in the core shell

---

## Color System

## Primary Palette

### Fairway Green
Primary brand color for buttons, highlights, active states

- Hex: `#1F5A3D`

### Deep Pine
Darker version for headers, strong text on light surfaces, premium accents

- Hex: `#153B2A`

### Fresh Green
Support accent for positive states, success, completed missions

- Hex: `#3E8A5E`

---

## Neutral Palette

### Scorecard Cream
Primary app background, slightly warmer than pure white

- Hex: `#F7F4EC`

### Clubhouse White
Card background / surface white

- Hex: `#FCFBF8`

### Sand
Secondary background / section tint

- Hex: `#EDE6D6`

### Fairway Mist
Soft border / divider neutral

- Hex: `#D7D2C6`

### Slate
Secondary text

- Hex: `#5F665F`

### Charcoal
Primary text

- Hex: `#1F241F`

---

## Accent Colors

### Birdie Blue
Use sparingly for info states, selected chips, or “special” but non-danger elements

- Hex: `#4D7C8A`

### Golden Tee
Use for featured holes, awards, recommended mode, or premium-adjacent emphasis

- Hex: `#C89B3C`

### Hazard Red
Use for warnings, penalties, destructive actions, or dangerous/high-risk states

- Hex: `#A94A3B`

### Bunker Clay
Use for novelty/curse/power-up side accents if needed

- Hex: `#B97846`

---

## Semantic Colors

### Success
- Background: `#E5F3EA`
- Text/Icon: `#24613F`

### Warning
- Background: `#F7E8D6`
- Text/Icon: `#915E21`

### Danger
- Background: `#F5DFDA`
- Text/Icon: `#8D3B31`

### Info
- Background: `#E5EEF1`
- Text/Icon: `#2D5D6B`

---

## Suggested Usage

### Main Buttons
- background: Fairway Green `#1F5A3D`
- text: Clubhouse White `#FCFBF8`

### Secondary Buttons
- background: Sand `#EDE6D6`
- text: Deep Pine `#153B2A`
- border: Fairway Mist `#D7D2C6`

### App Background
- Scorecard Cream `#F7F4EC`

### Cards / Panels
- Clubhouse White `#FCFBF8`
- border: Fairway Mist `#D7D2C6`

### Primary Text
- Charcoal `#1F241F`

### Secondary Text
- Slate `#5F665F`

---

## Typography

The typography should blend:
- classic golf print sensibility
- clean mobile readability
- a touch of premium character

## Font Pairing Recommendation

### Primary UI Font
**Inter**
Use for:
- body text
- buttons
- inputs
- score labels
- setup screens
- utility text

Why:
- extremely readable
- modern
- great for dense app UI
- excellent on mobile

### Secondary / Headline Font
**DM Serif Display**
Use for:
- screen titles
- section headers
- major recap titles
- awards headings
- featured hole banners

Why:
- elegant
- classic without feeling dusty
- gives a subtle heritage / golf editorial tone

### Optional Third Accent Font
**IBM Plex Mono**
Use sparingly for:
- score rows
- hole numbers
- leaderboard stats
- scorecard-style numeric displays

Why:
- feels structured and scorecard-like
- helps numbers feel organized
- adds a subtle “official score” character

## Font Usage Rules
- Do not overuse the serif font
- Keep the main app UI in Inter
- Use DM Serif Display only for moments that need tone or emphasis
- Use IBM Plex Mono only for numbers, stats, or scorecard moments

---

## Type Scale

### Display Title
- DM Serif Display
- 32–36px
- used for home title or end-of-round headings

### Screen Title
- DM Serif Display
- 24–28px

### Section Header
- Inter SemiBold
- 18–20px

### Body
- Inter Regular
- 15–16px

### Secondary / Helper Text
- Inter Regular
- 13–14px

### Score / Numeric UI
- IBM Plex Mono Medium
- 16–24px depending on context

---

## UI Components

## Buttons
Buttons should feel:
- large
- simple
- premium
- not overly glossy

### Primary Button
- filled Fairway Green
- white text
- large padding
- slight press state darkening

### Secondary Button
- light neutral fill
- dark green text
- bordered

### Tertiary / Ghost Button
- no heavy fill
- text only or minimal outline
- used sparingly

## Cards
Cards should be the primary layout unit in the app:
- player cards
- recap cards
- preset mode cards
- award cards
- power-up cards

Card styling:
- background: Clubhouse White
- border: 1px Fairway Mist
- radius: 16px
- shadow: very subtle or none
- padding: 16–20px

## Score Buttons
These are critical.

They should:
- be large and easy to tap
- show number prominently
- optionally show golf label below:
  - Birdie
  - Par
  - Bogey
  - Double

Selected state:
- filled green or strong bordered state
- obvious check or highlight

## Chips / Tags
Use pill-shaped chips for:
- card pack labels
- momentum tiers
- featured hole type
- challenge categories

Chip colors should be soft and readable, not candy-like.

---

## Iconography

Use clean line icons with consistent stroke weight.

Recommended icon style:
- simple outline icons
- no skeuomorphic golf clubs or cartoon balls in core shell
- accent icons only where they improve scanability

Examples:
- flag
- trophy
- bolt
- flame
- spark
- shield
- target

Use icons sparingly.

---

## Motion / Feedback

Animation should be subtle and useful.

Good places for motion:
- selecting a card
- confirming score selection
- using a power-up
- momentum tier increase
- featured hole announcement
- recap highlight entry

Avoid:
- bouncy arcade animation everywhere
- long transitions
- distracting motion in sunlight

Motion style:
- quick
- clean
- restrained

---

## Special Mode Styling

The core shell stays consistent, but certain modes can get controlled accents.

### Chaos
- accent with Hazard Red or Golden Tee badges
- keep overall layout grounded

### Party / Style / Novelty
- allow slightly more playful badge colors
- do not restyle the full app

### Power Ups
- can use a stronger accent treatment, such as Birdie Blue or Golden Tee
- still keep the base app shell consistent

### Featured Holes
- use a banner or highlighted card
- accent with Golden Tee and Deep Pine

---

## Accessibility

The app should prioritize:
- strong contrast
- large touch targets
- no color-only meaning
- readable type sizes
- obvious selected states
- visible disabled states

Minimum guidance:
- primary actions should be obvious without relying only on color
- selected score buttons should have both color and border/state difference
- labels should stay readable outdoors

---

## Spacing System

Use a simple spacing scale:
- 4
- 8
- 12
- 16
- 20
- 24
- 32

Recommended:
- card padding: 16–20
- section spacing: 24
- button height: at least 44–52px
- vertical spacing between stacked player cards: 16

---

## General Style Rules

### Do
- use structured layouts
- prioritize readability
- let numbers breathe
- use golf-inspired restraint
- make the app feel premium and calm
- use serif font only as accent

### Do Not
- make it neon or arcade-first
- overuse green everywhere
- add heavy shadows
- make the UI visually busy
- rely on tiny text
- make it feel like a generic sports-betting app

---

## Design Summary

Gimme Golf should feel like:
- a beautiful modern scorecard
- a premium mobile golf companion
- a product that respects golf traditions
- a game system layered on top of that tradition

The visual identity should say:
“this belongs on a golf course”
not
“this belongs in a casino”