# Waywords — Web-first, Engine-ready Gameplay Spec (v1.1)

> **Goal of this document:** A single, self-contained spec that a dev team can implement from day 1.
>
> **Focus:** game mechanics + implementation architecture (engine + web UI). Content strategy is out of scope, but generation stubs are included.
>
> **v1.1 Updates:** Netflix Waywords fidelity alignment — persistent hints, gray additional word tiles, hintCellId terminology, auditor/validator rules, TICK action removed.
>
> **Last Updated:** 2026-01-16 (PR #2 Engine + Puzzle Migration complete)

---

## 0) Summary

**Waywords mechanics (constant):** a themed word-search puzzle where the player finds *path words* whose tiles form a connected route from **START → END**. Some tiles are **emoji tokens** (tap to reveal meaning). The puzzle also includes **Additional Words** (decoys/bonus words, separate theme) that when found:
- Turn their tiles **gray**
- Reveal a **persistent hint letter** (yellow) that indicates where the path is

**Visual metaphor (v1 default):** **Circuit Traces** — found path words "power" PCB traces; START→END is "Source→Sink". This is a UI skin; the engine is unchanged.

This spec is **web-first**, **mobile-form-factor-first**, and designed to deploy as a **static site** (e.g., GitHub Pages). The engine (rules/state/validation) is a **pure TypeScript** library runnable and testable in **Node**.

### v1.1 Fidelity Notes (Netflix Waywords alignment)

Based on Netflix Waywords (Puzzled) research ([games-netflix.helpshift.com](https://games-netflix.helpshift.com/hc/en/8-netflix-puzzled/faq/1656-how-to-play-waywords/)):
- **Path word tiles turn green** when found
- **Additional word tiles turn gray** when found (green overrides gray if overlap)
- **Hint letters are yellow** and **persist indefinitely** (from both Hint button and Additional Word reveals)
- **Words List** shows found words and **sizes only** for unfound words
- **Timer + pause** controls in the UI (timer is UI-only, not engine-driven)

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

### 2.2.1 Tile rendering priority (v1.1) — MUST

At any time, a tile's **visual state** MUST be derived in this priority (highest to lowest):

1. **Selected preview** (purple overlay, transient) — during active drag
2. **Path-found** (green) — highest permanent priority; overrides all others
3. **Hint-marked** (yellow) — persistent from Hint button or Additional Word reveal
4. **Additional-found** (gray) — found Additional Word tiles
5. **Base tile** (neutral)

**Non-negotiable rules:**
- **MUST:** If a tile is both gray (additional-found) AND green (path-found), it renders as **green** (path takes priority).
- **MUST:** If a tile is hint-marked (yellow) AND later becomes path-found (green), it renders as **green**.
- **MUST:** Grid CSS and engine selectors MUST use this same priority order.
- **MUST:** Hints persist indefinitely — no expiry, no removal except on puzzle reset.

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

**MUST:** UI renders those adjacent cells clearly (e.g., with a ring highlight + external markers) and updates the objective microcopy to read *“Connect START tile → END tile”*. Any overlay targeting those cells (markers, rings, text) MUST set `pointer-events: none` so drag gestures land on the underlying tile.

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
  // v1.1: cluePersistMs removed — hints now persist indefinitely
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
  hintCellId?: string; // only for Additional Words (v1.1: renamed from clueCellId)
  /** @deprecated Use hintCellId instead. Supported temporarily for migration. Target removal: v1.2 */
  clueCellId?: string;
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

### 5.5 Runtime state schema (v1.1 — ACTUAL)

```ts
export type GameStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface RuntimeState {
  status: GameStatus;
  foundPathWords: Record<string, true>;       // wordId -> true
  foundAdditionalWords: Record<string, true>; // wordId -> true
  hintUsedFromButton: number;                 // v1.1: count of hints used from Hint button
  hintRevealedFromBonus: number;              // v1.1: count of hints revealed from Additional Words
  hintMarkedCells: Record<string, true>;      // cellId -> true — accumulates ALL hints (persistent)
  completedAt?: number;
  startedAt: number;
}
```

**v1.1 Changes:**
- `hintUsedFromButton` replaces `hintUsedCount` — tracks button-initiated hints only
- `hintRevealedFromBonus` added — tracks hints from Additional Word reveals
- Removed: `clueMarkedCells`, `lastClueExpiresAt` — hints persist indefinitely (no expiry)

**Analytics note:** Separate tracking enables future Netflix-style recaps ("You used 3 hints, bonus words revealed 2 more").

**Note:** Keep state serializable for localStorage.

---

## 6) Engine API (pure TS)

### 6.1 Core responsibilities
The engine must be deterministic and side-effect-free:
- No timers; instead return `effects` and allow host to schedule.

### 6.2 Actions (v1.1 — ACTUAL)

```ts
export type EngineAction =
  | { type: 'SELECT'; cellIds: string[] }     // finalized selection from UI
  | { type: 'PRESS_HINT' }                    // request hint for unfound path word
  | { type: 'RESET' };                        // reset puzzle state
  // v1.1: TICK removed — timer is UI-only, hints persist indefinitely
```

**v1.1 Change:** `TICK` action removed. Timer display is now purely UI state — the engine does not track elapsed time or manage hint expiration.

### 6.3 Outputs (v1.1 — ACTUAL)

```ts
export type HintSource = 'BUTTON' | 'BONUS';

export type EngineEvent =
  | { type: 'WORD_FOUND'; wordId: string; category: 'PATH' | 'ADDITIONAL' }
  | { type: 'ALREADY_FOUND'; wordId: string }
  | { type: 'INVALID_SELECTION' }
  | { type: 'HINT_APPLIED'; cellId: string; source: HintSource }  // v1.1: unified with source
  | { type: 'COMPLETED'; completedAt: number };
  // v1.1: CLUE_APPLIED removed — merged into HINT_APPLIED with source: 'BONUS'

export interface EngineEffects {
  // host may use for UI sounds, haptics, animations
  events: EngineEvent[];
}

export interface EngineResult {
  state: RuntimeState;
  effects: EngineEffects;
}
```

**v1.1 Changes:**
- `HINT_APPLIED` now includes `source: HintSource` to distinguish button vs bonus word hints
- `CLUE_APPLIED` removed — unified into `HINT_APPLIED` with `source: 'BONUS'`

### 6.4 Primary engine functions (v1.1 — ACTUAL)

```ts
export interface Engine {
  init(puzzle: WaywordsPuzzle, now: number): RuntimeState;
  reduce(puzzle: WaywordsPuzzle, state: RuntimeState, action: EngineAction): EngineResult;
  selectors: {
    // rendering helpers
    getPathCells(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string>;
    getAdditionalWordCells(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string>; // v1.1: for gray rendering
    getHintCells(state: RuntimeState): Set<string>;  // v1.1: for yellow rendering
    isConnected(puzzle: WaywordsPuzzle, state: RuntimeState): boolean;
    // optional: compute route overlay for completed state
    getRouteOverlay?(puzzle: WaywordsPuzzle, state: RuntimeState): Set<string>;
  };
}
```

**v1.1 Changes:**
- `getAdditionalWordCells` added — returns cells belonging to found Additional Words (for gray rendering)
- `getHintCells` added — returns accumulated hint-marked cells (for yellow rendering)
- `getClueCells` removed — clue system replaced by persistent hints

---

## 7) Core mechanics — Non-Negotiables (MUST rules)

This section defines the authoritative game mechanics. These are acceptance criteria for any implementation.

### 7.0 Mechanics Overview — MUST statements

**A) Selection model:**
- **MUST:** Words are selected as straight-line drags (`RAY_8DIR` — classic word-search).
- **MUST:** Selection snaps to nearest of 8 directions (horizontal, vertical, diagonal).

**B) Win condition:**
- **MUST:** You win ONLY when START→END are connected using found PATH tiles (green).
- **MUST:** Connectivity uses `ORTHO_4` (up/down/left/right neighbors only).
- **MUST:** The UI must keep the START and END tiles visible (marker + ring) and never intercept drag gestures on those tiles; microcopy should reinforce “Connect START tile → END tile”.

**C) Path words:**
- **MUST:** When found, their tiles become green and stay green.
- **MUST:** Green tiles participate in connectivity check.

**D) Additional/Bonus words:**
- **MUST:** When found, their tiles become gray.
- **MUST:** When found, they reveal ONE hint letter (yellow) "indicating where the path is".
- **MUST:** The hint letter (`hintCellId`) MUST be an intersection cell — in BOTH the bonus word's placement AND a path word's placement.

**E) Hints:**
- **MUST:** Hints persist indefinitely (no expiry).
- **MUST:** Hints from button AND hints from bonus words accumulate into the same hinted set.
- **MUST:** Hint button reveals a hint letter that belongs to an unfound PATH word (not a bonus word).
- **MUST:** Visually, all hints are yellow and identical.

**F) Emoji tiles (deferred to v1.2):**
- **MUST:** Tapping an emoji reveals its meaning (UI-only modal/sheet).
- **MUST:** Emoji tap-to-reveal MUST NOT interfere with drag selection.
- **Implementation note:** Use small movement threshold to distinguish tap from drag start.
- **Status:** Deferred to v1.2 — current engine only supports LETTER and VOID cell types. No puzzles currently use EMOJI cells.

### 7.1 Selection validation (placement lookup)
**Input:** `SELECT(cellIds[])`

Engine MUST:
1. Create `key = cellIds.join('|')`
2. Check key against a precomputed `placementKey → {wordId, category, placementIndex}` map.
3. If no match → `INVALID_SELECTION`.
4. If match:
   - If already found → `ALREADY_FOUND`
   - Else mark found and apply effects.

**Reverse selection:** if `allowReverseSelection` is enabled, the engine MUST pre-index both forward and reversed placement keys.

### 7.2 Path word found
On new path word found:
- Add `wordId` to `foundPathWords`.
- Mark tiles as path (via selector; UI renders them green).
- Recompute win condition:
  - If START cell connects to END cell through path tiles → complete.

### 7.3 Additional word found + hint reveal (v1.1 updated)

On new additional word found:
- Add `wordId` to `foundAdditionalWords`.
- Mark all placement tiles as **additional-found** (for gray rendering).
- Apply hint reveal:
  - Add `hintCellId` to `hintMarkedCells` (yellow highlight).
  - **Persistence:** hint tiles persist indefinitely (no expiration).
  - **Accumulation:** multiple Additional Words = multiple hint tiles.

**Key requirement:** The `hintCellId` must "indicate where the path is" — it should belong to at least one **unfound Path Word** placement. This is enforced by the validator (see Section 10.6.1).

### 7.4 Hint (v1.1 — ACTUAL)

On `PRESS_HINT`:
1. Choose an unfound path word (first unfound, for determinism).
2. Choose one cell from its placement.
3. Mark that cell as hint (`hintMarkedCells`) — **yellow highlight**.
4. Increment `hintUsedFromButton`.
5. Emit `HINT_APPLIED { cellId, source: 'BUTTON' }`.

**MUST rules:**
- **MUST:** Hint-marked cells persist indefinitely until the puzzle ends or is reset.
- **MUST:** Hints from Hint button and Additional Word reveals accumulate in the same `hintMarkedCells` set.
- **MUST:** All hints render as identical yellow highlighting.
- **MUST:** If path word becomes found, its cells turn green (overriding yellow).

**Hint selection policy (default):**
- Prefer a cell that is not already path-found (green), and not already hint-marked (yellow).
- If all cells of the chosen word are marked, choose the first cell anyway (fallback).

### 7.5 Emoji tiles (deferred to v1.2)
Emoji tile meaning reveal is **UI-only**:
- Puzzle JSON includes `meaning` string.
- UI shows a popover/sheet when player taps emoji tile.

**Status:** Deferred to v1.2. Current puzzles use only LETTER cells. Emoji support requires:
- Engine: Add EMOJI cell type handling
- UI: Tap-to-reveal gesture (distinguish from drag start)
- Puzzles: Create puzzles with EMOJI cells

### 7.6 Win condition (connectivity)
**Inputs:**
- `startCellId = puzzle.grid.start.adjacentCellId`
- `endCellId = puzzle.grid.end.adjacentCellId`
- `walkableCells = all cellIds that belong to any found path word placement`

Connectivity model (default): `ORTHO_4`.

Algorithm:
- BFS/DFS from startCellId through neighbors that are in walkableCells.
- Win if endCellId reached.
- **MUST:** Easy Daily puzzles place START on the top row (`y=0`) and END on the bottom row (`y=height - 1`) so the course visually flows top-to-bottom.

### 7.7 Route overlay (optional but recommended)
Upon completion:
- Compute shortest path in the walkable graph from start to end.
- Store nothing in state (optional) or store `completedAt` only.
- Provide `selectors.getRouteOverlay()` that returns the set of cells in the chosen path.

**Determinism:** BFS neighbor iteration order must be stable so overlay is consistent.

### 7.8 Words List UI (v1.1)

The Words button opens a modal/sheet showing all words:

**Display rules:**
- **Found words:** Show full token string (letters + emoji)
- **Unfound words:** Show only **size** (e.g., "5 letters") and optionally placeholder characters

**Sections:**
- **Path Words:** Listed first (theme-related)
- **Additional Words:** Listed second (decoys/bonus)

**Example display:**
```
Path Words:
  ✓ TRACK
  ✓ RIVER
  _ _ _ _ _ (5 letters)

Additional Words:
  ✓ OUR
  _ _ _ (3 letters)
```

---

## 8) Web UI requirements (mobile-first)

### 8.1 Rendering
- Grid is rendered as CSS grid with fixed aspect ratio cells.
- Tile layers (v1.1 updated):
  1) base tile
  2) additional-found highlight (gray) — v1.1
  3) path-found highlight (green) — overrides gray
  4) hint overlay (yellow) — persistent, from both Hint button and Additional Word reveals
  5) selection preview (purple, transient)
  6) route overlay (e.g., purple line) (optional, on completion)

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
- **Words Modal** (v1.1 updated)
  - section: Path Words
  - section: Additional Words
  - **found words:** show full token string
  - **unfound words:** show size only (e.g., "5 letters")
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

The mechanics remain identical (find path words → connect START→END; additional words → reveal a persistent hint cell; hints unlimited), but the **rendering layer** can present different metaphors.

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
  - `hintCellId` belongs to at least one path word placement (v1.1: renamed from clueCellId)

### 10.5 Generator package (CLI stub)

`packages/generator` should include:
- `validatePuzzle(puzzle): ValidationResult`
- `compileAuthoring(input): WaywordsPuzzle`
- `generatePuzzle(input): WaywordsPuzzle` (stub allowed)

**CLI:**
- `waywords-validate <puzzle.json>`
- `waywords-compile <puzzle.yml> --out puzzle.json`
- `waywords-generate <seed> --out puzzle.json` (stub)

### 10.6 Validation & Auditor — MUST Rules (v1.1)

These are the "you can't ship a puzzle unless these hold" rules. The auditor (`npm run audit`) enforces all of these.

#### 10.6.0 Quick reference — Auditor checks

| Check | Severity | Description |
|-------|----------|-------------|
| Schema | ERROR | Valid JSON matching WaywordsPuzzle schema |
| Single placement | ERROR | Each word MUST have exactly 1 placement |
| Solvability | ERROR | START→END must be reachable via path words |
| Start cell | ERROR | Start cell in path word placement, non-VOID |
| End cell | ERROR | End cell in path word placement, non-VOID |
| hintCellId intersection | ERROR | Must be in BOTH bonus word AND path word |
| Placement uniqueness | ERROR | No duplicate placement keys |
| Grid bounds | WARNING | All placements within grid bounds |
| Placement contiguity | ERROR | `ERR_PLACEMENT_NOT_CONTIGUOUS`: each consecutive pair of cells in a placement must be orthogonally adjacent (Manhattan distance = 1). |
| Placement ray | ERROR | `ERR_PLACEMENT_NOT_RAY`: placement must follow a straight ray (all steps share the same dx/dy), no bends allowed. |
| Placement forward | ERROR | `ERR_PLACEMENT_REVERSED`: horizontal words must flow left-to-right and vertical words top-to-bottom; reversed rays trigger this error. |
| Placement orthogonality | ERROR | `ERR_PLACEMENT_DIAGONAL`: ensures placements do not move diagonally (dx and dy cannot both be non-zero). |

### 10.6.1 Solvability invariants — MUST

**MUST:** `start.adjacentCellId` and `end.adjacentCellId`:
- Are in-bounds (exist in `grid.cells`)
- Are non-VOID (type is `LETTER` or `EMOJI`)
- Are included in at least one PATH word placement

**MUST:** If all PATH words are considered found, START→END must be connected:
- Walkable cells = union of all PATH word placements
- BFS/DFS using `ORTHO_4` adjacency (up/down/left/right)
- Puzzle is UNSOLVABLE if end cell is not reachable

### 10.6.2 Bonus hint intersection rule — MUST (Netflix fidelity)

This is the key rule that makes bonus word hints visually consistent with Netflix Waywords:

**MUST:** For each Additional Word with `hintCellId`:
1. `hintCellId` ∈ bonusWord.placement (cell is IN the bonus word)
2. `hintCellId` ∈ union(all PATH word placements) (cell is also in a path word)
3. `hintCellId` is non-VOID

**Visual result:**
- You find the bonus word → its letters go gray
- One intersecting letter remains yellow (the hint)
- Later, when you find the path word containing that cell, it turns green

**Rationale:** Per Netflix Waywords rules, bonus word reveals "indicate where the path is" — meaning the hint cell must be part of a Path Word. The intersection requirement ensures visual consistency.

### 10.6.3 Placement correctness invariants — MUST

**MUST:** Every placement must match grid tokens exactly:
- Each cellId in placement must exist in grid
- Cell value must match corresponding token

**MUST:** Duplicate placement keys are ERROR:
- `placementKey = cellIds.join('|')`
- No two words (across PATH and ADDITIONAL) may have identical placement keys
- Cell intersections are allowed and expected, but identical placements are not

### 10.6.4 Determinism constraint — Single placement per word

**MUST:** Each word MUST have exactly 1 placement for v1.1.

**Rationale:** If schema allowed multiple placements, engine would need to record which placement matched when found — adding complexity. Single placement keeps the auditor, engine, and tests simple and deterministic.

**Validator output:**
```
ERROR: Word 'EXAMPLE' has 2 placements, expected 1
```

### 10.6.5 Deprecation warnings

**SHOULD:** Validator warns when deprecated fields are used:
- `clueCellId` → warn: "Use hintCellId instead (clueCellId deprecated, removal in v1.2)"
- `cluePersistMs` in config → warn: "cluePersistMs deprecated, hints now persist indefinitely"

### 10.6.6 Forward-only geometry (easy puzzles) — MUST

The Week 1 dailies and other "easy" puzzles use `selectionModel: 'RAY_4DIR'` and enforce a **FORWARD_2DIR** placement policy:
1. **Orthogonal contiguity:** each step must move to a neighbor with Manhattan distance = 1 (`ERR_PLACEMENT_NOT_CONTIGUOUS`).
2. **Straight ray:** all steps within a placement must share the same direction vector (`ERR_PLACEMENT_NOT_RAY`).
3. **No diagonals:** horizontal (`dy=0`) or vertical (`dx=0`) only; any diagonal movement triggers `ERR_PLACEMENT_DIAGONAL`.
4. **Forward direction:** horizontal rays must progress left-to-right (`dx=+1`), vertical rays top-to-bottom (`dy=+1`); reverse movement triggers `ERR_PLACEMENT_REVERSED`.

Auditor coverage: the four geometry error codes (`ERR_PLACEMENT_NOT_CONTIGUOUS`, `ERR_PLACEMENT_NOT_RAY`, `ERR_PLACEMENT_DIAGONAL`, `ERR_PLACEMENT_REVERSED`) reject placements that break this policy before puzzles reach production. Even though the content is forward-facing, `allowReverseSelection: true` keeps the UI flexible so players can drag from either end of a word.

### 10.7 Content Rules v1 — Easy Daily (EASY_DAILY_V1 Profile)

These rules complement the auditor and give Easy Dailies their vertical "START→END" feel.

**Board & markers (MUST):**
- `START` (`grid.start.adjacentCellId`) must sit on `y=0`.
- `END` (`grid.end.adjacentCellId`) must sit on `y=height - 1`.
- Start/End Manhattan distance must be ≥ `height - 1` (vertical drop is the baseline; horizontal offset is encouraged).
- Default grid size: 7×7 (fallback to 8×8 after repeated generation failures).

**Path words (MUST):**
- 4–6 path words per puzzle.
- Word length: 3–7 characters.
- Unique path coverage must be ≥ 18 cells on 7×7, ≥ 22 on 8×8 (fallback formula `max(12, floor(width * height / 4))` for other sizes).
- BFS shortest path from START to END through path cells must be ≥ `height - 1`.
- First path word must include START; final path word must end at END.
- Every path word after the first must intersect the existing path set by **shared cellId** (adjacency-only is invalid).
- PATH↔PATH intersections must satisfy: `intersectionCount >= pathWordCount - 1`.
- The word-intersection graph must be connected from the START word to the END word (reject "touch-only" connectivity).
- **Parallel adjacency disallowed (MUST):** Two path words that do NOT share any cells (no intersection) must NOT have orthogonally adjacent cells. This prevents visual confusion where words run parallel/adjacent without intersecting. Error code: `ERR_PARALLEL_ADJACENCY` / `ERR_QA_PARALLEL_ADJACENCY`.

**Selection / readability (MUST):**
- `selectionModel = 'RAY_4DIR'`.
- Placements are forward-only (right/down).
- `allowReverseSelection = true`.

**Bonus words (SHOULD):**
- 1–2 bonus words per Easy Daily.
- Each bonus reveals a `hintCellId` that intersects a path placement.

**Enforcement:** `packages/generator/src/content-qa.ts` analyzes every generated daily and emits `ERR_QA_START_NOT_TOP_ROW`, `ERR_QA_END_NOT_BOTTOM_ROW`, `ERR_QA_TOO_FEW_PATH_WORDS`, `ERR_QA_TOO_MANY_PATH_WORDS`, `ERR_QA_PATH_COVERAGE_TOO_LOW`, `ERR_QA_ROUTE_TOO_SHORT`, `ERR_QA_PATH_INTERSECTIONS_TOO_LOW`, `ERR_QA_TOUCH_ONLY_CONNECTION`, `ERR_QA_PARALLEL_ADJACENCY`, `ERR_QA_START_MISSING`, or `ERR_QA_END_MISSING` when these conditions fail. CI should run `npm run content:qa -- --profile EASY_DAILY_V1 --failOnError` after regeneration so these content gates block publishing invalid dailies.

### 10.8 Data Format Reference

See `FORMAT_SPEC.md` for detailed JSON schemas:
- Puzzle JSON (`WaywordsPuzzle`) — grid, cells, words, placements
- Wordlist JSON — topic-based word pools for generation

See `CONTENT_AUTHORING_GUIDE.md` for wordlist creation guidelines.

---

## 11) Testing strategy (engine-first)

### 11.1 Unit tests (engine)
- Selection match and reverse match
- Additional word hint reveal (v1.1: persistent, no expiry)
- Hint button applies to unfound word
- Hint accumulation from both sources
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

### Sprint 2 — Hint/Words + polish (v1.1 updated)
- Additional words + persistent hint reveal (no expiry)
- Hint system (unlimited, persistent)
- Words list modal (show sizes for unfound)
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

4) **Hint visuals:** (v1.1 updated) All hints are yellow and visually identical
   - Both Hint button and Additional Word reveals produce yellow hints
   - Rationale: simpler mental model; hints accumulate and persist uniformly

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

---

## 16) Migrations (v1.1)

This section documents breaking changes and migration steps for puzzle authors and implementations.

### 16.1 PR #2 Migration (2026-01-16)

**Engine changes:**
- Removed `TICK` action — timer is now UI-only state, not engine-driven
- Removed `CLUE_APPLIED` event — merged into `HINT_APPLIED` with `source: 'BONUS'`
- Added `HintSource` type: `'BUTTON' | 'BONUS'`
- Changed `HINT_APPLIED` event to include `source` field
- Renamed state field: `hintUsedCount` → `hintUsedFromButton`
- Added state field: `hintRevealedFromBonus`
- Removed state fields: `clueMarkedCells`, `lastClueExpiresAt`

**Puzzle JSON changes:**
- Removed `config.cluePersistMs` — hints now persist indefinitely
- Renamed `hintCellId` (was `clueCellId`) — backwards compat supported during transition
- Added validation: `hintCellId` must be intersection cell (in bonus word AND path word)
- Added validation: each word must have exactly 1 placement

**Puzzle file migrations performed:**
- `easy-01.json`: Removed `cluePersistMs`
- `easy-02.json`: Removed `cluePersistMs`
- `medium-01.json`: Fixed end cell, renamed `clueCellId` → `hintCellId`, fixed intersection cells
- `medium-02.json`: Removed `cluePersistMs`, renamed `clueCellId` → `hintCellId`, fixed intersection cells
- `puzzles/sample.json`: Fixed end cell, added missing `DRY` path word for connectivity
- Test fixtures: Updated to use `hintCellId` and new state shape

### 16.2 Deprecation timeline

| Field | Status | Target removal |
|-------|--------|----------------|
| `clueCellId` | DEPRECATED | v1.2 |
| `cluePersistMs` | REMOVED | v1.1 (PR #2) |
| `TICK` action | REMOVED | v1.1 (PR #2) |
| `CLUE_APPLIED` event | REMOVED | v1.1 (PR #2) |
| `hintUsedCount` | RENAMED | v1.1 → `hintUsedFromButton` |

---

## 17) Changelog

### v1.1 (2026-01-16)
- Netflix Waywords fidelity alignment
- Persistent hints (no expiry)
- Hint source tracking (button vs bonus)
- Gray rendering for additional word tiles
- hintCellId intersection rule
- TICK action removed (timer is UI-only)
- Single placement per word enforced
- Auditor tool added (`npm run audit`)
