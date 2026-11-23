import { create } from 'zustand';
import type { StyleFilter } from '../lib/designs';
import { sanitizeText } from '../lib/sanitize';
import { isPresentationHash } from '../lib/share';
import type { LogoState } from './logo';

/** Opening screen, the styles gallery, or the editor (share links open straight into the editor). */
export type View = 'home' | 'gallery' | 'editor';

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
  view: View;
  /** Initials the visitor is exploring (sanitized; the logo store keeps the edited mark). */
  initials: string;
  filter: StyleFilter;
  /** Window scroll of the gallery when a design was opened, restored on the way back. */
  galleryScroll: number;
  /** The design last opened from the gallery, focused again on return. */
  lastDesign: string | null;
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
  setInitials: (raw: string) => void;
  explore: () => void;
  setFilter: (f: StyleFilter) => void;
  openEditor: (designId: string, scroll: number) => void;
  backToStyles: () => void;
  goHome: () => void;
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
  // A link with a mark in it opens the editor; a plain visit starts on the opening screen.
  view: typeof location !== 'undefined' && location.hash.replace(/^#/, '') !== '' ? 'editor' : 'home',
  initials: '',
  filter: 'all',
  galleryScroll: 0,
  lastDesign: null,
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
  setInitials: (raw) => set({ initials: sanitizeText(raw) }),
  explore: () => set({ view: 'gallery', galleryScroll: 0 }),
  setFilter: (filter) => set({ filter }),
  openEditor: (lastDesign, galleryScroll) => set({ view: 'editor', lastDesign, galleryScroll }),
  backToStyles: () => set({ view: 'gallery' }),
  goHome: () => set({ view: 'home' }),
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
