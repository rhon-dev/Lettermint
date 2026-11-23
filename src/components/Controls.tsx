import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getFontDef, WEIGHT_LABELS, type Weight } from '../fonts/registry';
import { meetsAA } from '../lib/color';
import { craftControls, nextBlobSeed, worstContrast } from '../lib/controls';
import { SHAPE_LABELS } from '../lib/shapes';
import { pickState, useLogoStore, LIMITS, type Fill, type LetterStyle } from '../store/logo';
import { useUiStore } from '../store/ui';
import { ColorField } from './ColorField';
import { FontPicker } from './FontPicker';
import { Icon } from './Icon';
import { PalettePicker } from './PalettePicker';
import { Segmented } from './Segmented';
import { ShapePicker } from './ShapePicker';
import { Slider } from './Slider';
import { Switch } from './Switch';

/** Inspector section: collapsed until asked for, so the first view stays about the mark. */
function Section({ title, summary, action, children }: { title: string; summary?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <details className="group border-b border-stone-200/80 last:border-b-0 dark:border-stone-800">
      <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-xs font-semibold tracking-widest text-stone-700 uppercase dark:text-stone-300">{title}</h2>
          {summary && <span className="truncate text-xs text-stone-600 dark:text-stone-400">{summary}</span>}
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="shrink-0 text-stone-500 transition-transform duration-150 group-open:rotate-180">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="space-y-4 pt-1 pb-6">
        {action && <div className="flex justify-end">{action}</div>}
        {children}
      </div>
    </details>
  );
}

function ContrastBadge() {
  // With gradients, the weakest stop pair decides legibility.
  const ratio = useLogoStore((s) => worstContrast(s));
  if (ratio === null) {
    return (
      <p className="text-xs text-stone-600 dark:text-stone-400">
        No background shape: check the letters against the backdrop where you use the mark.
      </p>
    );
  }
  const ok = meetsAA(ratio);
  return (
    <p className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
      <span
        aria-hidden="true"
        className={`grid h-4 w-4 place-items-center rounded-full text-white ${ok ? 'bg-mint-600' : 'bg-amber-500'}`}
      >
        {ok ? <Icon name="check" size={10} strokeWidth={3} /> : <span className="text-[10px] font-bold">!</span>}
      </span>
      <span>
        Contrast <span className="font-mono tabular-nums">{ratio.toFixed(2)}:1</span> —{' '}
        {ok ? 'passes WCAG AA' : 'below WCAG AA (4.5:1)'}
      </span>
    </p>
  );
}

function FillToggle() {
  const fill = useLogoStore((s) => s.fill);
  const setFill = useLogoStore((s) => s.setFill);
  return (
    <fieldset>
      <legend className="sr-only">Background fill</legend>
      <div className="chip grid grid-cols-2 gap-1 p-1">
        {(['solid', 'gradient'] as const).map((f) => (
          <label key={f} className="cursor-pointer">
            <input
              type="radio"
              name="fill"
              value={f}
              checked={fill === f}
              onChange={() => setFill(f)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center gap-2 rounded-[0.7rem] text-sm text-stone-600 capitalize transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mint-500 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
              <span
                aria-hidden="true"
                className={`h-3.5 w-3.5 rounded-full ${f === 'solid' ? 'bg-current' : 'bg-gradient-to-br from-mint-500 to-iris-500'}`}
              />
              {f}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const dot = (gradient: boolean) => (
  <span
    aria-hidden="true"
    className={`h-3.5 w-3.5 rounded-full ${gradient ? 'bg-gradient-to-br from-mint-500 to-iris-500' : 'bg-current'}`}
  />
);

const signed = (unit: string) => (n: number) => `${n > 0 ? '+' : ''}${n}${unit}`;

export function Controls() {
  const state = useLogoStore(useShallow(pickState));
  const apply = useLogoStore((s) => s.apply);
  const c = craftControls(state);
  const bgColor = useLogoStore((s) => s.bgColor);
  const bgColor2 = useLogoStore((s) => s.bgColor2);
  const fill = useLogoStore((s) => s.fill);
  const gradientAngle = useLogoStore((s) => s.gradientAngle);
  const fgColor = useLogoStore((s) => s.fgColor);
  const size = useLogoStore((s) => s.size);
  const scale = useLogoStore((s) => s.scale);
  const spacing = useLogoStore((s) => s.spacing);
  const setBgColor = useLogoStore((s) => s.setBgColor);
  const setBgColor2 = useLogoStore((s) => s.setBgColor2);
  const setGradientAngle = useLogoStore((s) => s.setGradientAngle);
  const setFgColor = useLogoStore((s) => s.setFgColor);
  const setSize = useLogoStore((s) => s.setSize);
  const setScale = useLogoStore((s) => s.setScale);
  const setSpacing = useLogoStore((s) => s.setSpacing);
  const swapColors = useLogoStore((s) => s.swapColors);
  const reset = useLogoStore((s) => s.reset);
  const notify = useUiStore((s) => s.notify);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-1">
        <h2 className="text-sm font-semibold">Details</h2>
        <button
          type="button"
          className="btn focus-ring -mr-2 text-xs text-stone-600 dark:text-stone-400"
          onClick={() => {
            reset();
            notify('Reset to the starting mark. Undo with ⌘/Ctrl+Z');
          }}
        >
          <Icon name="reset" size={14} /> Reset all
        </button>
      </div>
      <Section title="Shape" summary={SHAPE_LABELS[state.shape]}>
        <ShapePicker />
        {c.showRadius && (
          <Slider
            label="Corner radius"
            value={state.radius}
            {...LIMITS.radius}
            onChange={(radius) => apply({ radius })}
            format={(n) => `${n}%`}
            hint="Percent of the side. 50% is a circle."
          />
        )}
        {c.showSeed && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              Blob outline <span className="font-mono text-xs text-stone-600 tabular-nums dark:text-stone-400">#{state.blobSeed}</span>
            </p>
            <button
              type="button"
              className="btn chip focus-ring"
              onClick={() => apply({ blobSeed: nextBlobSeed(state.blobSeed) })}
            >
              <Icon name="shuffle" size={18} /> New blob
            </button>
          </div>
        )}
        <Switch
          label="Inner ring"
          checked={state.ring && c.ringAvailable}
          disabled={!c.ringAvailable}
          onChange={(ring) => apply({ ring })}
          hint={c.ringAvailable ? 'A border inside the shape, in the letter color.' : 'Needs a background shape.'}
        />
      </Section>
      <Section title="Typeface" summary={`${getFontDef(state.fontId).family} · ${state.weight}`}>
        <FontPicker />
        <Segmented<Weight>
          legend="Weight"
          name="weight"
          showLegend
          value={state.weight}
          onChange={(weight) => apply({ weight })}
          options={c.weights.map((w) => ({
            value: w.value,
            label: <span className="font-mono tabular-nums">{w.value}</span>,
            disabled: !w.available,
            title: w.available ? WEIGHT_LABELS[w.value] : `${WEIGHT_LABELS[w.value]}: not available in this typeface`,
          }))}
        />
        {c.weightFallback !== null && (
          <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
            This typeface has no {state.weight} weight. Showing {c.weightFallback} instead.
          </p>
        )}
      </Section>
      <Section title="Letters">
        <Segmented<LetterStyle>
          legend="Letter style"
          name="letter-style"
          value={state.letterStyle}
          onChange={(letterStyle) => apply({ letterStyle })}
          options={[
            { value: 'fill', label: 'Filled' },
            { value: 'outline', label: 'Outline' },
          ]}
        />
        {c.showStroke && (
          <Slider
            label="Outline width"
            value={state.stroke}
            {...LIMITS.stroke}
            onChange={(stroke) => apply({ stroke })}
            format={(n) => `${(n / 10).toFixed(1)}%`}
            hint="Percent of the canvas. Letters shrink if needed so the outline stays inside the shape."
          />
        )}
        <Segmented<Fill>
          legend="Letter fill"
          name="letter-fill"
          value={state.fgFill}
          onChange={(fgFill) => apply({ fgFill })}
          options={[
            { value: 'solid', label: <>{dot(false)} Solid</> },
            { value: 'gradient', label: <>{dot(true)} Gradient</> },
          ]}
        />
        {c.showLetterEnd && (
          <ColorField id="fg2" label="Letter gradient end" value={state.fgColor2} onChange={(fgColor2) => apply({ fgColor2 })} />
        )}
      </Section>
      <Section
        title="Colors"
        action={
          <button
            type="button"
            className="btn focus-ring -mr-2 text-xs text-stone-600 dark:text-stone-400"
            onClick={swapColors}
            aria-label="Swap background and letter colors"
          >
            <Icon name="swap" size={14} /> Swap
          </button>
        }
      >
        <PalettePicker />
        <FillToggle />
        <div className="grid grid-cols-2 gap-4">
          <ColorField id="bg" label={fill === 'gradient' ? 'Start' : 'Background'} value={bgColor} onChange={setBgColor} />
          {fill === 'gradient' ? (
            <ColorField id="bg2" label="End" value={bgColor2} onChange={setBgColor2} />
          ) : (
            <ColorField id="fg" label={c.showLetterEnd ? 'Letters start' : 'Letters'} value={fgColor} onChange={setFgColor} />
          )}
        </div>
        {fill === 'gradient' && (
          <ColorField id="fg" label={c.showLetterEnd ? 'Letters start' : 'Letters'} value={fgColor} onChange={setFgColor} />
        )}
        {(fill === 'gradient' || c.showLetterEnd) && (
          <Slider
            label="Gradient angle"
            value={gradientAngle}
            {...LIMITS.gradientAngle}
            onChange={setGradientAngle}
            format={(n) => `${n}°`}
            hint={fill === 'gradient' && c.showLetterEnd ? 'Shared by the background and letter gradients.' : undefined}
          />
        )}
        <ContrastBadge />
      </Section>
      <Section title="Size">
        <Slider label="Canvas size" value={size} {...LIMITS.size} onChange={setSize} format={(n) => `${n} px`} />
        <Slider
          label="Letter scale"
          value={scale}
          {...LIMITS.scale}
          onChange={setScale}
          format={(n) => `${n}%`}
          hint="Height of the letters relative to the canvas. Capped so letters never leave the shape."
        />
      </Section>
      {c.pair && (
      <Section
        title="Monogram"
        summary={state.layout === 'stack' ? 'Stacked' : 'In a row'}
        action={
          state.rotate1 !== 0 || state.rotate2 !== 0 ? (
            <button
              type="button"
              className="btn focus-ring -mr-2 text-xs text-stone-600 dark:text-stone-400"
              onClick={() => apply({ rotate1: 0, rotate2: 0 })}
            >
              <Icon name="reset" size={14} /> Straighten
            </button>
          ) : undefined
        }
      >
        <Slider
          label="Letter spacing"
          value={spacing}
          {...LIMITS.spacing}
          onChange={setSpacing}
          format={signed('%')}
          hint={state.layout === 'stack' ? 'Gap between the stacked letters.' : 'Space between the two characters. Negative values overlap them.'}
        />
        <Slider
          label="Overlap gap"
          value={state.knockout}
          {...LIMITS.knockout}
          onChange={(knockout) => apply({ knockout })}
          format={(n) => (n === 0 ? 'Off' : `${(n / 10).toFixed(1)}%`)}
          hint="Cuts a gap into the first letter where the second crosses it, so overlapping letters stay readable."
        />
        <Slider
          label="First letter rotation"
          value={state.rotate1}
          {...LIMITS.rotate1}
          onChange={(rotate1) => apply({ rotate1 })}
          format={signed('°')}
        />
        <Slider
          label="Second letter rotation"
          value={state.rotate2}
          {...LIMITS.rotate2}
          onChange={(rotate2) => apply({ rotate2 })}
          format={signed('°')}
        />
        <Slider
          label="Second letter shift"
          value={state.shift}
          {...LIMITS.shift}
          onChange={(shift) => apply({ shift })}
          format={signed('%')}
          hint="Moves the second letter up (+) or down (−) before fitting, in percent of the font size."
        />
      </Section>
      )}
    </div>
  );
}
