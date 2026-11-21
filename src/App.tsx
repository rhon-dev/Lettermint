import { useEffect } from 'react';
import { BottomSheet } from './components/BottomSheet';
import { Controls } from './components/Controls';
import { Preview } from './components/Preview';
import { useBottomSheet } from './hooks/useBottomSheet';
import { useMediaQuery, useViewportHeight } from './hooks/useMedia';
import { selectFont } from './lib/glyphs';
import { useLogoStore } from './store/logo';

function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className={compact ? 'flex items-baseline justify-between px-1' : 'space-y-1'}>
      <h1 className={`font-semibold tracking-tight ${compact ? 'text-xl' : 'text-3xl'}`}>Lettermint</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Minimal initials logos{compact ? '' : ' — free, no signup, runs in your browser'}
      </p>
    </header>
  );
}

function Footer() {
  return (
    <p className="pt-6 text-xs text-stone-600 dark:text-stone-400">
      All typefaces are licensed under the SIL Open Font License.{' '}
      <a href="/licenses/fonts.md" className="focus-ring rounded underline underline-offset-2">
        Font licenses
      </a>
    </p>
  );
}

function DesktopLayout() {
  return (
    <main className="mx-auto flex h-full max-w-[1600px] gap-6 p-6">
      <div className="flex min-w-0 basis-[60%] flex-col gap-6">
        <Header />
        <Preview className="flex-1" />
      </div>
      <aside
        aria-label="Logo controls"
        className="min-w-0 basis-[40%] overflow-y-auto rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
      >
        <Controls />
        <Footer />
      </aside>
    </main>
  );
}

function MobileLayout() {
  const vh = useViewportHeight();
  const sheet = useBottomSheet(vh);
  return (
    <main>
      <div
        style={{ height: vh - sheet.height }}
        className={`fixed inset-x-0 top-0 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${
          sheet.dragging ? '' : 'transition-[height] duration-200 ease-out'
        }`}
      >
        <Header compact />
        <Preview className="flex-1" showSize={sheet.snap === 'peek'} />
      </div>
      <BottomSheet sheet={sheet} label="Logo controls">
        <Controls />
        <Footer />
      </BottomSheet>
    </main>
  );
}

export function App() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const fontId = useLogoStore((s) => s.fontId);

  useEffect(() => {
    selectFont(fontId);
  }, [fontId]);

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
}
