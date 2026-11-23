import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { availableWeights, getFontDef, nearestWeight, WEIGHTS, WEIGHT_LABELS, type FontId, type Weight } from '../fonts/registry';
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
          <h3 className="text-xs font-semibold tracking-widest text-stone-700 uppercase dark:text-stone-300">{title}</h3>
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

export type ControlGroup = 'typography' | 'arrangement' | 'color';

type Target = 'both' | 'first' | 'second';

/** Typeface and weight, for both letters or for one letter of a pair. */
function TypefaceControls() {
  const state = useLogoStore(useShallow(pickState));
  const apply = useLogoStore((s) => s.apply);
  const pair = craftControls(state).pair;
  const mixed = state.fontId !== state.fontId2 || state.weight !== state.weight2;
  const [target, setTarget] = useState<Target>(mixed ? 'first' : 'both');
  const t: Target = pair ? target : 'both';
  const second = t === 'second';
  const fontId = second ? state.fontId2 : state.fontId;
  const weight = second ? state.weight2 : state.weight;
  const shipped = availableWeights(fontId);
  const drawn = nearestWeight(fontId, weight);
  const setFont = (id: FontId) => apply(t === 'both' ? { fontId: id, fontId2: id, weight2: state.weight } : second ? { fontId2: id } : { fontId: id });
  const setWeight = (w: Weight) => apply(t === 'both' ? { weight: w, weight2: w } : second ? { weight2: w } : { weight: w });
  const label = (i: 0 | 1) => (t === 'both' ? 'Both letters' : `${i === 0 ? 'First' : 'Second'} letter`);

  return (
    <>
      {pair && (
        <Segmented<Target>
          legend="Apply typeface to"
          name="type-target"
          showLegend
          value={t}
          onChange={setTarget}
          options={[
            { value: 'both', label: 'Both' },
            { value: 'first', label: 'First' },
            { value: 'second', label: 'Second' },
          ]}
        />
      )}
      <FontPicker legend={`Typeface: ${label(second ? 1 : 0)}`} value={fontId} weight={weight} onSelect={setFont} />
      <Segmented<Weight>
        legend="Weight"
        name="weight"
        showLegend
        value={weight}
        onChange={setWeight}
        options={WEIGHTS.map((value) => ({
          value,
          label: <span className="font-mono tabular-nums">{value}</span>,
          disabled: !shipped.includes(value),
          title: shipped.includes(value) ? WEIGHT_LABELS[value] : `${WEIGHT_LABELS[value]}: not available in this typeface`,
        }))}
      />
      {drawn !== weight && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          This typeface has no {weight} weight. Showing {drawn} instead.
        </p>
      )}
    </>
  );
}

export function GroupHeading({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 pb-1 font-display text-lg font-semibold tracking-tight">{children}</h2>;
}

export function ResetAll() {
  const reset = useLogoStore((s) => s.reset);
  const notify = useUiStore((s) => s.notify);
  return (
    <button
      type="button"
      className="btn focus-ring -ml-2 text-xs text-stone-600 dark:text-stone-400"
      onClick={() => {
        reset();
        notify('Reset to the starting mark. Undo with ⌘/Ctrl+Z');
      }}
    >
      <Icon name="reset" size={14} /> Reset all
    </button>
  );
}

/** Inspector sections for one group: typography, arrangement or color. */
export function Controls({ group }: { group: ControlGroup }) {
  const state = useLogoStore(useShallow(pickState));
  const apply = useLogoStore((s) => s.apply);
  const c = craftControls(state);
  const { bgColor, bgColor2, fill, gradientAngle, fgColor, size, scale, spacing } = state;
  const setBgColor = useLogoStore((s) => s.setBgColor);
  const setBgColor2 = useLogoStore((s) => s.setBgColor2);
  const setGradientAngle = useLogoStore((s) => s.setGradientAngle);
  const setFgColor = useLogoStore((s) => s.setFgColor);
  const setSize = useLogoStore((s) => s.setSize);
  const setScale = useLogoStore((s) => s.setScale);
  const setSpacing = useLogoStore((s) => s.setSpacing);
  const swapColors = useLogoStore((s) => s.swapColors);
  const mixed = c.pair && (state.fontId !== state.fontId2 || state.weight !== state.weight2);

  if (group === 'typography') {
    return (
      <div>
        <Section
          title="Typeface"
          summary={`${getFontDef(state.fontId).family} ${state.weight}${mixed ? ` + ${getFontDef(state.fontId2).family} ${state.weight2}` : ''}`}
        >
          <TypefaceControls />
        </Section>
        <Section title="Letters" summary={state.letterStyle === 'outline' ? 'Outline' : 'Filled'}>
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
        </Section>
      </div>
    );
  }

  if (group === 'arrangement') {
    return (
      <div>
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
              label="Second letter size"
              value={state.scale2}
              {...LIMITS.scale2}
              onChange={(scale2) => apply({ scale2 })}
              format={(n) => `${n}%`}
              hint="Relative to the first letter."
            />
            <Segmented<'second' | 'first'>
              legend="Letter in front"
              name="layer"
              showLegend
              value={state.firstOnTop ? 'first' : 'second'}
              onChange={(v) => apply({ firstOnTop: v === 'first' })}
              options={[
                { value: 'first', label: 'First' },
                { value: 'second', label: 'Second' },
              ]}
            />
            <Slider
              label="Overlap gap"
              value={state.knockout}
              {...LIMITS.knockout}
              onChange={(knockout) => apply({ knockout })}
              format={(n) => (n === 0 ? 'Off' : `${(n / 10).toFixed(1)}%`)}
              hint="Cuts a gap into the back letter where the front one crosses it, so overlapping letters stay readable."
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
        <Section title="Size" summary={`${scale}% · ${size} px`}>
          <Slider
            label="Letter scale"
            value={scale}
            {...LIMITS.scale}
            onChange={setScale}
            format={(n) => `${n}%`}
            hint="Height of the letters relative to the canvas. Capped so letters never leave the shape."
          />
          <Slider label="Canvas size" value={size} {...LIMITS.size} onChange={setSize} format={(n) => `${n} px`} />
        </Section>
      </div>
    );
  }

  return (
    <div>
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
        {c.pair && (
          <>
            <Switch
              label="Second letter in its own color"
              checked={state.twoTone}
              onChange={(twoTone) => apply({ twoTone })}
            />
            {state.twoTone && (
              <ColorField id="c2" label="Second letter" value={state.secondColor} onChange={(secondColor) => apply({ secondColor })} />
            )}
          </>
        )}
        <ContrastBadge />
      </Section>
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
    </div>
  );
}
