import { shareUrl, undo, redo, useHistoryStore } from '../store/persistence';
import { copyText } from '../lib/exporter';
import { useLogoStore } from '../store/logo';
import { useUiStore, type Theme } from '../store/ui';
import { Icon, type IconName } from './Icon';
import { Wordmark } from './Wordmark';

const THEMES: { id: Theme; icon: IconName; label: string }[] = [
  { id: 'light', icon: 'sun', label: 'Light theme' },
  { id: 'dark', icon: 'moon', label: 'Dark theme' },
  { id: 'system', icon: 'monitor', label: 'System theme' },
];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';

export function TopBar({ compact = false }: { compact?: boolean }) {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const notify = useUiStore((s) => s.notify);
  const setInitials = useUiStore((s) => s.setInitials);
  const backToStyles = useUiStore((s) => s.backToStyles);
  const nextTheme = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length] ?? THEMES[0]!;
  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[2]!;

  const onBack = () => {
    // The gallery shows the initials as edited here; the URL drops the mark so a reload starts fresh.
    const text = useLogoStore.getState().text;
    if (text) setInitials(text);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    backToStyles();
  };

  const onShare = async () => {
    try {
      await copyText(shareUrl());
      notify('Share link copied');
    } catch {
      notify("Couldn't copy: clipboard access is blocked. Copy the address bar URL instead.");
    }
  };

  return (
    <header className={`flex items-center gap-2 ${compact ? '' : 'px-1'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
        <button type="button" className="btn focus-ring -ml-2 shrink-0 px-2 sm:px-3" onClick={onBack}>
          <Icon name="left" size={18} />
          Styles
        </button>
        <span className="min-w-0 max-[420px]:sr-only">
          <Wordmark as="h1" />
        </span>
      </div>

      <nav aria-label="Editor actions" className="flex items-center gap-0.5 [@media(pointer:coarse)]:gap-2">
        <button
          type="button"
          className="btn focus-ring"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          title={`Undo (${MOD}Z)`}
          aria-keyshortcuts={IS_MAC ? 'Meta+Z' : 'Control+Z'}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="btn focus-ring"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          title={`Redo (${MOD}⇧Z)`}
          aria-keyshortcuts={IS_MAC ? 'Meta+Shift+Z' : 'Control+Shift+Z'}
        >
          <Icon name="redo" />
        </button>
        {!compact && (
          <>
            <button type="button" className="btn focus-ring" onClick={onShare} aria-label="Copy share link" title="Copy share link">
              <Icon name="link" />
            </button>
          </>
        )}
        <button
          type="button"
          className="btn focus-ring"
          onClick={() => setTheme(nextTheme.id)}
          aria-label={`${currentTheme.label}. Switch to ${nextTheme.label.toLowerCase()}`}
          title={`${currentTheme.label} — click for ${nextTheme.label.toLowerCase()}`}
        >
          <Icon name={currentTheme.icon} />
        </button>
        {!compact && <span aria-hidden="true" className="mx-1 h-6 w-px bg-stone-300 dark:bg-stone-700" />}
        <button
          type="button"
          className={`btn btn-primary focus-ring ${compact ? 'ml-1 px-3' : 'px-4'}`}
          onClick={() => setExportOpen(true)}
          title="Download (E)"
          aria-keyshortcuts="E"
        >
          <Icon name="download" size={18} />
          Download
        </button>
      </nav>
    </header>
  );
}
