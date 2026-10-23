/**
 * The career scrapbook. Every page is minted from event records or coach
 * memories; nothing here is invented after the fact. Cosmetics never appear.
 */
import { turnMeta } from "./calendar.ts";
import { memoryLine } from "./relationship.ts";
import { artKey, isBustSrc, isPitcherStyle, parkSrc, sceneBustSrc, sheet, stillSrc, type PortraitMood } from "./bible.ts";
import { datePark } from "./culture.ts";
import { eventsOfPa, type PlateEvent } from "./events.ts";
import { ordinalInning, proofLine, type GoalId } from "./goals.ts";
import type { RivalArmId } from "./rivals.ts";
import type { CharacterId, CoachMemory, DefiningPa, Highlight, Keepsake, TraineeRun } from "./types.ts";

export interface GameRecord {
  events: PlateEvent[];
  arm: RivalArmId;
  pgId: GoalId | null;
  /** Pitching outings summarize themselves. */
  summary?: string;
}

export function rivalName(arm: RivalArmId) {
  return arm === "academy" ? "the Academy arm" : sheet(arm).name;
}

/** One page for a played date. */
export function gameHighlight(
  run: TraineeRun,
  kind: string,
  pgMet: boolean,
  sgMet: boolean,
  record: GameRecord | undefined,
  smaller?: string | null,
): Highlight {
  const label = turnMeta(run.turn).label;
  const who = sheet(run.characterId);
  const proof = record?.pgId ? proofLine(record.pgId, record.events) : null;
  const pitching = isPitcherStyle(who.style);
  const vs = record && !(pitching && record.arm === "academy") ? ` vs ${rivalName(record.arm)}` : "";
  let line: string;
  if (record?.summary) line = `${record.summary}${vs}.`;
  else if (pgMet && proof) line = `She got what she came for${vs}. ${proof}`;
  else if (pgMet) line = `She got what she came for${vs}.`;
  // A Finale her side won without her ask: never "it got away" about a night they won.
  else if (kind === "finale" && run.finaleTeamWon) line = `They won${vs}, and what she came for didn't come.`;
  else if (sgMet) {
    const extra = (smaller?.trim() || "She still got something out of it.")
      .replace(/\s+That keeps her in it\.?$/i, "")
      .replace(/\.$/, "");
    const tail = extra ? `${extra[0]!.toLowerCase()}${extra.slice(1)}` : "she still got something out of it";
    line = `It got away from her${vs}, and ${tail}.`;
  } else line = `It got away from her${vs}.`;
  return { turn: run.turn, label, line, kind: "game" };
}

/**
 * A saved page, said the way the game says it now. Pages from before the copy pass named
 * "the goal"; pitcher years used to mint the hitter keepsake. The page says what she actually kept.
 */
export function scrapbookLine(id: CharacterId, line: string): string {
  line = line
    .replace("The goal she came for slipped", "It got away from her")
    .replace("The smaller one held.", "That keeps her in it.")
    .replace("The smaller ask held.", "That keeps her in it.");
  line = line.replace(
    /^(It got away from her(?: vs [^.]+)?)\. ([^.]+)\. That keeps her in it\.$/,
    (_, head: string, did: string) => `${head}, and ${did[0]!.toLowerCase()}${did.slice(1)}.`,
  );
  line = line.replace(
    /^(It got away from her(?: vs [^.]+)?)\. That keeps her in it\.$/,
    "$1, and that keeps her in it.",
  );
  const pitcher = isPitcherStyle(sheet(id).style);
  if (pitcher) {
    line = line.replaceAll(" vs the Academy arm", "");
    // Pitcher years used to mint the hitter's lines.
    if (line === "The Gate: she reached.") line = "The Gate: three outs.";
    if (line === "The Gate: she did not reach, and you kept her.") line = "The Gate: the outs weren't there.";
  }
  const kept = RETIRED_KEEPSAKE_PAGES[line];
  if (kept) return keepsakeLine(id, kept) ?? line;
  return RETIRED_MEMORY_LINES[line] ?? line;
}

export function memoryHighlight(m: CoachMemory): Highlight {
  return { turn: m.turn, label: turnMeta(m.turn).label, line: memoryLine(m), kind: "memory" };
}

/** Her Gate, as you'd remember it later: a whole sentence, never "The Gate: she reached." */
export const GATE_NOTE = {
  hitterMet: "She got on at the Gate, and she grinned about it the whole bus ride home.",
  hitterShort: "She got on at the Gate, just not the way she needed to, and she asked you what she should have done.",
  hitterMissed: "She never got on at the Gate, and she noticed you kept her anyway.",
  pitcherMet: "She got her three outs at the Gate and walked off like it was nothing.",
  pitcherMissed: "The outs didn't come at the Gate, and you sat with her on the bench after.",
} as const;

/** What she kept, as a memory: who kept it, and where it lives now. */
export const KEEPSAKE_NOTE = {
  dirt: "She kept a pinch of dirt from the baseline, wrapped up in a sock.",
  firstHit: "She kept the ball from her first hit, and it sits on her shelf now.",
  lastOut: "She kept the ball from the last out, and it lives in her glove bag now.",
} as const;

/** Her own keepsake page, where she has one: the same thing kept, in her world. */
const KEEPSAKE_PAGE: Partial<Record<CharacterId, string>> = {
  aoi: "It's on her shelf now, right next to the pencil stub.",
  miki: "She told you not to tell anyone, and it's in her locker, behind the melon pan.",
  yuki: "She wrote the date on it in marker, fast, and the ink smeared.",
  reina: "She wrote the pitch count on it in very small numbers.",
  sol: "Luz says it's going on the dashboard of the truck.",
  kira: "It went in the tin with her bus transfers.",
};

/** The keepsake as the book says it: what she kept, then where it lives, in her own world. */
export function keepsakeLine(id: CharacterId, keepsake: Keepsake): string | null {
  if (keepsake !== "dirt" && keepsake !== "ball") return null;
  const what =
    keepsake === "dirt"
      ? "She kept a pinch of dirt from the baseline."
      : isPitcherStyle(sheet(id).style)
        ? "She kept the ball from the last out."
        : "She kept the ball from her first hit.";
  const where = KEEPSAKE_PAGE[id];
  return where ? `${what.replace(/\.$/, "")}, and ${where[0]!.toLowerCase()}${where.slice(1)}` : what;
}

/**
 * Retired memory and keepsake lines old saves still hold, word for word, and what the book says
 * for them now. Don't edit the keys: they're how a saved line is recognized.
 */
export const RETIRED_MEMORY_LINES: Record<string, string> = {
  "The Gate: she reached.": GATE_NOTE.hitterMet,
  "The Gate: three outs.": GATE_NOTE.pitcherMet,
  "The Gate: the outs weren't there.": GATE_NOTE.pitcherMissed,
  "The Gate: she reached, but not the way she needed to.": GATE_NOTE.hitterShort,
  "The Gate: she did not reach, and you kept her.": GATE_NOTE.hitterMissed,
  "She kept a pinch of baseline dirt.": KEEPSAKE_NOTE.dirt,
  "She kept the ball from the last out.": KEEPSAKE_NOTE.lastOut,
  "She kept the first-hit ball.": KEEPSAKE_NOTE.firstHit,
};

/** Retired keepsake pages ("The first-hit ball, kept."), which the book now says through keepsakeLine. */
const RETIRED_KEEPSAKE_PAGES: Record<string, Keepsake> = {
  "A pinch of dirt from the baseline, kept.": "dirt",
  "The first-hit ball, kept.": "ball",
  "The last-out ball, kept.": "ball",
  "She kept the first-hit ball.": "ball",
};

/** Clubhouse wall. A pitcher ball is the last out. A hitter ball is the first hit. */
export function keepsakeWallLine(id: CharacterId, keepsake: Keepsake): string | null {
  if (keepsake === "dirt") return "She kept a pinch of dirt from the baseline.";
  if (keepsake === "ball") return isPitcherStyle(sheet(id).style) ? "She kept the ball from her last out." : "She kept the ball from her first hit.";
  return null;
}

export function keepsakeHighlight(run: TraineeRun): Highlight | null {
  const line = keepsakeLine(run.characterId, run.keepsake);
  return line ? { turn: run.turn, label: turnMeta(run.turn).label, line, kind: "keepsake" } : null;
}

export function rivalHighlight(run: TraineeRun, arm: RivalArmId): Highlight | null {
  if (arm === "academy") return null;
  const n = run.faced[arm] ?? 0;
  if (n !== 1 && n !== 3) return null;
  const name = sheet(arm).name;
  return {
    turn: run.turn,
    label: turnMeta(run.turn).label,
    line: n === 1 ? `First time facing ${name}.` : `Third time facing ${name}, and by now you know each other's habits.`,
    kind: "rival",
  };
}

/** The plate appearance that decided the Primary Goal, compacted for replay. */
export function definingPaFrom(run: TraineeRun, kind: string, record: GameRecord, pgMet: boolean, inning: number, outs: number, scoreDiff: number): DefiningPa | null {
  const ev = record.events;
  let pa: number | null = null;
  // The PA containing the proving event, or the last PA if the goal was missed.
  const proofOrder: PlateEvent["t"][] = ["rbi", "score", "stealResult", "reach", "foul", "contact"];
  if (pgMet) {
    for (const t of proofOrder) {
      const hit = [...ev].reverse().find((e) => e.t === t && "pa" in e);
      if (hit && "pa" in hit) {
        pa = hit.pa;
        break;
      }
    }
  }
  if (pa == null) {
    const last = [...ev].reverse().find((e) => e.t === "paComplete");
    pa = last && last.t === "paComplete" ? last.pa : null;
  }
  if (pa == null) return null;
  const start = ev.find((e) => e.t === "paStart" && e.pa === pa);
  const sat = inningAtLastPitcherOut(ev);
  const inPa = eventsOfPa(ev, pa);
  const pitches: DefiningPa["pitches"] = [];
  let current: { type: string; inZone: boolean } | null = null;
  for (const e of inPa) {
    if (e.t === "pitch") {
      current = { type: e.type, inZone: e.inZone };
      continue;
    }
    if (!current) continue;
    if (e.t === "take") {
      pitches.push({ ...current, result: e.strike ? "called strike" : "ball" });
      current = null;
    } else if (e.t === "contact") {
      if (e.tier === "miss") {
        pitches.push({ ...current, result: "swing and miss" });
        current = null;
      }
    } else if (e.t === "foul") {
      pitches.push({ ...current, result: e.twoStrike ? "foul, two strikes" : "foul" });
      current = null;
    } else if (e.t === "reach") {
      pitches.push({ ...current, result: e.via === "walk" ? "ball four" : e.base === 4 ? "home run" : e.base === 2 ? "double" : e.via === "bunt" ? "bunt single" : "single" });
      current = null;
    } else if (e.t === "out") {
      if (e.how === "caught-stealing") continue;
      pitches.push({ ...current, result: e.how === "k" ? "strike three" : e.how === "bunt" ? "bunt, out" : "in play, out" });
      current = null;
    }
  }
  const lastSteal = [...inPa].reverse().find((e): e is Extract<PlateEvent, { t: "stealResult" }> => e.t === "stealResult" && e.safe);
  const scoredSelf = inPa.some((e) => e.t === "score" && e.runner === "self");
  const outcome = scoredSelf
    ? lastSteal
      ? lastSteal.from === 2
        ? "She stole third and came home."
        : "She stole and came home."
      : "She scored."
    : inPa.some((e) => e.t === "rbi")
      ? "A run came in."
      : lastSteal
        ? lastSteal.from === 2
          ? "She stole third."
          : lastSteal.inning >= 7
            ? "She stole late."
            : "She stole second."
        : inPa.some((e) => e.t === "reach")
          ? "She reached."
          : inPa.some((e) => e.t === "out" && e.how === "k") || pitcherStrikeout(ev, pa)
            ? "Struck out."
            : "Out.";
  return {
    turn: run.turn,
    kind,
    rival: record.arm === "academy" ? null : record.arm,
    inning: start && start.t === "paStart" ? start.inning : (sat ?? inning),
    outs: start && start.t === "paStart" ? start.outs : outs,
    scoreDiff,
    bases: start && start.t === "paStart" ? { ...start.bases } : { first: false, second: false, third: false },
    pitches,
    outcome,
  };
}

/**
 * A finished side rolls the inning before the scrapbook is written.
 * The last `pitcherOut` is still in the inning she sat.
 */
/** A mound K is `pitcherOut`, not a hitter `out`, and it carries no plate-appearance id. */
function pitcherStrikeout(ev: PlateEvent[], pa: number): boolean {
  let current: number | null = null;
  for (const e of ev) {
    if (e.t === "pitch") current = e.pa;
    if (e.t === "pitcherOut" && e.how === "k" && current === pa) return true;
  }
  return false;
}

function inningAtLastPitcherOut(ev: PlateEvent[]): number | null {
  let current: number | null = null;
  let atOut: number | null = null;
  for (const e of ev) {
    if (e.t === "inning") current = e.inning;
    if (e.t === "pitcherOut") atOut = current;
  }
  return atOut;
}

/** A minted finale that stored the rolled inning still reads as the ninth she sat. */
function replayInning(pa: DefiningPa, pitcher: boolean): number {
  if (pitcher && pa.kind === "finale" && pa.outs === 0 && pa.inning > 9) return pa.inning - 1;
  return pa.inning;
}

function replayOuts(outs: number): string {
  if (outs <= 0) return "Nobody's out";
  if (outs === 1) return "One out";
  return "Two out";
}

function replayBases(bases: DefiningPa["bases"]): string {
  const on = [bases.first && "first", bases.second && "second", bases.third && "third"].filter(Boolean);
  if (on.length === 0) return "The bases are empty";
  if (on.length === 1) return `Runner on ${on[0]}`;
  if (on.length === 2) return `Runners on ${on[0]} and ${on[1]}`;
  return "Bases loaded";
}

function uncap(line: string): string {
  return line.charAt(0).toLowerCase() + line.slice(1);
}

/** The park, then who was out there, in one breath. */
function replaySituation(pa: DefiningPa, who: CharacterId): string {
  const name = sheet(who).name;
  const pitcher = isPitcherStyle(sheet(who).style);
  const rival = pa.rival ? sheet(pa.rival).name : "their pitcher";
  const vs = pitcher ? `${name} is on the mound` : `${name} is up against ${rival}`;
  return `${replayOuts(pa.outs)}, ${uncap(replayBases(pa.bases))}, and ${vs}.`;
}

/** Text replay, one line per pitch. The first line is a friend telling you the situation. */
export function replayLines(pa: DefiningPa, who: CharacterId): string[] {
  const pitcher = isPitcherStyle(sheet(who).style);
  const date = turnMeta(pa.turn).label;
  const inn = ordinalInning(replayInning(pa, pitcher));
  const lines = [`${date}, ${inn} inning. ${replaySituation(pa, who)}`];
  let balls = 0;
  let strikes = 0;
  for (const p of pa.pitches) {
    // Read like the scorebook Aoi keeps: the count, the pitch, then what happened.
    const a = /^[aeiou]/i.test(p.type) ? "an" : "a";
    lines.push(`${balls}-${strikes}, ${a} ${p.type}${p.inZone ? "" : " off the plate"}. ${sayReplayResult(p.result)}`);
    if (p.result === "ball") balls += 1;
    else if (p.result === "called strike" || p.result === "swing and miss" || p.result === "foul") strikes += 1;
  }
  lines.push(sayOutcome(replayOutcome(pa), pitcher, who, pa));
  return lines;
}

/** The pitch's result as a sentence, never a log token. */
function sayReplayResult(result: string): string {
  if (result === "called strike") return "Called strike.";
  if (result === "swing and miss") return "Swing and a miss.";
  if (result === "foul") return "Fouled off.";
  if (result === "foul, two strikes") return "Fouled off with two strikes.";
  if (result === "ball") return "Ball.";
  if (result === "ball four") return "Ball four.";
  if (result === "home run") return "Home run.";
  if (result === "double") return "Double.";
  if (result === "bunt single") return "Bunt single.";
  if (result === "single") return "Single.";
  if (result === "strike three") return "Strike three.";
  if (result === "bunt, out") return "Bunt, and she's out.";
  if (result === "in play, out") return "In play, and it's an out.";
  const cap = result.charAt(0).toUpperCase() + result.slice(1);
  return cap.endsWith(".") ? cap : `${cap}.`;
}

/** The saved outcome ("Struck out.") said as a whole sentence, from her side of it. */
function sayOutcome(outcome: string, pitcher: boolean, who?: CharacterId, pa?: DefiningPa): string {
  if (outcome === "Struck out.") return pitcher ? "She struck her out." : "She struck out.";
  if (outcome === "Out.") return pitcher ? "She got the out." : "She made an out.";
  if (outcome === "She reached.") {
    // A save from before steal closes were minted still has "She reached" on a steal date.
    if (who === "yuki" && pa?.kind === "finale" && pa.inning >= 7) return "She stole late.";
    if (who === "yuki" && pa?.kind === "series") return "She stole third.";
    if (who === "yuki" && pa?.kind === "stretch") return "She stole and came home.";
    if (who === "yuki" && pa?.kind === "first-light") return "She stole second.";
    return "She got on base.";
  }
  if (outcome === "A run came in.") return "A run came in on her.";
  return outcome;
}

/** A minted book kept "Out." for a mound punchout. Three strikes is the strikeout. */
function replayOutcome(pa: DefiningPa): string {
  if (pa.outcome !== "Out.") return pa.outcome;
  let strikes = 0;
  for (const p of pa.pitches) {
    if (p.result === "called strike" || p.result === "swing and miss" || p.result === "strike three") strikes += 1;
    else if (p.result === "foul" && strikes < 2) strikes += 1;
  }
  return strikes >= 3 ? "Struck out." : pa.outcome;
}

export const HIGHLIGHT_CAP = 24;

/** Her first two big games (the Gate, First Light) stay in the book however long the career runs. */
function isFirstPage(h: Highlight): boolean {
  if (h.kind !== "game") return false;
  const type = turnMeta(h.turn).type;
  return type === "gate" || type === "first-light";
}

/** The newest pages up to n, always keeping the Gate and First Light, in the order they happened. */
export function keepPages(pages: readonly Highlight[], n: number): Highlight[] {
  if (pages.length <= n) return [...pages];
  const pinned = new Set(pages.filter(isFirstPage));
  const room = Math.max(0, n - pinned.size);
  const rest = pages.filter((h) => !pinned.has(h));
  const newest = new Set(room > 0 ? rest.slice(-room) : []);
  return pages.filter((h) => pinned.has(h) || newest.has(h));
}

/** The pages the scrapbook opens to: eight of them, her first big games among them. */
export function scrapbookPages(pages: readonly Highlight[]): Highlight[] {
  return keepPages(pages, 8);
}

// ── The book (check-in 22, F6): one polaroid per big game, then her letter ──────────

export type BigGame = "gate" | "first-light" | "lantern-classic" | "night-classic" | "stretch" | "series" | "finale";

const BIG_GAMES: readonly BigGame[] = ["gate", "first-light", "lantern-classic", "night-classic", "stretch", "series", "finale"];

function bigGameOf(turn: number): BigGame | null {
  const type = turnMeta(turn).type as string;
  return (BIG_GAMES as readonly string[]).includes(type) ? (type as BigGame) : null;
}

/**
 * What each big game's page says, by how it went, for a hitter and a pitcher. The page's
 * title already names the game, so the caption never does. Each game shows once in a
 * career, so no caption repeats inside a book.
 */
export const PAGE_CAPTIONS: Record<BigGame, { met: [hitter: string, pitcher: string]; missed: [hitter: string, pitcher: string] }> = {
  gate: {
    met: ["Her first big game, and she got on.", "She took the ball before anyone offered it and gave it back with the inning done."],
    missed: ["Nothing fell her way, and she wanted another swing anyway.", "The outs didn't come, and she sat on the bench until they turned the lights off."],
  },
  "first-light": {
    met: ["She came to do one thing and did it before the lights warmed up.", "She finished what she started and walked off slow."],
    missed: ["Nothing fell in for her, so she wrote down every pitch on the bus home.", "The strike zone got away from her for one inning, and she still remembers which one."],
  },
  "lantern-classic": {
    met: ["The lanterns were up, and so was she.", "The lanterns came on in the fifth, and she was still out there."],
    missed: ["The lanterns stayed lit, but it wasn't her night.", "She left the game before the lanterns went out."],
  },
  "night-classic": {
    met: ["Somebody else's park, a full house, and it went her way.", "A road crowd, loud from the first pitch, and she quieted it."],
    missed: ["A long ride home, and she didn't talk.", "The road crowd got the last word."],
  },
  stretch: {
    met: ["It came down to the late innings, and she came through.", "Every out was hard, and she got the ones that mattered."],
    missed: ["It got away late, and she sat on the dugout step a long while.", "The arm ran out before the inning did."],
  },
  series: {
    met: ["She put the Finale on the calendar herself.", "She pitched her way into the Finale."],
    missed: ["It slipped away from her, and she kept the ticket stub anyway.", "She threw everything she had, and it wasn't quite enough."],
  },
  finale: {
    met: ["The biggest night of the three years, and she won it.", "The last out of three years was hers."],
    missed: ["The last night of three years, and she played every inning of it.", "She took the ball on the biggest night there is, and she'd wanted that part most."],
  },
};

type GirlCaptions = Record<BigGame, { met: string; missed: string }>;

/**
 * Her own page for each big game (check-in 23): what that game asked of her, said in her world
 * (her keepsakes, her people, her habits). One short sentence, past tense, the narrator's voice.
 * The role captions above are the fallback for a girl or a game this table doesn't cover.
 */
export const GIRL_CAPTIONS: Record<CharacterId, GirlCaptions> = {
  aoi: {
    gate: {
      met: "She reached first, and Haruko put a new sticker on the sign that night.",
      missed: "She didn't reach, and she ran the last ground ball out like it was 1981.",
    },
    "first-light": {
      met: "She reached and wrote it on the back of her batting glove, under Day one.",
      missed: "She didn't reach, and on the ride home she wrote down every pitch that beat her.",
    },
    "lantern-classic": {
      met: "She drove in a run and caught herself grinning in the box.",
      missed: "The run stayed out there, and she asked if you could skip the shop that night.",
    },
    "night-classic": {
      met: "She reached twice, and the pencil stub put two small circles in her scorebook.",
      missed: "She came up short and asked you to write down the pitch she chased, so she'd remember.",
    },
    stretch: {
      met: "Her hit came late, and she tripped leaving the box and laughed the hardest of anyone.",
      missed: "The late hit didn't come, and she sat under the 6-4-3 sign until Haruko turned the grill off.",
    },
    series: {
      met: "She got two hits, and Haruko waved the 6-4-3 flag in row F for both.",
      missed: "The second hit didn't come, and Haruko folded the flag and kept the grill on anyway.",
    },
    finale: {
      met: "A run came home on her on the last night, and the sign at 6-4-3 had to change.",
      missed: "Nobody came home on her, and she kept score of the whole game anyway.",
    },
  },
  reina: {
    gate: {
      met: "She got her three outs and wrote each one in the ruled notebook before she sat down.",
      missed: "The outs didn't come, and she ripped out a whole row of the scarf that night.",
    },
    "first-light": {
      met: "She got her two punchouts and checked the notebook twice to be sure.",
      missed: "The punchouts didn't come, and she threw in the empty bullpen until you told her the slot was back.",
    },
    "lantern-classic": {
      met: "She struck out seven under the lanterns and didn't pick up her knitting for a month after.",
      missed: "The lanterns won that one, and she sat in the tunnel knitting until they went out.",
    },
    "night-classic": {
      met: "She got two punchouts back to back on a slick ball, after a night she swore she slept.",
      missed: "The punchouts never came back to back, and she rubbed the same ball until the dew dried.",
    },
    stretch: {
      met: "With the bases loaded she went to three-and-two on purpose and got out of it.",
      missed: "A run came in with the bases loaded, and she left the dropped stitch where it was.",
    },
    series: {
      met: "She went six innings with Miki's melon pan still in her jacket pocket.",
      missed: "She didn't get the six innings, and she ate Miki's melon pan on the bench after.",
    },
    finale: {
      met: "She walked the leadoff hitter, and you stayed in the dugout and watched her get the next three.",
      missed: "She walked the leadoff hitter, and a run came in before the third out.",
    },
  },
  miki: {
    gate: {
      met: "She saw three pitches in one at-bat, and Section 4 rang the cowbell for each.",
      missed: "She swung early every time and said it was cool on the bus home, which it wasn't.",
    },
    "first-light": {
      met: "She didn't strike out once, and then she went and stood behind the dugout for a minute.",
      missed: "She struck out, and you bought her a melon pan and walked slow and didn't do the talk.",
    },
    "lantern-classic": {
      met: "She made Reina throw four in one at-bat, and Reina said the number out loud on the way off the field.",
      missed: "She never got Reina to four, and Gary clanked in the empty cage all night.",
    },
    "night-classic": {
      met: "She stayed in for five pitches, and Sol had to throw something that wasn't heat.",
      missed: "Sol got her before five, and she ate both melon pans on the bus, the in-case one too.",
    },
    stretch: {
      met: "She got the bat on two breaking balls, and Section 4 rang the bell like each one was a home run.",
      missed: "The breaking balls got under her bat, and she took the ugly ones in the cage until midnight.",
    },
    series: {
      met: "She got on twice, and the whole North bench leaned on the rail.",
      missed: "She didn't get on twice, and she said cool about it twice.",
    },
    finale: {
      met: "She never went down on strikes all night, and she made them sick of her.",
      missed: "They got her on strikes, and she still looked for you before she looked at Section 4.",
    },
  },
  sol: {
    gate: {
      met: "She threw nothing but heat, and nobody caught up to it for three outs.",
      missed: "The outs didn't come, and she iced the arm on Luz's tailgate like there was a game tomorrow.",
    },
    "first-light": {
      met: "She got her two punchouts on heat and told Luz the changeup was still dead.",
      missed: "The punchouts didn't come, and when you asked how she was, she said ninety-nine.",
    },
    "lantern-classic": {
      met: "She struck out seven with the wind pushing the lanterns sideways and never looked at the bullpen.",
      missed: "The lanterns got the better of her, and she iced the arm until you came and stood by the ice machine.",
    },
    "night-classic": {
      met: "She struck out two in a row, and that night she called Luz and didn't say why.",
      missed: "The punchouts never came back to back, and she traced the grip inside her glove in the tunnel.",
    },
    stretch: {
      met: "She got out of the jam with Kira tapping on the bullpen door the whole time.",
      missed: "A run scored out of the jam, and she said ninety-nine before anyone asked.",
    },
    series: {
      met: "She went six innings, and Luz watched every one from row one with the truck closed.",
      missed: "She didn't get the six innings, and Luz was still in row one when she came out.",
    },
    finale: {
      met: "She opened the ninth with Luz's changeup and got the two punchouts before the lead could go.",
      missed: "She threw Luz's changeup first like she promised, and the rest of the ninth didn't go her way.",
    },
  },
  kira: {
    gate: {
      met: "Her first out came before the catcher had settled, and she was home before the last bus.",
      missed: "The outs didn't come, and she was back at the bullpen door with her bag before anyone looked for her.",
    },
    "first-light": {
      met: "She held the one-run lead and pointed at the bullpen door, not the crowd.",
      missed: "The one-run lead went, and she rode the last bus to the end of the line and back.",
    },
    "lantern-classic": {
      met: "She got the two punchouts, and Aoi drew two little buses in her scorebook.",
      missed: "The two punchouts didn't come, and she tapped the bullpen door twice on her way back anyway.",
    },
    "night-classic": {
      met: "She came in with runners on, and every one of them stayed where she found them.",
      missed: "The runners she inherited came home, and she waited at the bullpen door to see if you'd come.",
    },
    stretch: {
      met: "She got four outs, the first of them in the eighth, which she had never pitched before.",
      missed: "She asked for the eighth and got it, and the inning didn't go the way she'd made the deal.",
    },
    series: {
      met: "Nobody reached, and she had a Stars Park bus transfer tucked in her cap.",
      missed: "Somebody reached, and she took the transfer out of her cap and put it back in the tin.",
    },
    finale: {
      met: "The tying run started on first and never got home, and she walked to the dugout instead of the door.",
      missed: "The tying run came around, and she went to the dugout anyway, like she'd said she would.",
    },
  },
  yuki: {
    gate: {
      met: "She reached first and was already looking at second.",
      missed: "She didn't reach, and she ran the bags alone after the lights went off while you held the stopwatch.",
    },
    "first-light": {
      met: "She stole second before anyone said go, and she kept going.",
      missed: "The steal didn't come, and she hid the leg from you all the way to the bus.",
    },
    "lantern-classic": {
      met: "She waited for your sign for once, then went from first all the way home.",
      missed: "She didn't score from first, and she told you the leg had grabbed before you had to ask.",
    },
    "night-classic": {
      met: "She reached twice, and both times she was leaning toward second before the pitch.",
      missed: "She came up short, and she ate a strawberry shaved ice so fast it hurt.",
    },
    stretch: {
      met: "She stole with a runner in scoring position and came all the way home, and Kira owed her another juice.",
      missed: "The run didn't come home with her, and Kira won the juice bet for once and didn't look happy about it.",
    },
    series: {
      met: "She took third standing up, and Reina looked at her once, too late.",
      missed: "She never stole third, and that night she didn't even open her new puzzle.",
    },
    finale: {
      met: "She stole late and was gone before you finished saying go.",
      missed: "The late steal never came, and that night she did a thousand-piece puzzle, slowly.",
    },
  },
};

/**
 * The Finale page when her side won it and her ask didn't come (check-in 24): the win first,
 * then what she wanted. Reina's and Kira's asks can't miss on a won night (any run ties it);
 * theirs are here so no girl's page can say the night was lost when it wasn't.
 */
export const FINALE_WON_SHORT_CAPTIONS: Record<CharacterId, string> = {
  aoi: "They won, and she still circled every at-bat where nobody came home on her.",
  reina: "They won, and she went over the ninth in the ruled notebook anyway, one row at a time.",
  miki: "They won, and Section 4 rang both cowbells anyway, strikeout and all.",
  sol: "They won, and she held up one finger to Luz in row one, though she'd wanted two.",
  kira: "They won, and she took the seat in the dugout without the save she'd come for.",
  yuki: "They won, and she told you the steal would have been there if you'd said go sooner.",
};

/** Her own caption for the page when she has one, else the role's. */
export function pageCaption(id: CharacterId, game: BigGame, met: boolean): string {
  const own = GIRL_CAPTIONS[id]?.[game]?.[met ? "met" : "missed"];
  if (own) return own;
  return PAGE_CAPTIONS[game][met ? "met" : "missed"][isPitcherStyle(sheet(id).style) ? 1 : 0];
}

const GAME_INDEX: Record<BigGame, number> ={ gate: 0, "first-light": 1, "lantern-classic": 2, "night-classic": 3, stretch: 4, series: 5, finale: 6 };

/** A page minted before the book kept its mark still says how it went. */
function metFromLine(line: string): boolean {
  return !/got away|slipped|did not reach|didn't|weren't/i.test(line);
}

function rivalFromLine(line: string): string | null {
  const m = / vs (?!the Academy)([A-Z][a-z]+)\b/.exec(line);
  return m ? m[1]! : null;
}

function meetingLine(name: string, n: number): string {
  if (n === 1) return `It was her first time facing ${name}.`;
  if (n === 2) return `${name} again, and they'd seen each other once before.`;
  if (n === 3) return `Third time against ${name}, and by now they knew each other's habits.`;
  if (n === 4) return `Fourth time against ${name}, and neither one blinked.`;
  if (n === 5) return `${name} again, five times now, and nobody was surprised.`;
  return `${name} one more time, and they'd both stopped counting.`;
}

export interface BookPicture {
  /** The still or the bust. */
  src: string;
  /** A bust stands on the park it happened in; a still is its own backdrop. */
  plate: string | null;
}

/**
 * The page's picture, from the stills for how it went. Pages that went the same way take
 * turns, so two in a row never share a picture.
 */
export function pagePicture(id: CharacterId, game: BigGame, met: boolean, nth: number): BookPicture {
  return pagePictureChoices(id, game, met, nth)[0]!;
}

/**
 * The page's picture and, after it, the ones it may give way to (check-in 31, F1): the rest of
 * its turn, then a few more stills from the same side of the day. Only the book's first page
 * ever gives way, when the ending's screens just showed its picture (`scrapbookBook`'s avoid).
 */
export function pagePictureChoices(id: CharacterId, game: BigGame, met: boolean, nth: number): BookPicture[] {
  const pitcher = isPitcherStyle(sheet(id).style);
  const plate = parkSrc(datePark(game, sheet(id).parkId));
  // A still that wears a banned mark gives way to a clean one, or to her bust on the park (bible OFF_MODEL_ART).
  const film = (stem: string, or: PortraitMood = "neutral"): BookPicture => {
    const src = stillSrc(id, stem, or);
    return { src, plate: isBustSrc(src) ? plate : null };
  };
  const bust = (mood: PortraitMood): BookPicture => ({ src: sceneBustSrc(id, mood), plate });
  const pool: BookPicture[] = met
    ? pitcher
      ? [film("k", "neutral"), film("follow", "focused"), bust("elated")]
      : [film("celebrate"), film("trot"), film("follow")]
    : pitcher
      ? [film("windup", "neutral"), film("walk", "neutral"), bust("focused")]
      : [film("take"), film("crushed"), bust("focused")];
  const extras: BookPicture[] = met
    ? pitcher
      ? [film("release", "neutral"), film("set", "neutral"), bust("elated"), bust("neutral")]
      : [film("contact"), bust("elated"), bust("neutral")]
    : pitcher
      ? [film("follow", "focused"), bust("crushed"), bust("neutral")]
      : [film("follow"), bust("neutral")];
  const turn = nth % pool.length;
  const out: BookPicture[] = [];
  for (const p of [...pool.slice(turn), ...pool.slice(0, turn), ...extras]) if (!out.some((o) => o.src === p.src)) out.push(p);
  return out;
}

/**
 * The book with its first polaroid moved off any picture in `avoid` (the ending's screens, which
 * run straight into it), onto the next of its choices that isn't the second page's picture. When
 * every choice is spent, it still steps off `near` (the screen just before the book).
 */
export function avoidOnFirstPage(id: CharacterId, entries: readonly BookEntry[], avoid: readonly string[], near: readonly string[] = []): BookEntry[] {
  const at = entries.findIndex((e) => e.kind === "page");
  const first = entries[at];
  // Two names for one file are one picture (bible SAME_ART).
  const has = (list: readonly string[], src: string) => list.some((s) => artKey(s) === artKey(src));
  if (!first || first.kind !== "page" || !has(avoid, first.page.picture.src)) return [...entries];
  const next = entries.slice(at + 1).find((e) => e.kind === "page");
  const nextSrc = next?.kind === "page" ? artKey(next.page.picture.src) : null;
  const { game, met } = first.page;
  const choices = pagePictureChoices(id, game, met, 0).filter((p) => artKey(p.src) !== nextSrc);
  const pick =
    choices.find((p) => !has(avoid, p.src)) ?? (has(near, first.page.picture.src) ? choices.find((p) => !has(near, p.src)) : undefined);
  if (!pick) return [...entries];
  const out = [...entries];
  out[at] = { kind: "page", page: { ...first.page, picture: pick } };
  return out;
}

export interface BookPage {
  turn: number;
  game: BigGame;
  /** The game's name, as the page was minted. */
  label: string;
  met: boolean;
  /** The big goal missed, and what she could still do saved the miss. The chip says 小さな達成. */
  saved: boolean;
  caption: string;
  /** Who was across from her, counted over the career. */
  meeting: string | null;
  /** A keepsake or a memory from the same day, tucked in. */
  notes: string[];
  picture: BookPicture;
}

export type BookEntry = { kind: "page"; page: BookPage } | { kind: "note"; turn: number; label: string; line: string };

/** Caption, then who was across from her, then the keepsake: one tap each on the polaroid. */
export function polaroidLines(page: { caption: string; meeting: string | null; notes: readonly string[] }): string[] {
  return [page.caption, page.meeting, ...page.notes].filter((x): x is string => Boolean(x));
}

/**
 * The scrapbook as a book: a polaroid for each big game she played, in order, with the
 * day's keepsake or memory tucked into its page. Memories from other days sit between
 * pages as notes. Rival pages are folded into the page they happened on.
 */
export function scrapbookBook(id: CharacterId, highlights: readonly Highlight[], pgResults?: readonly string[]): BookEntry[] {
  const games = new Map<number, Highlight>();
  for (const h of highlights) if (h.kind === "game" && bigGameOf(h.turn)) games.set(h.turn, h);
  const seen = new Map<string, number>();
  const nth = { met: 0, missed: 0 };
  const entries: BookEntry[] = [];
  const pages = new Map<number, BookPage>();
  const ordered = [...highlights].sort((a, b) => a.turn - b.turn);
  for (const h of ordered) {
    if (h.kind === "game") {
      const game = bigGameOf(h.turn);
      if (!game || games.get(h.turn) !== h) continue;
      const mark = pgResults?.[GAME_INDEX[game]];
      const met = mark === "met" ? true : mark === "missed" ? false : metFromLine(h.line);
      const rival = rivalFromLine(scrapbookLine(id, h.line));
      let meeting: string | null = null;
      if (rival) {
        const n = (seen.get(rival) ?? 0) + 1;
        seen.set(rival, n);
        meeting = meetingLine(rival, n);
      }
      // A Finale her side won short of her ask (gameHighlight's "They won") says they won.
      const wonShort = game === "finale" && !met && /^They won\b/.test(h.line);
      const caption = wonShort ? FINALE_WON_SHORT_CAPTIONS[id] : pageCaption(id, game, met);
      const saved = !met && (/smaller (ask|one) held/i.test(h.line) || /That keeps her in it/.test(h.line));
      const page: BookPage = {
        turn: h.turn,
        game,
        label: h.label,
        met,
        saved,
        caption,
        meeting,
        notes: [],
        picture: pagePicture(id, game, met, met ? nth.met++ : nth.missed++),
      };
      pages.set(h.turn, page);
      entries.push({ kind: "page", page });
    }
  }
  for (const h of ordered) {
    if (h.kind === "game" || h.kind === "rival") continue;
    const line = scrapbookLine(id, h.line);
    const page = pages.get(h.turn);
    if (page) {
      if (!page.notes.includes(line)) page.notes.push(line);
      continue;
    }
    // A memory from a working day sits between the pages, where it happened.
    const at = entries.findIndex((e) => (e.kind === "page" ? e.page.turn : e.turn) > h.turn);
    const note: BookEntry = { kind: "note", turn: h.turn, label: h.label, line };
    if (at < 0) entries.push(note);
    else entries.splice(at, 0, note);
  }
  return entries;
}

/** The last page, after the Finale: the letter every girl has had waiting in the bible. */
export function letterPage(id: CharacterId, finalePlayed: boolean): { kicker: string; text: string } | null {
  if (!finalePlayed) return null;
  const text = sheet(id).letters.trim();
  return text ? { kicker: "A letter from the stands", text } : null;
}

/** One sentence at a time, so the scrapbook doesn't dump the whole letter. */
export function letterLines(text: string): string[] {
  const parts = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

export function addHighlight(run: TraineeRun, h: Highlight | null) {
  if (!h) return;
  if (run.highlights.some((x) => x.turn === h.turn && x.kind === h.kind && x.line === h.line)) return;
  run.highlights = keepPages([...run.highlights, h], HIGHLIGHT_CAP);
}
