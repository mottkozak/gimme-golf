# Card Pack Reference

Generated from `src/data/cards.ts` and grouped by pack.

Fields included per card: code, name, challenge description, points, difficulty, type, visibility, eligible pars, required tags, excluded tags, and rules text.

## Classic (classic)

- Short: Core personal missions for every round.
- Includes: Common, Skill, Risk personal cards
- Best for: Every round and all skill levels
- Premium-ready: No
- Card count: 120

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| COM-001 | Fairway Finder | Hit the fairway off the tee on a par 4 or 5. | 1 | easy | common | Personal | 4, 5 | - | - | Success if tee shot finishes in fairway on a par 4 or 5. |
| COM-002 | Green Light | Reach the green in regulation. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if player reaches GIR for the hole par. |
| COM-003 | Clean Start | No penalty strokes on the hole. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if player records zero penalty strokes on the hole. |
| COM-004 | Two-Putt Pro | Take no more than two putts once on the green. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if player needs at most two putts after first reaching green. |
| COM-005 | Bogey Saver | Make bogey or better. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if score is bogey, par, birdie, or better. |
| COM-006 | Solid Contact | Advance every full swing at least 70% of intended distance with no whiffs or duffs. | 1 | medium | common | Personal | 3, 4, 5 | - | - | Success if all full swings are solid advances and no full swing is a whiff/duff. |
| COM-007 | No Sand Trouble | Avoid all bunkers on the hole. | 1 | easy | common | Personal | 3, 4, 5 | bunkers | - | Success if player never enters a bunker on this hole. |
| COM-008 | Recovery Artist | Miss the fairway but still make bogey or better. | 1 | medium | common | Personal | 4, 5 | - | - | Success if player misses fairway off tee and still scores bogey or better. |
| COM-009 | Safe Layup | On a par 5, do not go for the green in two, then make bogey or better. | 1 | medium | common | Personal | 5 | reachablePar5 | - | Success if player intentionally lays up on a reachable par 5 and still scores bogey or better. |
| COM-010 | First-Putt Friend | Your first putt finishes within 3 feet of the hole. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if first putt leaves 3 feet or less. |
| COM-011 | Straight Ball | No shot on the hole ends out of bounds or in a hazard. | 1 | medium | common | Personal | 3, 4, 5 | - | - | Success if all strokes stay in play and avoid OB/hazard areas. |
| COM-012 | Par 3 Survivor | On a par 3, make bogey or better. | 1 | easy | common | Personal | 3 | - | - | Success if score is bogey or better on a par 3. |
| COM-013 | Good Miss | Miss the green but get up-and-down for bogey or better. | 1 | medium | common | Personal | 3, 4, 5 | - | - | Success if player misses green and still finishes bogey or better. |
| COM-014 | Center Face-ish | No topped or chunked full swings on the hole. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if no full swing is topped or chunked. |
| COM-015 | Keep It Moving | Play the hole without taking a provisional or re-tee. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if player never hits a provisional and never re-tees. |
| COM-016 | Stress-Free Finish | Hole out with one putt from inside 6 feet. | 1 | medium | common | Personal | 3, 4, 5 | - | - | Success if final putt is holed from inside 6 feet in one attempt. |
| COM-017 | No Big Number | Score double bogey or better. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if score is double bogey or better. |
| COM-018 | Respectable Hole | Hit either the fairway or green, and make bogey or better. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Success if player hits fairway or green at least once in regulation path and scores bogey or better. |
| COM-019 | Fair Miss | Miss the fairway, but stay in bounds and avoid hazards. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Miss the fairway, but stay in bounds and avoid hazards. Reward: +1. |
| COM-020 | Safe Green | Miss the green, but leave yourself a chip or putt from a makeable position. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Miss the green, but leave yourself a chip or putt from a makeable position. Reward: +1. |
| COM-021 | Advance and Survive | No full shot travels backward or sideways more than forward. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. No full shot travels backward or sideways more than forward. Reward: +1. |
| COM-022 | No Three Off the Tee | Do not hit out of bounds off the tee. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Do not hit out of bounds off the tee. Reward: +1. |
| COM-023 | Lag Master | Your longest putt of the hole finishes within 4 feet. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Your longest putt of the hole finishes within 4 feet. Reward: +1. |
| COM-024 | Good Number | Make net par relative to your normal level for the hole. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Make net par relative to your normal level for the hole. Reward: +1. |
| COM-025 | Fairway or Fringe | Finish in either the fairway, fringe, or green with your approach sequence. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Finish in either the fairway, fringe, or green with your approach sequence. Reward: +1. |
| COM-026 | Trouble Avoided | Do not hit water, bunker, trees, or OB on the hole. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Do not hit water, bunker, trees, or OB on the hole. Reward: +1. |
| COM-027 | Tap-In Finish | Make your final putt from 3 feet or less. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Make your final putt from 3 feet or less. Reward: +1. |
| COM-028 | Calm Hole | No penalty strokes and no putt longer than three attempts. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. No penalty strokes and no putt longer than three attempts. Reward: +1. |
| COM-029 | Green-Side Safety | If you miss the green, miss it green-side rather than short-sided or hazard-side. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. If you miss the green, miss it green-side rather than short-sided or hazard-side. Reward: +1. |
| COM-030 | Tee Box Competent | Hit your tee shot in play and advance it at least a solid distance. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Hit your tee shot in play and advance it at least a solid distance. Reward: +1. |
| COM-031 | Fairway First | On a par 4 or 5, hit your tee shot in play and on the correct side of the hole. | 1 | easy | common | Personal | 4, 5 | - | - | Manual mission check. On a par 4 or 5, hit your tee shot in play and on the correct side of the hole. Reward: +1. |
| COM-032 | Middle of the Green | On approach, play safely to the center of the green and hit any putting surface. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. On approach, play safely to the center of the green and hit any putting surface. Reward: +1. |
| COM-033 | No Reload | Do not hit any shot that requires an immediate re-hit. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Do not hit any shot that requires an immediate re-hit. Reward: +1. |
| COM-034 | Green-Side Exit | If you miss the green, leave your ball in a playable green-side position. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. If you miss the green, leave your ball in a playable green-side position. Reward: +1. |
| COM-035 | One Good Putt | Make at least one confident, cleanly struck putt on the hole, regardless of length. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Make at least one confident, cleanly struck putt on the hole, regardless of length. Reward: +1. |
| COM-036 | No Cheap Mistakes | No penalty strokes, no whiffs, and no missed tap-ins. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. No penalty strokes, no whiffs, and no missed tap-ins. Reward: +1. |
| COM-037 | Advance the Ball | Every full swing must clearly improve your position. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Every full swing must clearly improve your position. Reward: +1. |
| COM-038 | Soft Landing | Finish any approach or chip on the green or fringe. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Finish any approach or chip on the green or fringe. Reward: +1. |
| COM-039 | Keep the Card Clean | Avoid triple bogey or worse. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Avoid triple bogey or worse. Reward: +1. |
| COM-040 | Routine Hole | Play the hole without a rules debate, ball search longer than a minute, or a second-guess meltdown. | 1 | easy | common | Personal | 3, 4, 5 | - | - | Manual mission check. Play the hole without a rules debate, ball search longer than a minute, or a second-guess meltdown. Reward: +1. |
| RSK-001 | Bombs Away | Drive 260+ yards in play. | 3 | hard | risk | Personal | 4, 5 | - | - | Success if player hits an in-play drive of at least 260 yards. |
| RSK-002 | Dagger Putt | Make a putt of 15 feet or longer. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if player holes a putt from 15+ feet. |
| RSK-003 | Hero Recovery | After a recovery shot from trouble, still make bogey or better. | 3 | hard | risk | Personal | 4, 5 | trees | - | Success if player executes recovery from trouble and still scores bogey or better. |
| RSK-004 | Go For It | On a par 5, attempt to reach in two and finish double bogey or better. | 3 | hard | risk | Personal | 5 | reachablePar5 | - | Success if player goes for green in two and still posts double bogey or better. |
| RSK-005 | Birdie Hunt | Make birdie. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if player scores birdie or better. |
| RSK-006 | Sand Wizard | Hole out from bunker or finish bunker shot inside 6 feet and make the putt. | 3 | hard | risk | Personal | 3, 4, 5 | bunkers | - | Success if player holes bunker shot or hits to 6 feet and converts the putt. |
| RSK-007 | Flag Attack | Finish any approach inside 12 feet. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if an approach (or par-3 tee shot) finishes within 12 feet. |
| RSK-008 | Long Drive King | Have the longest drive in the group on the hole and keep it in play. | 3 | hard | risk | Personal | 4, 5 | - | - | Success if player has longest in-play drive in the group. |
| RSK-009 | No Fear | Carry water or a forced hazard and still make bogey or better. | 3 | hard | risk | Personal | 3, 4, 5 | water | - | Success if player chooses forced carry line and still scores bogey or better. |
| RSK-010 | Scramble God | Miss fairway and green, then still save bogey or better. | 3 | hard | risk | Personal | 4, 5 | - | - | Success if player misses fairway and green then still records bogey or better. |
| RSK-011 | Putt for Glory | Make your first putt from outside 20 feet. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if first putt starts outside 20 feet and is holed. |
| RSK-012 | Tight Window | Play through a narrow gap or intentional shape and finish without penalty. | 3 | hard | risk | Personal | 4, 5 | trees | - | Success if player executes tight-window shot and takes no penalty. |
| RSK-013 | Must-Make Finish | Hole out from 8+ feet for par or better. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if player holes 8+ foot putt to secure par or better. |
| RSK-014 | Perfect Par 3 | Hit green on a par 3 and make par or better with no 3-putt. | 3 | hard | risk | Personal | 3 | - | - | Success if par-3 green is hit and player records par or better without 3-putt. |
| RSK-015 | Three Great Shots | Hit three consecutive quality shots on the hole. | 3 | hard | risk | Personal | 4, 5 | - | - | Success if player logs three consecutive quality shots: drive, approach/layup, chip/putt. |
| RSK-016 | Pressure Player | After another player completes a mission, complete yours too. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if another player completes mission first and this player also completes mission. |
| RSK-017 | Risk It for the Biscuit | Use one extra-aggressive club choice and still make bogey or better. | 3 | hard | risk | Personal | 4, 5 | - | - | Success if player commits to aggressive club decision and scores bogey or better. |
| RSK-018 | Clean Bird | Make birdie with no bunker, no hazard, no penalty, and no lip-out misses. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Success if player makes birdie while avoiding bunkers, hazards, penalties, and lip-out misses. |
| RSK-019 | Attack the Flag | Hit an approach inside 8 feet. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Hit an approach inside 8 feet. Reward: +3. |
| RSK-020 | Snake Eyes | Make a putt of 20+ feet. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Make a putt of 20+ feet. Reward: +3. |
| RSK-021 | Eagle Look | Create an eagle putt on a par 5. | 3 | hard | risk | Personal | 5 | - | - | Manual mission check. Create an eagle putt on a par 5. Reward: +3. |
| RSK-022 | Driver Offense | Use driver on a risky tee shot and still hit it in play. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Use driver on a risky tee shot and still hit it in play. Reward: +3. |
| RSK-023 | Hero Carry | Carry the most dangerous visible hazard on the hole and still make bogey or better. | 3 | hard | risk | Personal | 3, 4, 5 | water | - | Manual mission check. Carry the most dangerous visible hazard on the hole and still make bogey or better. Reward: +3. |
| RSK-024 | Bunker Assassin | Get out of a bunker and finish inside 4 feet. | 3 | hard | risk | Personal | 3, 4, 5 | bunkers | - | Manual mission check. Get out of a bunker and finish inside 4 feet. Reward: +3. |
| RSK-025 | Thread the Needle | Call a shaped shot before hitting it, then pull it off cleanly. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Call a shaped shot before hitting it, then pull it off cleanly. Reward: +3. |
| RSK-026 | Full Send | Be longest in the group off the tee by a clear margin and stay in play. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Be longest in the group off the tee by a clear margin and stay in play. Reward: +3. |
| RSK-027 | Bounce-Back Birdie | After making bogey or worse on the previous hole, make birdie here. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. After making bogey or worse on the previous hole, make birdie here. Reward: +3. |
| RSK-028 | Zero Panic | Recover from a terrible lie and still make bogey or better without a penalty. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Recover from a terrible lie and still make bogey or better without a penalty. Reward: +3. |
| RSK-029 | Kill Shot | Have the best approach shot in the group and still convert par or better. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Have the best approach shot in the group and still convert par or better. Reward: +3. |
| RSK-030 | No Regrets | Take the aggressive line everyone says not to take, and succeed. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Take the aggressive line everyone says not to take, and succeed. Reward: +3. |
| RSK-031 | Par 5 Predator | On a par 5, put yourself in eagle-range by the time you reach the green. | 3 | hard | risk | Personal | 5 | - | - | Manual mission check. On a par 5, put yourself in eagle-range by the time you reach the green. Reward: +3. |
| RSK-032 | Pure Strike Bonus | Hit the best-feeling full swing of the group and still make bogey or better. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Hit the best-feeling full swing of the group and still make bogey or better. Reward: +3. |
| RSK-033 | Drain the Snake | Make a putt from 18 feet or longer for par or better. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Make a putt from 18 feet or longer for par or better. Reward: +3. |
| RSK-034 | Recovery Rope | From serious trouble, hit a recovery shot that both escapes danger and advances meaningfully. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. From serious trouble, hit a recovery shot that both escapes danger and advances meaningfully. Reward: +3. |
| RSK-035 | Short-Sided Savior | Get up-and-down after leaving yourself short-sided around the green. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Get up-and-down after leaving yourself short-sided around the green. Reward: +3. |
| RSK-036 | Carry Commander | Choose to carry the trouble instead of laying back, and pull it off. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Choose to carry the trouble instead of laying back, and pull it off. Reward: +3. |
| RSK-037 | One-Swing Turnaround | After a poor shot, immediately hit a great one and still make bogey or better. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. After a poor shot, immediately hit a great one and still make bogey or better. Reward: +3. |
| RSK-038 | Drivable Dream | On a drivable hole, take the aggressive tee shot and finish double bogey or better. | 3 | hard | risk | Personal | 4, 5 | - | - | Manual mission check. On a drivable hole, take the aggressive tee shot and finish double bogey or better. Reward: +3. |
| RSK-039 | Laser Beam | Hit a full swing that finishes on your intended starting line and stays there. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. Hit a full swing that finishes on your intended starting line and stays there. Reward: +3. |
| RSK-040 | Pin Seeker | On an approach where the safe miss is obvious, ignore it and attack the pin successfully. | 3 | hard | risk | Personal | 3, 4, 5 | - | - | Manual mission check. On an approach where the safe miss is obvious, ignore it and attack the pin successfully. Reward: +3. |
| SKL-001 | Stick It Close | Finish an approach shot within 20 feet of the pin. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Success if any approach (or par-3 tee shot) finishes within 20 feet. |
| SKL-002 | Ice Putter | Make a putt of 10 feet or longer. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Success if player holes a putt from 10+ feet. |
| SKL-003 | Up-and-Down | Miss the green and still save par. | 2 | hard | skill | Personal | 3, 4, 5 | - | - | Success if player misses green in regulation and still makes par. |
| SKL-004 | Fairway to Green | Hit fairway and green in regulation on the same hole. | 2 | medium | skill | Personal | 4, 5 | - | - | Success if player hits fairway off tee and reaches GIR. |
| SKL-005 | One-Putt Hero | One-putt from off the green or from more than 8 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Success if player holes out in one putt from off green or from a distance greater than 8 feet. |
| SKL-006 | Pin Hunter | On a par 3, hit the green and finish within 25 feet. | 2 | medium | skill | Personal | 3 | - | - | Success if par-3 tee shot is on green and inside 25 feet. |
| SKL-007 | Long Two-Putt | From 30+ feet, two-putt or better. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Success if first putt starts from 30+ feet and hole is finished in two putts or fewer. |
| SKL-008 | Par Machine | Make par after missing either the fairway or green. | 2 | hard | skill | Personal | 3, 4, 5 | - | - | Success if player misses fairway/green at least once and still records par. |
| SKL-009 | Fairway Sniper | Hit fairway and finish drive in the longest third of the group. | 2 | hard | skill | Personal | 4, 5 | - | - | Success if drive is in fairway and among top-third distance in group. |
| SKL-010 | Clutch Scramble | Get up-and-down from sand for par or bogey. | 2 | hard | skill | Personal | 3, 4, 5 | bunkers | - | Success if player gets up-and-down from bunker for par or bogey. |
| SKL-011 | No-Waste Hole | Make par or better with no penalty strokes and no 3-putt. | 2 | hard | skill | Personal | 3, 4, 5 | - | - | Success if player scores par+ while avoiding penalties and 3-putts. |
| SKL-012 | Aggressive Line | Carry a hazard or cut a corner intentionally and make bogey or better. | 2 | hard | skill | Personal | 4, 5 | - | - | Success if player chooses aggressive carry/cut line and still records bogey or better. |
| SKL-013 | Birdie Chance | Create a birdie putt from within 15 feet. You do not have to make it. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Success if player has a birdie putt from 15 feet or closer. |
| SKL-014 | Pure Tee Ball | Drive 240+ yards in play. | 2 | hard | skill | Personal | 4, 5 | - | - | Success if player records an in-play drive of 240+ yards. |
| SKL-015 | Smart Golf | Hit the correct miss side on approach and still make par or bogey. | 2 | medium | skill | Personal | 4, 5 | - | - | Success if player follows intended miss side and still scores par or bogey. |
| SKL-016 | Bounce Back | After a bad tee shot, still make bogey or better. | 2 | medium | skill | Personal | 4, 5 | - | - | Success if tee shot is poor and player still posts bogey or better. |
| SKL-017 | Closed Strong | Make par or better with a made putt from 6 feet or more. | 2 | hard | skill | Personal | 3, 4, 5 | - | - | Success if player makes 6+ foot putt and finishes par or better. |
| SKL-018 | Par 5 Pressure | On a par 5, reach the green in regulation and avoid a 3-putt. | 2 | hard | skill | Personal | 5 | reachablePar5 | - | Success if player reaches GIR on par 5 and takes no 3-putt. |
| SKL-019 | Dart Board | Hit any approach inside 15 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Hit any approach inside 15 feet. Reward: +2. |
| SKL-020 | Fringe Genius | Miss the green but get down in two shots or fewer from just off the surface. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Miss the green but get down in two shots or fewer from just off the surface. Reward: +2. |
| SKL-021 | Clutch Two-Putt | Reach the green from 40+ feet away and still avoid a 3-putt. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Reach the green from 40+ feet away and still avoid a 3-putt. Reward: +2. |
| SKL-022 | Par 4 Precision | On a par 4, hit fairway and make par or better. | 2 | medium | skill | Personal | 4 | - | - | Manual mission check. On a par 4, hit fairway and make par or better. Reward: +2. |
| SKL-023 | Pin High | Finish your approach pin-high, regardless of left/right miss. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Finish your approach pin-high, regardless of left/right miss. Reward: +2. |
| SKL-024 | Long Iron Life | Use a long iron or hybrid on approach and still hit the green or fringe. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Use a long iron or hybrid on approach and still hit the green or fringe. Reward: +2. |
| SKL-025 | Scramble Touch | Miss the green, chip inside 6 feet, then make the putt. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Miss the green, chip inside 6 feet, then make the putt. Reward: +2. |
| SKL-026 | Big Putt Energy | Make a putt between 8 and 15 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Make a putt between 8 and 15 feet. Reward: +2. |
| SKL-027 | Fairway Pressure | Hit the fairway after another player already completed a drive-related mission. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Hit the fairway after another player already completed a drive-related mission. Reward: +2. |
| SKL-028 | Course Management | Take the safe play when danger is in play, then still make par or bogey. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Take the safe play when danger is in play, then still make par or bogey. Reward: +2. |
| SKL-029 | Drive for Show | Finish with one of the two longest drives in the group and still make bogey or better. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Finish with one of the two longest drives in the group and still make bogey or better. Reward: +2. |
| SKL-030 | Green Window | Hit the correct tier/section of the green as agreed by the group before the shot. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Hit the correct tier/section of the green as agreed by the group before the shot. Reward: +2. |
| SKL-031 | Wedge Wizard | From wedge range, hit your approach inside 18 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. From wedge range, hit your approach inside 18 feet. Reward: +2. |
| SKL-032 | Lag and Tap | From 25+ feet, leave your first putt inside 2 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. From 25+ feet, leave your first putt inside 2 feet. Reward: +2. |
| SKL-033 | Fairway Conversion | Hit the fairway, then hit the green or fringe with your next full shot. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Hit the fairway, then hit the green or fringe with your next full shot. Reward: +2. |
| SKL-034 | Scramble to Par | Miss the green and still make par with a chip and putt sequence. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Miss the green and still make par with a chip and putt sequence. Reward: +2. |
| SKL-035 | Tee Shot Trust | Hit your tee ball in play and finish with one of the better two tee shots in the group. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Hit your tee ball in play and finish with one of the better two tee shots in the group. Reward: +2. |
| SKL-036 | Controlled Aggression | Take an aggressive line on one shot and execute it without penalty or disaster. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Take an aggressive line on one shot and execute it without penalty or disaster. Reward: +2. |
| SKL-037 | Strong Three | On a par 3, finish with par or better after hitting the green or fringe. | 2 | medium | skill | Personal | 3 | - | - | Manual mission check. On a par 3, finish with par or better after hitting the green or fringe. Reward: +2. |
| SKL-038 | Long Putt Touch | From outside 20 feet, avoid both a 3-putt and leaving the second putt outside 3 feet. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. From outside 20 feet, avoid both a 3-putt and leaving the second putt outside 3 feet. Reward: +2. |
| SKL-039 | Trouble Conversion | After finding rough, trees, or an awkward lie, still get the next shot onto a safe target. | 2 | medium | skill | Personal | 3, 4, 5 | trees | - | Manual mission check. After finding rough, trees, or an awkward lie, still get the next shot onto a safe target. Reward: +2. |
| SKL-040 | Smart Birdie Look | Create a realistic birdie chance without taking on unnecessary danger. | 2 | medium | skill | Personal | 3, 4, 5 | - | - | Manual mission check. Create a realistic birdie chance without taking on unnecessary danger. Reward: +2. |

## Chaos (chaos)

- Short: Public modifiers that shake up the hole.
- Includes: Chaos public cards
- Best for: Groups that want more swingy holes
- Premium-ready: No
- Card count: 40

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| CHA-001 | Score Doubler | If any player makes birdie, they choose one opponent whose game points are canceled or doubled negatively. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual effect card. Resolve cancellation or negative doubling per group agreement when triggered. |
| CHA-002 | Longest Drive Bonus | Longest drive in play gets +2. | 2 | neutral | chaos | Public | 4, 5 | - | - | After hole, award +2 to golfer with longest in-play drive. |
| CHA-003 | Closest to Pin Bonus | On par 3s, closest to the pin gets +2. | 2 | neutral | chaos | Public | 3 | - | - | On par 3, award +2 to closest tee shot in regulation. |
| CHA-004 | Shared Pain | If any player makes double bogey or worse, every other player gets +1. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | If triggered, award +1 to all non-triggering golfers. |
| CHA-005 | Sabotage Token | First player to complete mission assigns -1 to any opponent. | -1 | neutral | chaos | Public | 3, 4, 5 | - | - | First mission finisher chooses one opponent to receive -1. |
| CHA-006 | Copycat | If two players complete the same style of achievement, both get +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Award +1 each to matching achievement pair when applicable. |
| CHA-007 | Lone Wolf | Only one player may score mission points. First to complete locks everyone else out. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual lockout effect; only first successful player receives mission points. |
| CHA-008 | Comeback Card | Player currently last in game score gets +1 bonus if they complete any mission. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Identify current last-place golfer and award +1 if they complete mission. |
| CHA-009 | Pressure Cooker | If you miss a putt inside 4 feet, you cannot score mission points. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual disqualification from mission points if short putt is missed. |
| CHA-010 | No Safe Plays | Layups do not count for mission rewards unless card explicitly allows it. | 0 | neutral | chaos | Public | 4, 5 | - | - | Manual constraint: layups cannot satisfy mission conditions unless stated. |
| CHA-011 | Birdie Bounty | Any birdie is worth +2 extra game points. | 2 | neutral | chaos | Public | 3, 4, 5 | - | - | Award additional +2 to any golfer making birdie. |
| CHA-012 | Bogey Tax | Any player making double bogey or worse gets -1 game point. | -1 | neutral | chaos | Public | 3, 4, 5 | - | - | Apply -1 to golfers who post double bogey or worse. |
| CHA-013 | Long Putt Special | Any made putt over 10 feet is worth +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Award +1 extra when golfer holes a putt longer than 10 feet. |
| CHA-014 | Target Golf | Approach shots on green earn +1 extra if player also avoids a 3-putt. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Award +1 if golfer hits approach to green and completes hole without 3-putt. |
| CHA-015 | Chaos Swap | Hole winner in game points may swap one point with any other player. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual swap effect: winner transfers 1 point with chosen opponent. |
| CHA-016 | Revenge Hole | Player with lowest game points on previous hole gets first tie-break rights on this hole. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual tie-break priority effect for previous-hole lowest scorer. |
| CHA-017 | Team Trouble | If one player finds water, every other player making bogey or better gets +1. | 1 | neutral | chaos | Public | 3, 4, 5 | water | - | When water is found, award +1 to other golfers finishing bogey or better. |
| CHA-018 | Jackpot Hole | All mission rewards on this hole are worth +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Add +1 bonus to every successfully completed mission reward. |
| CHA-019 | Double Trouble | If two or more players fail their missions, all successful players gain +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If two or more players fail their missions, all successful players gain +1 extra. Apply +1 points based on selected resolution. |
| CHA-020 | Rich Get Richer | Current game leader earns +1 if they complete any mission this hole. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Current game leader earns +1 if they complete any mission this hole. Apply +1 points based on selected resolution. |
| CHA-021 | Robin Hood | Current game leader loses 1 point if they fail; last place gains 1 if they succeed. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Current game leader loses 1 point if they fail; last place gains 1 if they succeed. |
| CHA-022 | Par 3 Panic | On a par 3, anyone missing the green cannot earn mission points. | 0 | neutral | chaos | Public | 3 | - | - | Manual chaos resolution. On a par 3, anyone missing the green cannot earn mission points. Apply 0 points based on selected resolution. |
| CHA-023 | The Collector | Any player who completes their mission and makes par or better steals 1 point from the current leader. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. A player who succeeds and makes par or better steals 1 point from current leader. |
| CHA-024 | Heat Check | If the same player succeeds on three holes in a row, they gain +2 extra here. | 2 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If the same player succeeds on three holes in a row, they gain +2 extra here. Apply +2 points based on selected resolution. |
| CHA-025 | Freeze Out | The previous hole's winner cannot earn bonus points from Chaos this hole. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Previous hole winner cannot receive this hole's chaos bonus. |
| CHA-026 | Mercy Rule | Any player in last place gets +1 just for completing a Common card this hole. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player in last place gets +1 just for completing a Common card this hole. Apply +1 points based on selected resolution. |
| CHA-027 | Group Project | If everyone in the group makes bogey or better, everyone gets +1. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If everyone in the group makes bogey or better, everyone gets +1. Apply +1 points based on selected resolution. |
| CHA-028 | Disaster Dividend | If any player cards triple bogey or worse, all other players get +2. | 2 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If any player cards triple bogey or worse, all other players get +2. Apply +2 points based on selected resolution. |
| CHA-029 | Clutch Multiplier | Any made putt over 12 feet is worth +2 instead of +1 bonus. | 2 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. A made putt over 12 feet is worth +2 bonus instead of +1. |
| CHA-030 | Fairway Tax | Any player missing the fairway on a par 4 or 5 loses 1 game point unless their mission specifically involves recovery. | -1 | neutral | chaos | Public | 4, 5 | - | - | Manual chaos resolution. Missing fairway on par 4/5 loses 1 game point unless mission is recovery-based. |
| CHA-031 | Bonus for Bravery | Any player completing a Risk card this hole gets +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player completing a Risk card this hole gets +1 extra. Apply +1 points based on selected resolution. |
| CHA-032 | Commoner's Relief | Any player completing a Common card this hole gets +1 extra if they are currently last in game points. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player completing a Common card this hole gets +1 extra if they are currently last in game points. Apply +1 points based on selected resolution. |
| CHA-033 | Clean Card Bonus | Any player who completes their mission and avoids a penalty stroke gets +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player who completes their mission and avoids a penalty stroke gets +1 extra. Apply +1 points based on selected resolution. |
| CHA-034 | Shared Glory | If every player completes their personal mission, everyone gets +2. | 2 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If every player completes their personal mission, everyone gets +2. Apply +2 points based on selected resolution. |
| CHA-035 | Only Pars Matter | Any player making par or better earns +1 game point, even if they fail their mission. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player making par or better earns +1 game point, even if they fail their mission. Apply +1 points based on selected resolution. |
| CHA-036 | Miss and Pay | Any player who 3-putts loses 1 game point. | -1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player who 3-putts loses 1 game point. Apply -1 points based on selected resolution. |
| CHA-037 | Kingmaker | The player with the best real score on the hole may give +1 to any other player. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Hole best real-score player may grant +1 to any other player. |
| CHA-038 | Tight Race | If two or more players tie for best game points on the hole, all tied players get +1 extra. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. If two or more players tie for best game points on the hole, all tied players get +1 extra. Apply +1 points based on selected resolution. |
| CHA-039 | Fail Forward | Any player who fails their mission but still makes bogey or better gains +1. | 1 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Any player who fails their mission but still makes bogey or better gains +1. Apply +1 points based on selected resolution. |
| CHA-040 | Spotlight Hole | The current real-score leader cannot earn Chaos bonus points this hole. | 0 | neutral | chaos | Public | 3, 4, 5 | - | - | Manual chaos resolution. Current real-score leader is ineligible for chaos bonus on this hole. |

## Props (props)

- Short: Prediction cards before the hole begins.
- Includes: Prop public prediction cards
- Best for: Groups that enjoy quick pre-hole picks
- Premium-ready: No
- Card count: 40

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| PRP-001 | Somebody Birdies | Will anyone in the group make birdie? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Each golfer predicts yes/no. Correct calls earn +2. |
| PRP-002 | Longest Drive Leader | Pick who has the longest drive in play. | 2 | neutral | prop | Public | 4, 5 | - | - | Each golfer picks a player. Correct pick earns +2. |
| PRP-003 | Green Hit (Player Pick) | Pick any active player: will they hit the green in regulation? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Template card: select target golfer before tee-off and predict yes/no on their GIR result. |
| PRP-004 | Clutch Putt (Player Pick) | Pick any active player: will they make a putt over 8 feet? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Template card: select target golfer and resolve success if they hole a putt longer than 8 feet. |
| PRP-005 | Fairway Bet (Player Pick) | Pick any active player: will they hit the fairway? | 2 | neutral | prop | Public | 4, 5 | - | - | Template card: select target golfer and resolve success if their tee shot is fairway in regulation. |
| PRP-006 | Safe Hole | Will nobody in the group take a penalty stroke? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-007 | Trouble Hole | Will at least one player hit bunker or water? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-008 | Par 3 Dart | Will anyone finish inside 20 feet on the tee shot? | 2 | neutral | prop | Public | 3 | - | - | On par 3, yes/no prediction. Correct call earns +2. |
| PRP-009 | No Three-Putts | Will the group combine for zero 3-putts on this hole? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-010 | Blow-Up Alert | Will any player make double bogey or worse? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-011 | Scramble Save | Will anyone miss the green and still save par? | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +3. |
| PRP-012 | Bomb Watch | Will anyone drive it 260+ in play? | 2 | neutral | prop | Public | 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-013 | Birdie Player Pick | Pick one player most likely to make birdie. | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Choose one active golfer before play. Correct pick earns +3. |
| PRP-014 | Bounce Back Call | Will the player with worst real score last hole make bogey or better here? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction using prior-hole real-score loser as target. Correct call earns +2. |
| PRP-015 | Two-Putt Field | Will every player who reaches the green take two putts or fewer? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-016 | Hero Shot | Will someone attempt an aggressive line/carry/recovery and pull it off? | 3 | neutral | prop | Public | 4, 5 | - | - | Yes/no prediction. Correct call earns +3. |
| PRP-017 | Closest to Pin Pick | Pick who will finish closest on a par 3 after the tee shot. | 3 | neutral | prop | Public | 3 | - | - | Choose one active golfer on par 3. Correct pick earns +3. |
| PRP-018 | Chaos Prediction | Will the hole public Chaos card affect at least two players? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Yes/no prediction. Correct call earns +2. |
| PRP-019 | Fairway Sweep | Will at least half the group hit the fairway? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least half the group hit the fairway? Correct call: +2. |
| PRP-020 | Green Sweep | Will at least half the group hit the green in regulation? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least half the group hit the green in regulation? Correct call: +2. |
| PRP-021 | Sand Visit | Will anyone visit a bunker and still make bogey or better? | 2 | neutral | prop | Public | 3, 4, 5 | bunkers | - | Manual prop resolution. Will anyone visit a bunker and still make bogey or better? Correct call: +2. |
| PRP-022 | Long Putt Drop | Will any player make a putt over 15 feet? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will any player make a putt over 15 feet? Correct call: +2. |
| PRP-023 | Clean Card | Will the entire group avoid penalty strokes this hole? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will the entire group avoid penalty strokes this hole? Correct call: +2. |
| PRP-024 | Lone Birdie | Will exactly one player make birdie? | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will exactly one player make birdie? Correct call: +3. |
| PRP-025 | All Safe | Will every player keep their tee shot in play? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will every player keep their tee shot in play? Correct call: +2. |
| PRP-026 | Blowup Pair | Will at least two players make double bogey or worse? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least two players make double bogey or worse? Correct call: +2. |
| PRP-027 | Best Ball Brain | Pick the player most likely to record the lowest real score on the hole. | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Pick the player most likely to record the lowest real score on the hole. Correct call: +3. |
| PRP-028 | Sand Save Alert | Will anyone get up-and-down from a bunker? | 3 | neutral | prop | Public | 3, 4, 5 | bunkers | - | Manual prop resolution. Will anyone get up-and-down from a bunker? Correct call: +3. |
| PRP-029 | Hero or Zero | Will someone attempt a risky aggressive shot and pay for it with bogey or worse? | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will someone attempt a risky aggressive shot and pay for it with bogey or worse? Correct call: +3. |
| PRP-030 | Mission Monster | Will at least three players complete their personal mission this hole? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least three players complete their personal mission this hole? Correct call: +2. |
| PRP-031 | Par Train | Will at least two players make par or better? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least two players make par or better? Correct call: +2. |
| PRP-032 | Risk Pays Off | Will any player complete a Risk card this hole? | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will any player complete a Risk card this hole? Correct call: +3. |
| PRP-033 | Clean Tee Shots | Will every player keep their first shot in play? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will every player keep their first shot in play? Correct call: +2. |
| PRP-034 | Mission Fail Rate | Will more players fail their mission than complete it? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will more players fail their mission than complete it? Correct call: +2. |
| PRP-035 | One-Putt Club | Will anyone one-putt from outside 6 feet? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will anyone one-putt from outside 6 feet? Correct call: +2. |
| PRP-036 | Best Score Pick | Pick which player will post the best real score on the hole. | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Pick which player will post the best real score on the hole. Correct call: +3. |
| PRP-037 | Bounce-Back Hole | Will any player who made double bogey or worse on the last hole make par or better here? | 3 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will any player who made double bogey or worse on the last hole make par or better here? Correct call: +3. |
| PRP-038 | Green Parade | Will at least two players hit the green in regulation? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will at least two players hit the green in regulation? Correct call: +2. |
| PRP-039 | Trouble and Recovery | Will anyone find trouble and still make bogey or better? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will anyone find trouble and still make bogey or better? Correct call: +2. |
| PRP-040 | Bonus Chaos | Will the Chaos card award or remove points from more than one player? | 2 | neutral | prop | Public | 3, 4, 5 | - | - | Manual prop resolution. Will the Chaos card award or remove points from more than one player? Correct call: +2. |

## Curse (curse)

- Short: Restrictions and handicaps for tougher missions.
- Includes: Curse personal challenge cards
- Best for: Competitive groups and difficulty spikes
- Premium-ready: Yes (future-expansion)
- Card count: 15

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| CUR-001 | No Warm Blanket | You cannot use your favorite club on the hole. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You cannot use your favorite club on the hole. Reward: +3. |
| CUR-002 | Pressure Tee | You must tee off first regardless of honors. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You must tee off first regardless of honors. Reward: +2. |
| CUR-003 | No Practice Swing | No practice swings on any full shot this hole. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. No practice swings on any full shot this hole. Reward: +2. |
| CUR-004 | Putter Nerves | Any putt inside 5 feet must be holed cleanly with no gimmies. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. Any putt inside 5 feet must be holed cleanly with no gimmies. Reward: +2. |
| CUR-005 | One-Club Down | You must club down by one on one full swing this hole. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You must club down by one on one full swing this hole. Reward: +3. |
| CUR-006 | One-Club Up | On one full swing this hole, you must take one extra club and choke down or swing easy. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. On one full swing this hole, you must take one extra club and choke down or swing easy. Reward: +3. |
| CUR-007 | Silent Swing | No talking through your setup, shot, or immediate result. Stay silent until the ball stops. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. No talking through your setup, shot, or immediate result. Stay silent until the ball stops. Reward: +2. |
| CUR-008 | Commit or Else | You must choose your club within 10 seconds once it is your turn. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You must choose your club within 10 seconds once it is your turn. Reward: +2. |
| CUR-009 | No Rangefinder | You may not use a rangefinder or GPS on the hole. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You may not use a rangefinder or GPS on the hole. Reward: +2. |
| CUR-010 | Blind Confidence | You must pick your club before hearing anyone else's yardage or advice. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. You must pick your club before hearing anyone else's yardage or advice. Reward: +2. |
| CUR-011 | Texas Hold'em | If your ball is on the fringe, you must putt it rather than chip it. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. If your ball is on the fringe, you must putt it rather than chip it. Reward: +2. |
| CUR-012 | Fairway Wood Jail | On one non-tee full swing, you must use a fairway wood or hybrid. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. On one non-tee full swing, you must use a fairway wood or hybrid. Reward: +3. |
| CUR-013 | No Hero Clause | If you get into trouble, you must take the safe punch-out instead of a miracle shot. | 2 | medium | curse | Personal | 3, 4, 5 | - | - | Manual mission check. If you get into trouble, you must take the safe punch-out instead of a miracle shot. Reward: +2. |
| CUR-014 | Bare Minimum | You must make bogey or better or lose 1 game point. If you do, gain the listed reward. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. Make bogey or better to gain +3. Failure may also apply a manual -1 penalty. |
| CUR-015 | Clean Finish | Once you reach the green, you may not leave any putt short of the hole. | 3 | hard | curse | Personal | 3, 4, 5 | - | - | Manual mission check. Once you reach the green, you may not leave any putt short of the hole. Reward: +3. |

## Style (style)

- Short: Social and theatrical challenge cards.
- Includes: Style personal challenge cards
- Best for: Casual rounds and social groups
- Premium-ready: Yes (future-expansion)
- Card count: 15

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| STY-001 | Called Shot | Before one shot, call your intended shape or landing zone. Pull it off to score. | 2 | medium | style | Personal | 3, 4, 5 | - | - | Manual mission check. Before one shot, call your intended shape or landing zone. Pull it off to score. Reward: +2. |
| STY-002 | Deadpan | No celebration allowed if you complete your mission. Break character and lose the bonus. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. No celebration allowed if you complete your mission. Break character and lose the bonus. Reward: +1. |
| STY-003 | Finger Guns | After a made putt, celebrate like a complete dork. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. After a made putt, celebrate like a complete dork. Reward: +1. |
| STY-004 | Commentary Mode | Another player narrates your next shot. If you succeed, both earn +1. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. Another player narrates your next shot; if successful both players gain +1. |
| STY-005 | Walk-Off Energy | After your final putt, do not watch it. Start walking immediately. It still has to drop. | 3 | hard | style | Personal | 3, 4, 5 | - | - | Manual mission check. After your final putt, do not watch it. Start walking immediately. It still has to drop. Reward: +3. |
| STY-006 | Club Twirl Tax | After your best full swing of the hole, you must club twirl. If the group agrees it was worthy, score it. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. After your best full swing of the hole, you must club twirl. If the group agrees it was worthy, score it. Reward: +1. |
| STY-007 | PGA Interview | After the hole, explain one shot as if you're in a post-round interview. Group votes if you committed to the bit. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. After the hole, explain one shot as if you're in a post-round interview. Group votes if you committed to the bit. Reward: +1. |
| STY-008 | Villain Arc | For one shot, openly announce an absurdly aggressive intention. If you pull it off, score it. | 2 | medium | style | Personal | 3, 4, 5 | - | - | Manual mission check. For one shot, openly announce an absurdly aggressive intention. If you pull it off, score it. Reward: +2. |
| STY-009 | Caddie for a Moment | Let another player choose your club for one shot. If the result is acceptable and you still make bogey or better, score it. | 2 | medium | style | Personal | 3, 4, 5 | - | - | Manual mission check. Let another player choose your club for one shot. If the result is acceptable and you still make bogey or better, score it. Reward: +2. |
| STY-010 | Respect the Line | Before a putt, dramatically squat and read it like it contains the secrets of the universe. Then make it. | 2 | medium | style | Personal | 3, 4, 5 | - | - | Manual mission check. Before a putt, dramatically squat and read it like it contains the secrets of the universe. Then make it. Reward: +2. |
| STY-011 | Signature Move | Declare one shot your "signature shot" before hitting it. If the group agrees it looked pure, score it. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. Declare one shot your "signature shot" before hitting it. If the group agrees it looked pure, score it. Reward: +1. |
| STY-012 | Broadcaster Voice | Call your own shot in a golf-commentator voice before hitting it. If successful, score it. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. Call your own shot in a golf-commentator voice before hitting it. If successful, score it. Reward: +1. |
| STY-013 | Stone Face Par | Make par or better and react like it meant absolutely nothing. | 2 | medium | style | Personal | 3, 4, 5 | - | - | Manual mission check. Make par or better and react like it meant absolutely nothing. Reward: +2. |
| STY-014 | Cartoon Confidence | On one putt outside 8 feet, confidently say "that's in" before the stroke. If it drops, score it. | 3 | hard | style | Personal | 3, 4, 5 | - | - | Manual mission check. On one putt outside 8 feet, confidently say "that's in" before the stroke. If it drops, score it. Reward: +3. |
| STY-015 | Group Approval | Do one ridiculous but harmless celebration after completing your mission. If the group gives it a thumbs-up, score it. | 1 | easy | style | Personal | 3, 4, 5 | - | - | Manual mission check. Do one ridiculous but harmless celebration after completing your mission. If the group gives it a thumbs-up, score it. Reward: +1. |

## Novelty (novelty)

- Short: Unusual shot challenges and creative play.
- Includes: Novelty personal challenge cards
- Best for: Creative players and casual groups
- Premium-ready: Yes (future-expansion)
- Card count: 30

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| NOV-001 | One-Hand Wonder | Hit one shot one-handed during this hole, then finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Hit one shot one-handed during this hole, then finish double bogey or better. Reward: +4. |
| NOV-002 | Opposite-Hand Escape | On one short shot or putt, use your opposite-handed stance and still finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one short shot or putt, use your opposite-handed stance and still finish double bogey or better. Reward: +4. |
| NOV-003 | Putter Off the Fringe | From off the green, use putter at least once and still make bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. From off the green, use putter at least once and still make bogey or better. Reward: +3. |
| NOV-004 | Feet Together | Hit one full or partial shot with your feet together, then finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Hit one full or partial shot with your feet together, then finish double bogey or better. Reward: +4. |
| NOV-005 | Knockdown Artist | Declare one shot a low punch or knockdown before hitting it, then pull it off and finish bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Declare one shot a low punch or knockdown before hitting it, then pull it off and finish bogey or better. Reward: +3. |
| NOV-006 | Caddie's Choice | Let another player choose your club for one shot, then finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Let another player choose your club for one shot, then finish double bogey or better. Reward: +4. |
| NOV-007 | No Glove, No Problem | Play the entire hole without a glove and finish bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Play the entire hole without a glove and finish bogey or better. Reward: +3. |
| NOV-008 | Three-Quarter Specialist | On one full swing, intentionally hit a three-quarter shot and keep it in play. Finish double bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one full swing, intentionally hit a three-quarter shot and keep it in play. Finish double bogey or better. Reward: +3. |
| NOV-009 | Texas Wedge Life | Use putter from off the green at least once and finish bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Use putter from off the green at least once and finish bogey or better. Reward: +3. |
| NOV-010 | Called Bank Shot | Call that your chip or putt will use a slope, bank, or side contour, then execute it well enough to finish within 4 feet or hole it. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Call that your chip or putt will use a slope, bank, or side contour, then execute it well enough to finish within 4 feet or hole it. Reward: +4. |
| NOV-011 | Eyes on the Prize | On one short putt inside 4 feet, hold your finish dramatically until the ball drops. Still make bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one short putt inside 4 feet, hold your finish dramatically until the ball drops. Still make bogey or better. Reward: +3. |
| NOV-012 | Hero Pose | After one shot, hold a ridiculously confident pose until the ball lands. If the shot is acceptable and you finish double bogey or better, score it. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. After one shot, hold a ridiculously confident pose until the ball lands. If the shot is acceptable and you finish double bogey or better, score it. Reward: +3. |
| NOV-013 | The Bump-and-Run | Play one intentional bump-and-run chip and get it onto the green or fringe. Finish bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Play one intentional bump-and-run chip and get it onto the green or fringe. Finish bogey or better. Reward: +3. |
| NOV-014 | Club Flip Approved | After one clearly good shot, do a club twirl or flip. If the group agrees the shot earned it and you finish double bogey or better, score it. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. After one clearly good shot, do a club twirl or flip. If the group agrees the shot earned it and you finish double bogey or better, score it. Reward: +3. |
| NOV-015 | Walk-In Putt | Before a putt outside 6 feet, start walking after contact as if it's going in. If it drops, score it. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Before a putt outside 6 feet, start walking after contact as if it's going in. If it drops, score it. Reward: +4. |
| NOV-016 | Half-Swing Hustle | Take one intentional half-swing on a recovery or wedge shot and still make bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Take one intentional half-swing on a recovery or wedge shot and still make bogey or better. Reward: +3. |
| NOV-017 | No Tee, Brave Soul | On one tee shot, hit without using a tee when legal to do so, and keep it in play. Finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one tee shot, hit without using a tee when legal to do so, and keep it in play. Finish double bogey or better. Reward: +4. |
| NOV-018 | Back-Foot Punch | Hit one shot intentionally off the back foot and keep it in play. Finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Hit one shot intentionally off the back foot and keep it in play. Finish double bogey or better. Reward: +4. |
| NOV-019 | Putt With Personality | Use an exaggeratedly serious pre-putt routine on one putt, then make it from 5 feet or more. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Use an exaggeratedly serious pre-putt routine on one putt, then make it from 5 feet or more. Reward: +3. |
| NOV-020 | The Listener | You must take swing advice from another player on one shot. If you follow it and still finish double bogey or better, score it. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. You must take swing advice from another player on one shot. If you follow it and still finish double bogey or better, score it. Reward: +4. |
| NOV-021 | Flighted Finish | Hit one intentionally flighted wedge or short iron and keep it under control. Finish bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Hit one intentionally flighted wedge or short iron and keep it under control. Finish bogey or better. Reward: +3. |
| NOV-022 | Barely Legal | Use the strangest club in your bag for one reasonable shot and still finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Use the strangest club in your bag for one reasonable shot and still finish double bogey or better. Reward: +4. |
| NOV-023 | One-Club Wizard | Use the same club for two consecutive non-putt shots and still make bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Use the same club for two consecutive non-putt shots and still make bogey or better. Reward: +4. |
| NOV-024 | The Toe Poke | On one recovery shot, intentionally just advance the ball safely instead of trying hero nonsense. Still make bogey or better. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one recovery shot, intentionally just advance the ball safely instead of trying hero nonsense. Still make bogey or better. Reward: +3. |
| NOV-025 | Declare the Miss | Before an approach, openly declare your intended miss side. If the result matches and you finish bogey or better, score it. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Before an approach, openly declare your intended miss side. If the result matches and you finish bogey or better, score it. Reward: +3. |
| NOV-026 | Lucky Bounce Believer | Before one shot, call for a generous bounce or kick. If the ball gets one and you still finish double bogey or better, score it. | 3 | medium | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Before one shot, call for a generous bounce or kick. If the ball gets one and you still finish double bogey or better, score it. Reward: +3. |
| NOV-027 | Soft Hands | On one greenside shot, use your highest-lofted club and leave it on the green. Finish bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one greenside shot, use your highest-lofted club and leave it on the green. Finish bogey or better. Reward: +4. |
| NOV-028 | No Stepping Off | On one full shot, once you address the ball, you may not step off. Hit it and keep it in play. Finish double bogey or better. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. On one full shot, once you address the ball, you may not step off. Hit it and keep it in play. Finish double bogey or better. Reward: +4. |
| NOV-029 | Trust the Read | Take one putt without a practice stroke and hole it from 6 feet or more. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Take one putt without a practice stroke and hole it from 6 feet or more. Reward: +4. |
| NOV-030 | Art Project | Attempt one intentionally shaped or creative shot that the group agrees was legitimate. If you pull it off and finish double bogey or better, score it. | 4 | hard | novelty | Personal | 3, 4, 5 | - | - | Manual mission check. Attempt one intentionally shaped or creative shot that the group agrees was legitimate. If you pull it off and finish double bogey or better, score it. Reward: +4. |

## Hybrid (hybrid)

- Short: Competitive cards tied to group performance.
- Includes: Hybrid personal challenge cards
- Best for: Competitive groups and pressure play
- Premium-ready: Yes (future-expansion)
- Card count: 10

| Code | Name | Challenge | Points | Difficulty | Type | Visibility | Eligible Pars | Required Tags | Excluded Tags | Rules |
|---|---|---|---:|---|---|---|---|---|---|---|
| HYB-001 | Match the Leader | Finish the hole with the same or better real score than the current leader. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Finish the hole with the same or better real score than the current leader. Reward: +2. |
| HYB-002 | Spoiler Alert | Beat at least one player who is ahead of you in game points on this hole's real score. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Beat at least one player who is ahead of you in game points on this hole's real score. Reward: +2. |
| HYB-003 | Chase Mode | If the player before you completes their mission, complete yours too. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. If the player before you completes their mission, complete yours too. Reward: +2. |
| HYB-004 | Best in the Group | Record the best real score on the hole outright. | 3 | hard | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Record the best real score on the hole outright. Reward: +3. |
| HYB-005 | Survivor | If at least one player makes double bogey or worse, make bogey or better. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. If at least one player makes double bogey or worse, make bogey or better. Reward: +2. |
| HYB-006 | Pressure Pairing | Finish no more than one stroke worse than the best score in the group. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Finish no more than one stroke worse than the best score in the group. Reward: +2. |
| HYB-007 | Outplay the Bombers | Have a shorter drive than someone else in the group but still tie or beat them on the hole. | 3 | hard | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Have a shorter drive than someone else in the group but still tie or beat them on the hole. Reward: +3. |
| HYB-008 | Closer's Bonus | If you are the last to hole out, still make bogey or better. | 2 | medium | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. If you are the last to hole out, still make bogey or better. Reward: +2. |
| HYB-009 | Turn the Tables | After losing to at least one player on the previous hole, beat them here. | 3 | hard | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. After losing to at least one player on the previous hole, beat them here. Reward: +3. |
| HYB-010 | Shadow Game | Match your own mission and also beat your previous hole's real score. | 3 | hard | hybrid | Personal | 3, 4, 5 | - | - | Manual mission check. Match your own mission and also beat your previous hole's real score. Reward: +3. |

---

Total cards: 270
