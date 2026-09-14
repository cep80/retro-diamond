/**
 * Authoritative plate clock.
 *
 * The animation loop renders progress; it never decides timing. Every input is
 * stamped with `performance.now()` at the moment it happens and converted to
 * flight progress here, so a dropped frame or a late React commit cannot move
 * the swing. Hidden tabs freeze the clock instead of letting the pitch resolve
 * behind the player's back.
 */

/** Documented tolerance: two inputs at the same wall-clock instant resolve within this many ms. */
export const TIMING_TOLERANCE_MS = 4;

/** A pitch that stays frozen longer than this is a dead ball and is re-dealt. */
export const DEAD_BALL_MS = 8000;

export interface PlateClock {
  /** Wall-clock start of the live phase (ms, performance.now domain). */
  t0: number;
  /** Total ms the clock has been frozen. */
  frozenMs: number;
  /** When the current freeze began, or null when running. */
  frozenAt: number | null;
  /** Duration of the live phase in seconds (pitch flight or delivery). */
  durationS: number;
}

export function startClock(now: number, durationS: number): PlateClock {
  return { t0: now, frozenMs: 0, frozenAt: null, durationS: Math.max(0.2, durationS) };
}

export function freezeClock(c: PlateClock, now: number): PlateClock {
  if (c.frozenAt != null) return c;
  return { ...c, frozenAt: now };
}

export function resumeClock(c: PlateClock, now: number): PlateClock {
  if (c.frozenAt == null) return c;
  return { ...c, frozenMs: c.frozenMs + Math.max(0, now - c.frozenAt), frozenAt: null };
}

export function isFrozen(c: PlateClock) {
  return c.frozenAt != null;
}

/** Elapsed live ms, excluding frozen time. */
export function elapsedMs(c: PlateClock, now: number) {
  const end = c.frozenAt ?? now;
  return Math.max(0, end - c.t0 - c.frozenMs);
}

/** Flight progress: 0 at release, 1 at the plate. */
export function progressAt(c: PlateClock, now: number) {
  return elapsedMs(c, now) / 1000 / c.durationS;
}

/** Signed seconds early (negative) or late (positive) versus plate arrival. */
export function timingErrAt(c: PlateClock, now: number) {
  return (progressAt(c, now) - 1) * c.durationS;
}

/** Seconds into the live phase, for two-tap deliveries (kick / release). */
export function secondsAt(c: PlateClock, now: number) {
  return elapsedMs(c, now) / 1000;
}

/** A freeze that outlived the dead-ball limit. */
export function deadBall(c: PlateClock, now: number) {
  return c.frozenAt != null && now - c.frozenAt >= DEAD_BALL_MS;
}

/** Monotonic input timestamp shared by pointer, keyboard, and gamepad paths. */
export function inputNow(ev?: { timeStamp?: number }) {
  if (typeof performance === "undefined") return Date.now();
  const now = performance.now();
  const stamp = ev?.timeStamp;
  // Event timestamps are in the same domain as performance.now() in modern
  // browsers. Use them when they are sane so a busy main thread does not add
  // its own delay to the read.
  if (typeof stamp === "number" && stamp > 0 && stamp <= now && now - stamp < 250) return stamp;
  return now;
}
