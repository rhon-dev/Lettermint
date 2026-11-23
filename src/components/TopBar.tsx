import { shareUrl, undo, redo, useHistoryStore } from '../store/persistence';
import { copyText } from '../lib/exporter';
import { useUiStore, type Theme } from '../store/ui';
import { Icon, type IconName } from './Icon';

const THEMES: { id: Theme; icon: IconName; label: string }[] = [
  { id: 'light', icon: 'sun', label: 'Light theme' },
  { id: 'dark', icon: 'moon', label: 'Dark theme' },
  { id: 'system', icon: 'monitor', label: 'System theme' },
];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="20" fill="#047857" />
      <path d="M17 20h6v19h10v5H17zM35 44V20h6l5 12 5-12h6v24h-5V30l-4 10h-4l-4-10v14z" fill="#fff" />
    </svg>
  );
}

export function TopBar({ compact = false }: { compact?: boolean }) {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const notify = useUiStore((s) => s.notify);
  const shuffle = useUiStore((s) => s.shuffle);
  const nextTheme = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length] ?? THEMES[0]!;
  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[2]!;

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
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <BrandMark />
        <div className="min-w-0">
          <h1 className="truncate max-[420px]:sr-only font-display text-lg leading-tight font-bold tracking-tight">Lettermint</h1>
          {!compact && (
            <p className="truncate text-xs text-stone-600 dark:text-stone-400">Monogram studio · runs in your browser</p>
          )}
        </div>
      </div>

      <nav aria-label="Editor actions" className="flex items-center gap-0.5">
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
            <button type="button" className="btn focus-ring" onClick={shuffle} aria-label="Shuffle variations" title="Shuffle variations (R)">
              <Icon name="shuffle" />
            </button>
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
          title="Export (E)"
          aria-keyshortcuts="E"
        >
          <Icon name="download" size={18} />
          Export
        </button>
      </nav>
    </header>
  );
}
