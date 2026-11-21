import type { ReactNode } from 'react';
import { contrastRatio, meetsAA } from '../lib/color';
import { useLogoStore, LIMITS } from '../store/logo';
import { useUiStore } from '../store/ui';
import { ColorField } from './ColorField';
import { FontPicker } from './FontPicker';
import { Icon } from './Icon';
import { PalettePicker } from './PalettePicker';
import { ShapePicker } from './ShapePicker';
import { Slider } from './Slider';
import { TextInput } from './TextInput';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-stone-200/80 py-6 first:pt-0 last:border-b-0 last:pb-0 dark:border-stone-800">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-stone-600 uppercase dark:text-stone-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ContrastBadge() {
  const bg = useLogoStore((s) => s.bgColor);
  const bg2 = useLogoStore((s) => s.bgColor2);
  const fill = useLogoStore((s) => s.fill);
  const fg = useLogoStore((s) => s.fgColor);
  // With a gradient, the weakest stop decides legibility.
  const ratio = Math.min(contrastRatio(bg, fg), fill === 'gradient' ? contrastRatio(bg2, fg) : Infinity);
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
            <span className="flex min-h-10 items-center justify-center gap-2 rounded-[0.7rem] text-sm text-stone-600 capitalize transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mint-500 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
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

export function Controls() {
  const bgColor = useLogoStore((s) => s.bgColor);
  const bgColor2 = useLogoStore((s) => s.bgColor2);
  const fill = useLogoStore((s) => s.fill);
  const gradientAngle = useLogoStore((s) => s.gradientAngle);
  const fgColor = useLogoStore((s) => s.fgColor);
  const size = useLogoStore((s) => s.size);
  const scale = useLogoStore((s) => s.scale);
  const spacing = useLogoStore((s) => s.spacing);
  const charCount = useLogoStore((s) => Array.from(s.text).length);
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
      <Section
        title="Text"
        action={
          <button
            type="button"
            className="btn focus-ring -mr-2 min-h-8 text-xs text-stone-600 dark:text-stone-400"
            onClick={() => {
              reset();
              notify('Reset to defaults — undo with ⌘/Ctrl+Z');
            }}
          >
            <Icon name="reset" size={14} /> Reset all
          </button>
        }
      >
        <TextInput />
      </Section>
      <Section title="Shape">
        <ShapePicker />
      </Section>
      <Section title="Typeface">
        <FontPicker />
      </Section>
      <Section
        title="Colors"
        action={
          <button
            type="button"
            className="btn focus-ring -mr-2 min-h-8 text-xs text-stone-600 dark:text-stone-400"
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
            <ColorField id="fg" label="Letters" value={fgColor} onChange={setFgColor} />
          )}
        </div>
        {fill === 'gradient' && (
          <>
            <ColorField id="fg" label="Letters" value={fgColor} onChange={setFgColor} />
            <Slider
              label="Gradient angle"
              value={gradientAngle}
              {...LIMITS.gradientAngle}
              onChange={setGradientAngle}
              format={(n) => `${n}°`}
            />
          </>
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
        <Slider
          label="Letter spacing"
          value={spacing}
          {...LIMITS.spacing}
          onChange={setSpacing}
          format={(n) => `${n > 0 ? '+' : ''}${n}%`}
          disabled={charCount < 2}
          hint={charCount < 2 ? 'Applies when there are two characters.' : 'Extra space between the two characters.'}
        />
      </Section>
    </div>
  );
}
