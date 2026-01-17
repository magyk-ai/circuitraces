import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { WaywordsPuzzle } from '@circuitraces/engine';
import { SelectionAdapter } from '../selection-adapter';
import './Grid.css';

interface GridProps {
  puzzle: WaywordsPuzzle;
  pathCells: Set<string>;
  additionalCells: Set<string>;
  hintCells: Set<string>;
  justFoundCells?: Set<string>;
  connectedPathOrder?: string[];  // Ordered cellIds from START to END for celebration animation
  onSelection: (cellIds: string[]) => void;
  isCompleted?: boolean;
}

// v1.1: Visual priority order: preview > path (green) > hint (yellow) > additional (gray)
export function Grid({ puzzle, pathCells, additionalCells, hintCells, justFoundCells, connectedPathOrder, onSelection, isCompleted }: GridProps) {
  const [selecting, setSelecting] = useState(false);
  const [previewCells, setPreviewCells] = useState<string[]>([]);
  const adapterRef = useRef<SelectionAdapter>(new SelectionAdapter(puzzle));

  useEffect(() => {
    adapterRef.current = new SelectionAdapter(puzzle);
    setSelecting(false);
    setPreviewCells([]);
  }, [puzzle]);

  // Build a map of cellId -> index in connected path for animation timing
  const pathOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    connectedPathOrder?.forEach((cellId, index) => {
      map.set(cellId, index);
    });
    return map;
  }, [connectedPathOrder]);

  // Get start/end cell positions for markers
  const startCellId = puzzle.grid.start.adjacentCellId;
  const endCellId = puzzle.grid.end.adjacentCellId;
  const startCell = puzzle.grid.cells.find(c => c.id === startCellId);
  const endCell = puzzle.grid.cells.find(c => c.id === endCellId);
  const gridContainerStyle = {
    '--grid-columns': puzzle.grid.width
  } as React.CSSProperties;

  const handlePointerDown = (cellId: string, e: React.PointerEvent) => {
    e.preventDefault(); // Prevent text selection, long-press menu

    // Capture pointer on grid container
    const gridElement = e.currentTarget.closest('.grid') as HTMLElement;
    if (gridElement) {
      gridElement.setPointerCapture(e.pointerId);
    }

    setSelecting(true);
    adapterRef.current.begin(cellId);
    setPreviewCells([cellId]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selecting) return;

    e.preventDefault(); // Prevent scroll during drag

    // Get cell under pointer using coordinates
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cellElement = element?.closest('[data-cell-id]') as HTMLElement;
    const cellId = cellElement?.getAttribute('data-cell-id');

    if (!cellId) return;

    const cells = adapterRef.current.update(cellId);
    setPreviewCells(cells);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!selecting) return;

    // Release pointer capture
    const gridElement = e.currentTarget as HTMLElement;
    if (gridElement && gridElement.hasPointerCapture(e.pointerId)) {
      gridElement.releasePointerCapture(e.pointerId);
    }

    setSelecting(false);

    if (previewCells.length > 1) {
      onSelection(previewCells);
    }

    setPreviewCells([]);
  };

  return (
    <div className="grid-container" style={gridContainerStyle}>
      {/* Objective microcopy */}
      <div className="objective-text" data-testid="objective">
        Connect <span className="start-label">START tile</span> → <span className="end-label">END tile</span>
      </div>

      {/* Start marker */}
      {startCell && (
        <div
          className={`start-marker ${isCompleted ? 'connected' : ''}`}
          style={{ '--marker-col': startCell.x + 1 } as React.CSSProperties}
          data-testid="start-marker"
        >
          ▼ START
        </div>
      )}

      <div
        className={`grid${isCompleted ? ' completed' : ''}`}
        data-testid="grid"
        style={{
          gridTemplateColumns: `repeat(${puzzle.grid.width}, 1fr)`,
          gridTemplateRows: `repeat(${puzzle.grid.height}, 1fr)`
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {puzzle.grid.cells.map((cell) => {
          if (cell.type === 'VOID') {
            return <div key={cell.id} className="cell void" />;
          }

          const isPath = pathCells.has(cell.id);
          const isPreview = previewCells.includes(cell.id);
          const isHint = hintCells.has(cell.id);
          const isAdditional = additionalCells.has(cell.id);
          const isJustFound = justFoundCells?.has(cell.id) ?? false;
          const isStart = cell.id === startCellId;
          const isEnd = cell.id === endCellId;

          // v1.1: Priority order (highest to lowest):
          // preview (purple) > path (green) > hint (yellow) > additional (gray) > base
          // CSS handles priority via specificity, so we apply all applicable classes
          const classes = ['cell'];
          if (isPreview) classes.push('preview');
          if (isPath) classes.push('path');
          if (isJustFound) classes.push('just-found');
          if (isHint && !isPath) classes.push('hint'); // Yellow only if not green
          if (isAdditional && !isPath && !isHint) classes.push('additional'); // Gray only if not green or yellow
          if (isStart) classes.push('start-cell');
          if (isEnd) classes.push('end-cell');

          // For completed state, use path order for staggered animation (traces from START to END)
          const pathIndex = pathOrderMap.get(cell.id);
          const cellStyle: React.CSSProperties = {
            gridColumn: cell.x + 1,
            gridRow: cell.y + 1,
            ...(isCompleted && isPath && pathIndex !== undefined
              ? { '--cell-index': pathIndex } as React.CSSProperties
              : {})
          };

          return (
            <div
              key={cell.id}
              data-cell-id={cell.id}
              className={classes.join(' ')}
              onPointerDown={(e) => handlePointerDown(cell.id, e)}
              style={cellStyle}
            >
              {cell.value}
            </div>
          );
        })}
      </div>

      {/* End marker */}
      {endCell && (
        <div
          className={`end-marker ${isCompleted ? 'connected' : ''}`}
          style={{ '--marker-col': endCell.x + 1 } as React.CSSProperties}
          data-testid="end-marker"
        >
          END ▲
        </div>
      )}
    </div>
  );
}
