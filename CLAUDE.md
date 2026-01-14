# Circuit Races - Developer Guide for Claude

## Project Overview

Circuit Races is a path-based word puzzle game built with an engine-first architecture. Players find words in a grid that form a connected path from START to END.

**Full specification:** See `spec-v1.0.md` for complete game mechanics and architecture details.

## Quick Start

```bash
# Install all dependencies
npm install

# Run engine tests
npm test

# Start development server
npm run dev

# Build for production
npm run build

# Validate puzzle JSON
npm run validate puzzles/sample.json
```

## Project Structure

```
/home/harshal/magyk/circuitraces/
├── packages/
│   ├── engine/          # Core game logic (pure TypeScript, no DOM)
│   │   ├── src/
│   │   │   ├── types.ts           # Data contracts
│   │   │   ├── actions.ts         # Engine actions & events
│   │   │   ├── placement-index.ts # Fast word validation
│   │   │   ├── connectivity.ts    # BFS connectivity check
│   │   │   ├── engine.ts          # Core reduce function
│   │   │   └── __tests__/         # Unit tests
│   │   └── package.json
│   │
│   └── generator/       # Puzzle validation CLI
│       ├── src/
│       │   ├── validator.ts       # Schema + placement validation
│       │   └── cli.ts             # circuitraces-validate command
│       └── package.json
│
├── apps/
│   └── web/            # Vite + React web app
│       ├── src/
│       │   ├── App.tsx              # Main application
│       │   ├── components/Grid.tsx  # Grid rendering + selection
│       │   └── selection-adapter.ts # RAY_8DIR gesture converter
│       ├── index.html
│       └── package.json
│
├── puzzles/
│   └── sample.json     # Hand-crafted test puzzle (5x5 grid)
│
├── spec-v1.0.md        # Complete game specification
├── README.md           # User-facing documentation
└── package.json        # Workspace root
```

## Current MVP Scope

**Implemented:**
- ✅ Core engine with path words only
- ✅ RAY_8DIR drag selection
- ✅ BFS connectivity check (win condition)
- ✅ Unit tests (9 tests, all passing)
- ✅ Sample puzzle (5x5 grid, 4 words)
- ✅ Basic web UI with drag selection
- ✅ Puzzle validation CLI

**Deferred (Post-MVP):**
- ❌ Hints system
- ❌ Additional words + clues
- ❌ Emoji tokens (letters only for now)
- ❌ Circuit Traces visual skin
- ❌ Persistence/localStorage
- ❌ Multiple puzzles

## Development Workflow

### Testing

```bash
# Run all engine tests
npm test

# Watch mode for TDD
cd packages/engine && npm run test:watch
```

### Building

```bash
# Build engine package
cd packages/engine && npm run build

# Build web app
cd apps/web && npm run build

# Build all
npm run build
```

### Running

```bash
# Start dev server (hot reload enabled)
npm run dev
# Visit http://localhost:5173

# Preview production build
cd apps/web && npm run preview
```

### Validation

```bash
# Validate a puzzle JSON file
npm run validate puzzles/sample.json
# Output: ✓ Puzzle is valid

# Direct validation
cd packages/generator && npm run build
node dist/cli.js ../../puzzles/sample.json
```

## Key Architecture Decisions

### 1. Engine-First Design

The engine (`packages/engine`) is **pure TypeScript** with zero browser/DOM dependencies. This enables:
- Fast unit testing in Node
- Easy portability to native apps
- Clear separation of concerns

### 2. Placement-Based Validation

Words are validated via **O(1) lookup** in a pre-computed placement index. Each word's valid cellId sequences are indexed on puzzle load.

### 3. BFS Connectivity

Win condition uses **breadth-first search** through found path word cells to determine if START connects to END (ORTHO_4 adjacency).

### 4. Selection Adapter

UI gesture (pointer drag) → cellIds conversion happens in `SelectionAdapter` class, keeping geometry logic out of the engine.

## How to Play (Testing)

1. Start dev server: `npm run dev`
2. Grid shows 5x5 letter grid
3. Drag to select words:
   - **STAR** (top row: S-T-A-R)
   - **PATH** (row 2: P-A-T-H)
   - **ECHO** (row 3: E-C-H-O)
   - **GOAL** (row 5: G-O-A-L)
4. When all words found and path connects: completion screen

## Common Tasks

### Adding a New Puzzle

1. Create `puzzles/new-puzzle.json` following `WaywordsPuzzle` schema
2. Validate: `npm run validate puzzles/new-puzzle.json`
3. Update `apps/web/src/App.tsx` to load different puzzle

### Adding Engine Logic

1. Edit files in `packages/engine/src/`
2. Add tests in `packages/engine/src/__tests__/`
3. Run tests: `npm test`
4. Engine is automatically linked to web app via workspace

### Debugging

- Engine: Add `console.log` in `engine.ts`, check browser console
- UI: React DevTools + browser console
- Selection: Log `cellIds` in `Grid.tsx` pointer handlers

## Deployment

### GitHub Pages (Automated)

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages on push to main.

**Setup:**
1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. Push to main branch → automatic deployment

**Manual deployment:**
```bash
npm run build
# Output: apps/web/dist/
# Upload dist/ directory to GitHub Pages manually
```

### Local Testing

```bash
npm run build
cd apps/web
npm run preview
# Visit http://localhost:4173
```

**Note:** The web app uses `base: './'` in vite.config.ts for GitHub Pages compatibility (works with repo-name paths).

## TypeScript Configuration

- **Root:** `tsconfig.base.json` - strict mode, ES2022 target
- **Engine:** Node-only, no DOM types
- **Web:** DOM + React JSX support
- All packages use strict TypeScript

## Package Manager

Using **npm** with workspaces:
- Monorepo dependencies linked automatically
- `@circuitraces/engine` imported directly in web app
- Version: npm 10.x (shipped with Node LTS)

## Known Issues

- Puzzle loading uses absolute path `/sample.json` (requires Vite publicDir config)
- Moderate security vulnerabilities in transitive deps (React ecosystem, non-critical)

## Next Steps

See `spec-v1.0.md` section "Next Steps (Post-MVP)" for roadmap:
1. Additional words + clues
2. Hints system
3. Emoji tokens
4. Circuit Traces visual skin
5. Persistence
6. Multiple puzzles

## Resources

- **Spec:** `spec-v1.0.md` (complete game mechanics)
- **Tests:** `packages/engine/src/__tests__/` (engine correctness)
- **Sample puzzle:** `puzzles/sample.json` (reference implementation)
