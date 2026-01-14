# Circuit Races

[![Test](https://github.com/magyk-ai/circuitraces/actions/workflows/test.yml/badge.svg)](https://github.com/magyk-ai/circuitraces/actions/workflows/test.yml)
[![Deploy](https://github.com/magyk-ai/circuitraces/actions/workflows/deploy.yml/badge.svg)](https://github.com/magyk-ai/circuitraces/actions/workflows/deploy.yml)

A path-based word puzzle game where players find words that form a connected route from START to END.

🎮 **[Play Now](https://magyk-ai.github.io/circuitraces/)**

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

- `packages/engine` - Pure TypeScript game logic (testable in Node)
- `packages/generator` - Puzzle validation CLI
- `apps/web` - Vite + React web app
- `puzzles/` - Sample puzzle JSON files

## MVP Features

✅ Core engine with path word finding
✅ RAY_8DIR drag selection
✅ Win detection via connectivity check
✅ Unit tested (9 tests passing)
✅ Basic web UI

## Development

```bash
# Run tests
npm test

# Start dev server
npm run dev
# Visit http://localhost:5173

# Validate puzzle
npm run validate puzzles/sample.json
```

## How to Play

1. Drag to select words in the grid
2. Found words highlight in green
3. Win when START connects to END through found path words

### Sample Puzzle Solution

- Select **STAR** (top row)
- Select **PATH** (row 2)
- Select **ECHO** (row 3)
- Select **GOAL** (bottom row)

## Tech Stack

- **Engine:** TypeScript (strict mode)
- **Web:** React 18 + Vite 6
- **Tests:** Vitest 2
- **Package Manager:** npm workspaces

## Documentation

- **`spec-v1.0.md`** - Complete game specification
- **`CLAUDE.md`** - Developer guide for Claude

## Architecture

Engine-first design:
- Pure TypeScript engine (no DOM dependencies)
- O(1) word validation via placement index
- BFS connectivity for win condition
- Selection adapter converts gestures to engine actions

## Next Steps

See `spec-v1.0.md` for full roadmap:
- Hints system
- Additional words + clues
- Emoji tokens
- Circuit Traces visual skin
- Persistence
- Multiple puzzles
