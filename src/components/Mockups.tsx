import { useDeferredValue, useMemo } from 'react';
import { buildLogo } from '../lib/buildLogo';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { LogoMark } from './LogoMark';

/** The current mark shown in the places it will actually live. */
export function Mockups() {
  const live = useCurrentMark();
  // Deferred like the gallery: the artboard updates first during a drag.
  const state = useDeferredValue(live.state);
  const font = live.font;
  const geo = useMemo(() => buildLogo(state, font), [state, font]);
  // App icons are masked by the OS, so they get the full-bleed square version.
  const iconState = useMemo(() => ({ ...state, shape: 'square' as const }), [state]);
  const iconGeo = useMemo(() => buildLogo(iconState, font), [iconState, font]);
  const mark = (className: string) => <LogoMark state={state} font={font} geometry={geo} className={className} />;

  return (
    <section aria-labelledby="mockups-title" className="space-y-3">
      <h2 id="mockups-title" className="text-sm font-semibold">
        In context
      </h2>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {/* Browser tab */}
        <li className="chip flex flex-col overflow-hidden">
          <div className="flex items-end gap-1 bg-stone-200/70 px-2 pt-2 dark:bg-stone-800">
            <div className="flex min-w-0 items-center gap-1.5 rounded-t-lg bg-white px-2 py-1.5 dark:bg-stone-900">
              {mark('h-4 w-4 shrink-0')}
              <span className="truncate text-[11px] text-stone-700 dark:text-stone-300">Your brand</span>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 bg-white p-2 dark:bg-stone-900">
            <span className="h-2 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
          </div>
          <p className="px-2 py-1.5 text-[11px] text-stone-600 dark:text-stone-400">Favicon · 16px</p>
        </li>

        {/* iOS home screen */}
        <li className="chip flex flex-col overflow-hidden">
          <div className="grid flex-1 grid-cols-3 place-items-center gap-2 bg-gradient-to-br from-iris-500/70 to-mint-600/70 p-3">
            <span className="h-9 w-9 rounded-[0.6rem] bg-white/25" />
            <span className="flex flex-col items-center gap-0.5">
              <span className="h-11 w-11 overflow-hidden rounded-[0.7rem] shadow-md"><LogoMark state={iconState} font={font} geometry={iconGeo} className="h-full w-full" /></span>
              <span className="text-[9px] font-medium text-white">Brand</span>
            </span>
            <span className="h-9 w-9 rounded-[0.6rem] bg-white/25" />
          </div>
          <p className="px-2 py-1.5 text-[11px] text-stone-600 dark:text-stone-400">App icon</p>
        </li>

        {/* Social avatar */}
        <li className="chip flex flex-col overflow-hidden">
          <div className="flex flex-1 items-center gap-2 bg-white p-3 dark:bg-stone-900">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-stone-900">
              {mark('h-full w-full')}
            </span>
            <span className="min-w-0 space-y-1">
              <span className="block truncate text-xs font-semibold">Your Name</span>
              <span className="block h-1.5 w-14 rounded-full bg-stone-200 dark:bg-stone-700" />
            </span>
          </div>
          <p className="px-2 py-1.5 text-[11px] text-stone-600 dark:text-stone-400">Social avatar</p>
        </li>

        {/* Light vs dark */}
        <li className="chip flex flex-col overflow-hidden">
          <div className="grid flex-1 grid-cols-2">
            <span className="grid place-items-center bg-white p-3">{mark('h-10 w-10')}</span>
            <span className="grid place-items-center bg-stone-950 p-3">{mark('h-10 w-10')}</span>
          </div>
          <p className="px-2 py-1.5 text-[11px] text-stone-600 dark:text-stone-400">Light &amp; dark</p>
        </li>
      </ul>
    </section>
  );
}
