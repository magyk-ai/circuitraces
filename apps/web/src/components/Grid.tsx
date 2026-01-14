import React, { useRef, useState } from 'react';
import type { WaywordsPuzzle } from '@circuitraces/engine';
import { SelectionAdapter } from '../selection-adapter';
import './Grid.css';

interface GridProps {
  puzzle: WaywordsPuzzle;
  pathCells: Set<string>;
  hintCells: Set<string>;
  clueCells: Set<string>;
  onSelection: (cellIds: string[]) => void;
}

export function Grid({ puzzle, pathCells, hintCells, clueCells, onSelection }: GridProps) {
  const [selecting, setSelecting] = useState(false);
  const [previewCells, setPreviewCells] = useState<string[]>([]);
  const adapterRef = useRef<SelectionAdapter | null>(null);

  if (!adapterRef.current) {
    adapterRef.current = new SelectionAdapter(puzzle);
  }

  const handlePointerDown = (cellId: string, e: React.PointerEvent) => {
    e.preventDefault(); // Prevent text selection, long-press menu

    // Capture pointer on grid container
    const gridElement = e.currentTarget.closest('.grid') as HTMLElement;
    if (gridElement) {
      gridElement.setPointerCapture(e.pointerId);
    }

    setSelecting(true);
    adapterRef.current!.begin(cellId);
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

    const cells = adapterRef.current!.update(cellId);
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
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${puzzle.grid.width}, 1fr)`,
        gridTemplateRows: `repeat(${puzzle.grid.height}, 1fr)`
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {puzzle.grid.cells.map(cell => {
        if (cell.type === 'VOID') {
          return <div key={cell.id} className="cell void" />;
        }

        const isPath = pathCells.has(cell.id);
        const isPreview = previewCells.includes(cell.id);
        const isHint = hintCells.has(cell.id);
        const isClue = clueCells.has(cell.id);

        return (
          <div
            key={cell.id}
            data-cell-id={cell.id}
            className={`cell ${isPath ? 'path' : ''} ${isPreview ? 'preview' : ''} ${isHint ? 'hint' : ''} ${isClue ? 'clue' : ''}`}
            onPointerDown={(e) => handlePointerDown(cell.id, e)}
            style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
          >
            {cell.value}
          </div>
        );
      })}
    </div>
  );
}
