/**
 * Timers that stop with the game. `suspend` freezes every pending wait and
 * remembers what it had left; `resume` re-arms each with exactly that. The
 * mound's field / reaction / next-batter waits use this so a pause (or a
 * backgrounded tab) never lets the beat run on without the player.
 */
import { realScheduler, type PlateScheduler } from "./plate-controller.ts";

interface Entry {
  fn: () => void;
  handle: unknown;
  fireAt: number;
  /** Ms left while suspended; null while running. */
  left: number | null;
}

export class SuspendableTimers {
  private entries = new Set<Entry>();
  private suspended = false;
  private readonly sched: PlateScheduler;

  constructor(sched: PlateScheduler = realScheduler) {
    this.sched = sched;
  }

  set(fn: () => void, ms: number): void {
    const entry: Entry = { fn, handle: null, fireAt: this.sched.now() + ms, left: null };
    this.entries.add(entry);
    if (this.suspended) entry.left = Math.max(0, ms);
    else this.arm(entry, ms);
  }

  clearAll(): void {
    for (const e of this.entries) if (e.handle !== null) this.sched.clear(e.handle);
    this.entries.clear();
  }

  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;
    const now = this.sched.now();
    for (const e of this.entries) {
      if (e.handle !== null) this.sched.clear(e.handle);
      e.handle = null;
      e.left = Math.max(0, e.fireAt - now);
    }
  }

  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    for (const e of this.entries) {
      const left = e.left ?? 0;
      e.left = null;
      this.arm(e, left);
    }
  }

  get pending(): number {
    return this.entries.size;
  }

  private arm(entry: Entry, ms: number) {
    entry.fireAt = this.sched.now() + ms;
    entry.handle = this.sched.set(() => {
      this.entries.delete(entry);
      entry.fn();
    }, ms);
  }
}
