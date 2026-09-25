/**
 * The race scorebug's held state. The game deals the next at-bat the instant a
 * plate appearance's last pitch resolves; the bug holds the one that just
 * ended until the card clears. Kept out of the .tsx so the node test runner
 * covers it.
 */
import type { Bases, PlateEvent } from "../shine/events.ts";

/** What the scorebug shows; `score` is the raw run difference (null when the kind has no score). */
export interface BugState {
  inning: string | null;
  score: number | null;
  atBat: string;
  count: { balls: number; strikes: number };
  outs: number;
  bases: Bases;
  self: 1 | 2 | 3 | null;
}

type Base = 1 | 2 | 3;
const BASE_KEY = { 1: "first", 2: "second", 3: "third" } as const;

/**
 * The bug at the end of her at-bat: that at-bat's events replayed, in order,
 * onto the bug as it stood during it. Her base lights when she reaches, the
 * runners move, every run goes on the board and every out on the lamps.
 * Her own trip after the at-bat (a steal, a run scored) rides along, so the
 * bug agrees with the basepath line on the card.
 */
export function settleBug(held: BugState, events: readonly PlateEvent[], pa: number): BugState {
  const bases: Bases = { ...held.bases };
  let self = held.self;
  let outs = held.outs;
  let runs = 0;
  // Teammates on one play move together: a walk lists the trailing runner
  // first, so a batch clears every base it leaves before it fills any.
  let leave: Base[] = [];
  let reach: Base[] = [];
  const flush = () => {
    for (const b of leave) bases[BASE_KEY[b]] = false;
    for (const b of reach) bases[BASE_KEY[b]] = true;
    leave = [];
    reach = [];
  };
  for (const e of events) {
    if (!("pa" in e) || e.pa !== pa) continue;
    const mate = (e.t === "advance" || e.t === "score") && e.runner === "mate";
    if (!mate) flush();
    if (e.t === "reach") {
      if (e.base < 4) {
        const b = e.base as Base;
        bases[BASE_KEY[b]] = true;
        self = b;
      }
    } else if (e.t === "advance") {
      if (e.runner === "mate") {
        leave.push(e.from);
        reach.push(e.to);
      } else {
        bases[BASE_KEY[e.from]] = false;
        bases[BASE_KEY[e.to]] = true;
        self = e.to;
      }
    } else if (e.t === "score") {
      runs += 1;
      if (e.runner === "mate") {
        if (e.from !== 0) leave.push(e.from);
      } else {
        if (e.from !== 0) bases[BASE_KEY[e.from]] = false;
        self = null;
      }
    } else if (e.t === "out") {
      outs = Math.min(2, outs + 1);
      if (e.how === "caught-stealing" && self !== null) {
        bases[BASE_KEY[self]] = false;
        self = null;
      }
    }
  }
  flush();
  return {
    ...held,
    score: held.score === null ? null : held.score + runs,
    outs,
    bases,
    self,
  };
}
