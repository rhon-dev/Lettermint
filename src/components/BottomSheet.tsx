import type { ReactNode } from 'react';
import type { useBottomSheet } from '../hooks/useBottomSheet';

interface BottomSheetProps {
  sheet: ReturnType<typeof useBottomSheet>;
  label: string;
  children: ReactNode;
}

export function BottomSheet({ sheet, label, children }: BottomSheetProps) {
  const expanded = sheet.snap === 'expanded';
  return (
    <aside
      aria-label={label}
      style={{ height: sheet.height }}
      className={`fixed inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.08)] ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800 ${
        sheet.dragging ? '' : 'transition-[height] duration-200 ease-out'
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse controls' : 'Expand controls'}
        className="focus-ring flex min-h-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-t-3xl active:cursor-grabbing"
        {...sheet.handleProps}
      >
        <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-600" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </aside>
  );
}
