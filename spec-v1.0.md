# Waywords — Web-first, Engine-ready Gameplay Spec (v0.1)

> **Goal of this document:** A single, self-contained spec that a dev team can implement from day 1.
>
> **Focus:** game mechanics + implementation architecture (engine + web UI). Content strategy is out of scope, but generation stubs are included.

---

## 0) Summary

**Waywords mechanics (constant):** a themed word-search puzzle where the player finds *path words* whose tiles form a connected route from **START → END**. Some tiles are **emoji tokens** (tap to reveal meaning). The puzzle also includes **Additional Words** (separate theme) that reveal a **single-letter clue** pointing toward the path.

**Visual metaphor (v1 default):** **Circuit Traces** — found path words “power” PCB traces; START→END is “Source→Sink”. This is a UI skin; the engine is unchanged.

This spec is **web-first**, **mobile-form-factor-first**, and designed to deploy as a **static site** (e.g., GitHub Pages). The engine (rules/state/validation) is a **pure TypeScript** library runnable and testable in **Node**.

---

## 1) Scope

### 1.1 In scope
- Puzzle runtime rules: input, selection, validation, state transitions, hint/clue mechanics, win check.
- Data model: puzzle JSON contract + engine state.
- Web UI requirements: mobile-first interaction, rendering requirements, accessibility.
- Tooling architecture: monorepo, engine package, web app, test strategy.
- Generation stubs: interfaces + validation hooks (no content strategy).

### 1.2 Out of scope
- Thematic content sourcing, editorial guidelines, scheduling, monetization.
- Server-side accounts, sync, leaderboards.

---

## 2) Target platforms & deployment constraints

### 2.1 Primary deployment
- **Static web** build deployable to **GitHub Pages**.
- No server required for core gameplay.

### 2.2 Form-factor priority
- **Mobile UX first** (touch + small screen).
- Must still work on desktop web.

### 2.3 Offline support
- PWA-friendly (optional for v1): cache app shell and puzzle JSON.
- Persist progress locally (localStorage or IndexedDB; default: localStorage for v1 simplicity).

---

## 3) Runtime architecture (separation of concerns)

### 3.1 Packages

**Monorepo layout (recommended):**

```
/ (repo root)
  /packages
    /engine         # pure TS rules/state machine; no DOM
    /generator      # optional CLI; creates/validates puzzle JSON (stubs ok)
    /shared         # shared utilities/types (optional)
  /apps
    /web            # Vite static web app (React/Svelte/Vanilla)
  package.json
  tsconfig.base.json
```

**Key rule:** `packages/engine` must have **zero browser/UI dependencies**.

### 3.2 Engine boundaries
- **Engine input:** puzzle JSON + player actions.
- **Engine output:** next state + render directives (tile styles, overlays) + events.

Engine is responsible for:
- Validating a selection against allowed placements
- Tracking found words
- Applying hint and clue marking
- Determining completion via connectivity

Web app is responsible for:
- Rendering and animations
- Pointer/touch handling and converting gestures into engine actions
- Persisting/loading game state

---

## 4) Tech stack choices

### 4.1 Node & TypeScript
- Target Node: **current LTS line** (baseline; dev machines + CI must match).
- TS: strict mode, ES2022+ output (Vite handles bundling).

### 4.2 Frontend framework decision

This game is largely **UI + gestures + grid rendering**, not sprite physics.

**Recommendation:** **No game engine** (Phaser/Unity-web/Canvas engines are overkill).

Choose one of:

**Option A — React + Vite (recommended default)**
- Pros: huge ecosystem, stable, easy to hire, strong PWA + Capacitor support.
- Cons: slightly more boilerplate.

**Option B — Svelte + Vite**
- Pros: lightweight, excellent performance, simpler state wiring.
- Cons: smaller hiring pool in some orgs.

**Option C — Vanilla TS + Web Components (Lit)**
- Pros: minimal, portable.
- Cons: slower iteration for complex UI flows.

**Decision driver:** if future “native rewrite” might use React Native, choose **React** now to share mental model (engine stays shared regardless).

### 4.3 Mobile portability path
- **Short-term:** wrap the web app with **Capacitor** for iOS/Android (minimal changes).
- **Long-term:** build a native UI (React Native/Flutter) that calls the same `engine` package.

---

## 5) Puzzle & state data contracts

### 5.1 Token model
Words are sequences of **tokens**:
- `L("A".."Z")`
- `E("SEA" | "BULL" | ...)` (emoji meaning token)

**Rule:** an emoji tile counts as exactly **1 token** for word size and matching.

### 5.2 Grid model
Grid may be rectangular with `VOID` cells to create irregular shapes.

Cells have:
- `id`, `x`, `y`
- `type`: `LETTER | EMOJI | VOID`
- `value`: `"A".."Z"` or `emojiId`
- `meaning?`: only for EMOJI tiles (string shown in UI)

START and END are *markers* adjacent to specific cells:
- `start.adjacentCellId`
- `end.adjacentCellId`

### 5.3 Word placement model (authoritative)
To keep runtime fast and deterministic, puzzle JSON includes explicit placements:
- Each word has one or more `placements`, each a list of cellIds.
- Engine validates selection by lookup of `placementKey = join(cellIds, "|")`.

### 5.4 Puzzle JSON schema (v1)

```ts
export type Token =
  | { t: 'L'; v: string }        // single uppercase letter
  | { t: 'E'; v: string };       // emoji meaning id

export type CellType = 'LETTER' | 'EMOJI' | 'VOID';

export interface Cell {
  id: string;
  x: number;
  y: number;
  type: CellType;
  value?: string;   // for LETTER: "A".."Z"; for EMOJI: emojiId
  meaning?: string; // for EMOJI: display meaning
}

export type SelectionModel = 'RAY_4DIR' | 'RAY_8DIR' | 'ADJACENT_4' | 'ADJACENT_8';
export type ConnectivityModel = 'ORTHO_4' | 'ORTHO_8';

export interface PuzzleConfig {
  selectionModel: SelectionModel;
  connectivityModel: ConnectivityModel;
  allowReverseSelection: boolean;
  cluePersistMs: number;
}

export interface StartEndMarker {
  adjacentCellId: string;
  markerStyle?: 'ARROW_UP' | 'ARROW_DOWN' | 'ARROW_LEFT' | 'ARROW_RIGHT';
}

export interface WordDef {
  wordId: string;
  tokens: Token[];
  size: number; // must equal tokens.length
  placements: string[][]; // array of placements; placement is array of cellIds
  clueCellId?: string; // only for Additional Words
}

export interface WaywordsPuzzle {
  puzzleId: string;
  mode: 'WAYWORDS';
  theme: string;
  config: PuzzleConfig;
  grid: {
    width: number;
    height: number;
    cells: Cell[]; // includes VOID
    start: StartEndMarker;
    end: StartEndMarker;
  };
  words: {
    path: WordDef[];
    additional: WordDef[];
  };
}
```

### 5.5 Runtime state schema

```ts
export type GameStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface RuntimeState {
  status: GameStatus;
  foundPathWords: Record<string, true>;       // wordId map
  foundAdditionalWords: Record<string, true>; // wordId map
  hintUsedCount: number;
  hintMarkedCells: Record<string, true>;      // cellId map
  clueMarkedCells: Record<string, true>;      // usually 0..1
  lastClueExpiresAt?: number;
  completedAt?: number;
  startedAt: number;
}
```

**Note:** Keep state serializable for localStorage.

---

## 6) Engine API (pure TS)

### 6.1 Core responsibilities
The engine must be deterministic and side-effect-free:
- No timers; instead return `effects` and allow host to schedule.

### 6.2 Actions

```ts
export type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }     // finalized selection from UI
  | { type: 'PRESS_HINT' }
  | { type: 'TICK'; now: number }             // host-driven time progression
  | { type: 'RESET' };                        // optional
```

### 6.3 Outputs

```ts
export type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string; category: 'PATH' | 'ADDITIONAL' }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'CLUE_APPLIED'; cellId: string }
  | { type: 'HINT_APPLIED'; cellId: string }
  | { type: 'COMPLETED'; completedAt: number };

export interface EngineEffects {
  // host may use for UI sounds, haptics, animations
  events: EngineEvent[];
}

export interface EngineResult {
  state: RuntimeState;
  effects: EngineEffects;
}
```

### 6.4 Primary engine functions

```ts
export interface Engine {
  init(puzzle: WaywordsPuzzle, now: number): RuntimeState;
  reduce(puzzle: WaywordsPuzzle, state: RuntimeState, action: EngineAction): EngineResult;
  selectors: {
    // rendering helpers
    getPathCells(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string>;
    isConnected(puzzle: WaywordsPuzzle, state: RuntimeState): boolean;
    // optional: compute route overlay for completed state
    getRouteOverlay(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string>;
  };
}
```

---

## 7) Core mechanics (authoritative rules)

### 7.1 Selection validation (placement lookup)
**Input:** `SELECT(cellIds[])`

Engine must:
1. Create `key = cellIds.join('|')`
2. Check key against a precomputed `placementKey → {wordId, category, placementIndex}` map.
3. If no match → `INVALID_SELECTION`.
4. If match:
   - If already found → `ALREADY_FOUND`
   - Else mark found and apply effects.

**Reverse selection:** if enabled, the engine should pre-index both forward and reversed placement keys.

### 7.2 Path word found
On new path word found:
- Add `wordId` to `foundPathWords`.
- Mark tiles as path (via selector; UI renders them green).
- Recompute win condition:
  - If START cell connects to END cell through path tiles → complete.

### 7.3 Additional word found + clue
On new additional word found:
- Add `wordId` to `foundAdditionalWords`.
- Apply clue:
  - Clear previous `clueMarkedCells`.
  - Mark `clueCellId` as clue.
  - Set `lastClueExpiresAt = now + cluePersistMs`.

**Expiration:** when host sends `TICK(now)` and `now >= lastClueExpiresAt`, clear clue.

### 7.4 Hint
On `PRESS_HINT`:
- Choose an unfound path word.
- Choose one cell from one of its placements.
- Mark that cell as hint (`hintMarkedCells`).
- Increment `hintUsedCount`.

**Hint selection policy (default):**
- Prefer a cell that is not already path-found, and not already hint/clue-marked.
- If all are marked, choose any cell.

### 7.5 Emoji tiles
Emoji tile meaning reveal is **UI-only**:
- Puzzle JSON includes `meaning` string.
- UI shows a popover/sheet when player taps emoji tile.

### 7.6 Win condition (connectivity)
**Inputs:**
- `startCellId = puzzle.grid.start.adjacentCellId`
- `endCellId = puzzle.grid.end.adjacentCellId`
- `walkableCells = all cellIds that belong to any found path word placement`

Connectivity model (default): `ORTHO_4`.

Algorithm:
- BFS/DFS from startCellId through neighbors that are in walkableCells.
- Win if endCellId reached.

### 7.7 Route overlay (optional but recommended)
Upon completion:
- Compute shortest path in the walkable graph from start to end.
- Store nothing in state (optional) or store `completedAt` only.
- Provide `selectors.getRouteOverlay()` that returns the set of cells in the chosen path.

**Determinism:** BFS neighbor iteration order must be stable so overlay is consistent.

---

## 8) Web UI requirements (mobile-first)

### 8.1 Rendering
- Grid is rendered as CSS grid with fixed aspect ratio cells.
- Tile layers:
  1) base tile
  2) path-found highlight (green)
  3) hint/clue overlay (yellow)
  4) route overlay (e.g., purple line) (optional)

### 8.2 Touch/drag input
Use Pointer Events:
- `pointerdown` records start cell.
- `pointermove` updates live selection preview.
- `pointerup/cancel` finalizes selection and dispatches `SELECT(cellIds)`.

**Important:** the engine does NOT compute drag geometry; UI converts gesture into cellIds.

### 8.3 Selection geometry policy (UI → cellIds)
The UI must implement one selection model (config-driven):

**Default for v1:** `RAY_8DIR` (word-search style).
- Determine direction from start cell to current cell.
- Snap to nearest allowed direction.
- Emit cellIds along ray until current cell, stopping at VOID.

(Alternative adjacency selection can be implemented later behind the same interface.)

### 8.4 Core UI screens/components
- **Game Screen**
  - theme header
  - start/end markers
  - grid
  - bottom bar: Hint, Words
- **Words Modal**
  - section: Path Words
  - section: Additional Words
  - each row: displayed token string + size + found indicator
- **Emoji Meaning Sheet**
  - meaning text + optional icon
- **Completion Sheet**
  - time, hints used, optional share string

### 8.5 Accessibility
- High-contrast mode option (CSS variables).
- Screen-reader labels for tiles:
  - letters read as “A”, emoji as its meaning.
- Buttons reachable and labeled.

### 8.6 Visual metaphor skins (same mechanics, different story)

The mechanics remain identical (find path words → connect START→END; additional words → reveal a clue cell; hints unlimited), but the **rendering layer** can present different metaphors.

**Non-negotiable:** skins are **UI-only**. Puzzle JSON and engine logic remain unchanged.

#### 8.6.1 Skin contract (UI-only)
A skin is a small manifest that controls visuals + microcopy without altering rules.

- `skinId`: string (e.g., `"CIRCUIT"`, `"THREAD"`, `"CONSTELLATION"`)
- `paletteTokens`: CSS variable set (e.g., `--tile-bg`, `--path-on`, `--hint-mark`, `--clue-mark`, `--route-overlay`)
- `icons`:
  - `startMarker`, `endMarker`, `hintIcon`, `wordsIcon`, `emojiChip`
- `microcopy`:
  - labels for buttons + UI sections (e.g., “Hint”, “Words”, “Theme”, “Completed”)
  - optional alternate vocabulary (e.g., “Hint” → “Probe”)
- `rendering`:
  - tile border style, typography scale, glow/animation flags
  - optional overlay renderer: `"SVG" | "NONE"` for route/traces

**Skin does NOT change:** selection rules, connectivity rules, word list content, hint/clue behavior.

#### 8.6.2 AB testing support (static-friendly)
Because deployment is static, AB testing is done via **client-side assignment**.

**Variant selection priority order:**
1. Query param: `?skin=CIRCUIT` (forces a skin; useful for QA)
2. Local override (localStorage key: `waywords_skin_override`)
3. AB assignment (localStorage key: `waywords_skin_bucket`)
4. Default: `CIRCUIT`

**AB assignment algorithm (v1):**
- On first load, assign a stable bucket (e.g., `A|B`) using a random seed and store it.
- Map bucket to a skin in `skins/manifest.json`.

**Telemetry stub:**
- For v1 static, log to console and optionally store locally.
- Provide an interface so a future analytics sink can be injected without changing gameplay:
  - `onEvent({type, puzzleId, skinId, timestamp, metadata})`

#### 8.6.3 Circuit Traces skin (v1 default)
**Metaphor mapping:**
- START = **Source** (power input)
- END = **Sink** (output)
- Path words = **Traces** that become “powered/active” when found
- Additional words = **Diagnostics** (still optional) that reveal a “test pad” (clue cell)
- Hint = **Probe** (highlights one tile)

**UI requirements (Circuit):**
- Grid cells read like PCB pads; found path tiles get an “active trace” treatment (e.g., glow).
- Route overlay (optional) is rendered as an SVG polyline following cell centers, to look like a continuous trace.
- Emoji tiles appear as small component icons; tapping shows a bottom sheet: “Component meaning”.
- Microcopy defaults:
  - Hint → **Probe** (button)
  - Words → **Bill of Materials** or **Netlist** (choose one; keep short on mobile)
  - Completed → **Circuit Closed**

---

## 9) Persistence & deterministic replays

### 9.1 Save model
Persist per puzzleId:
- RuntimeState
- Optionally: last opened timestamp

### 9.2 Compatibility
- Version field can be added to state to support migrations.

---

## 10) Generation & content stubs (no strategy)

This project will eventually need a content pipeline, but v1 can launch with hand-authored puzzle JSON.

### 10.1 What content generation must eventually produce
A generator (or authoring tool) must output valid `WaywordsPuzzle` JSON:
- Theme string
- Grid (letters + emoji tiles with meanings)
- Word lists: path + additional
- Explicit placements (cellId sequences)
- Start/end adjacent cell ids

### 10.2 Emoji dictionary (required for authoring)
Maintain a versioned dictionary:
- `emojiId` → rendered emoji (or icon), and `meaning` string
- Optional: synonyms for future acceptance (v1: exact match only)

In puzzle JSON, each EMOJI cell stores:
- `value: emojiId`
- `meaning: string`

### 10.3 Authoring formats (practical stubs)
To keep editing simple, support a lightweight authoring input that compiles to puzzle JSON:
- `puzzle.yml` / `puzzle.json` with:
  - theme
  - grid as rows (letters + emojiId tokens)
  - word lists by id
  - placements (or allow generator to place)

**Compilation step (generator package):**
- Converts grid rows to `Cell[]` with stable ids
- Expands words into `WordDef` with size
- Validates placements against grid

### 10.4 Generator responsibilities (eventual)
- Create a valid `WaywordsPuzzle` JSON.
- Validate constraints:
  - placements exist and match grid tokens
  - path connectivity from start to end when all path words found
  - clueCellId belongs to at least one path word placement

### 10.5 Generator package (CLI stub)

`packages/generator` should include:
- `validatePuzzle(puzzle): ValidationResult`
- `compileAuthoring(input): WaywordsPuzzle`
- `generatePuzzle(input): WaywordsPuzzle` (stub allowed)

**CLI:**
- `waywords-validate <puzzle.json>`
- `waywords-compile <puzzle.yml> --out puzzle.json`
- `waywords-generate <seed> --out puzzle.json` (stub)

### 10.6 Validation checks (must ship early)
Even before generation exists, ship validation to protect authored content:
- Schema validation
- Placement integrity validation
- Connectivity validation

---

## 11) Testing strategy (engine-first)

### 11.1 Unit tests (engine)
- Selection match and reverse match
- Additional word clue set/expire
- Hint applies to unfound word
- Connectivity BFS correctness

### 11.2 Property-based tests (recommended)
- For randomly generated small puzzles (or puzzle fragments), assert:
  - if all path words marked found → start connects end
  - placement keys always resolve to the expected word

### 11.3 UI tests
- Playwright smoke tests:
  - load puzzle
  - simulate drag selection
  - open modals

---

## 12) Build & deploy (static)

### 12.1 Web build
- Vite build output to `dist/`.
- Configure `base` path for GitHub Pages repo-name deployments.

### 12.2 GitHub Pages
- Use GitHub Actions workflow:
  - install deps
  - build web app
  - deploy `dist/`

---

## 13) Implementation plan (first 2–3 sprints)

### Sprint 0 — Repo + contracts
- Monorepo scaffolding (engine + web + generator)
- Puzzle schema + validator in generator
- One minimal sample puzzle committed under `/puzzles/`
- Web app loads puzzle JSON by URL/path

### Sprint 1 — Engine + basic UI
- Engine package: init/reduce/selectors
- Web app: render grid, implement ray-selection, dispatch SELECT
- Path word highlighting + win check
- Circuit skin v1 applied via skin manifest

### Sprint 2 — Hint/Words/Clues + polish
- Additional words + clue marking + expiry via TICK
- Hint system (unlimited)
- Words list modal
- Completion sheet + route overlay selector (SVG trace)

### Sprint 3 — AB + QA hardening
- Skin AB assignment + override controls
- Playwright smoke tests
- PWA/offline caching (optional)

---

## 14) Decisions for v1 (simplicity + easy play)

These defaults are chosen to minimize confusion, reduce accidental input, and keep puzzles readable on small screens.

1) **Selection model:** `RAY_8DIR` (classic word-search)
   - Drag-select in a straight line; supports diagonals.
   - Rationale: simplest mental model, fastest play, lowest frustration.

2) **Connectivity model:** `ORTHO_4` (up/down/left/right)
   - Rationale: clearer “path” readability on mobile; avoids ambiguous diagonal corner-touch connections.

3) **Hints:** unlimited per puzzle (tracked)
   - Rationale: keeps the experience approachable; difficulty is in discovery, not resource management.

4) **Clue visuals:** distinct from Hint but in the same visual family
   - Rationale: players can tell “I earned this clue” vs “I used a hint” at a glance.

---

## 15) Appendix: UI→Engine selection adapter contract

The UI must provide an adapter:

```ts
export interface SelectionAdapter {
  begin(cellId: string): void;
  update(cellId: string): string[]; // returns current preview selection cellIds
  end(cellId: string): string[];    // returns final selection cellIds
}
```

For `RAY_8DIR`, the adapter:
- Calculates direction by comparing (dx, dy)
- Normalizes to one of 8 directions
- Emits all intermediate cellIds along that vector

This keeps geometry out of the engine and enables future mobile/native UIs.

