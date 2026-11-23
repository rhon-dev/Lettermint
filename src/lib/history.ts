/**
 * Undo/redo stack with time-based coalescing: changes that arrive within
 * `mergeMs` of the previous one (e.g. a slider drag) form a single step.
 * A gesture (beginGesture … endGesture) is always exactly one step, however long it takes.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastAt = -Infinity;
  private inGesture = false;
  private gesturePushed = false;

  constructor(
    private current: T,
    private readonly equals: (a: T, b: T) => boolean,
    private readonly mergeMs = 500,
    private readonly limit = 100,
  ) {}

  /** Record a new state. Returns false when nothing changed. */
  record(next: T, now: number): boolean {
    if (this.equals(next, this.current)) return false;
    const merge = this.inGesture ? this.gesturePushed : now - this.lastAt <= this.mergeMs;
    if (!merge) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
      if (this.inGesture) this.gesturePushed = true;
    }
    this.lastAt = now;
    this.current = next;
    this.future = [];
    return true;
  }

  beginGesture(): void {
    this.inGesture = true;
    this.gesturePushed = false;
  }

  /** Close the gesture. One that ended where it started (a cancelled drag) leaves no step behind. */
  endGesture(): void {
    if (!this.inGesture) return;
    const start = this.past[this.past.length - 1];
    if (this.gesturePushed && start !== undefined && this.equals(start, this.current)) this.past.pop();
    this.inGesture = false;
    this.lastAt = -Infinity;
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
