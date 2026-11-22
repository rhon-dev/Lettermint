import type { Font } from 'opentype.js';
import { create } from 'zustand';
import { fontUrl, nearestWeight, type FontId, type Weight } from '../fonts/registry';

/** Cache key for one family at one shipped weight, e.g. "inter:700". */
export type FontKey = `${FontId}:${Weight}`;

export function fontKey(id: FontId, weight: Weight): FontKey {
  return `${id}:${nearestWeight(id, weight)}`;
}

const cache = new Map<FontKey, Promise<Font>>();

/** Fetch + parse a self-hosted font once; concurrent callers share the same promise. */
export function loadFont(id: FontId, weight: Weight): Promise<Font> {
  const key = fontKey(id, weight);
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = Promise.all([
    import('opentype.js'),
    fetch(fontUrl(id, weight)).then((res) => {
      if (!res.ok) throw new Error(`Font ${key}: HTTP ${res.status}`);
      return res.arrayBuffer();
    }),
  ]).then(([opentype, buffer]) => opentype.parse(buffer));
  cache.set(key, promise);
  // Allow a retry after a failed load.
  promise.catch(() => cache.delete(key));
  return promise;
}

export type FontStatus = 'loading' | 'ready' | 'error';

interface FontStore {
  fonts: Partial<Record<FontKey, Font>>;
  status: Partial<Record<FontKey, FontStatus>>;
  /** Font currently shown in the preview: the last selected font that finished loading. */
  activeKey: FontKey | null;
}

export const useFontStore = create<FontStore>()(() => ({ fonts: {}, status: {}, activeKey: null }));

function setStatus(key: FontKey, status: FontStatus): void {
  useFontStore.setState((s) => ({ status: { ...s.status, [key]: status } }));
}

/** Load a font into the store (used by picker tiles, the gallery and selection). */
export function requestFont(id: FontId, weight: Weight): Promise<Font | null> {
  const key = fontKey(id, weight);
  const current = useFontStore.getState().status[key];
  if (current === undefined || current === 'error') setStatus(key, 'loading');
  return loadFont(id, weight).then(
    (font) => {
      useFontStore.setState((s) => ({
        fonts: { ...s.fonts, [key]: font },
        status: { ...s.status, [key]: 'ready' },
      }));
      return font;
    },
    () => {
      setStatus(key, 'error');
      return null;
    },
  );
}

let latestSelection: FontKey | null = null;

/** Switch the preview to the font once it is ready; until then the previous font stays visible. */
export function selectFont(id: FontId, weight: Weight): Promise<Font | null> {
  const key = fontKey(id, weight);
  latestSelection = key;
  return requestFont(id, weight).then((font) => {
    if (font && latestSelection === key) useFontStore.setState({ activeKey: key });
    return font;
  });
}
