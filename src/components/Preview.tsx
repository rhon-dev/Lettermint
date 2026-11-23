import { useEffect, useMemo } from 'react';
import { getFontDef } from '../fonts/registry';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { fontKey, requestFont, selectFont, useFontStore } from '../lib/glyphs';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { applyAsOneStep } from '../store/persistence';
import { useUiStore, type Backdrop } from '../store/ui';
import { FaviconPreview } from './FaviconPreview';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';
import { MarkEditor } from './MarkEditor';

const BACKDROPS: { id: Backdrop; label: string; swatch: string }[] = [
  { id: 'light', label: 'Light', swatch: 'bg-stone-50' },
  { id: 'dark', label: 'Dark', swatch: 'bg-stone-950' },
  { id: 'checker', label: 'Transparent', swatch: 'checkerboard' },
];

const BACKDROP_CLASS: Record<Backdrop, string> = {
  checker: 'checkerboard',
  light: 'bg-stone-50',
  dark: 'bg-stone-950',
};

export const GUIDANCE = 'Drag a letter to position it.';

const pill =
  'rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-stone-900/90 dark:ring-white/10';

/** Pin one version, keep editing, flip between them at the same size, or restore the pinned one. */
function CompareControls() {
  const { state } = useCurrentMark();
  const pinned = useUiStore((s) => s.pinned);
  const showPinned = useUiStore((s) => s.showPinned);
  const pin = useUiStore((s) => s.pin);
  const setShowPinned = useUiStore((s) => s.setShowPinned);
  const notify = useUiStore((s) => s.notify);

  if (!pinned) {
    return (
      <button type="button" className={`btn focus-ring h-11 text-xs ${pill}`} onClick={() => pin(state)} title="Keep this version to compare against">
        <Icon name="pin" size={16} /> Pin version
      </button>
    );
  }
  return (
    <div className={`flex items-center gap-1 p-1 ${pill}`}>
      <div role="radiogroup" aria-label="Version on the artboard" className="flex gap-1">
        {([true, false] as const).map((p) => (
          <button
            key={String(p)}
            type="button"
            role="radio"
            aria-checked={showPinned === p}
            onClick={() => setShowPinned(p)}
            className={`btn focus-ring h-9 min-h-9 px-3 text-xs ${showPinned === p ? 'bg-stone-900 text-white hover:!bg-stone-900 dark:bg-white dark:text-stone-900 dark:hover:!bg-white' : ''}`}
          >
            {p ? 'Pinned' : 'Current'}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn focus-ring h-9 min-h-9 px-3 text-xs"
        onClick={() => {
          applyAsOneStep(pinned);
          setShowPinned(false);
          notify('Pinned version restored. Undo to go back.');
        }}
      >
        Restore pinned
      </button>
      <button type="button" className="btn focus-ring h-9 min-h-9 w-9 min-w-9 px-0" aria-label="Unpin version" onClick={() => pin(null)}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/**
 * The artboard: the mark (drawn by the export serializer), the editing layer on top, font loading
 * and empty states, the comparison toggle, and the real 16 px favicon underneath.
 */
export function Preview({ className = '', compact = false, showSize = true }: { className?: string; compact?: boolean; showSize?: boolean }) {
  const { state, font, fontReady, fontFailed, wantedFamily } = useCurrentMark();
  const backdrop = useUiStore((s) => s.backdrop);
  const setBackdrop = useUiStore((s) => s.setBackdrop);
  const pinned = useUiStore((s) => s.pinned);
  const showPinned = useUiStore((s) => s.showPinned && s.pinned !== null);
  const pinnedFont = useFontStore((s) => (pinned ? (s.fonts[fontKey(pinned.fontId, pinned.weight)] ?? null) : null));

  useEffect(() => {
    if (pinned) void requestFont(pinned.fontId, pinned.weight);
  }, [pinned]);

  const shown = showPinned && pinned ? pinned : state;
  const shownFont = showPinned ? pinnedFont : font;
  const geo = useMemo(() => buildLogo(shown, shownFont), [shown, shownFont]);
  const editing = !showPinned && fontReady && !geo.placeholder;
  const firstLoad = font === null && !fontFailed;

  const hint = showPinned
    ? 'Showing the pinned version. Choose Current to keep editing.'
    : geo.placeholder
      ? 'Type one or two characters to start.'
      : !fontReady
        ? fontFailed
          ? `${wantedFamily} couldn't load.`
          : `Loading ${wantedFamily}…`
        : GUIDANCE;

  return (
    <section aria-label="Artboard" className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div
        className={`${BACKDROP_CLASS[backdrop]} relative min-h-0 flex-1 overflow-hidden rounded-[1.25rem] ring-1 ring-black/5 transition-colors duration-200 dark:ring-white/10`}
      >
        <div className={`absolute inset-0 ${compact ? 'p-4 pt-14' : 'p-8 pt-16 xl:p-12 xl:pt-16'}`}>
          <div className="relative h-full w-full">
            <LogoMark
              state={shown}
              font={shownFont}
              geometry={geo}
              label={describeLogo(shown, getFontDef(shown.fontId).family)}
              className="absolute inset-0 h-full w-full"
            />
            <MarkEditor geo={geo} size={shown.size} enabled={editing} className="absolute inset-0 h-full w-full" />
          </div>
        </div>

        {firstLoad && (
          <div role="status" className="absolute inset-0 grid place-items-center">
            <span className={`flex items-center gap-2 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 ${pill}`}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mint-500 motion-safe:animate-pulse" />
              Loading {wantedFamily}…
            </span>
          </div>
        )}
        {!firstLoad && !fontReady && !showPinned && (
          <div role="status" className={`absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 ${pill}`}>
            {fontFailed ? (
              <>
                {wantedFamily} couldn't load.
                <button type="button" className="focus-ring rounded font-semibold underline" onClick={() => void selectFont(state.fontId, state.weight)}>
                  Retry
                </button>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mint-500 motion-safe:animate-pulse" />
                Loading {wantedFamily}…
              </>
            )}
          </div>
        )}
        {geo.placeholder && !showPinned && (
          <div className="absolute inset-x-0 bottom-6 grid place-items-center">
            <button
              type="button"
              className={`btn focus-ring px-4 text-sm ${pill}`}
              onClick={() => document.getElementById('initials')?.focus()}
            >
              Type your initials
            </button>
          </div>
        )}

        <div role="radiogroup" aria-label="Artboard background" className={`absolute top-2 left-2 flex gap-1 p-1 [@media(pointer:coarse)]:gap-2 ${pill}`}>
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={backdrop === b.id}
              aria-label={`${b.label} artboard`}
              title={`${b.label} artboard`}
              onClick={() => setBackdrop(b.id)}
              className="focus-ring grid h-9 w-9 cursor-pointer place-items-center rounded-full transition-transform duration-150 active:scale-95 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
            >
              <span
                className={`h-5 w-5 rounded-full ring-1 ring-black/15 dark:ring-white/20 ${b.swatch} ${
                  backdrop === b.id ? 'outline-2 outline-offset-2 outline-mint-500' : ''
                }`}
              />
            </button>
          ))}
        </div>
        {!compact && (
          <div className="absolute top-2 right-2">
            <CompareControls />
          </div>
        )}
        {showSize && (
          <p className={`pointer-events-none absolute right-3 bottom-3 px-2.5 py-1 font-mono text-xs text-stone-700 tabular-nums dark:text-stone-300 ${pill}`}>
            {shown.size} × {shown.size} px
          </p>
        )}
      </div>
      <div className={`flex items-center justify-between gap-x-4 gap-y-2 px-1 ${compact ? '' : 'flex-wrap'}`}>
        <p className={`min-w-0 text-sm ${editing ? 'text-stone-700 dark:text-stone-300' : 'text-stone-600 dark:text-stone-400'}`}>{hint}</p>
        <FaviconPreview compact={compact} paint={shown} geo={geo} title={describeLogo(shown, getFontDef(shown.fontId).family)} />
      </div>
    </section>
  );
}
