import { PALETTES } from '../lib/palettes';
import { useLogoStore } from '../store/logo';

export function PalettePicker() {
  const bg = useLogoStore((s) => s.bgColor);
  const fg = useLogoStore((s) => s.fgColor);
  const fill = useLogoStore((s) => s.fill);
  const apply = useLogoStore((s) => s.apply);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Presets</legend>
      <div className="grid grid-cols-6 gap-2">
        {PALETTES.map((p) => {
          const active = p.bg === bg && p.fg === fg;
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={active}
              aria-label={`${p.name} palette`}
              title={p.name}
              onClick={() => apply({ bgColor: p.bg, bgColor2: p.bg2, fgColor: p.fg })}
              className={`focus-ring relative grid aspect-square min-h-11 cursor-pointer place-items-center rounded-xl text-sm font-bold ring-1 ring-black/10 transition-transform duration-150 hover:scale-105 active:scale-95 dark:ring-white/15 ${
                active ? 'outline-2 outline-offset-2 outline-mint-500' : ''
              }`}
              style={{
                background: fill === 'gradient' ? `linear-gradient(135deg, ${p.bg}, ${p.bg2})` : p.bg,
                color: p.fg,
              }}
            >
              <span aria-hidden="true">Aa</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
