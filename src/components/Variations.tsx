import { useEffect, useMemo } from 'react';
import { getFontDef } from '../fonts/registry';
import { fontKey, requestFont, useFontStore } from '../lib/glyphs';
import { displayText } from '../lib/sanitize';
import { SHAPE_LABELS } from '../lib/shapes';
import { variationSet, type Variation } from '../lib/variations';
import { useShallow } from 'zustand/react/shallow';
import { pickState, useLogoStore } from '../store/logo';
import { useUiStore } from '../store/ui';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';

function VariationTile({ v, index }: { v: Variation; index: number }) {
  const current = useLogoStore(useShallow(pickState));
  const font = useFontStore((s) => s.fonts[fontKey(v.fontId, current.weight)] ?? null);
  const apply = useLogoStore((s) => s.apply);
  const notify = useUiStore((s) => s.notify);
  const family = getFontDef(v.fontId).family;
  // Applying a variation keeps the user's other settings, so the preview does too.
  const state = useMemo(() => ({ ...current, ...v, size: 256 }), [current, v]);

  return (
    <li style={{ animationDelay: `${index * 40}ms` }} className="motion-safe:animate-pop-in [animation-fill-mode:both]">
      <button
        type="button"
        onClick={() => {
          apply(v);
          notify(`Applied ${family} · ${SHAPE_LABELS[v.shape]}`);
        }}
        aria-label={`Use ${family}, ${SHAPE_LABELS[v.shape]}, ${v.fill} ${v.bgColor} background`}
        title={`${family} · ${SHAPE_LABELS[v.shape]}`}
        className="group focus-ring checkerboard relative grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-2xl p-2 ring-1 ring-black/5 transition-transform duration-200 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:shadow-lg active:scale-95 dark:ring-white/10"
      >
        {font ? (
          <LogoMark state={state} font={font} className="h-full w-full" />
        ) : (
          <span aria-hidden="true" className="h-4/5 w-4/5 rounded-full bg-stone-300/60 motion-safe:animate-pulse dark:bg-stone-600/60" />
        )}
        <span className="pointer-events-none absolute inset-x-1 bottom-1 truncate rounded-lg bg-black/55 px-1.5 py-0.5 text-center text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {family}
        </span>
      </button>
    </li>
  );
}

export function Variations({ count = 8, compact = false }: { count?: number; compact?: boolean }) {
  const seed = useUiStore((s) => s.seed);
  const shuffle = useUiStore((s) => s.shuffle);
  const text = useLogoStore((s) => displayText(s.text, s.uppercase));
  const weight = useLogoStore((s) => s.weight);
  const list = useMemo(() => variationSet(seed, count), [seed, count]);

  useEffect(() => {
    for (const v of list) void requestFont(v.fontId, weight);
  }, [list, weight]);

  return (
    <section aria-labelledby="variations-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="variations-title" className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="sparkles" size={16} className="text-iris-500" />
            Variations for <span className="text-aurora font-display text-base">{text || 'Aa'}</span>
          </h2>
          {!compact && (
            <p className="text-xs text-stone-600 dark:text-stone-400">Tap one to start from it, then fine-tune.</p>
          )}
        </div>
        <button type="button" onClick={shuffle} className="btn chip focus-ring" title="Shuffle (R)">
          <Icon name="shuffle" size={18} />
          Shuffle
        </button>
      </div>
      <ul key={seed} className={`grid grid-cols-4 gap-2 sm:gap-3 ${compact ? '' : 'lg:grid-cols-8'}`}>
        {list.map((v, i) => (
          <VariationTile key={`${seed}-${i}`} v={v} index={i} />
        ))}
      </ul>
    </section>
  );
}
