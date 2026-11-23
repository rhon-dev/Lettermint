import { forwardRef } from 'react';
import { getFontDef } from '../fonts/registry';
import type { Design } from '../lib/designs';
import { describeLogo } from '../lib/describe';
import { useDesign } from '../hooks/useDesign';
import type { LogoState } from '../store/logo';
import { LogoMark } from './LogoMark';

export function DesignArt({ d, text, label }: { d: Design; text: string; label?: string }) {
  const { state, font, font2 } = useDesign(d, text);
  if (!state) {
    return <span aria-hidden="true" className="block h-full w-full bg-paper-deep/70 motion-safe:animate-pulse dark:bg-stone-800" />;
  }
  return (
    <LogoMark
      state={state}
      font={font}
      font2={font2}
      label={label ?? describeLogo(state, getFontDef(state.fontId).family)}
      className="block h-full w-full"
    />
  );
}

interface TileProps {
  d: Design;
  text: string;
  onOpen: (d: Design, state: LogoState) => void;
}

/** One selectable gallery design: the mark, its name and one line about how it is built. */
export const DesignTile = forwardRef<HTMLButtonElement, TileProps>(function DesignTile({ d, text, onOpen }, ref) {
  const { state, font, font2 } = useDesign(d, text);
  const ready = state !== null;
  return (
    <button
      ref={ref}
      type="button"
      data-design={d.id}
      aria-disabled={!ready}
      aria-label={`${d.name}. ${d.note}.${ready ? '' : ' Loading.'}`}
      onClick={() => state && onOpen(d, state)}
      className="group focus-ring flex w-full cursor-pointer flex-col gap-3 rounded-[1.25rem] p-2 text-left transition-colors duration-150 hover:bg-ink/[0.04] focus-visible:bg-mint-50/70 active:scale-[0.99] dark:hover:bg-white/[0.05] dark:focus-visible:bg-mint-900/30"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-paper-deep/60 ring-1 ring-ink/10 transition-shadow duration-150 group-hover:ring-ink/25 dark:bg-stone-900 dark:ring-white/10">
        {state ? (
          <LogoMark state={state} font={font} font2={font2} className="block h-full w-full" />
        ) : (
          <span aria-hidden="true" className="block h-full w-full motion-safe:animate-pulse" />
        )}
      </span>
      <span className="flex items-baseline justify-between gap-3 px-1">
        <span className="font-display text-lg leading-tight font-semibold">{d.name}</span>
        <span aria-hidden="true" className="hidden text-xs font-medium whitespace-nowrap text-mint-700 sm:inline opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-mint-400">
          Customize →
        </span>
      </span>
      <span className="-mt-2 px-1 text-sm text-ink-soft dark:text-stone-400">{d.note}</span>
    </button>
  );
});
