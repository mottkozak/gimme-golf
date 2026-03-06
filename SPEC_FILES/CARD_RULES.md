# GIMME GOLF - Card Rules

## Card types
- common
- skill
- risk
- chaos
- prop

## Personal card rules
Personal cards are assigned to individual golfers each hole.
Categories:
- common = 1 point
- skill = 2 points
- risk = 3 points

## Public card rules
Chaos and Prop cards are public cards that apply at the hole level.

- At most one Chaos card per hole
- At most one Prop card per hole
- These are optional based on round settings

## Filtering rules
Card selection must respect hole context:
- par-3-only cards only appear on par 3 holes
- drive-distance cards only appear on par 4 or 5 holes
- reach-in-two cards only appear on par 5 holes
- putting cards can appear on any hole
- hazard-specific cards should prefer matching hole tags when possible

## Difficulty weighting
If dynamic difficulty is enabled:
- better golfers receive more medium/hard cards
- weaker golfers receive more easy/medium cards

## Resolution
For v1:
- card completion is entered manually
- public card outcomes are entered manually
- app computes points automatically
- actual golf strokes are never changed by card logic
