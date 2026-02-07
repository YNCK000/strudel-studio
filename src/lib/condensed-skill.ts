/**
 * Condensed Strudel skill for fast agent responses
 * This is a minimal reference - the full skill is in bundled-skills.ts
 */

export const CONDENSED_SKILL = `# Strudel Quick Reference

## Required Format
\`\`\`javascript
setcps(BPM/4/60)  // REQUIRED first line

let kick = s("bd*4")  // Define patterns

stack(kick, ...)  // REQUIRED: playable final expression
\`\`\`

## Mini-Notation
| Syntax | Meaning | Example |
|--------|---------|---------|
| \`*n\` | Repeat | \`s("bd*4")\` |
| \`[...]\` | Subdivide | \`s("[bd sd] hh")\` |
| \`<...>\` | Alternate cycles | \`s("<bd sd>")\` |
| \`~\` | Rest | \`s("bd ~ sd ~")\` |
| \`,\` | Chord/parallel | \`note("c4,e4,g4")\` |
| \`(x,y)\` | Euclidean | \`s("bd(5,16)")\` |

## Sound Sources
**Drums:** bd, sd, hh, oh, cp, tom, rim, cr, ride
**Synths:** sine, sawtooth, square, triangle, supersaw

## Essential Effects
\`\`\`javascript
.lpf(1000)                          // Low-pass filter
.lpf(sine.range(200, 2000).slow(8)) // Animated filter
.lpq(10)                            // Resonance
.gain(0.8)                          // Volume
.room(0.5)                          // Reverb
.delay(0.25).delayfeedback(0.4)     // Delay
.attack(0.01).decay(0.2).sustain(0.7).release(0.5)
\`\`\`

## Pattern Building
\`\`\`javascript
// stack() - Layer together
stack(s("bd*4"), s("hh*8"), s("~ sd ~ sd"))

// arrange() - Song sections
arrange([8, intro], [16, drop], [8, outro])
\`\`\`

## Genre BPMs
House: 120-128 | Techno: 130-140 | Trap: 140 (half-time)
DnB: 170-180 | Hip-Hop: 85-100 | Dubstep: 140

## DO NOT use (hallucinations)
- .glide(), .portamento(), .slide(), .volume()

## Quality Checklist
1. setcps(BPM/4/60) first line
2. Final expression is stack() or arrange()
3. Filter automation on melodics
4. Effects: .room(), .delay() on melodics
5. Drum fills before transitions
`;

export const CONDENSED_ANTIPATTERNS = `# Anti-Patterns (AVOID)

❌ Static drums - vary per section, add fills
❌ Buildups that stop before drop - peak AT the downbeat
❌ Same 4 chords forever - evolve: roots→triads→7ths
❌ Identical drops - each drop needs 1-2 unique elements
❌ No filter movement - use sine.range().slow() on filters
❌ Abrupt transitions - use fills, risers, crashes
`;
