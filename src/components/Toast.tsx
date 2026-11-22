import { useUiStore } from '../store/ui';

/** Single polite live region; never steals focus. */
export function Toast() {
  // While the export dialog is open the rest of the page is inert, so the dialog announces instead.
  const toast = useUiStore((s) => (s.exportOpen ? null : s.toast));
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      {toast && (
        <p
          key={toast.id}
          className="motion-safe:animate-toast-in absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-stone-900"
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}
