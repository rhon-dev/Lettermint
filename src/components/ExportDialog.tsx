import { useEffect, useMemo, useRef, useState } from 'react';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { copyText, downloadBlob, fileStem, svgBlob, svgToPng } from '../lib/exporter';
import { displayText } from '../lib/sanitize';
import { logoSvgString } from '../lib/svg';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { shareUrl } from '../store/persistence';
import { useUiStore } from '../store/ui';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';

const PNG_SIZES = [64, 180, 512, 1024, 2048] as const;
type Format = 'svg' | 'png';

export function ExportDialog() {
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const notify = useUiStore((s) => s.notify);
  const ref = useRef<HTMLDialogElement>(null);
  const { state, font, family } = useCurrentMark();
  const [format, setFormat] = useState<Format>('png');
  const [px, setPx] = useState<number>(1024);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const geo = useMemo(() => buildLogo(state, font), [state, font]);
  const ready = font !== null && !geo.placeholder;
  const svg = () => logoSvgString(state, geo, describeLogo(state, family));
  const stem = fileStem(displayText(state.text, state.uppercase), state.shape);

  const onDownload = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      if (format === 'svg') {
        downloadBlob(svgBlob(svg()), `${stem}.svg`);
        notify('SVG downloaded');
      } else {
        downloadBlob(await svgToPng(svg(), px), `${stem}-${px}.png`);
        notify(`PNG ${px}×${px} downloaded`);
      }
    } catch {
      notify('Export failed — please try again');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async (what: 'svg' | 'link') => {
    try {
      await copyText(what === 'svg' ? svg() : shareUrl());
      notify(what === 'svg' ? 'SVG code copied' : 'Share link copied');
    } catch {
      notify('Clipboard is unavailable in this browser');
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
      className="surface m-auto w-[min(28rem,calc(100vw-2rem))] p-0 text-stone-900 open:motion-safe:animate-pop-in dark:text-stone-100"
    >
      <div className="space-y-5 p-5 sm:p-6">
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

        <div className="checkerboard mx-auto grid aspect-square w-32 place-items-center rounded-2xl p-3">
          <LogoMark state={state} font={font} geometry={geo} className="h-full w-full" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Format</legend>
          <div className="chip grid grid-cols-2 gap-1 p-1">
            {(['png', 'svg'] as const).map((f) => (
              <label key={f} className="cursor-pointer">
                <input
                  type="radio"
                  name="export-format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 flex-col items-center justify-center rounded-[0.7rem] text-sm text-stone-600 transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mint-500 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
                  <span className="font-semibold uppercase">{f}</span>
                  <span className="text-xs">{f === 'svg' ? 'Scales infinitely' : 'Works everywhere'}</span>
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
                  <span className="chip flex min-h-11 items-center px-3.5 font-mono text-sm tabular-nums transition-colors duration-150 peer-checked:bg-mint-600 peer-checked:text-white peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint-500">
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

        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary focus-ring w-full text-base"
            disabled={!ready || busy}
            aria-busy={busy}
            onClick={onDownload}
          >
            <Icon name="download" />
            {busy ? 'Preparing…' : `Download ${format.toUpperCase()}`}
          </button>
          {!ready && (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400">
              Type at least one character to export.
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
      </div>
    </dialog>
  );
}
