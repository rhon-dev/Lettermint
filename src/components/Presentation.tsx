import { useMemo } from 'react';
import { getFontDef } from '../fonts/registry';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { encodeState } from '../lib/share';
import { displayText } from '../lib/sanitize';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { pickState, useLogoStore } from '../store/logo';
import { useUiStore } from '../store/ui';
import { FaviconPreview } from './FaviconPreview';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';

/** Presentation link view: the finished mark with a small portfolio masthead and one way in to edit it. */
export function Presentation() {
  const { state, font, font2, fontReady, fontFailed, wantedFamily } = useCurrentMark();
  const setPresenting = useUiStore((s) => s.setPresenting);
  const geo = useMemo(() => buildLogo(state, font, font2), [state, font, font2]);
  const initials = displayText(state.text, state.uppercase);
  const name = state.brandName.trim();
  const title = describeLogo(state, wantedFamily);

  const remix = () => {
    // Same composition, now as an ordinary edit link.
    window.history.replaceState(null, '', `#${encodeState(pickState(useLogoStore.getState()))}`);
    setPresenting(false);
    useUiStore.setState({ view: 'editor' });
  };

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-5 sm:gap-8 sm:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-300 pb-6 dark:border-stone-700">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-stone-600 uppercase dark:text-stone-400">Monogram</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{name || initials || 'Untitled'}</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {initials ? `“${initials}” ` : ''}set in {wantedFamily} {state.weight}
            {Array.from(initials).length === 2 && (state.fontId2 !== state.fontId || state.weight2 !== state.weight)
              ? ` and ${getFontDef(state.fontId2).family} ${state.weight2}`
              : ''}
            {state.layout === 'stack' ? ', stacked' : state.knockout > 0 ? ', overlapping' : ''}.
          </p>
        </div>
        <button type="button" className="btn btn-primary focus-ring px-5 text-base" onClick={remix}>
          <Icon name="pencil" size={18} /> Remix this mark
        </button>
      </header>

      <figure className="relative grid aspect-square max-h-[68dvh] w-full place-items-center self-center overflow-hidden rounded-[1.5rem] bg-stone-50 ring-1 ring-black/5 sm:aspect-[4/3] dark:ring-white/10">
        <LogoMark state={state} font={font} geometry={geo} label={title} className="h-[78%] w-[78%]" />
        {!fontReady && (
          <p role="status" className="absolute inset-x-0 bottom-4 text-center text-sm text-stone-600">
            {fontFailed ? `${wantedFamily} couldn't load. Check your connection and reload.` : `Loading ${wantedFamily}…`}
          </p>
        )}
      </figure>

      <section aria-label="At small sizes" className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <FaviconPreview paint={state} geo={geo} title={title} />
        <div className="flex items-end gap-3" aria-hidden="true">
          {[96, 48, 32].map((px) => (
            <span key={px} className="block rounded-xl bg-white p-2 ring-1 ring-stone-200">
              <span className="block" style={{ width: px, height: px }}>
                <LogoMark state={state} font={font} geometry={geo} className="block h-full w-full" />
              </span>
            </span>
          ))}
        </div>
      </section>

      <footer className="mt-auto text-xs text-stone-600 dark:text-stone-400">
        Made with Lettermint. Letters are converted to vector paths; typefaces are licensed under the SIL Open Font License.
      </footer>
    </main>
  );
}
