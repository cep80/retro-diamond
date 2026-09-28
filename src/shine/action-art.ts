/**
 * Action art: the 2D presentation vocabulary for the plate.
 *
 * Phase 2 of the hook plan replaces the live 3D scene with stills at every
 * cue and a short clip on money beats. Hybrid E (PA film bible 2026-09-17):
 * sit is mound_close (pitcher looking in); Go cuts to action stills. This module
 * is the pure half: pose keys, the cue → picture rule, five-family grammar,
 * clip alignment math, budgets, and the manifest shape the farm writes.
 * No DOM, no timers, no controller.
 * Build spec: design/diamond-shine-action-art-build-spec-2026-09-16.md.
 * Film language: design/diamond-shine-pa-film-2026-09-17.md.
 */
import type { Stage } from "./beats.ts";
import type { DuelCall } from "./duel.ts";
import type { FieldBeat, SwingKind } from "./featured-game.ts";
import type { CharacterId } from "./types.ts";

/** The beats where the bat touched the ball. */
const BAT_TOUCHED: ReadonlySet<FieldBeat> = new Set<FieldBeat>(["foul", "foul-tip", "grounder-out", "fly-out", "sac-fly", "bunt-out", "bunt-down", "single", "double", "hr"]);

/** True when the bat touched the ball: the beats that flash and leave the bat. */
export function ballLeavesBat(beat: FieldBeat): boolean {
  return BAT_TOUCHED.has(beat);
}

/** The outcome card, one line per beat (PA film bible §1.4). */
export const RESULT_LINE: Record<FieldBeat, string> = {
  miss: "Swing and miss.",
  "foul-tip": "Foul tip. Almost.",
  foul: "Foul. Pulled.",
  "take-strike": "Strike. Looking.",
  ball: "Ball.",
  k: "Strike three.",
  walk: "Ball four.",
  "grounder-out": "Ground ball. Thrown out.",
  "fly-out": "In the air. Caught.",
  "sac-fly": "Deep enough. Run scores.",
  "bunt-out": "Bunt. Thrown out.",
  "bunt-down": "Bunt. Beats it out.",
  single: "Through the hole.",
  double: "Into the gap.",
  hr: "Gone.",
};

export const TWO_STRIKE_FOUL_SUFFIX = " Still two.";

/** One readable callout per resolved pitch; two-strike fouls add the count sentence. */
export function resultReadout(opts: { beat: FieldBeat; twoStrikeHold: boolean }): string {
  const line = RESULT_LINE[opts.beat];
  if (opts.twoStrikeHold && (opts.beat === "foul" || opts.beat === "foul-tip")) return `${line}${TWO_STRIKE_FOUL_SUFFIX}`;
  return line;
}

/**
 * The result stamp: the verdict slams in big and bilingual after the
 * picture has already said it (Uma's race-finish stamp). The beats that end
 * an at-bat get one; fouls, balls and called strikes stay quiet so the stamp
 * keeps its weight. An out in play gets the small one: slate, set down
 * rather than slammed, and gone sooner, so the at-bat still ends on a stamp
 * without the out shouting like a hit.
 */
export interface ResultStamp {
  jp: string;
  en: string;
  tone: "gold" | "coral" | "teal" | "slate";
}

/**
 * Whose date the stamp is coloured for. The race is the batter's: her hit is
 * teal, her strikeout coral. The mound is the pitcher's, so the same beats
 * read the other way: her strikeout is gold, a hit or a walk against her is
 * the small slate set-down, an out she gets is teal, a home run off her coral.
 */
export type StampSide = "batter" | "pitcher";

/** A stamp key: a beat that ends an at-bat, or the run she scores on the bases (the race's 得点). */
export type StampKey = FieldBeat | "score";

const OUT_STAMP: ResultStamp = { jp: "アウト", en: "Out", tone: "slate" };

const STAMPS: Partial<Record<FieldBeat, ResultStamp>> = {
  hr: { jp: "ホームラン", en: "Home run", tone: "gold" },
  double: { jp: "ツーベース", en: "Double", tone: "teal" },
  single: { jp: "ヒット", en: "Base hit", tone: "teal" },
  walk: { jp: "フォアボール", en: "Ball four", tone: "teal" },
  "sac-fly": { jp: "犠牲フライ", en: "Sac fly", tone: "teal" },
  "bunt-down": { jp: "バントヒット", en: "Bunt single", tone: "teal" },
  "grounder-out": OUT_STAMP,
  "fly-out": OUT_STAMP,
  "bunt-out": OUT_STAMP,
};

/** The pitcher's side: the same words, her tones. A beat that isn't listed keeps the batter's tone. */
const PITCHER_TONES: Partial<Record<FieldBeat, ResultStamp["tone"]>> = {
  hr: "coral",
  double: "slate",
  single: "slate",
  walk: "slate",
  "sac-fly": "slate",
  "bunt-down": "slate",
  "grounder-out": "teal",
  "fly-out": "teal",
  "bunt-out": "teal",
};

/** She comes home: gold, the same slam as a hit (the race lays it over her trot). */
export const SCORE_STAMP: ResultStamp = { jp: "得点", en: "Run scores", tone: "gold" };

export function resultStamp(beat: StampKey | null, swung: boolean, side: StampSide = "batter"): ResultStamp | null {
  if (!beat) return null;
  if (beat === "score") return SCORE_STAMP;
  if (beat === "k") {
    const tone = side === "pitcher" ? "gold" : "coral";
    return swung ? { jp: "三振", en: "Strike three", tone } : { jp: "見逃し三振", en: "Caught looking", tone };
  }
  const stamp = STAMPS[beat];
  if (!stamp) return null;
  if (side === "batter") return stamp;
  return { ...stamp, tone: PITCHER_TONES[beat] ?? stamp.tone };
}

/** The stamp lands just after the settle still (CONTACT_HOLD_MS) has spoken, and clears before the next pick. */
export const STAMP_DELAY_MS = 360;
export const STAMP_HOLD_MS = 1500;
/** A home run is its own moment: the stamp stays up while the park goes off. */
export const HR_STAMP_HOLD_MS = 2600;
/** An out in play says it and steps aside: the card is right behind it. */
export const OUT_STAMP_HOLD_MS = 900;
/** The run she scores holds the card this long under its stamp. */
export const SCORE_STAMP_HOLD_MS = 1200;

export function stampHoldMs(beat: StampKey | null): number {
  if (beat === "hr") return HR_STAMP_HOLD_MS;
  if (beat === "score") return SCORE_STAMP_HOLD_MS;
  if (beat === "grounder-out" || beat === "fly-out" || beat === "bunt-out") return OUT_STAMP_HOLD_MS;
  return STAMP_HOLD_MS;
}

export function stampVisible(sinceResolveMs: number, beat: StampKey | null = null): boolean {
  return sinceResolveMs >= STAMP_DELAY_MS && sinceResolveMs < STAMP_DELAY_MS + stampHoldMs(beat);
}

/** The name on the home run's plate: kana and number for the cast, the name alone for an academy bat. */
export interface HrNameplate {
  name: string;
  jp: string | null;
  number: number | null;
}

/**
 * The home run's lower third, after the kana. The race names the hitter and
 * her number; the mound names the hitter and who it came off, so the plate
 * is about the pitcher whose date it is: "Nishi · off Reina #18".
 */
export function hrPlateLine(hitter: HrNameplate, side: StampSide = "batter", pitcher: HrNameplate | null = null): string {
  if (side === "pitcher" && pitcher) {
    return `${hitter.name} · off ${pitcher.name}${pitcher.number !== null ? ` #${pitcher.number}` : ""}`;
  }
  return `${hitter.name}${hitter.number !== null ? ` · #${hitter.number}` : ""}`;
}

export const BATTER_POSES = ["stance", "load", "cut", "contact", "follow", "take", "celebrate", "crushed", "trot"] as const;
export type BatterPose = (typeof BATTER_POSES)[number];
export const PITCHER_POSES = ["set", "windup", "release", "follow"] as const;
export type PitcherPose = (typeof PITCHER_POSES)[number] | "k";
export const MONEY_BEATS = ["hr", "k", "walk", "spurt", "unique", "curtain"] as const;
export type MoneyBeat = (typeof MONEY_BEATS)[number];

const HITTER_CLIPS = ["k", "hr"] as const;
const PITCHER_CLIPS = ["k", "walk"] as const;

/** Binding cast bar: a girl is startable only with this pack. Portrait is not a career. */
export function filmReady(id: CharacterId, manifest: ActionManifest | null): boolean {
  const girl = manifest?.girls[id];
  if (!girl) return false;
  const stills = girl.role === "pitcher" ? PITCHER_POSES : BATTER_POSES;
  const clips = girl.role === "pitcher" ? PITCHER_CLIPS : HITTER_CLIPS;
  return stills.every((p) => Boolean(girl.stills[p])) && clips.every((c) => Boolean(girl.clips[c]));
}

/** Hybrid E farm / LOOK angles. Side-scroll is mini-games only — not listed. */
export const ACTION_ANGLES = ["mound_close", "three_quarter", "profile", "catcher_crop"] as const;
export type ActionAngle = (typeof ACTION_ANGLES)[number];

/**
 * Sit / flight hero: mound looking in, close on her face (Pretty Derby watch-her).
 * Catcher-crop is farm-only. Go / swing cut-ins use the action still angle.
 */
export const SIT_ANGLE: ActionAngle = "mound_close";
export const CUT_ANGLE: ActionAngle = "three_quarter";

/** Default angle for a role on the featured plate (PA film bible §1). */
export function defaultAngleFor(role: "batter" | "pitcher"): ActionAngle {
  return role === "batter" ? SIT_ANGLE : "three_quarter";
}

/** Five-family stranger gate (PA film bible §2). */
export const OUTCOME_FAMILIES = ["hit", "foul", "tip", "whiff", "take"] as const;
export type OutcomeFamily = (typeof OUTCOME_FAMILIES)[number];

export function outcomeFamily(beat: FieldBeat | null, swung: boolean): OutcomeFamily | null {
  if (!beat) return null;
  if (beat === "foul-tip") return "tip";
  if (beat === "foul") return "foul";
  if (beat === "miss") return "whiff";
  if (beat === "k") return swung ? "whiff" : "take";
  if (beat === "take-strike" || beat === "ball" || beat === "walk") return "take";
  if (ballLeavesBat(beat)) return "hit";
  return swung ? "whiff" : "take";
}

/**
 * Cut-in strip implied by the family. Used by tests and farm QA; `pictureFor`
 * stays the runtime authority and must agree.
 */
export function familyCutIn(family: OutcomeFamily | null): readonly BatterPose[] | null {
  if (family === "hit" || family === "foul" || family === "tip") return ["load", "cut", "contact"];
  if (family === "whiff") return ["load", "cut"];
  return null;
}

export interface ActionStill {
  url: string;
  bytes: number;
  w: number;
  h: number;
  /** Hybrid E angle this still was farmed at. Optional on legacy manifests. */
  angle?: ActionAngle;
  /** Farm provenance: which authored clip and time produced the still. */
  source?: { clip: string; t: number };
}

export interface ActionClip {
  url: string;
  bytes: number;
  w: number;
  h: number;
  durationS: number;
  /** Seconds into the clip where contact / release / the sting lands. Aligned to the resolve cue. */
  markerS: number;
  poster?: string;
  angle?: ActionAngle;
  /**
   * Composed from imported anime stills (`scripts/art/money-clips.mjs`), not
   * farmed from the 3D scene. Wins over farm renders in `clipFor`; the farm
   * never overwrites it.
   */
  authored?: true;
  /** Provenance: the segments stitched at `fps` (farm clips, or stills for authored ones). */
  source?: { fps: number; segments: [clip: string, from: number, to: number][] };
}

export interface GirlArt {
  role: "batter" | "pitcher";
  stills: Partial<Record<BatterPose | PitcherPose, ActionStill>>;
  clips: Partial<Record<MoneyBeat, ActionClip>>;
}

export interface ActionManifest {
  version: 1;
  renderedAt: string;
  /** Declares Hybrid E when present; older manifests omit it. */
  film?: "hybrid-e";
  girls: Partial<Record<CharacterId, GirlArt>>;
}

export const ACTION_MANIFEST_URL = "/art/action/manifest.json";
/** Stills are 3:4, the portrait frame. */
export const STILL_W = 720;
export const STILL_H = 960;
export const STILL_QUALITY = 82;
export const CLIP_FPS = 24;

/** Hook plan §3.2: ≤ 6 MB stills, ≤ 25 MB clips, lazy per girl. */
export const STILLS_BUDGET_BYTES = 6_000_000;
export const CLIPS_BUDGET_BYTES = 25_000_000;
export const GIRL_STILLS_BUDGET_BYTES = 1_200_000;
export const GIRL_CLIPS_BUDGET_BYTES = 4_500_000;

/** Cut-in strip on Go: one still per step, a hitstop on contact. Race-view: a sentence, not a strobe. */
export const CUT_IN_STEP_MS = 120;
export const CUT_IN_HITSTOP_MS = 160;
/** The contact still holds this long before the follow-through still. */
export const CONTACT_HOLD_MS = 280;

export interface ActionView {
  stage: Stage;
  beat: FieldBeat | null;
  swung: boolean;
  swingKind: SwingKind | null;
  call: DuelCall | null;
  /** Flight progress, render-only. */
  u: number;
  /** Where the Go landed on the flight clock; null until the tap. */
  tappedAtU: number | null;
  /** Wall clock of the resolve cue; null before it. */
  resolvedAtMs: number | null;
  nowMs: number;
  reduced: boolean;
  /**
   * The done panel: the date is over and her still holds how it went, never a
   * replay. "met" / "missed" puts the date's verdict on her face; true settles
   * the closing beat as itself (a day with no verdict: the exhibition, the cage,
   * the weekly look). Unset mid-date, and on the mound.
   */
  settled?: DateVerdict | true | null;
}

/** How a date ended, for her face at the done panel. */
export type DateVerdict = "met" | "missed";

export interface ActionPicture {
  pitcher: PitcherPose;
  batter: BatterPose;
  /** Stills to flash on Go, in order; null when nothing was swung. */
  cutIn: readonly BatterPose[] | null;
  clip: MoneyBeat | null;
  /** Outcome card copy; null before the resolve cue. */
  card: string | null;
  /** Slow push-in on the pitcher during the wind-up. */
  pushIn: boolean;
  /** Hybrid E five-family tag after resolve; null before. */
  family: OutcomeFamily | null;
  /** Angle the focused plate should prefer. */
  angle: ActionAngle;
}

export interface StingFlags {
  spurt?: boolean;
  unique?: boolean;
  curtain?: boolean;
}

/** Which money-beat clip a resolve deserves. Beats first, then stings by priority. */
export function moneyBeatFor(beat: FieldBeat | null, flags: StingFlags = {}): MoneyBeat | null {
  if (beat === "hr") return "hr";
  if (beat === "k") return "k";
  if (beat === "walk") return "walk";
  if (flags.curtain) return "curtain";
  if (flags.unique) return "unique";
  if (flags.spurt) return "spurt";
  return null;
}

/** Field, reaction, and the between-pitch idle while the last beat is still on the view. */
const AFTER_STAGES: ReadonlySet<Stage> = new Set(["field", "reaction", "idle"]);

/**
 * The still that names the beat once the swing has settled (stranger test
 * 2026-09-17: five of five read the HR marker as a hit and the walk marker
 * as a K, because those beats reused the contact / follow frames). After
 * CONTACT_HOLD_MS a home run is her watching it go, a strikeout is her
 * crushed, a walk is the bat down and the trot to first. Null keeps the
 * row's own pose.
 *
 * At the done panel a verdict wins over the beat: a date she got is her
 * celebrating (a closing home run was reading as 達成 over the contact
 * grimace), one she didn't is her crushed. A met date that closed on a walk
 * or on the bases (the race hands a running close in as a walk) keeps the
 * trot: how she got there is the picture.
 */
export function settledBatterPose(beat: FieldBeat | null, verdict: DateVerdict | null = null): BatterPose | null {
  if (verdict === "missed") return "crushed";
  if (verdict === "met") return beat === "walk" ? "trot" : "celebrate";
  if (beat === "hr") return "celebrate";
  if (beat === "k") return "crushed";
  if (beat === "walk") return "trot";
  return null;
}

/**
 * The ball's flight on the 3:4 frame, mound → plate. u=0 is the release
 * point high in the frame; u=1 is the plate, mid-zone on her load still
 * (62% down, give or take the location), not her ankles. It grows as it
 * comes, so it reads as a ball coming at her rather than a speck on the dirt.
 * `loc` fans the last stretch so where it crossed still reads. Percent of the
 * frame; `angleDeg` is the direction of travel on screen (0 is right, 90 is
 * straight down), for the trail behind it.
 */
export const FLIGHT_START_TOP = 40;
export const FLIGHT_DROP = 22;
export function plate2dFlight(opts: { u: number; loc: { x: number; y: number } }): {
  left: number;
  top: number;
  scale: number;
  angleDeg: number;
} {
  const t = Math.max(0, Math.min(1, Number.isFinite(opts.u) ? opts.u : 0));
  const aimX = (opts.loc.x / 3 - 0.5) * 16;
  const aimY = (opts.loc.y / 3 - 0.5) * 8;
  // The frame is 3:4, so a percent of its height is 4/3 of a percent of its width.
  const angleDeg = (Math.atan2((FLIGHT_DROP + aimY) * (4 / 3), aimX) * 180) / Math.PI;
  return {
    left: 50 + aimX * t,
    top: FLIGHT_START_TOP + FLIGHT_DROP * t + aimY * t,
    scale: 0.6 + t * 1.9,
    angleDeg,
  };
}

/**
 * The race decides swing or take at release, so `tappedAtU` is known for the
 * whole flight. Showing her cut before the ball gets there gives the pitch
 * away; the cut lands this far (flight progress) ahead of her swing point.
 */
export const CUT_LEAD_U = 0.08;

/** True once the flight has reached her swing; before that a swing and a take look the same. */
export function swingShowing(view: Pick<ActionView, "u" | "tappedAtU">): boolean {
  return view.tappedAtU !== null && view.u >= view.tappedAtU - CUT_LEAD_U;
}

export function pictureFor(view: ActionView, flags: StingFlags = {}, twoStrikeHold = false): ActionPicture {
  const picture = playPicture(view, flags, twoStrikeHold);
  if (!view.settled || view.stage === "prepare" || view.stage === "flight") return picture;
  // The done panel. A closing beat swapped in there has no clock (no stamp, no replay) and is
  // settled at once. The last pitch playing as itself keeps its contact hold, then its own
  // settled still while its stamp is up, so she never celebrates under a "Strike three".
  if (view.resolvedAtMs !== null) {
    const since = view.nowMs - view.resolvedAtMs;
    if (since < CONTACT_HOLD_MS) return picture;
    if (view.settled !== true && since < STAMP_DELAY_MS + stampHoldMs(view.beat)) return pictureFor({ ...view, settled: true }, flags, twoStrikeHold);
  }
  const batter = settledBatterPose(view.beat, view.settled === true ? null : view.settled) ?? (picture.batter === "contact" ? "follow" : picture.batter);
  return batter === picture.batter ? picture : { ...picture, batter };
}

/** The picture the pitch itself paints, before the done panel settles her. */
function playPicture(view: ActionView, flags: StingFlags, twoStrikeHold: boolean): ActionPicture {
  const { stage, beat } = view;
  const tapped = swingShowing(view);
  if (stage === "prepare") {
    return {
      pitcher: "windup",
      batter: "load",
      cutIn: null,
      clip: null,
      card: null,
      pushIn: !view.reduced,
      family: null,
      angle: defaultAngleFor("pitcher"),
    };
  }
  if (stage === "flight") {
    if (tapped) {
      return {
        pitcher: "release",
        batter: "cut",
        cutIn: ["load", "cut"],
        clip: null,
        card: null,
        pushIn: false,
        family: null,
        angle: CUT_ANGLE,
      };
    }
    const early = view.u < RELEASE_HOLD_U;
    return {
      pitcher: "release",
      batter: view.call === "take" ? "take" : "load",
      cutIn: null,
      clip: null,
      card: null,
      pushIn: false,
      family: null,
      angle: defaultAngleFor(early ? "pitcher" : "batter"),
    };
  }
  if (stage === "idle" && beat === "walk" && !view.swung) {
    return {
      pitcher: "set",
      batter: "trot",
      cutIn: null,
      clip: null,
      card: null,
      pushIn: false,
      family: null,
      angle: defaultAngleFor("batter"),
    };
  }
  if (AFTER_STAGES.has(stage) && beat) {
    const card = resultReadout({ beat, twoStrikeHold });
    const clip = moneyBeatFor(beat, flags);
    const family = outcomeFamily(beat, view.swung);
    const since = view.resolvedAtMs === null ? 0 : view.nowMs - view.resolvedAtMs;
    const settled = since >= CONTACT_HOLD_MS ? settledBatterPose(beat) : null;
    if (!view.swung) {
      return {
        pitcher: beat === "k" ? "k" : "follow",
        batter: settled ?? "take",
        cutIn: null,
        clip,
        card,
        pushIn: false,
        family,
        angle: SIT_ANGLE,
      };
    }
    if (ballLeavesBat(beat)) {
      const batter: BatterPose = since >= CONTACT_HOLD_MS ? (settled ?? "follow") : "contact";
      return {
        pitcher: "follow",
        batter,
        cutIn: ["load", "cut", "contact"],
        clip,
        card,
        pushIn: false,
        family,
        angle: CUT_ANGLE,
      };
    }
    return {
      pitcher: "follow",
      batter: settled ?? "follow",
      cutIn: ["load", "cut"],
      clip,
      card,
      pushIn: false,
      family,
      angle: CUT_ANGLE,
    };
  }
  return {
    pitcher: "set",
    batter: "stance",
    cutIn: null,
    clip: null,
    card: null,
    pushIn: false,
    family: null,
    angle: defaultAngleFor("batter"),
  };
}

/** Flight holds the pitcher's release still this far into the flight before the batter plate. */
export const RELEASE_HOLD_U = 0.2;
export type ActionFocus = "pitcher" | "batter";

/**
 * Which plate fills the frame. The wind-up is the pitcher's when she is in
 * the cast; academy (no plate) never takes the frame. The first part of the
 * flight is her release; the Go, the contact and the reaction are the
 * batter's. At rest the batter waits under the sit grid.
 */
export function focusFor(view: Pick<ActionView, "stage" | "u" | "tappedAtU">, hasPitcher = true): ActionFocus {
  if (!hasPitcher) return "batter";
  if (view.stage === "prepare") return "pitcher";
  if (view.stage === "flight" && !swingShowing(view) && view.u < RELEASE_HOLD_U) return "pitcher";
  return "batter";
}

/** Whose money-beat clip plays. A walk is the girl who reached, even on a take. */
export function clipOwner(view: Pick<ActionView, "swung" | "beat">): ActionFocus {
  if (view.beat === "walk" || view.beat === "hr") return "batter";
  if (view.beat === "k" && !view.swung) return "pitcher";
  return view.swung ? "batter" : "pitcher";
}

/**
 * The clip to play for a picture, preferring the owner's, else the other
 * girl's. Authored anime clips win over farm renders regardless of owner
 * (AAA lock 2026-09-18): a 3D farm Reina must never cut into the anime plate
 * when either girl has a drawn clip for the beat.
 */
export function clipFor(
  beat: MoneyBeat | null,
  owner: ActionFocus,
  girls: { batter: GirlArt | undefined; pitcher: GirlArt | undefined },
): { role: ActionFocus; clip: ActionClip } | null {
  if (!beat) return null;
  const order: ActionFocus[] = owner === "batter" ? ["batter", "pitcher"] : ["pitcher", "batter"];
  for (const authoredOnly of [true, false]) {
    for (const role of order) {
      const clip = girls[role]?.clips[beat];
      if (clip && (!authoredOnly || clip.authored)) return { role, clip };
    }
  }
  return null;
}

/**
 * Seek so the clip's marker frame is on screen at the resolve cue. A late
 * start seeks forward; the marker is never shown late. Clamped to the clip.
 */
export function clipSeekS(clip: Pick<ActionClip, "markerS" | "durationS">, resolvedAtMs: number, nowMs: number): number {
  const s = clip.markerS + Math.max(0, nowMs - resolvedAtMs) / 1000;
  return Math.max(0, Math.min(clip.durationS, s));
}

export function clipEndsAtMs(clip: Pick<ActionClip, "markerS" | "durationS">, resolvedAtMs: number): number {
  return resolvedAtMs + (clip.durationS - clip.markerS) * 1000;
}

/** After the money clip, the done card keeps that beat's poster. The next sit goes back to her set. */
export function holdBeatPoster(opts: { clipActive: boolean; stage: string; poster: string | null | undefined }): string | null {
  if (opts.clipActive || !opts.poster) return null;
  if (opts.stage !== "reaction" && opts.stage !== "field") return null;
  return opts.poster;
}

/**
 * Which still of the cut-in strip to draw `elapsedMs` after the Go. Each
 * step lasts CUT_IN_STEP_MS; the contact still adds a hitstop. Reduced
 * motion shows only the last still. Returns -1 once the strip is over.
 */
export function cutInFrame(cutIn: readonly BatterPose[], elapsedMs: number, reduced = false): number {
  if (cutIn.length === 0) return -1;
  if (reduced) return elapsedMs < CUT_IN_STEP_MS + CUT_IN_HITSTOP_MS ? cutIn.length - 1 : -1;
  let t = 0;
  for (let i = 0; i < cutIn.length; i += 1) {
    const hold = CUT_IN_STEP_MS + (cutIn[i] === "contact" ? CUT_IN_HITSTOP_MS : 0);
    if (elapsedMs < t + hold) return i;
    t += hold;
  }
  return -1;
}

export function cutInTotalMs(cutIn: readonly BatterPose[], reduced = false): number {
  if (reduced) return cutIn.length ? CUT_IN_STEP_MS + CUT_IN_HITSTOP_MS : 0;
  return cutIn.reduce((ms, p) => ms + CUT_IN_STEP_MS + (p === "contact" ? CUT_IN_HITSTOP_MS : 0), 0);
}

/** Missing still → the nearest earlier pose in the row, so a frame is never empty. */
export function fallbackPose<P extends BatterPose | PitcherPose>(
  want: P,
  have: ReadonlySet<string> | readonly string[],
  row: readonly P[],
): P | null {
  const has = have instanceof Set ? have : new Set(have);
  const i = row.indexOf(want);
  if (i < 0) return null;
  for (let j = i; j >= 0; j -= 1) if (has.has(row[j])) return row[j];
  for (let j = i + 1; j < row.length; j += 1) if (has.has(row[j])) return row[j];
  return null;
}

export function stillFor(girl: GirlArt | undefined, pose: BatterPose | PitcherPose): ActionStill | null {
  if (!girl) return null;
  const kClip = girl.clips.k;
  if (pose === "k" && girl.role === "pitcher" && kClip?.poster) {
    const clip = kClip;
    return { url: kClip.poster, bytes: clip.bytes, w: clip.w, h: clip.h, angle: clip.angle };
  }
  const row: readonly (BatterPose | PitcherPose)[] = girl.role === "batter" ? BATTER_POSES : PITCHER_POSES;
  const key = fallbackPose(pose, Object.keys(girl.stills), row);
  return key ? (girl.stills[key] ?? null) : null;
}

/** Stills first, then posters, then clips: the lazy per-girl order. */
export function actionAssetUrls(manifest: ActionManifest, girlId: CharacterId): string[] {
  const girl = manifest.girls[girlId];
  if (!girl) return [];
  const stills = Object.values(girl.stills).map((s) => s.url);
  const clips = Object.values(girl.clips);
  const posters = clips.map((c) => c.poster).filter((p): p is string => Boolean(p));
  return [...stills, ...posters, ...clips.map((c) => c.url)];
}

export interface BudgetReport {
  stillsBytes: number;
  clipsBytes: number;
  perGirl: Partial<Record<CharacterId, { stillsBytes: number; clipsBytes: number }>>;
  over: string[];
}

export function actionBudget(manifest: ActionManifest): BudgetReport {
  const report: BudgetReport = { stillsBytes: 0, clipsBytes: 0, perGirl: {}, over: [] };
  for (const [id, girl] of Object.entries(manifest.girls) as [CharacterId, GirlArt][]) {
    const stillsBytes = Object.values(girl.stills).reduce((n, s) => n + s.bytes, 0);
    const clipsBytes = Object.values(girl.clips).reduce((n, c) => n + c.bytes, 0);
    report.perGirl[id] = { stillsBytes, clipsBytes };
    report.stillsBytes += stillsBytes;
    report.clipsBytes += clipsBytes;
    if (stillsBytes > GIRL_STILLS_BUDGET_BYTES) report.over.push(`${id}: stills ${stillsBytes} > ${GIRL_STILLS_BUDGET_BYTES}`);
    if (clipsBytes > GIRL_CLIPS_BUDGET_BYTES) report.over.push(`${id}: clips ${clipsBytes} > ${GIRL_CLIPS_BUDGET_BYTES}`);
  }
  if (report.stillsBytes > STILLS_BUDGET_BYTES) report.over.push(`stills ${report.stillsBytes} > ${STILLS_BUDGET_BYTES}`);
  if (report.clipsBytes > CLIPS_BUDGET_BYTES) report.over.push(`clips ${report.clipsBytes} > ${CLIPS_BUDGET_BYTES}`);
  return report;
}

export function posesForRole(role: GirlArt["role"]): readonly (BatterPose | PitcherPose)[] {
  return role === "batter" ? BATTER_POSES : PITCHER_POSES;
}

/** The still URLs the farm writes for a girl, without reading the manifest (title preloads). */
export function actionStillHrefs(girl: CharacterId, role: GirlArt["role"]): string[] {
  return posesForRole(role).map((pose) => `/art/action/${girl}/${pose}.webp`);
}

/** Title preloads (spec §3.3): the manifest, then Aoi's and Reina's stills. */
export const ACTION_PRELOAD_HREFS: readonly string[] = [
  ACTION_MANIFEST_URL,
  ...actionStillHrefs("aoi", "batter"),
  ...actionStillHrefs("reina", "pitcher"),
];

/** Aoi five-family stranger-gate samples (PA film bible §2). */
export const AOI_FAMILY_REEL: readonly { family: OutcomeFamily; beat: FieldBeat; swung: boolean; pose: BatterPose }[] = [
  { family: "hit", beat: "single", swung: true, pose: "contact" },
  { family: "foul", beat: "foul", swung: true, pose: "contact" },
  { family: "tip", beat: "foul-tip", swung: true, pose: "contact" },
  { family: "whiff", beat: "miss", swung: true, pose: "follow" },
  { family: "take", beat: "take-strike", swung: false, pose: "take" },
];
