/** Compact Lettermint wordmark: a small ink seal and the name set in the display serif. */
export function Wordmark({ as: Tag = 'span' }: { as?: 'span' | 'h1' }) {
  return (
    <Tag className="flex min-w-0 items-center gap-2">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="9" className="fill-ink dark:fill-paper" />
        <circle cx="23.5" cy="23.5" r="3" className="fill-mint-500" />
        <path d="M9 8h3.2v13.2H19V24H9z" className="fill-paper dark:fill-ink" />
      </svg>
      <span className="truncate font-display text-lg leading-none font-semibold tracking-tight">
        Lettermint
      </span>
    </Tag>
  );
}
