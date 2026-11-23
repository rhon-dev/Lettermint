import { create } from 'zustand';
import { isPresentationHash } from '../lib/share';
import type { LogoState } from './logo';

export type Theme = 'system' | 'light' | 'dark';
export type Backdrop = 'checker' | 'light' | 'dark';

interface Toast {
  id: number;
  message: string;
}

interface UiState {
  theme: Theme;
  backdrop: Backdrop;
  toast: Toast | null;
  exportOpen: boolean;
  /** Bumped to reshuffle the variations gallery. */
  seed: number;
  /** Letter the position controls move (0 = first, 1 = second). */
  selected: 0 | 1;
  /** A version kept for comparison during this session only (never saved or shared). */
  pinned: LogoState | null;
  /** Show the pinned version on the artboard instead of the current one. */
  showPinned: boolean;
  /** Opened from a presentation link: show the finished mark until the visitor chooses to remix it. */
  presenting: boolean;
  setTheme: (t: Theme) => void;
  setBackdrop: (b: Backdrop) => void;
  notify: (message: string) => void;
  setExportOpen: (open: boolean) => void;
  shuffle: () => void;
  select: (i: 0 | 1) => void;
  pin: (state: LogoState | null) => void;
  setShowPinned: (on: boolean) => void;
  setPresenting: (on: boolean) => void;
}

const THEME_KEY = 'lettermint:theme';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>()((set) => ({
  theme: typeof localStorage === 'undefined' ? 'system' : readTheme(),
  // A quiet solid artboard; the transparency checker is one click away.
  backdrop: 'light',
  toast: null,
  exportOpen: false,
  seed: Math.floor(Math.random() * 1e9),
  selected: 1,
  pinned: null,
  showPinned: false,
  presenting: typeof location !== 'undefined' && isPresentationHash(location.hash),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies.
    }
    set({ theme });
  },
  setBackdrop: (backdrop) => set({ backdrop }),
  notify: (message) => {
    clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), message } });
    toastTimer = setTimeout(() => set({ toast: null }), 3000);
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
  shuffle: () => set((s) => ({ seed: (s.seed * 16807 + 1) % 2147483647 })),
  select: (selected) => set({ selected }),
  pin: (pinned) => set({ pinned, showPinned: false }),
  setShowPinned: (showPinned) => set({ showPinned }),
  setPresenting: (presenting) => set({ presenting }),
}));

/** Keep the `dark` class on <html> in sync with the chosen theme and the OS setting. */
export function initTheme(): void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const { theme } = useUiStore.getState();
    const dark = theme === 'dark' || (theme === 'system' && mql.matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  };
  apply();
  mql.addEventListener('change', apply);
  useUiStore.subscribe((s, prev) => {
    if (s.theme !== prev.theme) apply();
  });
}
