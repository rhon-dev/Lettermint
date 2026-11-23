import { useLayoutEffect, useRef, useState } from 'react';
import { filterDesigns, STYLE_FILTERS, type Design } from '../lib/designs';
import { fontKey, useFontStore } from '../lib/glyphs';
import { openDocument } from '../store/persistence';
import type { LogoState } from '../store/logo';
import { useUiStore } from '../store/ui';
import { DesignTile } from './DesignTile';
import { InitialsField } from './InitialsField';
import { Wordmark } from './Wordmark';

/** The styles gallery: every design drawn from the visitor's initials, filterable, one click to edit. */
export function Gallery() {
  const initials = useUiStore((s) => s.initials);
  const filter = useUiStore((s) => s.filter);
  const setFilter = useUiStore((s) => s.setFilter);
  const goHome = useUiStore((s) => s.goHome);
  // While the field is empty the tiles keep the last initials instead of going blank.
  const [shown, setShown] = useState(initials || 'AR');
  if (initials && initials !== shown) setShown(initials);
  const list = filterDesigns(filter);
  const tiles = useRef(new Map<string, HTMLButtonElement>());

  // Coming back from the editor: same scroll position, focus on the design that was opened.
  useLayoutEffect(() => {
    const { galleryScroll, lastDesign } = useUiStore.getState();
    window.scrollTo(0, galleryScroll);
    if (lastDesign) tiles.current.get(lastDesign)?.focus({ preventScroll: true });
  }, []);

  const open = (d: Design, state: LogoState) => {
    const [a, b] = d.fonts;
    // The tile's fonts are loaded, so the editor's first frame draws with exactly them.
    useFontStore.setState({ activeKey: fontKey(a.id, a.weight), activeKey2: fontKey(b.id, b.weight) });
    openDocument(state);
    useUiStore.getState().pin(null);
    useUiStore.getState().openEditor(d.id, window.scrollY);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pt-5 pb-16 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between gap-4">
        <button type="button" onClick={goHome} className="focus-ring -m-1 rounded-lg p-1" aria-label="Lettermint, back to the start">
          <Wordmark />
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-5 border-b border-ink/15 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/15">
        <div className="min-w-0">
          <p className="text-sm text-ink-soft dark:text-stone-400">{list.length} designs · pick one to customize</p>
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Styles for <span className="tracking-[0.06em]">{shown.toUpperCase()}</span>
          </h1>
        </div>
        <div className="w-full sm:w-60">
          <InitialsField id="initials" label="Change initials" size="sm" error={initials ? null : 'Type initials to update the styles.'} />
        </div>
      </div>

      <div role="group" aria-label="Filter styles" className="-mx-1 mt-4 flex flex-wrap gap-2 px-1">
        {STYLE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`focus-ring min-h-11 cursor-pointer rounded-full px-4 text-sm font-medium ring-1 transition-colors duration-150 ${
              filter === f.id
                ? 'bg-ink text-paper ring-ink dark:bg-paper dark:text-ink dark:ring-paper'
                : 'bg-transparent text-ink ring-ink/20 hover:bg-ink/5 dark:text-stone-100 dark:ring-white/20 dark:hover:bg-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul aria-label={`Styles for ${shown.toUpperCase()}`} className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {list.map((d) => (
          <li key={d.id}>
            <DesignTile
              ref={(el) => {
                if (el) tiles.current.set(d.id, el);
                else tiles.current.delete(d.id);
              }}
              d={d}
              text={shown}
              onOpen={open}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
