# Data Format Specification

This document specifies the JSON formats used by Circuit Races for puzzles and wordlists.

## Puzzle JSON Format (`WaywordsPuzzle`)

Puzzle files define the grid, words, and game configuration. See `spec-v1.0.md` §5.4 for the authoritative TypeScript definitions.

### Root Structure

```json
{
  "puzzleId": "daily-2026-01-17-devops",
  "mode": "WAYWORDS",
  "theme": "DevOps Daily",
  "config": { ... },
  "grid": { ... },
  "words": { ... }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `puzzleId` | string | Yes | Unique identifier |
| `mode` | `"WAYWORDS"` | No | Game mode (default: WAYWORDS) |
| `theme` | string | Yes | Display title |
| `config` | PuzzleConfig | Yes | Game behavior settings |
| `grid` | Grid | Yes | Grid dimensions, cells, markers |
| `words` | Words | Yes | Path and additional word definitions |

### PuzzleConfig

```json
{
  "selectionModel": "RAY_4DIR",
  "connectivityModel": "ORTHO_4",
  "allowReverseSelection": true
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `selectionModel` | string | `RAY_4DIR`, `RAY_8DIR`, `ADJACENT_4`, `ADJACENT_8` | How players select words |
| `connectivityModel` | string | `ORTHO_4`, `ORTHO_8` | How path connectivity is checked |
| `allowReverseSelection` | boolean | true/false | Allow selecting words backwards |

### Grid

```json
{
  "width": 7,
  "height": 7,
  "cells": [ ... ],
  "start": { "adjacentCellId": "r0c2" },
  "end": { "adjacentCellId": "r6c5" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Grid columns (typically 6-8) |
| `height` | number | Grid rows (typically 6-8) |
| `cells` | Cell[] | All cells in the grid |
| `start` | StartEndMarker | START marker position |
| `end` | StartEndMarker | END marker position |

### Cell

```json
{
  "id": "r0c0",
  "x": 0,
  "y": 0,
  "type": "LETTER",
  "value": "B"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `id` | string | `r{row}c{col}` | Unique cell identifier |
| `x` | number | 0 to width-1 | Column position |
| `y` | number | 0 to height-1 | Row position |
| `type` | string | `LETTER`, `EMOJI`, `VOID` | Cell content type |
| `value` | string | A-Z or emoji ID | Cell content |
| `meaning` | string | (optional) | Emoji meaning text |

### WordDef

```json
{
  "wordId": "BUILD",
  "tokens": [
    { "t": "L", "v": "B" },
    { "t": "L", "v": "U" },
    { "t": "L", "v": "I" },
    { "t": "L", "v": "L" },
    { "t": "L", "v": "D" }
  ],
  "size": 5,
  "placements": [["r0c0", "r0c1", "r0c2", "r0c3", "r0c4"]],
  "hintCellId": "r0c2"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `wordId` | string | The word text (uppercase) |
| `tokens` | Token[] | Letter/emoji breakdown |
| `size` | number | Word length (must equal tokens.length) |
| `placements` | string[][] | Valid cell ID sequences (typically one) |
| `hintCellId` | string | (Additional words only) Cell to highlight as hint |

### Token

```json
{ "t": "L", "v": "A" }
```

| Field | Values | Description |
|-------|--------|-------------|
| `t` | `L`, `E` | Token type: Letter or Emoji |
| `v` | string | Value: letter (A-Z) or emoji ID |

### Example Puzzle

```json
{
  "puzzleId": "example-001",
  "theme": "Example Puzzle",
  "config": {
    "selectionModel": "RAY_4DIR",
    "connectivityModel": "ORTHO_4",
    "allowReverseSelection": true
  },
  "grid": {
    "width": 5,
    "height": 5,
    "cells": [
      { "id": "r0c0", "x": 0, "y": 0, "type": "LETTER", "value": "S" },
      { "id": "r0c1", "x": 1, "y": 0, "type": "LETTER", "value": "T" },
      ...
    ],
    "start": { "adjacentCellId": "r0c0" },
    "end": { "adjacentCellId": "r4c4" }
  },
  "words": {
    "path": [
      {
        "wordId": "START",
        "tokens": [{"t":"L","v":"S"},{"t":"L","v":"T"},{"t":"L","v":"A"},{"t":"L","v":"R"},{"t":"L","v":"T"}],
        "size": 5,
        "placements": [["r0c0","r0c1","r0c2","r0c3","r0c4"]]
      }
    ],
    "additional": []
  }
}
```

---

## Wordlist JSON Format

Wordlists provide source words for puzzle generation, organized by topic.

### Root Structure

```json
{
  "contentVersion": "2026.01.17",
  "topics": {
    "topic-id": {
      "path": ["WORD1", "WORD2", ...],
      "bonus": ["HINT1", "HINT2", ...]
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `contentVersion` | string | Version date (YYYY.MM.DD format) |
| `topics` | object | Map of topic ID → WordList |

### WordList

```json
{
  "path": ["BUILD", "DEPLOY", "MERGE", ...],
  "bonus": ["API", "SSL", "GIT", ...]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string[] | Main path words for puzzles |
| `bonus` | string[] | Additional/hint words |

### Word Requirements

| Constraint | Path Words | Bonus Words |
|------------|------------|-------------|
| Length | 3-7 characters | 3-7 characters |
| Format | UPPERCASE A-Z only | UPPERCASE A-Z only |
| Recommended count | 50+ per topic | 20+ per topic |
| Ideal length | 4-6 characters | 3-4 characters |

### Example Wordlist

```json
{
  "contentVersion": "2026.01.17",
  "topics": {
    "devops": {
      "path": [
        "BUILD", "DEPLOY", "MERGE", "SCALE", "CLOUD",
        "CODE", "TEST", "HOST", "NODE", "PUSH",
        "PULL", "REPO", "PIPE", "ROOT", "USER",
        "SUDO", "BASH", "SHELL", "DISK", "DOCKER",
        "KUBE", "POD", "LOAD", "PROXY", "RULE",
        "ALERT", "GRAPH", "TRACE", "DEBUG", "ERROR",
        "WARN", "INFO", "FATAL", "CRASH", "RETRY",
        "HEAP", "STACK", "QUEUE", "LOGS", "CACHE"
      ],
      "bonus": [
        "OPS", "DEV", "CI", "CD", "API",
        "SSL", "SSH", "AWS", "URL", "DNS",
        "GIT", "TAG", "RUN", "JOB", "VM"
      ]
    }
  }
}
```

---

## File Locations

| File Type | Location | Naming Convention |
|-----------|----------|-------------------|
| Daily puzzles | `apps/web/public/daily/` | `YYYY-MM-DD-topic.json` |
| Puzzle index | `apps/web/public/daily/index.json` | - |
| Wordlists | `packages/generator/wordlists/` | `week1.json`, etc. |
| Sample puzzle | `puzzles/sample.json` | - |

---

## Validation

Use the generator CLI tools to validate formats:

```bash
cd packages/generator

# Validate puzzle JSON
npm run validate path/to/puzzle.json

# Deep audit (geometry, connectivity)
npm run audit path/to/puzzle.json

# Check wordlist statistics
npm run wordlist:stats
```

See `CONTENT_AUTHORING_GUIDE.md` for wordlist creation guidelines.
