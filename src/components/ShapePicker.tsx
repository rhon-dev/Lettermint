import { SHAPES, SHAPE_LABELS, shapePath } from '../lib/shapes';
import { useLogoStore } from '../store/logo';

export function ShapePicker() {
  const shape = useLogoStore((s) => s.shape);
  const radius = useLogoStore((s) => s.radius);
  const seed = useLogoStore((s) => s.blobSeed);
  const setShape = useLogoStore((s) => s.setShape);

  return (
    <fieldset>
      <legend className="sr-only">Shape</legend>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 ring-1 ring-stone-200 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 dark:bg-stone-800 dark:ring-stone-700">
        {SHAPES.map((s) => (
          <label key={s} className="cursor-pointer">
            <input
              type="radio"
              name="shape"
              value={s}
              checked={shape === s}
              onChange={() => setShape(s)}
              className="peer sr-only"
            />
            <span className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-xs text-stone-600 transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 hover:text-stone-900 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100 dark:hover:text-stone-100">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="fill-current">
                {s === 'none' ? (
                  <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" />
                ) : (
                  <path d={shapePath(s, 24, { radius, seed })} />
                )}
              </svg>
              {SHAPE_LABELS[s]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
