import React, { useRef, useState } from 'react';
import type { WaywordsPuzzle } from '@circuitraces/engine';
import { SelectionAdapter } from '../selection-adapter';
import './Grid.css';

interface GridProps {
  puzzle: WaywordsPuzzle;
  pathCells: Set<string>;
  onSelection: (cellIds: string[]) => void;
}

export function Grid({ puzzle, pathCells, onSelection }: GridProps) {
  const [selecting, setSelecting] = useState(false);
  const [previewCells, setPreviewCells] = useState<string[]>([]);
  const adapterRef = useRef<SelectionAdapter | null>(null);

  if (!adapterRef.current) {
    adapterRef.current = new SelectionAdapter(puzzle);
  }

  const handlePointerDown = (cellId: string) => {
    setSelecting(true);
    adapterRef.current!.begin(cellId);
    setPreviewCells([cellId]);
  };

  const handlePointerMove = (cellId: string) => {
    if (!selecting) return;
    const cells = adapterRef.current!.update(cellId);
    setPreviewCells(cells);
  };

  const handlePointerUp = () => {
    if (!selecting) return;
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
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {puzzle.grid.cells.map(cell => {
        if (cell.type === 'VOID') {
          return <div key={cell.id} className="cell void" />;
        }

        const isPath = pathCells.has(cell.id);
        const isPreview = previewCells.includes(cell.id);

        return (
          <div
            key={cell.id}
            className={`cell ${isPath ? 'path' : ''} ${isPreview ? 'preview' : ''}`}
            onPointerDown={() => handlePointerDown(cell.id)}
            onPointerEnter={() => handlePointerMove(cell.id)}
            style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
          >
            {cell.value}
          </div>
        );
      })}
    </div>
  );
}
