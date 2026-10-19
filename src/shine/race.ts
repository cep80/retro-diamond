/**
 * The race: her plate appearance, Pretty Derby style.
 *
 * The Coach sits her, presses Go, and can release one swing while the ball is
 * in the air. With no release, her swing and her timing come from her sheet
 * and the sit. The resolvers in `featured-game.ts` stay the single truth for
 * what the ball does.
 *
 * Pure and seeded: the same run, game, pitch and pick always produce the same
 * decision, so the harness and the browser agree. A release replaces only
 * that pitch's timing.
 */
import { locCell, locInZone, type Cell, type Loc } from "./core/zone.ts";
import { cellDistance, gaussianFrom, satRight, sitFamily, statSigma, stuffSigmaBite, type CoachCardId, type DuelCall, type PitchFamily } from "./duel.ts";
import type { SwingKind } from "./featured-game.ts";
import type { CharacterId, StyleId, TraineeStats } from "./types.ts";

/** What the Coach sets before Go. The card is spent on the first pitch it applies to. */
export interface RacePick {
  sit: Cell;
  call: DuelCall;
  card: CoachCardId | null;
}

export interface SwingDecision {
  swing: boolean;
  kind: SwingKind;
  /**
   * Where the barrel actually goes: the sit, or the crossed cell when she
   * adjusted to the pitch. The resolver measures location error from here.
   */
  aim: Cell;
  /** True when she moved the barrel off the sit to the ball. */
  adjusted: boolean;
  /** Seconds early (−) or late (+); 0 is the barrel on plane at the plate. */
  timingErr: number;
  /** Flight progress where the bat meets the plane (1 = the plate). */
  u: number;
  /** Why she swung or held, for the caption and the harness. */
  why: "sat-on-it" | "close" | "protect" | "chase" | "took" | "take-call" | "ball" | "three-oh";
}

/**
 * Her share of the timing error is wider than the Duel's 70/30 blend because
 * there is no tap left to carry the rest: the sit is the whole coaching lever.
 */
export const RACE_SIGMA_MULT = 1.55;
/** Sitting on the crossed cell tightens her; sitting two cells off leaves her guessing. */
export const SIT_SIGMA: Record<0 | 1 | 2, number> = { 0: 0.55, 1: 1, 2: 1.6 };
export const FAMILY_RIGHT_SIGMA = 0.8;
export const FAMILY_WRONG_SIGMA = 1.35;
export const POWER_SIGMA = 1.15;
/**
 * A swing timed inside the window but below this timing quality is fouled
 * off (late clips it back, early pulls it). This is what makes a race PA run
 * deep like a real one instead of ending on the first mistimed swing.
 */
export const RACE_FOUL_BAND = 0.3;
export const RACE_MODS = { foulBand: RACE_FOUL_BAND } as const;
/** Bat meets the plane no earlier / later than this on the flight clock. */
export const SWING_U_MIN = 0.62;
export const SWING_U_MAX = 1.1;

export interface SwingContext {
  stats: TraineeStats;
  style: StyleId;
  count: { balls: number; strikes: number };
  pitch: { loc: Loc; speed: number; family: PitchFamily; stuff?: number };
  pick: Pick<RacePick, "sit" | "call">;
  /** Practice: she swings at everything, contact only. */
  practice?: boolean;
  /** Leverage on: Guts steadies the hands. */
  guts?: boolean;
}

/** How far outside the zone the pitch is, in cells; 0 inside. */
export function offPlate(loc: Loc): number {
  if (locInZone(loc)) return 0;
  return Math.max(Math.abs(loc.x - 1.5) - 1.5, Math.abs(loc.y - 1.5) - 1.5, 0);
}

/** Probability she offers at this pitch, before the roll. */
export function swingChance(ctx: SwingContext): { p: number; why: SwingDecision["why"] } {
  const { count, pitch, pick } = ctx;
  if (ctx.practice) return { p: 1, why: "sat-on-it" };
  if (pick.call === "take") return { p: 0, why: "take-call" };
  const inZone = locInZone(pitch.loc);
  const d = cellDistance(pick.sit, locCell(pitch.loc));
  const two = count.strikes >= 2;
  const eye = Math.max(1, Math.min(20, ctx.stats.eye)) / 20;
  const family = sitFamily(pick.call);
  const right = family !== null && satRight(pick.call, pitch.family);
  const wrong = family !== null && !right;

  if (pick.call === "protect") {
    const off = offPlate(pitch.loc);
    return { p: inZone ? 0.98 : Math.max(0.15, 0.7 - off * 0.6), why: "protect" };
  }

  let p: number;
  let why: SwingDecision["why"];
  if (inZone) {
    if (d === 0) {
      p = 0.96;
      why = "sat-on-it";
    } else if (d === 1) {
      p = two ? 0.92 : 0.85;
      why = "close";
    } else {
      p = two ? 0.88 : 0.55;
      why = two ? "protect" : "took";
    }
    if (right) p = Math.min(0.98, p + 0.1);
    if (wrong) p -= 0.15;
    // Behind in the count with a strike coming: a strike in the zone gets a swing.
    if (count.balls === 3 && count.strikes > 0) p = Math.max(p, 0.85);
  } else {
    const off = offPlate(pitch.loc);
    // Eye is the chase curve: a 20-Eye hitter barely offers at a ball.
    const chase = Math.max(0.04, 0.55 - eye * 0.38 - off * 0.35);
    p = d === 0 ? chase + 0.22 : d === 1 ? chase : chase * 0.5;
    if (two) p *= 1.7;
    if (wrong) p += 0.08;
    why = "chase";
  }
  if (count.balls === 3 && count.strikes === 0 && d !== 0) {
    p *= 0.25;
    why = "three-oh";
  }
  if (!inZone && why === "chase" && p < 0.5) why = "ball";
  return { p: Math.max(0, Math.min(0.98, p)), why };
}

/** Standard deviation of her timing, in seconds, for this pitch and pick. */
export function timingSigma(ctx: SwingContext, power: boolean): number {
  const d = cellDistance(ctx.pick.sit, locCell(ctx.pitch.loc));
  let sigma = statSigma(ctx.stats.contact) * RACE_SIGMA_MULT * SIT_SIGMA[d];
  const family = sitFamily(ctx.pick.call);
  if (family !== null) sigma *= satRight(ctx.pick.call, ctx.pitch.family) ? FAMILY_RIGHT_SIGMA : FAMILY_WRONG_SIGMA;
  if (power) sigma *= POWER_SIGMA;
  if (ctx.guts) sigma *= 1 - 0.15 * (Math.max(1, Math.min(20, ctx.stats.guts)) / 20);
  if (ctx.practice) sigma *= 0.6;
  // A better arm is harder to time, however good her hands have become.
  else sigma *= stuffSigmaBite(ctx.pitch.stuff);
  return sigma;
}

/** Power when she sat on it early in the count and her Power is her game. */
export function swingKindFor(ctx: SwingContext): SwingKind {
  if (ctx.practice || ctx.pick.call === "protect" || ctx.pick.call === "take") return "contact";
  const d = cellDistance(ctx.pick.sit, locCell(ctx.pitch.loc));
  const two = ctx.count.strikes >= 2;
  if (two || d > 0) return "contact";
  if (ctx.style === "lead" || ctx.style === "move") return "contact";
  return ctx.stats.power >= ctx.stats.contact - 1 ? "power" : "contact";
}

/**
 * How often she gets the barrel from the sit to a pitch one cell off it.
 * Contact is the hands, Eye is seeing it early. A pitch two cells off the
 * sit is never adjusted to: that is what a wrong sit costs.
 */
export function adjustChance(stats: Pick<TraineeStats, "contact" | "eye">): number {
  const contact = Math.max(1, Math.min(20, stats.contact)) / 20;
  const eye = Math.max(1, Math.min(20, stats.eye)) / 20;
  return Math.min(0.95, 0.3 + contact * 0.45 + eye * 0.2);
}

/** The cell the barrel goes to: the sit, or the crossed cell when she adjusts. */
export function barrelCell(ctx: SwingContext, r: () => number): { aim: Cell; adjusted: boolean } {
  const crossed = locCell(ctx.pitch.loc);
  const d = cellDistance(ctx.pick.sit, crossed);
  if (d === 0) return { aim: ctx.pick.sit, adjusted: false };
  // The first lesson has to honor the Coach's box. Auto-correcting every practice swing
  // made a wrong sit look exactly like a right one.
  if (ctx.practice) return { aim: ctx.pick.sit, adjusted: false };
  if (d === 1 && r() < adjustChance(ctx.stats)) return { aim: crossed, adjusted: true };
  return { aim: ctx.pick.sit, adjusted: false };
}

/** Where on the flight the bat meets the plane, from the timing error. */
export function swingProgress(timingErr: number, speed: number): number {
  const u = 1 + timingErr / Math.max(0.2, speed);
  return Math.max(SWING_U_MIN, Math.min(SWING_U_MAX, u));
}

/** Hold a sheet swing until the plate so a release can still land on time. */
export function heldMeetU(u: number): number {
  return Math.max(u, 1);
}

export type ReleaseBand = "early" | "now" | "late";

/** A release before this reads early. 0.78 itself is on time. */
const RELEASE_EARLY_U = 0.78;
/** A release after this reads late. 1.06 itself is on time. */
const RELEASE_LATE_U = 1.06;
/** The middle of the on-time band. */
const RELEASE_CENTER_U = 0.92;

/** Early, on time, or late. The band is wide on purpose: this is a swing, not a reflex bar. */
export function releaseBand(u: number): ReleaseBand {
  if (u < RELEASE_EARLY_U) return "early";
  if (u > RELEASE_LATE_U) return "late";
  return "now";
}

/**
 * How far off the plate a human release is. A flat early or late error sat
 * inside the foul band for any trained Contact, so a mash at two strikes
 * fouled the at-bat forever. Far off the on-time band is a miss. A near miss
 * still clips it foul. On time stays a hair either side of the plate.
 * Sheet swings do not come through here.
 */
const RELEASE_OFF_BASE = 0.122;
const RELEASE_OFF_SCALE = 0.322;

export function releaseTimingErr(u: number): number {
  const band = releaseBand(u);
  if (band === "early") return -(RELEASE_OFF_BASE + RELEASE_OFF_SCALE * ((RELEASE_EARLY_U - u) / RELEASE_EARLY_U));
  if (band === "late") return RELEASE_OFF_BASE + RELEASE_OFF_SCALE * ((u - RELEASE_LATE_U) / RELEASE_EARLY_U);
  const t = Math.max(-1, Math.min(1, (u - RELEASE_CENTER_U) / 0.14));
  return t * 0.05;
}

/**
 * The reaction, only when the Coach released: she says how it felt, in her own voice.
 * Three of each, picked by the pitch, so a career of swings doesn't hear one line.
 */
const RELEASE_VOICE: Record<CharacterId, Record<ReleaseBand, readonly [string, string, string]>> = {
  aoi: {
    early: ["Way early! Sorry. I could feel it the second I started.", "Um, sorry. I was out in front of that one. Way out.", "Too early. That's on me, Coach. I'll write it down."],
    now: ["That's the one. Right on time.", "Um. That felt really good, actually.", "On time! I mean, yes. On time, Coach."],
    late: ["Late. It got in on my hands. Sorry.", "Um, sorry, I was late. It was right there, too.", "Late again. I'll be quicker. I promise."],
  },
  miki: {
    early: ["Early. Cool. Super cool.", "Way out in front. Gary could've timed that better.", "So. That was early. Moving on."],
    now: ["...Okay. That one was right on.", "On time. Don't make it a thing.", "Cool. Actually cool, that time."],
    late: ["Late. It ate me up. Cool.", "It got in on me. Gary's laughing somewhere.", "So I was late. Don't say it."],
  },
  yuki: {
    early: ["Early! I went before the ball did, Stopwatch.", "Too fast. Even for me. Don't say it.", "Early. Already gone before it got here."],
    now: ["Right on it! Did you see? Right on it!", "On time. Write that down, Stopwatch.", "That's the timing. Already had it."],
    late: ["Late! Me! Don't write it down.", "It beat me there. That never happens.", "Late, Stopwatch. Your thumb was slow, not me."],
  },
  reina: {
    early: ["Early. A tenth, maybe less.", "Out in front. Again.", "Early. I counted it wrong."],
    now: ["On time. Exactly.", "That was right. Don't clap.", "On the barrel. Note it."],
    late: ["Late. Two hundredths. Again.", "Late. It got in on me.", "Late. I saw it and still waited."],
  },
  sol: {
    early: ["Early, Jefe. Too much heat in my hands.", "Out in front. Hitting's dumb.", "Early. Don't tell Luz."],
    now: ["Ha. On time. Hitting's easy, Jefe.", "That's the one.", "Right on it. Tell Luz."],
    late: ["Late. Who throws that slow?", "Late, Jefe. Don't look at me.", "It got in on me. Fine."],
  },
  kira: {
    early: ["Early! Deal's off, I wasn't ready.", "Way early, Partner. Like, first-bus early.", "Out in front. I'm counting that as enthusiasm."],
    now: ["Right on time, Partner! Put it in the contract.", "On time! That's a deal.", "Ha! Right on it!"],
    late: ["Late. Like the last bus. Classic.", "It got in on me, Partner. Rude.", "Late! I was still bouncing."],
  },
};

/** The Coach's swing as she felt it, in quotes. `seed` (the pitch) picks the line; no girl is the booth's plain call. */
export function releaseLine(band: ReleaseBand, who?: CharacterId | null, seed = 0): string {
  const lines = who ? RELEASE_VOICE[who]?.[band] : undefined;
  if (lines) return `"${lines[Math.abs(Math.floor(seed)) % lines.length]}"`;
  if (band === "early") return "She was way out in front of that one.";
  if (band === "late") return "It got in on her hands. She was late.";
  return "Right on time. She was all over it.";
}

/** Her decision on one pitch. `r` is the seeded source for this pitch. */
export function decideSwing(ctx: SwingContext, r: () => number): SwingDecision {
  const { p, why } = swingChance(ctx);
  const kind = swingKindFor(ctx);
  if (r() >= p) {
    return { swing: false, kind, aim: ctx.pick.sit, adjusted: false, timingErr: 0, u: 1, why: why === "sat-on-it" || why === "close" || why === "protect" ? "took" : why };
  }
  const timingErr = gaussianFrom(r) * timingSigma(ctx, kind === "power");
  const barrel = barrelCell(ctx, r);
  return { swing: true, kind, ...barrel, timingErr, u: swingProgress(timingErr, ctx.pitch.speed), why };
}

/** Pacing for the plate appearance. The flight stays long enough to swing. */
export const RACE_PACE = {
  prepareMs: 900,
  prepareMsReduced: 420,
  flightScale: 1.6,
  /** The count reads between pitches before the next wind-up. */
  betweenPitchMs: 900,
  betweenPitchMsReduced: 450,
  /** The PA result card holds before the next pick. */
  paCardMs: 2200,
  paCardMsReduced: 1200,
  /** HR / K / walk: the money clip finishes past the reaction beat before the card. */
  moneyHoldMs: 2200,
  moneyHoldMsReduced: 800,
  /** A home run holds longer: the stamp, the burst and the crowd finish before the card. */
  hrHoldMs: 3000,
  hrHoldMsReduced: 1000,
} as const;

const RUN_WORDS = ["no", "one", "two", "three", "four"];

/** "a run scores" / "two runs score", for the card. */
function runsIn(rbi: number): string {
  return rbi === 1 ? "a run scores" : `${RUN_WORDS[rbi] ?? String(rbi)} runs score`;
}

function pick<T>(lines: readonly T[], seed: number): T {
  return lines[Math.abs(Math.floor(seed)) % lines.length]!;
}

/**
 * One line for the result card: the booth saying what happened, in a whole sentence.
 * The stamp already said "Strike three" / "Ball four", so the card says what happens next.
 * `seed` (the at-bat) picks between versions, so the same line doesn't come every time.
 */
export function paCardLine(opts: { beat: string | null; banner: string; reached: boolean; struckOut: boolean; rbi: number; seed?: number }): string {
  const s = opts.seed ?? 0;
  if (opts.beat === "hr") {
    if (opts.rbi > 1) return `She hit it out, and ${runsIn(opts.rbi)}!`;
    return pick(["She hit it out of the park!", "That one's gone. Home run!", "Over the wall. She gets to jog this one."], s);
  }
  if (opts.beat === "k") return pick(["She's out on strikes.", "She goes down on strikes.", "Back to the dugout on strikes."], s);
  if (opts.beat === "walk") return opts.rbi > 0 ? `She takes her base, and ${runsIn(opts.rbi)}.` : pick(["She takes her base.", "She jogs down to first.", "That's a walk, and she'll take it."], s);
  if (opts.beat === "bunt-down") return opts.rbi > 0 ? `She beats out the bunt, and ${runsIn(opts.rbi)}.` : "She bunts and beats the throw.";
  if (opts.beat === "single") return opts.rbi > 0 ? `She's on, and ${runsIn(opts.rbi)}!` : pick(["She's on first.", "She's aboard, and the dugout's up on the rail.", "She gets on."], s);
  if (opts.beat === "double") return opts.rbi > 0 ? `Into the gap for a double, and ${runsIn(opts.rbi)}!` : pick(["Into the gap. She's standing on second.", "She rips it into the gap and coasts into second.", "That's a double. She's on second."], s);
  if (opts.beat === "sac-fly") return pick(["It's caught, but it's deep enough. The run scores.", "Deep enough. The runner tags and scores."], s);
  if (opts.beat === "fly-out") return pick(["Caught in the air. She's out.", "It hangs up there, and they catch it.", "A fly ball, and they're under it."], s);
  if (opts.beat === "grounder-out") return pick(["On the ground, and they throw her out.", "She runs it out, but they get her at first.", "A grounder, and they make the play."], s);
  if (opts.beat === "bunt-out") return "They field the bunt and get her at first.";
  return opts.banner;
}

/** How her at-bat ended, as she'd talk about it (her trip after it, when it said more). */
type AtBatMood = "hr" | "hit" | "walk" | "k" | "out" | "sac" | "caught" | "scored";

/** Her own words on the card after the at-bat, in quotes: the girl reacting, never a caption. */
const AT_BAT_TRIP: Partial<Record<CharacterId, Partial<Record<AtBatMood, readonly string[]>>>> = {
  aoi: {
    caught: ["Um. I was out by a lot. Sorry, Coach.", "That's a CS in my scorebook. I hate writing CS."],
    scored: ["I scored! Mom's going to need another sticker.", "Um, I touched home. Did everyone see? I touched home."],
  },
  miki: {
    caught: ["Caught stealing. Cool. Gary would've made it.", "So. Running's not my thing. Noted."],
    scored: ["I scored. Section 4 is losing it. I'm fine. Totally fine.", "Home. Cool. Don't look at me."],
  },
  yuki: {
    caught: ["Out by a step. One step! I'd go again.", "She threw me out. Don't make the face, Stopwatch."],
    scored: ["Home! Already! Did you get the time?", "Scored. That's what the legs are for."],
  },
};

const AT_BAT_VOICE: Record<CharacterId, Record<"hr" | "hit" | "walk" | "k" | "out" | "sac", readonly string[]>> = {
  aoi: {
    hr: ["Um. Sorry. Did that just go out? Coach, it went out.", "I don't have a symbol for that in my scorebook. I'll make one.", "Mom's going to need a bigger sticker."],
    hit: ["I got on! Sorry. I reached base, Coach.", "That's a hit in my book. In pen.", "On base. That's where I like it."],
    walk: ["Four balls. I'll take first, thank you.", "Um, sorry, I'll just be standing on first now.", "A walk's as good as a hit. Mom says so, anyway."],
    k: ["Sorry, Coach. I'm writing that pitch down so I remember her.", "Sorry. That's a K in my book.", "Um. That one's going in the scorebook with a frown."],
    out: ["I hit it! Um. Right at somebody. Moral victory?", "That's a 6-3 in my head, and I don't like it.", "Sorry. I ran it out, at least."],
    sac: ["That's a sac fly. A run's a run, Coach."],
  },
  miki: {
    hr: ["...Cool. That went out. Cool cool cool.", "Did Section 4 see that? Tell me they saw that.", "Okay. I'm gonna go stand somewhere and not cry."],
    hit: ["Cool. I'm on.", "Section 4's ringing the bell. I'm pretending I can't hear it.", "It's a hit. Don't make it a thing."],
    walk: ["I'll take the walk. Free base, no feelings.", "Four balls. Cool. I'm going.", "So. That's a walk."],
    k: ["Cool. Super cool.", "So. That happened.", "Don't do the talk. I know the talk."],
    out: ["Right at her. Cool.", "So I hit it hard and it didn't matter. Normal.", "Even Gary would've caught that one."],
    sac: ["Run scored. I'm out. I'll call that a trade."],
  },
  yuki: {
    hr: ["Home run! I didn't even have to run fast. Weird.", "Already gone! The ball, I mean.", "Did you time that? Stopwatch, did you time it?"],
    hit: ["On! Already looking at second.", "I'm on. Watch the catcher's knees, Stopwatch.", "First base. Already bored of it."],
    walk: ["Walk. Fine. At least I don't have to run yet.", "Four balls. Whatever. I'm stealing second.", "Already on first. Ugh, walking."],
    k: ["Struck out. Already over it. Mostly.", "Don't make the face. I saw the face.", "Strike three. Next time I'm… never mind. Next time."],
    out: ["Out by a step. One step!", "I ran it out faster than last time. Still out.", "I'd go again. Don't make the face."],
    sac: ["A run scored! Not me, but somebody did."],
  },
  reina: {
    hr: ["That counts. I checked."],
    hit: ["On first. Don't clap."],
    walk: ["Four balls. I know how that feels from the other side."],
    k: ["Struck out. I'll remember her."],
    out: ["Out. Note it."],
    sac: ["One run. Fine."],
  },
  sol: {
    hr: ["Ha! Tell Luz. Tell everybody."],
    hit: ["Hitting's easy, Jefe."],
    walk: ["Walked. Boring."],
    k: ["Struck out. Respect."],
    out: ["Out. Hitting's dumb."],
    sac: ["A run's a run, Jefe."],
  },
  kira: {
    hr: ["Partner! Was that a home run? That's a deal!"],
    hit: ["I'm on! I have no idea what I'm doing."],
    walk: ["Free base! Best deal in baseball."],
    k: ["Okay. New deal. I pitch, you hit."],
    out: ["Out. I'm counting that as cardio."],
    sac: ["Run scored! I'll take a cut of that."],
  },
};

function atBatMood(beat: string | null): Exclude<AtBatMood, "caught" | "scored"> | null {
  if (beat === "hr") return "hr";
  if (beat === "single" || beat === "double" || beat === "bunt-down") return "hit";
  if (beat === "walk") return "walk";
  if (beat === "k") return "k";
  if (beat === "sac-fly") return "sac";
  if (beat === "fly-out" || beat === "grounder-out" || beat === "bunt-out") return "out";
  return null;
}

/**
 * What she says after the at-bat, in quotes, or null for a beat that didn't end one. `seed` is
 * the at-bat. `trip` is her run around the bases after it (the record's runner line): getting
 * thrown out or coming home is what she'd talk about, so it wins over the at-bat.
 */
export function atBatQuote(who: CharacterId, beat: string | null, seed = 0, trip?: string | null): string | null {
  const mood = atBatMood(beat);
  if (!mood) return null;
  const tripMood: AtBatMood | null = !trip ? null : /Caught stealing/.test(trip) ? "caught" : /\b(scored|came around)\b/.test(trip) ? "scored" : null;
  const lines = (tripMood ? AT_BAT_TRIP[who]?.[tripMood] : undefined) ?? AT_BAT_VOICE[who]?.[mood];
  return lines?.length ? `"${pick(lines, seed)}"` : null;
}
