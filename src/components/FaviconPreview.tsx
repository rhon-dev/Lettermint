import { useEffect, useRef, useState } from 'react';
import type { LogoGeometry } from '../lib/buildLogo';
import { svgToPng } from '../lib/exporter';
import { logoSvgString, type Paint } from '../lib/svg';

/**
 * The real 16 px favicon: the exported SVG rasterised to a 16×16 PNG, exactly as the brand kit's
 * favicon-16.png, shown at 16 CSS px in a light and a dark browser tab.
 */
export function FaviconPreview({
  paint,
  geo,
  title,
  compact = false,
  className = '',
}: {
  paint: Paint;
  geo: LogoGeometry;
  title: string;
  compact?: boolean;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const empty = geo.placeholder || !geo.glyphPath;

  useEffect(() => {
    if (empty) return;
    let live = true;
    // Debounced so a drag stays smooth; the tab icon catches up a moment after the pointer stops.
    const timer = setTimeout(() => {
      svgToPng(logoSvgString(paint, geo, title), 16).then(
        (blob) => {
          if (!live) return;
          const next = URL.createObjectURL(blob);
          if (current.current) URL.revokeObjectURL(current.current);
          current.current = next;
          setUrl(next);
        },
        () => {
          // Rasterising failed (rare); the previous favicon stays visible.
        },
      );
    }, 120);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [paint, geo, title, empty]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    [],
  );

  const icon = url && !empty ? <img src={url} width={16} height={16} alt="" className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-sm bg-stone-300/70 dark:bg-stone-600/70" />;
  return (
    <figure className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-2 shadow-sm ring-1 ring-stone-200">
        {icon}
        {!compact && <span className="text-xs text-stone-700">Light tab</span>}
      </span>
      <span className="flex h-8 items-center gap-1.5 rounded-lg bg-stone-800 px-2 ring-1 ring-stone-700">
        {icon}
        {!compact && <span className="text-xs text-stone-200">Dark tab</span>}
      </span>
      <figcaption className="text-xs whitespace-nowrap text-stone-600 dark:text-stone-400">{compact ? '16 px' : 'Favicon · actual 16 px'}</figcaption>
    </figure>
  );
}
