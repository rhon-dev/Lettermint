import { create } from 'zustand';

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
  setTheme: (t: Theme) => void;
  setBackdrop: (b: Backdrop) => void;
  notify: (message: string) => void;
  setExportOpen: (open: boolean) => void;
  shuffle: () => void;
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
  backdrop: 'checker',
  toast: null,
  exportOpen: false,
  seed: Math.floor(Math.random() * 1e9),
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
