import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { LogoGeometry } from '../lib/buildLogo';
import { clampOffset, clientToLogo, keepInCanvas, offsetDelta, offsetKeys, snapCenter } from '../lib/compose';
import { beginGesture, endGesture } from '../store/persistence';
import { useLogoStore } from '../store/logo';
import { useUiStore } from '../store/ui';

/** Screen pixels a pointer must travel before a press becomes a drag (a shorter press just selects). */
const DRAG_THRESHOLD = 3;
/** Snap distance and extra hit area around each letter, in screen pixels. */
const SNAP_PX = 8;
const HIT_PX = 12;
const ACCENT = '#10b981';

interface Drag {
  pointerId: number;
  index: 0 | 1;
  clientX: number;
  clientY: number;
  moved: boolean;
  start: { x: number; y: number };
  offset: [number, number];
  center: { x: number; y: number };
  box: { x1: number; y1: number; x2: number; y2: number };
  targets: { x: number[]; y: number[] };
}

const boxCenter = (b: { x1: number; y1: number; x2: number; y2: number }) => ({ x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 });

/**
 * Transparent layer over the artboard with the same viewBox as the mark. Letters are picked and
 * dragged here with Pointer Events (mouse, pen, touch); positions are written in logo coordinates.
 */
export function MarkEditor({ geo, size, enabled, className = '' }: { geo: LogoGeometry; size: number; enabled: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [unitsPerPx, setUnitsPerPx] = useState(1);
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const apply = useLogoStore((s) => s.apply);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      if (width > 0 && height > 0) setUnitsPerPx(size / Math.min(width, height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    // CSS touch-action is ignored on SVG shapes, so a touch that starts on a letter is claimed here
    // (non-passive) to stop the browser from panning and cancelling the drag. Touches elsewhere still scroll.
    const claim = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.hasAttribute('data-letter')) e.preventDefault();
    };
    el.addEventListener('touchstart', claim, { passive: false });
    return () => el.removeEventListener('touchstart', claim);
  }, [enabled]);

  const letters = geo.placeholder ? [] : geo.letters;
  const sel = letters[selected] ?? letters[0];

  const onDown = (e: PointerEvent<SVGPathElement>, index: 0 | 1) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const svg = ref.current;
    const box = letters[index]?.box;
    if (!svg || !box) return;
    e.preventDefault();
    // Capture on the letter: moves and the release still arrive when the pointer leaves the artboard.
    e.currentTarget.setPointerCapture(e.pointerId);
    select(index);
    const s = useLogoStore.getState();
    const [kx, ky] = offsetKeys(index);
    const other = letters[index === 0 ? 1 : 0]?.box;
    const otherCenter = other ? boxCenter(other) : null;
    drag.current = {
      pointerId: e.pointerId,
      index,
      clientX: e.clientX,
      clientY: e.clientY,
      moved: false,
      start: clientToLogo(e.clientX, e.clientY, svg.getBoundingClientRect(), size),
      offset: [s[kx], s[ky]],
      center: boxCenter(box),
      box,
      targets: { x: [size / 2, ...(otherCenter ? [otherCenter.x] : [])], y: [size / 2, ...(otherCenter ? [otherCenter.y] : [])] },
    };
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const svg = ref.current;
    if (!d || !svg || e.pointerId !== d.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.clientX, e.clientY - d.clientY) < DRAG_THRESHOLD) return;
      d.moved = true;
      beginGesture();
      setDragging(d.index);
    }
    const rect = svg.getBoundingClientRect();
    const p = clientToLogo(e.clientX, e.clientY, rect, size);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    // Alt/Option turns snapping off for free placement.
    const snap = e.altKey
      ? { dx: 0, dy: 0, guideX: null, guideY: null }
      : snapCenter({ x: d.center.x + dx, y: d.center.y + dy }, d.targets, (SNAP_PX * size) / Math.min(rect.width, rect.height));
    const [kx, ky] = offsetKeys(d.index);
    const move = keepInCanvas(d.box, dx + snap.dx, dy + snap.dy, size);
    apply({ [kx]: clampOffset(d.offset[0] + offsetDelta(move.dx, size)), [ky]: clampOffset(d.offset[1] + offsetDelta(move.dy, size)) });
    setGuides((g) => (g.x === snap.guideX && g.y === snap.guideY ? g : { x: snap.guideX, y: snap.guideY }));
  };

  const finish = (e: PointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    if (d.moved) {
      // A cancelled pointer (system gesture, palm rejection) puts the letter back where it started.
      if (cancelled) {
        const [kx, ky] = offsetKeys(d.index);
        apply({ [kx]: d.offset[0], [ky]: d.offset[1] });
      }
      endGesture();
    }
    setDragging(null);
    setGuides({ x: null, y: null });
  };

  const pad = 6 * unitsPerPx;
  return (
    <svg
      ref={ref}
      viewBox={geo.viewBox}
      aria-hidden="true"
      className={className}
      onPointerMove={onMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => finish(e, false)}
      style={{ pointerEvents: 'none' }}
    >
      {letters.map((l, i) => (
        <path
          key={i}
          d={l.d}
          data-letter={i}
          fill="transparent"
          stroke="transparent"
          strokeWidth={HIT_PX * unitsPerPx}
          strokeLinejoin="round"
          onPointerDown={(e) => onDown(e, i as 0 | 1)}
          style={{
            pointerEvents: enabled ? 'all' : 'none',
            cursor: dragging === i ? 'grabbing' : 'grab',
            // Only the letters claim touch gestures; the rest of the artboard still scrolls the page.
            touchAction: 'none',
          }}
        />
      ))}
      {enabled && sel?.box && (
        <rect
          x={sel.box.x1 - pad}
          y={sel.box.y1 - pad}
          width={sel.box.x2 - sel.box.x1 + pad * 2}
          height={sel.box.y2 - sel.box.y1 + pad * 2}
          rx={4 * unitsPerPx}
          fill="none"
          stroke={ACCENT}
          strokeWidth={1.5}
          strokeDasharray={dragging === null ? '5 4' : undefined}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {guides.x !== null && (
        <line x1={guides.x} y1={0} x2={guides.x} y2={size} stroke={ACCENT} strokeWidth={1} vectorEffect="non-scaling-stroke" className="motion-safe:animate-guide-in" />
      )}
      {guides.y !== null && (
        <line x1={0} y1={guides.y} x2={size} y2={guides.y} stroke={ACCENT} strokeWidth={1} vectorEffect="non-scaling-stroke" className="motion-safe:animate-guide-in" />
      )}
    </svg>
  );
}
