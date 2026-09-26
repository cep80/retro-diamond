/**
 * Named rivals change the competition. Reina locates, Sol overpowers, Kira
 * compresses the late innings. Adaptation reads only what the player has
 * actually done at the plate (`run.tells`), never hidden difficulty counters,
 * and every adaptation is written on the scouting card before it is used.
 */
import { clamp } from "./core/rng.ts";
import type { Ballplayer, PitchType } from "./core/zone.ts";
import type { Cell, Loc, PitchCall } from "./core/zone.ts";
import { academyBatter, academyPitcher, traineeBatter } from "./actors.ts";
import { isPitcherStyle, sheet } from "./bible.ts";
import { weeklySit } from "./pilgrimage.ts";
import { duelFastballRate } from "./duel.ts";
import type { CharacterId, Tells, TraineeRun } from "./types.ts";

export type RivalArmId = CharacterId | "academy";
export type RivalIdentity = "locate" | "heat" | "urgency" | "tryout";

export interface RivalProfile {
  id: RivalArmId;
  name: string;
  jp: string | null;
  number: number | null;
  identity: RivalIdentity;
  /** Probability shift toward the strike zone on non-chase pitches. */
  zoneBias: number;
  /** How hard she hugs the edge when aiming at a cell (0 heart, 1 chalk). */
  edgeBias: number;
  /** Shift on secondary-pitch usage. */
  secondaryBias: number;
  /** Flight-time multiplier. <1 is faster. */
  speedMult: number;
  /** Extra bias toward the top of the zone (Sol climbs the ladder). */
  upBias: number;
  /** Two player-facing tells. What to expect before the first pitch. */
  tells: [string, string];
  /** One line on how she reads hitters. */
  reads: string;
  /** Innings she appears in for compressed roles, or null for the whole game. */
  entersInning: number | null;
}

const PROFILES: Record<RivalArmId, RivalProfile> = {
  academy: {
    id: "academy",
    name: "Academy Arm",
    jp: null,
    number: null,
    identity: "tryout",
    zoneBias: 0,
    edgeBias: 0.4,
    secondaryBias: 0,
    speedMult: 1,
    upBias: 0,
    tells: ["Tryout arm. Throws strikes; not much bite.", "Fastball first. The secondary comes later in the count."],
    reads: "Does not scout. Every hitter gets the same look.",
    entersInning: null,
  },
  reina: {
    id: "reina",
    name: "Reina",
    jp: "レイナ",
    number: 18,
    identity: "locate",
    zoneBias: 0.08,
    edgeBias: 0.85,
    secondaryBias: 0.05,
    speedMult: 1.02,
    upBias: 0,
    tells: ["Lives on the corners. Almost never misses over the heart.", "Never walks anyone. Sitting on a cell is how you beat her."],
    reads: "She reads where you sit. If you never chase, she stays on the chalk.",
    entersInning: null,
  },
  sol: {
    id: "sol",
    name: "Sol",
    jp: "ソル",
    number: 21,
    identity: "heat",
    zoneBias: 0.04,
    edgeBias: 0.5,
    secondaryBias: -0.22,
    speedMult: 0.88,
    upBias: 0.6,
    tells: ["Fastball up. The window is shorter than anything you've seen.", "Climbs the ladder with two strikes. Sit high or take it."],
    reads: "She reads your timing. Late swings bring more heat; early swings bring the changeup.",
    entersInning: null,
  },
  kira: {
    id: "kira",
    name: "Kira",
    jp: "キラ",
    number: 99,
    identity: "urgency",
    zoneBias: 0.1,
    edgeBias: 0.6,
    secondaryBias: 0.12,
    speedMult: 0.93,
    upBias: 0,
    tells: ["Comes in from the pen for the late innings. Attacks the first pitch.", "Two-strike slider, down and away. Every time."],
    reads: "She reads the first pitch. Jump it too often and it starts off the plate.",
    entersInning: 8,
  },
  aoi: {
    id: "aoi",
    name: "Aoi",
    jp: "アオイ",
    number: 1,
    identity: "tryout",
    zoneBias: 0,
    edgeBias: 0.4,
    secondaryBias: 0,
    speedMult: 1,
    upBias: 0,
    tells: ["Not a pitcher.", "Not a pitcher."],
    reads: "",
    entersInning: null,
  },
  miki: {
    id: "miki",
    name: "Miki",
    jp: "ミキ",
    number: 4,
    identity: "tryout",
    zoneBias: 0,
    edgeBias: 0.4,
    secondaryBias: 0,
    speedMult: 1,
    upBias: 0,
    tells: ["Not a pitcher.", "Not a pitcher."],
    reads: "",
    entersInning: null,
  },
  yuki: {
    id: "yuki",
    name: "Yuki",
    jp: "ユキ",
    number: 2,
    identity: "tryout",
    zoneBias: 0,
    edgeBias: 0.4,
    secondaryBias: 0,
    speedMult: 1,
    upBias: 0,
    tells: ["Not a pitcher.", "Not a pitcher."],
    reads: "",
    entersInning: null,
  },
};

export function rivalProfile(id: RivalArmId): RivalProfile {
  return PROFILES[id];
}

/** The arm a hitter's story puts on the mound. Practice stays anonymous. */
export function hitterRivalArm(id: CharacterId): CharacterId {
  if (id === "aoi") return "reina";
  if (id === "miki") return "sol";
  if (id === "yuki") return "reina";
  return sheet(id).rival;
}

/**
 * Who starts the game against her, by date. Kira closes the late innings of
 * the Stretch, Series, and Finale regardless of who started.
 */
export function opposingArm(run: Pick<TraineeRun, "characterId">, kind: string): RivalArmId {
  if (kind === "practice") return "academy";
  if (kind === "weekly") {
    const a = weeklySit().arm;
    return a === run.characterId ? (a === "reina" ? "sol" : "reina") : a;
  }
  if (kind === "lantern-classic") return "reina";
  if (kind === "night-classic") return "sol";
  return hitterRivalArm(run.characterId);
}

/** The arm on the mound for a given inning of a given date. */
export function armForInning(run: Pick<TraineeRun, "characterId">, kind: string, inning: number): RivalArmId {
  const starter = opposingArm(run, kind);
  if ((kind === "stretch" || kind === "series" || kind === "finale") && inning >= (PROFILES.kira.entersInning ?? 8)) {
    if (run.characterId !== "kira") return "kira";
  }
  return starter;
}

function yearScale(year: number) {
  return year <= 1 ? -2 : year === 2 ? 0 : 1;
}

/** A rival as a `Ballplayer` the plate math understands. Year 1 forms are rawer. */
export function rivalPlayer(id: RivalArmId, year: number): Ballplayer {
  const base = academyPitcher();
  if (id === "academy") return base;
  const who = sheet(id);
  const scale = yearScale(year);
  return {
    ...base,
    id: `rival-${id}`,
    name: who.name,
    stuff: clamp(who.stats.stuff + 3 + scale, 1, 20),
    control: clamp(who.stats.control + 2 + scale, 1, 20),
    stamina: clamp(who.stats.stamina + scale, 1, 20),
    eye: who.stats.eye,
    contact: who.stats.contact,
    power: who.stats.power,
    speed: who.stats.speed,
  };
}

/** Where the cast hitter bats in the order a pitcher faces (0-based, of six). Aoi leads off; anyone else hits third. */
export function rivalBatSlot(id: CharacterId): number {
  return pitcherRivalBat(id) === "aoi" ? 0 : 2;
}

/** The lineup a pitcher works through: academy bats with the cast hitter in her slot (rivalBatSlot). */
export function rivalLineup(run: Pick<TraineeRun, "characterId" | "year">, index: number): Ballplayer {
  const slot = index % 6;
  if (slot !== rivalBatSlot(run.characterId)) return academyBatter(index);
  const cast = pitcherRivalBat(run.characterId);
  const who = sheet(cast);
  const scale = yearScale(run.year);
  const p = traineeBatter({
    characterId: cast,
    stats: {
      ...who.stats,
      contact: clamp(who.stats.contact + 2 + scale, 1, 20),
      eye: clamp(who.stats.eye + 1 + scale, 1, 20),
      power: clamp(who.stats.power + scale, 1, 20),
    },
  });
  return { ...p, id: `rival-bat-${cast}` };
}

export function pitcherRivalBat(id: CharacterId): CharacterId {
  if (id === "reina") return "miki";
  if (id === "sol") return "aoi";
  if (id === "kira") return "aoi";
  return "aoi";
}

/**
 * Who bats the weekly look. It is always a plate appearance and never
 * touches the career, so a hitter lead bats it herself (null = use the
 * career run), a pitcher lead hands the bat to her rival, and a player
 * with no career gets Aoi.
 */
export function weeklyGuestFor(lead: CharacterId | null): CharacterId | null {
  if (!lead) return "aoi";
  return isPitcherStyle(sheet(lead).style) ? pitcherRivalBat(lead) : null;
}

export type Adaptation =
  | { kind: "first-pitch-off"; line: string }
  | { kind: "fill-zone"; line: string }
  | { kind: "bury"; line: string }
  | { kind: "speed-up"; line: string }
  | { kind: "slow-down"; line: string };

export const ADAPT_MIN_SAMPLES = 4;

function rate(a: number, b: number) {
  const n = a + b;
  return n === 0 ? null : a / n;
}

/**
 * What a rival is allowed to conclude from observable history. Returns at most
 * one adaptation so the player can always name what changed.
 */
export function rivalAdaptation(profile: RivalProfile, tells: Tells): Adaptation | null {
  if (profile.identity === "tryout") return null;
  const fp = rate(tells.firstPitchSwings, tells.firstPitchTakes);
  const chase = rate(tells.chaseSwings, tells.chaseTakes);
  const late = rate(tells.lateSwings, tells.earlySwings);
  const fpN = tells.firstPitchSwings + tells.firstPitchTakes;
  const chaseN = tells.chaseSwings + tells.chaseTakes;
  const timeN = tells.lateSwings + tells.earlySwings;

  if (profile.identity === "urgency" && fpN >= ADAPT_MIN_SAMPLES && fp !== null && fp >= 0.6) {
    return { kind: "first-pitch-off", line: `${profile.name} has watched you jump the first pitch. Expect it off the plate.` };
  }
  if (profile.identity === "heat" && timeN >= ADAPT_MIN_SAMPLES && late !== null) {
    if (late >= 0.65) return { kind: "speed-up", line: `${profile.name} has seen you late. More heat, higher.` };
    if (late <= 0.35) return { kind: "slow-down", line: `${profile.name} has seen you early. The changeup is coming.` };
  }
  if (profile.identity === "locate" && chaseN >= ADAPT_MIN_SAMPLES && chase !== null) {
    if (chase <= 0.25) return { kind: "fill-zone", line: `${profile.name} knows you don't chase. She'll work the zone, on the chalk.` };
    if (chase >= 0.6) return { kind: "bury", line: `${profile.name} knows you chase. Two strikes, she buries it.` };
  }
  if (fpN >= ADAPT_MIN_SAMPLES && fp !== null && fp >= 0.7) {
    return { kind: "first-pitch-off", line: `${profile.name} has seen you swing first pitch. It starts off the plate.` };
  }
  return null;
}

/** The third book line when the arm has not adapted to you: what fatigue does to her. */
const FATIGUE_LINES: Record<RivalArmId, string> = {
  academy: "Tryout arm. Same look all night.",
  reina: "Past pitch 100 the fastball sits up. That is the only mistake she makes.",
  sol: "Past pitch 100 the heat is still there; the ladder gets lower.",
  kira: "One inning of everything. She does not get tired; she gets out.",
  aoi: "Not a pitcher.",
  miki: "Not a pitcher.",
  yuki: "Not a pitcher.",
};

export function fatigueLine(id: RivalArmId): string {
  return FATIGUE_LINES[id] ?? "";
}

/**
 * The Duel's book on an arm: line 1 always, line 2 by Wit or a take, line 3
 * (her adaptation to you, else what fatigue does to her) by more of either.
 */
export function bookLines(profile: RivalProfile, adaptation: Adaptation | null, open: 1 | 2 | 3): string[] {
  const all = [profile.tells[0], profile.tells[1], adaptation?.line ?? fatigueLine(profile.id)];
  return all.slice(0, open);
}

export interface ScoutingReport {
  arm: RivalArmId;
  name: string;
  title: string;
  tells: [string, string];
  reads: string;
  adaptation: Adaptation | null;
  seen: number;
  /** A line from the player's own history, or null before any looks. */
  history: string | null;
  lateArm: RivalArmId | null;
}

export function scoutingReport(run: Pick<TraineeRun, "characterId" | "tells" | "faced" | "year">, kind: string): ScoutingReport {
  const arm = opposingArm(run, kind);
  const p = rivalProfile(arm);
  const adaptation = rivalAdaptation(p, run.tells);
  const seen = run.faced[arm as CharacterId] ?? 0;
  const late = armForInning(run, kind, 9);
  const yearNote = arm === "academy" ? "" : run.year === 1 ? " · first year" : run.year === 3 ? " · senior" : "";
  return {
    arm,
    name: p.name,
    title: p.number != null ? `#${p.number} ${p.name}${yearNote}` : p.name,
    tells: p.tells,
    reads: p.reads,
    adaptation,
    seen,
    history: historyLine(run.tells),
    lateArm: late !== arm ? late : null,
  };
}

function historyLine(t: Tells): string | null {
  const fpN = t.firstPitchSwings + t.firstPitchTakes;
  const chaseN = t.chaseSwings + t.chaseTakes;
  if (fpN + chaseN < 2) return null;
  const parts: string[] = [];
  if (fpN >= 2) parts.push(`first pitch: swung ${t.firstPitchSwings}, took ${t.firstPitchTakes}`);
  if (chaseN >= 2) parts.push(`off the plate: chased ${t.chaseSwings}, took ${t.chaseTakes}`);
  return parts.length ? `Your book — ${parts.join(" · ")}.` : null;
}

/** Bend a CPU call toward a rival's identity and her one adaptation. */
export function shapeCall(
  profile: RivalProfile,
  adaptation: Adaptation | null,
  call: PitchCall,
  count: { balls: number; strikes: number },
  arsenalTypes: PitchType[],
  r: () => number,
  duel = false,
): PitchCall & { speedMult: number } {
  let { type, target } = call;
  let speedMult = profile.speedMult;
  const first = count.balls === 0 && count.strikes === 0;
  const twoStrikes = count.strikes >= 2;

  // The Duel: identity owns the family mix so the book reads true.
  if (duel) {
    const secondaries = arsenalTypes.filter((t) => t !== "fastball");
    if (r() < duelFastballRate(profile.identity, count) || secondaries.length === 0) type = "fastball";
    else if (type === "fastball") type = secondaries[Math.floor(r() * secondaries.length)]!;
  }

  // Identity: pitch mix.
  if (profile.secondaryBias < 0 && type !== "fastball" && r() < -profile.secondaryBias) type = "fastball";
  if (profile.secondaryBias > 0 && type === "fastball" && !first && r() < profile.secondaryBias) {
    const sec = arsenalTypes.filter((t) => t !== "fastball");
    if (sec.length) type = sec[Math.floor(r() * sec.length)]!;
  }
  // Identity: location.
  if (profile.upBias > 0 && r() < profile.upBias * (twoStrikes ? 1 : 0.5)) target = { x: target.x, y: Math.min(target.y, 0.45) };
  if (profile.edgeBias > 0.6 && !first) {
    const dx = target.x - 1.5;
    const dy = target.y - 1.5;
    target = { x: 1.5 + dx * (1 + (profile.edgeBias - 0.6) * 0.5), y: 1.5 + dy * (1 + (profile.edgeBias - 0.6) * 0.5) };
  }
  if (profile.zoneBias > 0 && !twoStrikes && r() < profile.zoneBias) {
    target = { x: clamp(target.x, 0.35, 2.65), y: clamp(target.y, 0.35, 2.65) };
  }
  // Urgency: attack early.
  if (profile.identity === "urgency" && first && r() < 0.5) {
    type = "fastball";
    target = { x: clamp(target.x, 0.5, 2.5), y: clamp(target.y, 0.5, 2.5) };
  }
  if (profile.identity === "urgency" && twoStrikes && arsenalTypes.includes("slider") && r() < 0.6) {
    type = "slider";
    target = { x: 3.2, y: 2.9 };
  }

  // One communicated adaptation.
  if (adaptation) {
    if (adaptation.kind === "first-pitch-off" && first) target = { x: r() < 0.5 ? -0.5 : 3.5, y: target.y };
    if (adaptation.kind === "fill-zone") target = { x: clamp(target.x, 0.3, 2.7), y: clamp(target.y, 0.3, 2.7) };
    if (adaptation.kind === "bury" && twoStrikes) target = { x: target.x, y: 3.5 };
    if (adaptation.kind === "speed-up") {
      if (r() < 0.6) type = "fastball";
      speedMult *= 0.94;
      target = { x: target.x, y: Math.min(target.y, 0.6) };
    }
    if (adaptation.kind === "slow-down" && r() < 0.5) {
      const slow = arsenalTypes.find((t) => t === "changeup") ?? arsenalTypes.find((t) => t === "curve");
      if (slow) type = slow;
    }
  }
  return { type, target, speedMult };
}

/** Bookkeeping the rival is allowed to read later. */
export function recordHitterTell(
  tells: Tells,
  ev: { first: boolean; inZone: boolean; swung: boolean; timingErr?: number; pullFoul?: boolean },
): Tells {
  const next = { ...tells };
  if (ev.first) {
    if (ev.swung) next.firstPitchSwings += 1;
    else next.firstPitchTakes += 1;
  }
  if (!ev.inZone) {
    if (ev.swung) next.chaseSwings += 1;
    else next.chaseTakes += 1;
  }
  if (ev.swung && typeof ev.timingErr === "number" && Math.abs(ev.timingErr) > 0.04) {
    if (ev.timingErr > 0) next.lateSwings += 1;
    else next.earlySwings += 1;
  }
  if (ev.pullFoul) next.pullFouls += 1;
  return next;
}

export function recordPitcherTell(tells: Tells, ev: { first: boolean; twoStrikes: boolean; type: PitchType; inZone: boolean }): Tells {
  const next = { ...tells };
  if (ev.first) {
    if (ev.type === "fastball") next.fpFastballs += 1;
    else next.fpSecondaries += 1;
    if (ev.inZone) next.fpZone = (next.fpZone ?? 0) + 1;
    else next.fpOff = (next.fpOff ?? 0) + 1;
  }
  if (ev.twoStrikes) {
    if (ev.inZone) next.twoStrikeZone += 1;
    else next.twoStrikeOff += 1;
  }
  return next;
}

/**
 * What a rival hitter has learned from the pitcher's book. Both reads are about
 * where the glove sat, which the Coach chooses, so each one can be beaten: start
 * her off the plate, or come back into the zone with two strikes. The game picks
 * the pitch type, so a read built on type would be a penalty nobody could answer.
 */
export function hitterAdaptation(
  tells: Tells,
  batterName: string,
): { sitFirstStrike: boolean; takeTwoStrike: boolean; line: string | null; firstLine: string | null; twoStrikeLine: string | null } {
  const fpN = (tells.fpZone ?? 0) + (tells.fpOff ?? 0);
  const tsN = tells.twoStrikeOff + tells.twoStrikeZone;
  const sitFirstStrike = fpN >= ADAPT_MIN_SAMPLES && (tells.fpZone ?? 0) / fpN >= 0.7;
  const takeTwoStrike = tsN >= ADAPT_MIN_SAMPLES && tells.twoStrikeOff / tsN >= 0.7;
  const firstLine = sitFirstStrike ? `${batterName} has seen you start in the zone. She's sitting on the first strike.` : null;
  const twoStrikeLine = takeTwoStrike ? `${batterName} knows you go off the plate with two strikes. She won't chase.` : null;
  return { sitFirstStrike, takeTwoStrike, line: firstLine ?? twoStrikeLine, firstLine, twoStrikeLine };
}

export function rivalPortraitId(arm: RivalArmId): CharacterId | null {
  return arm === "academy" ? null : arm;
}

export type { Cell, Loc };
