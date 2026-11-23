import type { KeyboardEvent, MouseEvent } from 'react';
import { activeStarter, COMPOSITIONS, composeStarter, letterLabels, nudgeOffsets, offsetKeys, type Composition, type Direction } from '../lib/compose';
import { displayText } from '../lib/sanitize';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { applyAsOneStep } from '../store/persistence';
import { useLogoStore } from '../store/logo';
import { useUiStore } from '../store/ui';
import { Icon } from './Icon';
import { TextInput } from './TextInput';

const ARROWS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/** Tiny diagram of each starter, two blocks standing in for the letters. */
function StarterIcon({ id }: { id: Composition }) {
  const a = 'fill-current opacity-45';
  return (
    <svg viewBox="0 0 32 24" width="32" height="24" aria-hidden="true" className="shrink-0">
      {id === 'side' && (
        <>
          <rect x="3" y="5" width="11" height="14" rx="1.5" className={a} />
          <rect x="18" y="5" width="11" height="14" rx="1.5" className="fill-current" />
        </>
      )}
      {id === 'overlap' && (
        <>
          <rect x="5" y="7" width="12" height="14" rx="1.5" className={a} />
          <rect x="13" y="3" width="13" height="14" rx="1.5" className="fill-current stroke-white dark:stroke-stone-900" strokeWidth="2" />
        </>
      )}
      {id === 'stack' && (
        <>
          <rect x="11" y="1" width="10" height="10" rx="1.5" className={a} />
          <rect x="11" y="13" width="10" height="10" rx="1.5" className="fill-current" />
        </>
      )}
    </svg>
  );
}

const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n / 100).toFixed(1)}%`;

/** First view of the editor: the initials, three composition starters and letter positioning. */
export function Compose() {
  const { state, font, fontReady } = useCurrentMark();
  const apply = useLogoStore((s) => s.apply);
  const selected = useUiStore((s) => s.selected);
  const select = useUiStore((s) => s.select);
  const text = displayText(state.text, state.uppercase);
  const count = Array.from(text).length;
  const pair = count === 2;
  const sel = count === 1 ? 0 : selected;
  const labels = letterLabels(text);
  const active = pair && fontReady && font ? activeStarter(state, font, text) : null;
  const [kx, ky] = offsetKeys(sel);
  const moved = state[kx] !== 0 || state[ky] !== 0;

  // Read the store at event time so fast repeats never nudge from a stale render.
  const nudge = (dir: Direction, large: boolean) => apply(nudgeOffsets(useLogoStore.getState(), sel, dir, large));
  const onArrow = (e: KeyboardEvent) => {
    const dir = ARROWS[e.key];
    if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    nudge(dir, e.shiftKey);
  };
  const onPad = (dir: Direction) => (e: MouseEvent) => nudge(dir, e.shiftKey);

  const padButton = (dir: Direction, area: string) => (
    <button
      type="button"
      className={`btn chip focus-ring h-11 w-11 px-0 ${area}`}
      aria-label={`Move ${labels[sel] ?? 'letter'} ${dir}`}
      title={`Move ${dir} (arrow key; Shift for a bigger step)`}
      onClick={onPad(dir)}
      onKeyDown={onArrow}
    >
      <Icon name={dir} size={18} />
    </button>
  );

  return (
    <section aria-labelledby="compose-title" className="space-y-5">
      <h2 id="compose-title" className="sr-only">
        Compose
      </h2>
      <TextInput />

      {pair && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Composition</legend>
          <div className="grid grid-cols-3 gap-2">
            {COMPOSITIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={active === c.id}
                disabled={!fontReady || !font}
                title={!fontReady ? 'Waiting for the font…' : undefined}
                onClick={() => font && applyAsOneStep(composeStarter(c.id, font, text))}
                className={`btn focus-ring min-h-16 flex-col gap-1 rounded-xl px-2 text-xs ring-1 transition-[background-color,box-shadow] duration-150 ${
                  active === c.id
                    ? 'bg-mint-50 text-mint-800 ring-2 ring-mint-600 hover:!bg-mint-50 dark:bg-mint-900/40 dark:text-mint-200 dark:ring-mint-400 dark:hover:!bg-mint-900/40'
                    : 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700'
                }`}
              >
                <StarterIcon id={c.id} />
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Starters set spacing and positions from the measured letters. Colors and font stay as they are.
          </p>
        </fieldset>
      )}

      {count > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Position</legend>
          <div className="flex items-start gap-4">
            <div className="grid shrink-0 grid-cols-3 grid-rows-3 gap-0.5" role="group" aria-label="Move the selected letter">
              {padButton('up', 'col-start-2')}
              {padButton('left', 'col-start-1 row-start-2')}
              {padButton('right', 'col-start-3 row-start-2')}
              {padButton('down', 'col-start-2 row-start-3')}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div role="group" aria-label="Letter to move" className="grid grid-cols-2 gap-2">
                {labels.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={sel === i}
                    aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                    onClick={() => select(i as 0 | 1)}
                    onKeyDown={onArrow}
                    className={`btn focus-ring min-h-11 rounded-xl px-2 text-xs ring-1 ${count === 1 ? 'col-span-2' : ''} ${
                      sel === i
                        ? 'bg-stone-900 text-white ring-stone-900 hover:!bg-stone-900 dark:bg-white dark:text-stone-900 dark:ring-white dark:hover:!bg-white'
                        : 'bg-stone-100 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="font-mono text-xs text-stone-600 tabular-nums dark:text-stone-400" aria-live="polite">
                x {pct(state[kx])} · y {pct(state[ky])}
              </p>
              <button
                type="button"
                className="btn focus-ring -ml-2 min-h-11 text-xs text-stone-600 dark:text-stone-400"
                disabled={!moved}
                onClick={() => applyAsOneStep({ [kx]: 0, [ky]: 0 })}
              >
                <Icon name="reset" size={14} /> Reset position
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            Drag on the artboard, or select a letter and use the arrow keys. Shift moves 10× further.
          </p>
        </fieldset>
      )}
    </section>
  );
}
