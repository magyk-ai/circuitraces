# Content Authoring Guide

This guide explains how to create wordlists that produce interesting, playable puzzles for Circuit Races.

**Related documents:**
- `FORMAT_SPEC.md` — JSON schema reference for puzzle and wordlist formats
- `spec-v1.0.md` §10.7 — Generation constraints (EASY_DAILY_V1 profile)

## Overview

Circuit Races puzzles are generated from **topic-based wordlists**. Each topic contains:
- **Path words**: The main words players must find to connect START → END
- **Bonus words**: Extra words that intersect the path for bonus points

The puzzle generator randomly selects words and places them on a grid, ensuring they intersect and form a connected path.

## Wordlist Format

Wordlists are stored in JSON format at `packages/generator/wordlists/`.

See `FORMAT_SPEC.md` for the complete schema. Quick reference:

```json
{
  "contentVersion": "2026.01.17",
  "topics": {
    "topic-id": {
      "path": ["WORD1", "WORD2", "WORD3", ...],
      "bonus": ["HINT1", "HINT2", "HINT3", ...]
    }
  }
}
```

### Field Specifications

| Field | Type | Description |
|-------|------|-------------|
| `contentVersion` | string | Date stamp for tracking changes (YYYY.MM.DD) |
| `topics` | object | Map of topic-id → wordlist |
| `path` | string[] | Main path words (50+ recommended) |
| `bonus` | string[] | Bonus/hint words (20+ recommended) |

## Word Requirements

### Length Constraints

| Category | Min | Max | Ideal Range |
|----------|-----|-----|-------------|
| Path words | 3 | 7 | 4-6 chars |
| Bonus words | 3 | 7 | 3-4 chars |

**Why these limits?**
- Words < 3 chars are too easy and cause placement issues
- Words > 7 chars are hard to fit on 7×7/8×8 grids
- 4-6 char words provide the best intersection opportunities

### Character Set

- **Allowed**: A-Z uppercase letters only
- **Not allowed**: Numbers, symbols, spaces, lowercase, accents, emoji

```
✅ GOOD: BUILD, DEPLOY, MERGE, STACK
❌ BAD:  build, 401K, S&P, café, 🚀
```

### Word Count Targets

| Category | Minimum | Recommended | Why |
|----------|---------|-------------|-----|
| Path words | 30 | 50+ | More variety, fewer generation failures |
| Bonus words | 15 | 20+ | Ensures bonus word placement succeeds |

## Creating Interesting Wordlists

### 1. Theme Coherence

All words should clearly belong to the topic. Players enjoy recognizing domain vocabulary.

```
✅ DevOps theme: BUILD, DEPLOY, MERGE, DOCKER, KUBE, SCALE
❌ Mixed themes: BUILD, PIZZA, DEPLOY, SUNSET, MERGE
```

### 2. Length Distribution

Aim for a balanced distribution across lengths. Too many same-length words limits placement options.

**Ideal path word distribution (for 50 words):**
```
3 chars:  5-8 words   (10-15%)
4 chars: 15-20 words  (30-40%)  ← Most common
5 chars: 12-15 words  (25-30%)
6 chars:  8-12 words  (15-25%)
7 chars:  3-5 words   (5-10%)
```

**Check your distribution:**
```bash
cd packages/generator
npm run wordlist:stats
```

### 3. Letter Variety

Include words with diverse starting letters and common intersection letters.

**High-value intersection letters** (appear in many positions):
- Vowels: A, E, I, O, U
- Common consonants: S, T, R, N, L

```
✅ Good variety: ALERT, BUILD, CODE, DEPLOY, ERROR, FATAL
❌ Poor variety: BUILD, BRANCH, BINARY, BASH, BLOCK, BUG
```

### 4. Avoid Near-Duplicates

Words that are too similar confuse players and create visual clutter.

```
❌ Avoid: TEST, TESTS, TESTING (pick one)
❌ Avoid: LOG, LOGS, LOGGER (pick one)
❌ Avoid: BUILD, BUILDS, BUILDER (pick one)
✅ Better: TEST, BUILD, DEPLOY, MERGE, SCALE
```

### 5. Intersection Potential

Words should share common letters to enable intersection. Check that your wordlist has words that can cross each other.

**Good intersection pairs:**
```
BUILD ∩ DEBUG (share U)
SCALE ∩ ALERT (share A, L, E)
MERGE ∩ ERROR (share E, R)
```

**Poor intersection potential:**
```
JAZZ ∩ FIZZ (only Z, uncommon)
MYTH ∩ LYNX (minimal overlap)
```

### 6. Bonus Word Strategy

Bonus words should:
- Be **shorter** (3-4 chars ideal) - easier to place
- Share letters with path words - must intersect
- Be **recognizable** - abbreviations, acronyms work well

```
✅ Good bonus: API, SSL, GIT, AWS, URL, DNS
❌ Poor bonus: BALANCER, FIREWALL (too long, hard to place)
```

## Common Mistakes

### 1. Too Many Long Words
```
❌ KUBERNETES, CONTAINERIZE, ORCHESTRATION
✅ KUBE, DOCKER, SCALE, POD, NODE
```

### 2. Words Outside Length Range
```
❌ UP (2 chars - too short)
❌ RETENTION (9 chars - too long)
✅ CHURN, GROWTH, FUNNEL (4-6 chars)
```

### 3. Insufficient Word Count
```
❌ 20 path words → Many generation failures
✅ 50 path words → Reliable generation
```

### 4. Duplicate Words Across Lists
```
❌ "DEV" in both path and bonus lists
✅ Keep path and bonus lists disjoint
```

### 5. Case Sensitivity
```
❌ "deck", "Slide" (mixed case)
✅ "DECK", "SLIDE" (uppercase only)
```

## Validation Checklist

Before submitting a wordlist:

- [ ] All words are 3-7 characters
- [ ] All words are UPPERCASE letters only
- [ ] At least 50 path words
- [ ] At least 20 bonus words
- [ ] No duplicates within or across lists
- [ ] Good length distribution (check with `npm run wordlist:stats`)
- [ ] Words are thematically coherent
- [ ] Diverse starting letters
- [ ] Good intersection potential (shared vowels/consonants)

## Testing Your Wordlist

### 1. Check Statistics
```bash
cd packages/generator
npm run wordlist:stats
```

Look for:
- Usable words percentage (should be >90%)
- Balanced length distribution
- Words flagged as too short/long

### 2. Generate Test Puzzles
```bash
npm run generate
```

Watch for:
- Generation failures (> 100 attempts is concerning)
- Failed topics (may need more/better words)

### 3. Run Content QA
```bash
npm run content:qa
```

All puzzles should pass with `✅ OK`.

### 4. Play Test

Load puzzles in the web app and verify:
- Words are recognizable and thematic
- Puzzle difficulty feels appropriate
- No confusing visual layouts

## Example: Well-Designed Wordlist

```json
{
  "devops": {
    "path": [
      "BUILD", "DEPLOY", "MERGE", "SCALE", "CLOUD",
      "CODE", "TEST", "HOST", "NODE", "PUSH",
      "PULL", "REPO", "PIPE", "ROOT", "USER",
      "SUDO", "BASH", "SHELL", "DISK", "DOCKER",
      "KUBE", "POD", "LOAD", "PROXY", "RULE",
      "ALERT", "GRAPH", "TRACE", "DEBUG", "ERROR",
      "WARN", "INFO", "FATAL", "CRASH", "RETRY",
      "HEAP", "STACK", "QUEUE", "LOGS", "CACHE",
      "NGINX", "REDIS", "MYSQL", "MONGO", "KAFKA",
      "SPARK", "YARN", "HELM", "VAULT", "CONSUL"
    ],
    "bonus": [
      "OPS", "DEV", "CI", "CD", "API",
      "SSL", "SSH", "AWS", "GCP", "URL",
      "DNS", "GIT", "TAG", "RUN", "JOB",
      "VM", "OS", "TCP", "UDP", "HTTP"
    ]
  }
}
```

**Why this works:**
- 50 path words, 20 bonus words
- Length distribution: 3-char (4), 4-char (20), 5-char (16), 6-char (8), etc.
- Good letter variety (words start with many different letters)
- Clear DevOps theme
- Short, punchy bonus words (all 2-4 chars)
- Many common intersection letters (E, A, S, T, R, O)

## Adding a New Topic

1. Create entries in `wordlists/week1.json`:
```json
{
  "topics": {
    "your-new-topic": {
      "path": [...50+ words...],
      "bonus": [...20+ words...]
    }
  }
}
```

2. Add to batch generator schedule in `batch-generate.ts`:
```typescript
const TOPICS = [
  // ... existing topics
  { id: 'your-new-topic', title: 'Your Topic Daily' }
];
```

3. Test generation:
```bash
npm run generate
npm run content:qa
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  WORDLIST QUICK REFERENCE               │
├─────────────────────────────────────────────────────────┤
│ PATH WORDS                                              │
│   Count:    50+ recommended                             │
│   Length:   3-7 chars (4-6 ideal)                       │
│   Format:   UPPERCASE letters only                      │
│                                                         │
│ BONUS WORDS                                             │
│   Count:    20+ recommended                             │
│   Length:   3-7 chars (3-4 ideal)                       │
│   Format:   UPPERCASE letters only                      │
│                                                         │
│ VALIDATION                                              │
│   npm run wordlist:stats    # Check distribution        │
│   npm run generate          # Test puzzle creation      │
│   npm run content:qa        # Verify quality            │
│                                                         │
│ COMMON ISSUES                                           │
│   ❌ Words > 7 chars (won't fit on grid)               │
│   ❌ Words < 3 chars (placement issues)                │
│   ❌ < 30 path words (generation failures)             │
│   ❌ Duplicate words across lists                       │
│   ❌ Mixed case or special characters                   │
└─────────────────────────────────────────────────────────┘
```
