import { useRef, useState, type FormEvent } from 'react';
import { getDesign, HEADLINE, initialsError, SPECIMEN_EXAMPLES, SPECIMENS } from '../lib/designs';
import { useUiStore } from '../store/ui';
import { DesignArt } from './DesignTile';
import { Icon } from './Icon';
import { InitialsField } from './InitialsField';
import { Wordmark } from './Wordmark';

/** Opening screen: one field, one action, and three live specimens that follow the field. */
export function Home() {
  const initials = useUiStore((s) => s.initials);
  const explore = useUiStore((s) => s.explore);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = initialsError(initials);
    setError(err);
    if (err) {
      input.current?.focus();
      return;
    }
    window.scrollTo(0, 0);
    explore();
  };

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col px-5 pt-5 pb-10 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between">
        <Wordmark />
        <p className="hidden text-sm text-ink-soft sm:block dark:text-stone-400">Monograms, set in your browser</p>
      </header>

      <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-16">
        <form onSubmit={submit} noValidate className="max-w-md space-y-6">
          <h1 className="font-display text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">{HEADLINE}</h1>
          <p className="text-base text-ink-soft sm:text-lg dark:text-stone-400">
            Type one or two letters, browse the styles they suggest, then make one yours.
          </p>
          <InitialsField ref={input} id="initials" label="Your initials" error={error} onEdit={() => setError(null)} />
          <button type="submit" className="btn btn-primary focus-ring h-14 w-full px-6 text-base sm:w-auto">
            Explore styles
            <Icon name="right" size={18} />
          </button>
        </form>

        <ul aria-label="Live specimens" className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4">
          {SPECIMENS.map((id, i) => {
            const d = getDesign(id)!;
            const text = initials || SPECIMEN_EXAMPLES[i]!;
            return (
              <li key={id} className={i === 0 ? 'col-span-2 sm:row-span-2' : ''}>
                <figure className="space-y-2">
                  <div className="aspect-square overflow-hidden rounded-2xl ring-1 ring-ink/10 dark:ring-white/10">
                    <DesignArt d={d} text={text} />
                  </div>
                  <figcaption className="flex items-baseline justify-between gap-2 px-0.5 text-sm">
                    <span className="font-display font-semibold">{d.name}</span>
                    <span className="truncate font-display text-ink-soft italic dark:text-stone-400">{text.toUpperCase()}</span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="text-xs text-ink-soft dark:text-stone-400">
        Free, no signup. Everything runs on your device. Typefaces under the SIL Open Font License.
      </footer>
    </div>
  );
}
