import { History } from '../lib/history';
import { encodeState, presentationPayload, readShareHash, withV1Composition } from '../lib/share';
import { useUiStore } from './ui';
import { create } from 'zustand';
import { pickState, sameState, useLogoStore, validatePartial, type LogoState } from './logo';

const STORAGE_KEY = 'lettermint:v2';

export const useHistoryStore = create<{ canUndo: boolean; canRedo: boolean }>()(() => ({
  canUndo: false,
  canRedo: false,
}));

let history: History<LogoState> | null = null;
let restoring = false;

function syncFlags(): void {
  if (history) useHistoryStore.setState({ canUndo: history.canUndo, canRedo: history.canRedo });
}

function restore(state: LogoState | null): void {
  if (!state) return;
  restoring = true;
  useLogoStore.setState(state);
  restoring = false;
  syncFlags();
}

export const undo = () => restore(history?.undo() ?? null);
export const redo = () => restore(history?.redo() ?? null);

/** Everything between begin and end (a drag, a starter, a restore) is one undo step. */
export function beginGesture(): void {
  history?.beginGesture();
}

export function endGesture(): void {
  history?.endGesture();
  syncFlags();
}

/** Apply an untrusted partial as exactly one undo step, never merged with a recent edit. */
export function applyAsOneStep(partial: Partial<Record<keyof LogoState, unknown>>): void {
  beginGesture();
  useLogoStore.getState().apply(partial);
  endGesture();
}

/** Edit link (default) or a presentation link that opens on the finished mark. */
export function shareUrl(kind: 'edit' | 'present' = 'edit'): string {
  const { origin, pathname } = window.location;
  const state = pickState(useLogoStore.getState());
  return `${origin}${pathname}#${kind === 'present' ? presentationPayload(state) : encodeState(state)}`;
}

/**
 * Load initial state (URL hash wins over autosave), then keep autosave, the
 * URL hash and the undo history in sync with the store.
 */
export function initPersistence(): void {
  const { apply } = useLogoStore.getState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Autosaves from before letter positions existed keep the composition they were drawn with.
    if (saved) apply(withV1Composition(validatePartial(JSON.parse(saved) as Record<string, unknown>)));
  } catch {
    // Corrupt or unavailable storage: start from defaults.
  }
  const link = readShareHash(window.location.hash);
  apply(link.state);
  if (link.damaged) useUiStore.getState().notify("Couldn't read that share link. Nothing was changed.");

  history = new History(pickState(useLogoStore.getState()), sameState);
  syncFlags();

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  useLogoStore.subscribe((s) => {
    const snap = pickState(s);
    if (!restoring && history?.record(snap, performance.now())) syncFlags();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      } catch {
        // Ignore quota/private-mode errors; autosave is best-effort.
      }
      window.history.replaceState(null, '', `#${encodeState(snap)}`);
    }, 250);
  });
}
