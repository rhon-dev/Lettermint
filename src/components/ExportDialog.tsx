import { useEffect, useMemo, useRef, useState } from 'react';
import { brandPalette, buildLockup, inkColor, STEPS } from '../lib/brandkit';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { copyText, downloadBlob, fileStem, svgBlob, svgToPng } from '../lib/exporter';
import { brandKitZip } from '../lib/kitZip';
import { displayText, MAX_NAME, NAME_HINT } from '../lib/sanitize';
import { logoSvgString } from '../lib/svg';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { fontKey, useFontStore } from '../lib/glyphs';
import { shareUrl } from '../store/persistence';
import { useLogoStore } from '../store/logo';
import { useUiStore } from '../store/ui';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';

const PNG_SIZES = [64, 180, 512, 1024, 2048] as const;
type Format = 'svg' | 'png' | 'kit';

const FORMATS: readonly { value: Format; label: string; hint: string }[] = [
  { value: 'png', label: 'PNG', hint: 'Works everywhere' },
  { value: 'svg', label: 'SVG', hint: 'Scales infinitely' },
  { value: 'kit', label: 'Kit', hint: 'Icons + colours' },
];

const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

export function ExportDialog() {
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const notify = useUiStore((s) => s.notify);
  const ref = useRef<HTMLDialogElement>(null);
  const { state, font, family } = useCurrentMark();
  const [format, setFormat] = useState<Format>('png');
  const [px, setPx] = useState<number>(1024);
  const [busy, setBusy] = useState(false);
  const setBrandName = useLogoStore((s) => s.setBrandName);
  const toast = useUiStore((s) => s.toast);
  const fontFailed = useFontStore((s) => s.status[fontKey(state.fontId, state.weight)] === 'error');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const geo = useMemo(() => buildLogo(state, font), [state, font]);
  const ready = font !== null && !geo.placeholder;
  const svg = () => logoSvgString(state, geo, describeLogo(state, family));
  const name = state.brandName.trim();
  const stem = fileStem(displayText(state.text, state.uppercase), state.shape);
  const ink = inkColor(state);
  const palette = useMemo(() => brandPalette(ink), [ink]);
  const lockups = useMemo(
    () =>
      format === 'kit' && ready && font && name
        ? (['horizontal', 'stacked'] as const).map((l) => ({ layout: l, svg: buildLockup(state, geo, font, name, l).svg }))
        : [],
    [format, ready, font, name, state, geo],
  );

  const onDownload = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      if (format === 'kit' && font) {
        const title = describeLogo(state, family);
        downloadBlob(await brandKitZip({ paint: state, geo, font, name, title }), `${stem}-brand-kit.zip`);
        notify('Brand kit downloaded');
      } else if (format === 'svg') {
        downloadBlob(svgBlob(svg()), `${stem}.svg`);
        notify('SVG downloaded');
      } else {
        downloadBlob(await svgToPng(svg(), px), `${stem}-${px}.png`);
        notify(`PNG ${px}×${px} downloaded`);
      }
    } catch {
      notify('Export failed. Please try again, or pick a smaller PNG size.');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async (what: 'svg' | 'link') => {
    try {
      await copyText(what === 'svg' ? svg() : shareUrl());
      notify(what === 'svg' ? 'SVG code copied' : 'Share link copied');
    } catch {
      notify(
        what === 'svg'
          ? "Couldn't copy: clipboard access is blocked. Download the SVG instead."
          : "Couldn't copy: clipboard access is blocked. Copy the address bar URL instead.",
      );
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="export-title"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) dismisses.
        if (e.target === e.currentTarget) setOpen(false);
      }}
      className="surface m-auto max-h-[calc(100dvh-1rem)] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain p-0 text-stone-900 open:motion-safe:animate-pop-in dark:text-stone-100"
    >
      <div className="space-y-5 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="export-title" className="font-display text-xl font-bold tracking-tight">
              Export your mark
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">Vector or pixel-perfect PNG, ready to use.</p>
          </div>
          <button type="button" className="btn focus-ring -m-2" aria-label="Close export" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </header>

        <div className="checkerboard mx-auto grid aspect-square w-24 place-items-center sm:w-32 rounded-2xl p-3">
          <LogoMark state={state} font={font} geometry={geo} className="h-full w-full" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Format</legend>
          <div className="chip grid grid-cols-3 gap-1 p-1">
            {FORMATS.map((f) => (
              <label key={f.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="export-format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 flex-col items-center justify-center rounded-[0.7rem] text-sm text-stone-600 transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mint-500 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
                  <span className="font-semibold">{f.label}</span>
                  <span className="hidden text-xs sm:block">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {format === 'png' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Size</legend>
            <div className="flex flex-wrap gap-2">
              {PNG_SIZES.map((n) => (
                <label key={n} className="cursor-pointer">
                  <input
                    type="radio"
                    name="png-size"
                    checked={px === n}
                    onChange={() => setPx(n)}
                    className="peer sr-only"
                  />
                  <span className="chip flex min-h-11 items-center px-3.5 font-mono text-sm tabular-nums transition-colors duration-150 peer-checked:bg-mint-700 peer-checked:text-white peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint-500">
                    {n}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
              180 = Apple touch icon · 512 = app stores &amp; PWA
            </p>
          </fieldset>
        )}

        {format === 'kit' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="brand-name" className="block text-sm font-medium">
                Brand name
              </label>
              <input
                id="brand-name"
                type="text"
                value={state.brandName}
                maxLength={MAX_NAME * 2}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Lena Studio"
                aria-describedby="brand-name-hint"
                autoComplete="organization"
                className="focus-ring w-full rounded-xl bg-stone-100 px-4 py-2.5 text-base ring-1 ring-stone-200 placeholder:text-stone-500 dark:bg-stone-800 dark:ring-stone-700 dark:placeholder:text-stone-400"
              />
              <p id="brand-name-hint" className="text-xs text-stone-600 dark:text-stone-400">
                Optional. {NAME_HINT} Adds side-by-side and stacked lockups, and names the web manifest.
              </p>
            </div>

            {lockups.length > 0 && (
              <div className="grid grid-cols-[3fr_2fr] gap-2">
                {lockups.map((l) => (
                  <figure key={l.layout} className="space-y-1">
                    <div className="checkerboard flex h-24 items-center justify-center rounded-xl p-3">
                      <img
                        src={svgDataUri(l.svg)}
                        alt={`${name} ${l.layout === 'horizontal' ? 'side-by-side' : 'stacked'} lockup`}
                        className="max-h-full max-w-full"
                      />
                    </div>
                    <figcaption className="text-xs text-stone-600 dark:text-stone-400">
                      {l.layout === 'horizontal' ? 'Side by side' : 'Stacked'}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Palette</p>
              <ul className="flex overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-700" aria-label="Generated brand palette">
                {STEPS.map((step) => (
                  <li
                    key={step}
                    className="h-8 flex-1"
                    style={{ background: palette.scale[step] }}
                    title={`${step} ${palette.scale[step]}`}
                    aria-label={`${step}: ${palette.scale[step]}`}
                  />
                ))}
                <li
                  className="ml-1 h-8 w-10"
                  style={{ background: palette.complement }}
                  title={`Complement ${palette.complement}`}
                  aria-label={`Complement: ${palette.complement}`}
                />
              </ul>
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                ZIP with favicon.ico, PNG icons from 16 to 512 px, a 1200×630 OG image, site.webmanifest, palette.css and
                tailwind.config.js.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary focus-ring w-full text-base"
            disabled={!ready || busy}
            aria-busy={busy}
            onClick={onDownload}
          >
            <Icon name="download" />
            {busy ? 'Preparing…' : format === 'kit' ? 'Download brand kit' : `Download ${format.toUpperCase()}`}
          </button>
          {!ready && (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400">
              {geo.placeholder
                ? 'Type at least one character to export.'
                : fontFailed
                  ? "This font couldn't load. Check your connection, then pick the font again."
                  : 'Loading the font…'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn chip focus-ring" disabled={!ready} onClick={() => onCopy('svg')}>
              <Icon name="copy" size={18} /> Copy SVG
            </button>
            <button type="button" className="btn chip focus-ring" onClick={() => onCopy('link')}>
              <Icon name="link" size={18} /> Copy link
            </button>
          </div>
        </div>
        {/* The page behind a modal dialog is inert, so confirmations are announced (and shown) here. */}
        <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium text-stone-700 dark:text-stone-300">
          {toast?.message}
        </p>
      </div>
    </dialog>
  );
}
