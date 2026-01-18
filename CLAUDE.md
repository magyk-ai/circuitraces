# Circuit Races - Developer Guide for Claude

## Project Overview

Circuit Races is a path-based word puzzle game built with an engine-first architecture. Players find words in a grid that form a connected path from START to END.

## Documentation Index

- **`OPERATIONS.md`** ⭐ - **START HERE for development workflow**
  - Pre-commit checklist
  - Local testing procedures
  - GitHub CLI (gh) commands
  - CI/CD pipeline details
  - Deployment workflows
  - Troubleshooting guides

- **`spec-v1.0.md`** - Complete game mechanics and architecture specification

- **`CURRENT_STATUS.md`** - Project status snapshot, what works, what needs fixing

- **`NEXT_STEPS.md`** - Prioritized roadmap (Sprints A-D)

- **`TESTING_GUIDE.md`** - How to test on desktop and mobile

- **`IMPLEMENTATION_SUMMARY.md`** - What was built, metrics, decisions

- **`CLAUDE.md`** (this file) - Technical architecture and code organization

- **`README.md`** - User-facing quick start

- **`GITHUB_PAGES_SETUP.md`** - Deployment setup guide

- **`FORMAT_SPEC.md`** - Puzzle JSON and wordlist JSON schemas

- **`CONTENT_AUTHORING_GUIDE.md`** - How to create wordlists for puzzle generation

## Non-Negotiable Merge Rules

**Spec-first PRs:** Any PR that changes gameplay mechanics MUST update `spec-v1.0.md` in the same PR (or in an immediately preceding doc PR). No gameplay changes without spec updates.

## Quick Start

```bash
# If node commands fail, ensure correct Node version:
nvm use 24

# Install all dependencies
npm install

# Before ANY commit - run this!
npm run precommit  # Runs: lint + typecheck + test + build + e2e

# Or run checks individually:
npm run lint        # ESLint code quality check
npm run typecheck   # TypeScript type checking
npm test            # Unit tests (56 tests: 35 engine + 21 generator)
npm run build       # Build engine + web app
npm run test:e2e    # E2E tests (10 Playwright tests)

# Development
npm run dev         # Start dev server (http://localhost:5173)

# Validation
npm run validate puzzles/sample.json  # Validate puzzle JSON

# See OPERATIONS.md for complete workflow details!
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
│   └── generator/       # Puzzle generation & validation tools
│       ├── src/
│       │   ├── validator.ts       # Schema + placement validation
│       │   ├── auditor.ts         # Deep puzzle validation (connectivity, geometry)
│       │   ├── construct-puzzle.ts # Puzzle generation algorithm
│       │   ├── batch-generate.ts  # Daily puzzle batch generator
│       │   ├── content-qa.ts      # Content quality assurance checks
│       │   ├── wordlist-stats.ts  # Wordlist analysis & histograms
│       │   └── cli.ts             # circuitraces-validate command
│       ├── wordlists/
│       │   └── week1.json         # Topic wordlists (7 topics, ~490 words)
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
- ✅ Core engine with path words and bonus words
- ✅ RAY_4DIR drag selection (forward-only: right and down)
- ✅ BFS connectivity check (win condition)
- ✅ Unit tests (56 tests: 35 engine + 21 generator)
- ✅ E2E tests (10 Playwright tests)
- ✅ Daily puzzles (7 days × 7 topics = 49 puzzles)
- ✅ Puzzle generation pipeline with validation
- ✅ Content QA system
- ✅ Basic web UI with drag selection
- ✅ Puzzle validation CLI

**Deferred (Post-MVP):**
- ❌ Hints system (UI exists, needs polish)
- ❌ Emoji tokens (letters only for now)
- ❌ Circuit Traces visual skin
- ❌ Persistence/localStorage

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

### Validation & Content Tools

```bash
# Validate a puzzle JSON file
npm run validate puzzles/sample.json
# Output: ✓ Puzzle is valid

# Deep audit with geometry & connectivity checks
cd packages/generator
npm run audit ../../puzzles/sample.json
```

## Generator CLI Tools

The `packages/generator` package includes several CLI tools for content creation and debugging:

```bash
# From repository root:
npm run generate      # Generate all daily puzzles (7 days × 7 topics = 49 puzzles)
npm run content:qa    # Run content QA on all generated puzzles
npm run wordlist:stats # View wordlist statistics and length histograms
npm run validate <path-to-puzzle.json>  # Validate a single puzzle
npm run audit <path-to-puzzle.json>     # Deep audit (geometry, connectivity, hints)

# Or from packages/generator directory:
cd packages/generator
npm run generate
npm run content:qa
npm run wordlist:stats
npm run validate <path-to-puzzle.json>
npm run audit <path-to-puzzle.json>
```

### Wordlist Stats Output Example
```
📊 Wordlist Statistics
Source: wordlists/week1.json
Topics: 7

📁 DEVOPS
  Path Words: 50 total, 48 usable (3-7 chars)
  Length Distribution:
   3 chars │██████░░░░░░░░░░░░░░░░░░░░░░░░│   4
   4 chars │██████████████████████████████│  20
   5 chars │████████████████████████░░░░░░│  16
   ...
```

### Content QA Checks
- `ERR_QA_START_NOT_TOP_ROW` - START must be on top row
- `ERR_QA_END_NOT_BOTTOM_ROW` - END must be on bottom row
- `ERR_QA_PATH_INTERSECTIONS_TOO_LOW` - Words must intersect sufficiently
- `ERR_QA_PARALLEL_ADJACENCY` - Non-intersecting words must not touch

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

- **Spec:** `spec-v1.0.md` (complete game mechanics and generation constraints)
- **Format Spec:** `FORMAT_SPEC.md` (puzzle.json and wordlist.json schemas)
- **Content Guide:** `CONTENT_AUTHORING_GUIDE.md` (how to create wordlists)
- **Tests:** `packages/engine/src/__tests__/` (engine correctness)
- **Sample puzzle:** `puzzles/sample.json` (reference implementation)
- **Daily puzzles:** `apps/web/public/daily/` (generated content)
- **Wordlists:** `packages/generator/wordlists/week1.json` (source words by topic)
