import type { ReactNode } from 'react';
import { contrastRatio, meetsAA } from '../lib/color';
import { useLogoStore, LIMITS } from '../store/logo';
import { ColorField } from './ColorField';
import { FontPicker } from './FontPicker';
import { ShapePicker } from './ShapePicker';
import { Slider } from './Slider';
import { TextInput } from './TextInput';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-stone-200 py-6 first:pt-0 last:border-b-0 last:pb-0 dark:border-stone-800">
      <h2 className="text-xs font-semibold tracking-widest text-stone-600 uppercase dark:text-stone-400">{title}</h2>
      {children}
    </section>
  );
}

function ContrastBadge() {
  const bg = useLogoStore((s) => s.bgColor);
  const fg = useLogoStore((s) => s.fgColor);
  const ratio = contrastRatio(bg, fg);
  const ok = meetsAA(ratio);
  return (
    <p className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      <span>
        Contrast <span className="font-mono tabular-nums">{ratio.toFixed(2)}:1</span> —{' '}
        {ok ? 'passes WCAG AA' : 'below WCAG AA (4.5:1)'}
      </span>
    </p>
  );
}

export function Controls() {
  const bgColor = useLogoStore((s) => s.bgColor);
  const fgColor = useLogoStore((s) => s.fgColor);
  const size = useLogoStore((s) => s.size);
  const scale = useLogoStore((s) => s.scale);
  const spacing = useLogoStore((s) => s.spacing);
  const charCount = useLogoStore((s) => Array.from(s.text).length);
  const setBgColor = useLogoStore((s) => s.setBgColor);
  const setFgColor = useLogoStore((s) => s.setFgColor);
  const setSize = useLogoStore((s) => s.setSize);
  const setScale = useLogoStore((s) => s.setScale);
  const setSpacing = useLogoStore((s) => s.setSpacing);

  return (
    <div>
      <Section title="Text">
        <TextInput />
      </Section>
      <Section title="Shape">
        <ShapePicker />
      </Section>
      <Section title="Typeface">
        <FontPicker />
      </Section>
      <Section title="Colors">
        <div className="grid grid-cols-2 gap-4">
          <ColorField id="bg" label="Background" value={bgColor} onChange={setBgColor} />
          <ColorField id="fg" label="Letters" value={fgColor} onChange={setFgColor} />
        </div>
        <ContrastBadge />
      </Section>
      <Section title="Size">
        <Slider
          label="Canvas size"
          value={size}
          {...LIMITS.size}
          onChange={setSize}
          format={(n) => `${n} px`}
        />
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
