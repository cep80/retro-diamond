/**
 * The career scrapbook. Every page is minted from event records or coach
 * memories; nothing here is invented after the fact. Cosmetics never appear.
 */
import { turnMeta } from "./calendar.ts";
import { memoryLine } from "./relationship.ts";
import { isPitcherStyle, parkSrc, sceneBustSrc, sheet, type PortraitMood } from "./bible.ts";
import { datePark } from "./culture.ts";
import { eventsOfPa, type PlateEvent } from "./events.ts";
import { proofLine, type GoalId } from "./goals.ts";
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
export function gameHighlight(run: TraineeRun, kind: string, pgMet: boolean, sgMet: boolean, record: GameRecord | undefined): Highlight {
  const label = turnMeta(run.turn).label;
  const who = sheet(run.characterId);
  const proof = record?.pgId ? proofLine(record.pgId, record.events) : null;
  const pitching = isPitcherStyle(who.style);
  const vs = record && !(pitching && record.arm === "academy") ? ` vs ${rivalName(record.arm)}` : "";
  let line: string;
  if (record?.summary) line = `${record.summary}${vs}.`;
  else if (pgMet && proof) line = `She got what she came for${vs}. ${proof}`;
  else if (pgMet) line = `She got what she came for${vs}.`;
  else if (sgMet) line = `It got away from her${vs}. The smaller ask held.`;
  else line = `It got away from her${vs}.`;
  return { turn: run.turn, label, line, kind: "game" };
}

/**
 * A saved page, said the way the game says it now. Pages from before the copy pass named
 * "the goal"; pitcher years used to mint the hitter keepsake. The page says what she actually kept.
 */
export function scrapbookLine(id: CharacterId, line: string): string {
  line = line.replace("The goal she came for slipped", "It got away from her").replace("The smaller one held.", "The smaller ask held.");
  if (!isPitcherStyle(sheet(id).style)) return line;
  line = line.replaceAll(" vs the Academy arm", "");
  if (line === "The first-hit ball, kept." || line === "She kept the first-hit ball.") return "The last-out ball, kept.";
  if (line === "The Gate: she reached.") return "The Gate: three outs.";
  if (line === "The Gate: she did not reach, and you kept her.") return "The Gate: the outs weren't there.";
  return line;
}

export function memoryHighlight(m: CoachMemory): Highlight {
  return { turn: m.turn, label: turnMeta(m.turn).label, line: memoryLine(m), kind: "memory" };
}

/** Clubhouse wall. A pitcher ball is the last out. A hitter ball is the first hit. */
export function keepsakeWallLine(id: CharacterId, keepsake: Keepsake): string | null {
  if (keepsake === "dirt") return "A pinch of dirt from the baseline.";
  if (keepsake === "ball") return isPitcherStyle(sheet(id).style) ? "The last-out ball." : "The first-hit ball.";
  return null;
}

export function keepsakeHighlight(run: TraineeRun): Highlight | null {
  if (run.keepsake === "dirt") return { turn: run.turn, label: turnMeta(run.turn).label, line: "A pinch of dirt from the baseline, kept.", kind: "keepsake" };
  if (run.keepsake === "ball") {
    const line = isPitcherStyle(sheet(run.characterId).style) ? "The last-out ball, kept." : "The first-hit ball, kept.";
    return { turn: run.turn, label: turnMeta(run.turn).label, line, kind: "keepsake" };
  }
  return null;
}

export function rivalHighlight(run: TraineeRun, arm: RivalArmId): Highlight | null {
  if (arm === "academy") return null;
  const n = run.faced[arm] ?? 0;
  if (n !== 1 && n !== 3) return null;
  const name = sheet(arm).name;
  return {
    turn: run.turn,
    label: turnMeta(run.turn).label,
    line: n === 1 ? `First look at ${name}.` : `Third look at ${name}. She has a book on you now, and you on her.`,
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
  const outcome = [...inPa].reverse().find((e) => e.t === "score" && e.runner === "self")
    ? "She scored."
    : inPa.some((e) => e.t === "rbi")
      ? "A run came in."
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

/** Text replay, one line per pitch. */
export function replayLines(pa: DefiningPa, who: CharacterId): string[] {
  const name = sheet(who).name;
  const pitcher = isPitcherStyle(sheet(who).style);
  const rival = pa.rival ? sheet(pa.rival).name : "the Academy arm";
  const bases = pa.bases.first || pa.bases.second || pa.bases.third
    ? `runner${Number(pa.bases.first) + Number(pa.bases.second) + Number(pa.bases.third) > 1 ? "s" : ""} on ${[pa.bases.first && "1st", pa.bases.second && "2nd", pa.bases.third && "3rd"].filter(Boolean).join(" & ")}`
    : "bases empty";
  const matchup = pitcher ? `${name} on the mound` : `${name} vs ${rival}`;
  const lines = [`${turnMeta(pa.turn).label}. Inning ${replayInning(pa, pitcher)}, ${pa.outs} out, ${bases}. ${matchup}.`];
  let balls = 0;
  let strikes = 0;
  for (const p of pa.pitches) {
    lines.push(`${balls}-${strikes} ${p.type}${p.inZone ? "" : " off the plate"} — ${p.result}.`);
    if (p.result === "ball") balls += 1;
    else if (p.result === "called strike" || p.result === "swing and miss" || p.result === "foul") strikes += 1;
  }
  lines.push(replayOutcome(pa));
  return lines;
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
    missed: ["Nothing fell her way. She asked to hit again anyway.", "The outs didn't come. She sat on the bench until they turned the lights off."],
  },
  "first-light": {
    met: ["She came to do one thing and did it before the lights warmed up.", "She finished what she started and walked off slow."],
    missed: ["Nothing fell. She wrote the pitches down on the bus.", "It got loud, and for an inning the zone got small. She remembers which inning."],
  },
  "lantern-classic": {
    met: ["The lanterns were up, and so was she.", "The lanterns came on in the fifth. She was still out there."],
    missed: ["The lanterns stayed lit. It wasn't her night.", "She left before the lanterns did."],
  },
  "night-classic": {
    met: ["Somebody else's park, a full house, and it went her way.", "A road crowd, loud from the first pitch. She quieted it."],
    missed: ["A long ride home. She took the window seat and didn't talk.", "The road crowd got the last word."],
  },
  stretch: {
    met: ["It came down to the late innings, and she came through.", "Every out was hard. She got the ones that mattered."],
    missed: ["It got away late. She sat on the dugout step a long while.", "The arm ran out before the inning did."],
  },
  series: {
    met: ["She put the Finale on the calendar herself.", "She pitched her way into the Finale."],
    missed: ["It slipped. She kept the ticket stub anyway.", "She threw everything she had. It wasn't quite enough."],
  },
  finale: {
    met: ["The biggest night of the three years, and she won it.", "The last out of three years was hers."],
    missed: ["The last night of three years. She played every inning of it.", "She took the ball on the biggest night there is. She'd wanted that part most."],
  },
};

const GAME_INDEX: Record<BigGame, number> = { gate: 0, "first-light": 1, "lantern-classic": 2, "night-classic": 3, stretch: 4, series: 5, finale: 6 };

/** A page minted before the book kept its mark still says how it went. */
function metFromLine(line: string): boolean {
  return !/got away|slipped|did not reach|didn't|weren't/i.test(line);
}

function rivalFromLine(line: string): string | null {
  const m = / vs (?!the Academy)([A-Z][a-z]+)\b/.exec(line);
  return m ? m[1]! : null;
}

function meetingLine(name: string, n: number): string {
  if (n === 1) return `First time across from ${name}.`;
  if (n === 2) return `${name} again.`;
  if (n === 3) return `${name}, a third time. They know each other's habits by now.`;
  if (n === 4) return `${name}, a fourth time.`;
  if (n === 5) return `${name} again. Neither of them was surprised.`;
  return `${name}, one more time.`;
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
  const pitcher = isPitcherStyle(sheet(id).style);
  const plate = parkSrc(datePark(game, sheet(id).parkId));
  const film = (stem: string): BookPicture => ({ src: `/art/action/${id}/${stem}.webp`, plate: null });
  const bust = (mood: PortraitMood): BookPicture => ({ src: sceneBustSrc(id, mood), plate });
  const pool: BookPicture[] = met
    ? pitcher
      ? [film("k"), bust("elated"), film("follow")]
      : [film("celebrate"), bust("elated"), film("trot")]
    : pitcher
      ? [bust("focused"), bust("crushed"), film("set")]
      : [bust("focused"), film("crushed"), bust("crushed")];
  return pool[nth % pool.length]!;
}

export interface BookPage {
  turn: number;
  game: BigGame;
  /** The game's name, as the page was minted. */
  label: string;
  met: boolean;
  caption: string;
  /** Who was across from her, counted over the career. */
  meeting: string | null;
  /** A keepsake or a memory from the same day, tucked in. */
  notes: string[];
  picture: BookPicture;
}

export type BookEntry = { kind: "page"; page: BookPage } | { kind: "note"; turn: number; label: string; line: string };

/**
 * The scrapbook as a book: a polaroid for each big game she played, in order, with the
 * day's keepsake or memory tucked into its page. Memories from other days sit between
 * pages as notes. Rival pages are folded into the page they happened on.
 */
export function scrapbookBook(id: CharacterId, highlights: readonly Highlight[], pgResults?: readonly string[]): BookEntry[] {
  const pitcher = isPitcherStyle(sheet(id).style);
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
      const caption = PAGE_CAPTIONS[game][met ? "met" : "missed"][pitcher ? 1 : 0];
      const smaller = !met && /smaller (ask|one) held/i.test(h.line) ? " She still got the little one." : "";
      const page: BookPage = {
        turn: h.turn,
        game,
        label: h.label,
        met,
        caption: `${caption}${smaller}`,
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
  return text ? { kicker: "A letter from the stands.", text } : null;
}

export function addHighlight(run: TraineeRun, h: Highlight | null) {
  if (!h) return;
  if (run.highlights.some((x) => x.turn === h.turn && x.kind === h.kind && x.line === h.line)) return;
  run.highlights = keepPages([...run.highlights, h], HIGHLIGHT_CAP);
}
