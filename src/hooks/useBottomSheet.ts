import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export type SheetSnap = 'peek' | 'expanded';

/** Sheet height as a fraction of the viewport for each snap point. */
// Expanded stops short enough that the artwork stays visible above the sheet while editing.
export const SNAP_FRACTION: Record<SheetSnap, number> = { peek: 0.46, expanded: 0.64 };

interface DragState {
  startY: number;
  startHeight: number;
  height: number;
}

/** Owns snap + drag state so the layout can size the preview around the sheet. */
export function useBottomSheet(viewportHeight: number) {
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [drag, setDrag] = useState<DragState | null>(null);
  const movedRef = useRef(false);

  const min = viewportHeight * (SNAP_FRACTION.peek - 0.08);
  const max = viewportHeight * (SNAP_FRACTION.expanded + 0.04);
  const height = drag ? drag.height : viewportHeight * SNAP_FRACTION[snap];

  const handleProps = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      movedRef.current = false;
      setDrag({ startY: e.clientY, startHeight: height, height });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!drag) return;
      const dy = drag.startY - e.clientY;
      if (Math.abs(dy) > 4) movedRef.current = true;
      setDrag({ ...drag, height: Math.min(max, Math.max(min, drag.startHeight + dy)) });
    },
    onPointerUp: () => {
      if (!drag) return;
      if (movedRef.current) {
        const mid = (viewportHeight * (SNAP_FRACTION.peek + SNAP_FRACTION.expanded)) / 2;
        setSnap(drag.height > mid ? 'expanded' : 'peek');
      }
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
    onClick: () => {
      // A drag ends with a click event too; only treat a real tap as a toggle.
      if (movedRef.current) {
        movedRef.current = false;
        return;
      }
      setSnap((s) => (s === 'peek' ? 'expanded' : 'peek'));
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSnap('expanded');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSnap('peek');
      }
    },
  };

  return { snap, height, dragging: drag !== null, handleProps };
}
