import type { Font } from 'opentype.js';
import { create } from 'zustand';
import { getFontDef, type FontId } from '../fonts/registry';

const cache = new Map<FontId, Promise<Font>>();

/** Fetch + parse a self-hosted font once; concurrent callers share the same promise. */
export function loadFont(id: FontId): Promise<Font> {
  const cached = cache.get(id);
  if (cached) return cached;
  const { url } = getFontDef(id);
  const promise = Promise.all([
    import('opentype.js'),
    fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Font ${id}: HTTP ${res.status}`);
      return res.arrayBuffer();
    }),
  ]).then(([opentype, buffer]) => opentype.parse(buffer));
  cache.set(id, promise);
  // Allow a retry after a failed load.
  promise.catch(() => cache.delete(id));
  return promise;
}

export type FontStatus = 'loading' | 'ready' | 'error';

interface FontStore {
  fonts: Partial<Record<FontId, Font>>;
  status: Partial<Record<FontId, FontStatus>>;
  /** Font currently shown in the preview: the last selected font that finished loading. */
  activeId: FontId | null;
}

export const useFontStore = create<FontStore>()(() => ({ fonts: {}, status: {}, activeId: null }));

function setStatus(id: FontId, status: FontStatus): void {
  useFontStore.setState((s) => ({ status: { ...s.status, [id]: status } }));
}

/** Load a font into the store (used by picker tiles and selection). */
export function requestFont(id: FontId): Promise<Font | null> {
  const current = useFontStore.getState().status[id];
  if (current === undefined || current === 'error') setStatus(id, 'loading');
  return loadFont(id).then(
    (font) => {
      useFontStore.setState((s) => ({
        fonts: { ...s.fonts, [id]: font },
        status: { ...s.status, [id]: 'ready' },
      }));
      return font;
    },
    () => {
      setStatus(id, 'error');
      return null;
    },
  );
}

let latestSelection: FontId | null = null;

/** Switch the preview to `id` once it is ready; until then the previous font stays visible. */
export function selectFont(id: FontId): void {
  latestSelection = id;
  void requestFont(id).then((font) => {
    if (font && latestSelection === id) useFontStore.setState({ activeId: id });
  });
}
