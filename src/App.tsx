import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { BottomSheet } from './components/BottomSheet';
import { Compose } from './components/Compose';
import { Controls } from './components/Controls';
import { Mockups } from './components/Mockups';
import { Presentation } from './components/Presentation';
import { Preview } from './components/Preview';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { Variations } from './components/Variations';
import { useBottomSheet } from './hooks/useBottomSheet';
import { useMediaQuery, useViewportHeight } from './hooks/useMedia';
import { useShortcuts } from './hooks/useShortcuts';
import { selectFont } from './lib/glyphs';
import { DISCLAIMER } from './lib/site';
import { useLogoStore } from './store/logo';
import { useUiStore } from './store/ui';

// Export code (dialog, brand kit, ZIP writer) loads on first open, not with the editor.
const ExportDialog = lazy(
  (): Promise<{ default: ComponentType }> =>
    import('./components/ExportDialog').then(
      (m) => ({ default: m.ExportDialog }),
      () => {
        // Offline before the chunk was cached: keep the editor alive and explain.
        useUiStore.getState().setExportOpen(false);
        useUiStore.getState().notify("Export couldn't load. Check your connection and reload the page.");
        return { default: () => null };
      },
    ),
);

function Footer() {
  return (
    <footer className="pt-6 text-xs text-stone-600 dark:text-stone-400">
      All typefaces are licensed under the SIL Open Font License.{' '}
      <a href="/licenses/fonts.md" className="focus-ring rounded underline underline-offset-2">
        Font licenses
      </a>
      <span className="mt-1 block">
        Shortcuts: <kbd className="font-mono">R</kbd> shuffle · <kbd className="font-mono">E</kbd> export ·{' '}
        <kbd className="font-mono">⌘/Ctrl Z</kbd> undo · arrow keys move the selected letter
      </span>
      <span className="mt-1 block">{DISCLAIMER}</span>
    </footer>
  );
}

function DesktopLayout() {
  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3 p-4 xl:px-6">
      <TopBar />
      {/* Controls come first in the DOM (and tab order) but sit on the right; the mark takes most of the view. */}
      <main className="flex min-h-0 flex-1 flex-row-reverse gap-4 xl:gap-6">
        <aside aria-label="Logo controls" className="surface w-[22rem] shrink-0 overflow-y-auto p-5 xl:w-[24rem]">
          <Compose />
          <div className="mt-6 border-t border-stone-200/80 pt-4 dark:border-stone-800">
            <Controls />
          </div>
          <Footer />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto">
          <Preview className="h-[calc(100dvh-6.5rem)] min-h-[26rem] shrink-0" />
          <div className="surface space-y-6 p-5">
            <Variations />
            <Mockups />
          </div>
        </div>
      </main>
    </div>
  );
}

function MobileLayout() {
  const vh = useViewportHeight();
  const sheet = useBottomSheet(vh);
  return (
    <>
      <div
        style={{ height: vh - sheet.height }}
        className={`fixed inset-x-0 top-0 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${
          sheet.dragging ? '' : 'transition-[height] duration-200 ease-out'
        }`}
      >
        <TopBar compact />
        <Preview className="flex-1" compact showSize={false} />
      </div>
      <BottomSheet sheet={sheet} label="Logo controls">
        <main>
          {/* Initials and composition come before variations; the artwork stays visible above. */}
          <div className="pb-6">
            <Compose />
          </div>
          <div className="border-t border-stone-200/80 py-6 dark:border-stone-800">
            <Variations compact />
          </div>
          <Controls />
          <div className="border-t border-stone-200/80 pt-6 dark:border-stone-800">
            <Mockups />
          </div>
          <Footer />
        </main>
      </BottomSheet>
    </>
  );
}

export function App() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const fontId = useLogoStore((s) => s.fontId);
  const weight = useLogoStore((s) => s.weight);
  const exportOpen = useUiStore((s) => s.exportOpen);
  const presenting = useUiStore((s) => s.presenting);
  const notify = useUiStore((s) => s.notify);
  const [exportLoaded, setExportLoaded] = useState(false);
  if (exportOpen && !exportLoaded) setExportLoaded(true);
  useShortcuts();

  useEffect(() => {
    void selectFont(fontId, weight).then((font) => {
      if (!font) notify("This font couldn't load. Check your connection and try again.");
    });
  }, [fontId, weight, notify]);

  return (
    <>
      <a
        href="#initials"
        onClick={(e) => {
          // Focus without touching the URL hash, which holds the share state.
          e.preventDefault();
          document.getElementById('initials')?.focus();
        }}
        className="focus-ring sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-stone-900"
      >
        Skip to editor
      </a>
      {presenting ? <Presentation /> : isDesktop ? <DesktopLayout /> : <MobileLayout />}
      {exportLoaded && (
        <Suspense fallback={null}>
          <ExportDialog />
        </Suspense>
      )}
      <Toast />
    </>
  );
}
