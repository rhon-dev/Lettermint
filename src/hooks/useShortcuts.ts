import { useEffect } from 'react';
import { redo, undo } from '../store/persistence';
import { useUiStore } from '../store/ui';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return !['range', 'radio', 'checkbox', 'color', 'button'].includes(target.type);
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** ⌘/Ctrl+Z undo, ⇧⌘Z / Ctrl+Y redo, R shuffle, E export. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y' && !isTyping(e.target)) {
        e.preventDefault();
        redo();
        return;
      }
      const ui = useUiStore.getState();
      if (mod || e.altKey || isTyping(e.target) || ui.exportOpen || ui.presenting) return;
      if (key === 'r') {
        e.preventDefault();
        useUiStore.getState().shuffle();
      } else if (key === 'e') {
        e.preventDefault();
        useUiStore.getState().setExportOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
