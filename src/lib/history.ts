/**
 * Undo/redo stack with time-based coalescing: changes that arrive within
 * `mergeMs` of the previous one (e.g. a slider drag) form a single step.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastAt = -Infinity;

  constructor(
    private current: T,
    private readonly equals: (a: T, b: T) => boolean,
    private readonly mergeMs = 500,
    private readonly limit = 100,
  ) {}

  /** Record a new state. Returns false when nothing changed. */
  record(next: T, now: number): boolean {
    if (this.equals(next, this.current)) return false;
    if (now - this.lastAt > this.mergeMs) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.lastAt = now;
    this.current = next;
    this.future = [];
    return true;
  }

  undo(): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(this.current);
    this.current = prev;
    this.lastAt = -Infinity;
    return prev;
  }

  redo(): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(this.current);
    this.current = next;
    this.lastAt = -Infinity;
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
