import { isPitcherStyle, sheet } from "./bible.ts";
import type { CharacterId, EndingRank } from "./types.ts";

export type ParkCulture = "jp" | "blend" | "us";
export type CrowdStem = "koi" | "north" | "east" | "west" | "midwest" | "desert";

/** First sentence of Past — Select tile leads with her story, not a build. */
export function pastBlurb(id: CharacterId) {
  const past = sheet(id).past.trim();
  const cut = past.search(/[.!?]\s/);
  if (cut < 0) return past;
  return past.slice(0, cut + 1);
}

/** Curtain Call still path. Cap in hand, no bat — presentation only. */
export function curtainStillSrc(skin: "otachidai" | "dugout") {
  return skin === "otachidai" ? "/bg/park-koi.jpg" : "/bg/stadium.jpg";
}

/**
 * The girl on お立ち台. Celebrate and hitter follow stills hold a bat — retired.
 * Aoi has the locked cap-in-hand still. Miki walks off with the bat on the ground.
 * Yuki's trot is the steal: she is already running, no bat in the frame.
 * Pitchers hold the glove.
 */
export function curtainFilmSrc(id: CharacterId) {
  if (id === "aoi") return "/art/curtain/aoi.png";
  if (isPitcherStyle(sheet(id).style)) return `/art/action/${id}/follow.webp`;
  return `/art/action/${id}/trot.webp`;
}

/** The line under the Call. It names the still, not a pose she does not have. */
export function curtainCaption(id: CharacterId) {
  if (id === "aoi") return "Cap in hand. No bat.";
  if (id === "yuki") return "She's going.";
  if (isPitcherStyle(sheet(id).style)) return "The glove stays.";
  return "The bat is down.";
}

/** Ending rank as the emotional frame label (before sparks / box score). */
export function endingRankLabel(rank: EndingRank) {
  if (rank === "never-quit") return "Never Quit ◆";
  if (rank === "S") return "S — Legend";
  if (rank === "A") return "A — Diamond";
  if (rank === "B") return "B — Finale Night";
  if (rank === "D") return "D — Quiet Ending";
  return "C — Lantern";
}

/**
 * 応援団 visual swell. Two strikes at Lantern Field — portrait/crowd wash only.
 * Never a plate constant.
 */
export function ouenSwell(parkId: string, strikes: number) {
  return parkCulture(parkId) === "jp" && strikes >= 2;
}

const EAST = new Set(["harbor", "kings", "knights", "mags"]);
const WEST = new Set(["rain", "palms", "stars", "peaks"]);
const MIDWEST = new Set(["irons", "forges", "smoke"]);
const DESERT = new Set(["dusters", "heat", "range"]);

export function parkCulture(parkId: string): ParkCulture {
  if (parkId === "koi") return "jp";
  if (parkId === "north") return "blend";
  return "us";
}

/** Work-day open. Same stations; the light is the park. */
export function workMorningLine(parkId: string) {
  if (parkId === "koi") return "Morning at the complex. 朝練.";
  if (parkId === "heat" || parkId === "dusters" || parkId === "range") return "Early work. The sun is already up.";
  if (parkId === "north") return "Morning. The poles wait if she'll go.";
  return "Early work. The complex is already awake.";
}

/** Story, not a gacha. Mentor C rotates at year-start. She does not change parks. */
const RETIRED_YEAR_VOICE = "She's moving to the Palms organization. A new voice arrives.";
const RETIRED_REACH = "She was on. The goal she came for stayed open.";
const RETIRED_K = "She struck out. The sit never found the pitch.";

export function yearVoice(year: 1 | 2 | 3) {
  if (year === 2) return "Last year's coach took a job in Osaka. The new one shows up with donuts.";
  if (year === 3) return "The Stretch is next.";
  return "The year is open.";
}

/** A saved miss line from before the reach count still names what she did. */
export function dateSpeech(line: string) {
  if (line === RETIRED_REACH) return "She reached once. She needed two.";
  if (line === RETIRED_K) return "She put the ball in play. She never got on.";
  return line;
}

/** Fan mail quotes a date she actually sat. No napkin invents a count. */
export function fanLetter(run: { characterId: CharacterId; highlights?: { kind: string; label: string; line: string }[] }): string {
  const last = [...(run.highlights ?? [])].reverse().find((h) => h.kind === "game");
  const who = sheet(run.characterId);
  if (!last) return `They wrote from the seats. They already call her number ${who.number}.`;
  return `${last.label}. ${last.line} Row J kept the napkin. They already call her number ${who.number}.`;
}

/** Campus speech. A saved year-start line from before the coach rewrite still speaks the new one. */
export function morningSpeech(lastLine: string | null, year: 1 | 2 | 3, parkId: string) {
  if (!lastLine) return workMorningLine(parkId);
  if (lastLine === RETIRED_YEAR_VOICE) return yearVoice(year);
  return dateSpeech(lastLine);
}

/** Sacred-date host. Culture follows this park, not the girl's home. */
export function datePark(kind: string, homePark: string, weekly = false) {
  if (weekly || kind === "weekly" || kind === "lantern-classic" || kind === "gate") return "koi";
  if (kind === "night-classic") return "kings";
  return homePark;
}

/** Curtain Call is the last-act Winning Live. Misses walk off without it. */
export function shouldCurtainCall(kind: string, pgMet: boolean) {
  if (!pgMet) return false;
  return (
    kind === "first-light" ||
    kind === "lantern-classic" ||
    kind === "night-classic" ||
    kind === "stretch" ||
    kind === "series" ||
    kind === "finale"
  );
}

export function crowdStem(parkId: string): CrowdStem {
  if (parkId === "koi") return "koi";
  if (parkId === "north") return "north";
  if (WEST.has(parkId)) return "west";
  if (MIDWEST.has(parkId)) return "midwest";
  if (DESERT.has(parkId)) return "desert";
  return "east";
}

export function curtainSkin(parkId: string): "otachidai" | "dugout" {
  return parkCulture(parkId) === "jp" ? "otachidai" : "dugout";
}

/** Lantern's Call is お立ち台. The sheet line stays the home-park dugout for Kings. */
export function curtainCallLine(call: string, skin: "otachidai" | "dugout"): string {
  if (skin === "otachidai" && call.startsWith("Dugout.")) return `お立ち台.${call.slice("Dugout.".length)}`;
  if (skin === "dugout" && call.startsWith("お立ち台.")) return `Dugout.${call.slice("お立ち台.".length)}`;
  return call;
}

/** Presentation only. Never a plate constant. */
export function cowbellOn(parkId: string, scoreDiff: number, inning: number) {
  return parkId === "north" && Math.abs(scoreDiff) <= 1 && inning >= 7;
}

export function verseTier(fans: number): 0 | 1 | 2 | 3 {
  if (fans >= 80) return 3;
  if (fans >= 60) return 2;
  if (fans >= 30) return 1;
  return 0;
}

/** 6 girls × 3 fan-tier verses = 18 lines. Audio/visual only. */
export const VERSES: Record<CharacterId, [string, string, string]> = {
  aoi: [
    "アオイ — First Light, take the bag.",
    "Lantern towels. Reach, then go first-to-third.",
    "They start it in the on-deck circle. アオイ.",
  ],
  reina: [
    "レイナ — Cold Count. One more strike.",
    "The 応援団 holds the note until she nods.",
    "They start it before she leaves the bullpen. レイナ.",
  ],
  miki: [
    "Cowbell for Miki. They do not wait for a win.",
    "North still sings when it's 8–1.",
    "The bell is already going when she leaves the on-deck circle.",
  ],
  sol: [
    "Red Mesa on the organ. The radar gun reads a hundred and one.",
    "Gulf wind in the walk-up. She does not smile.",
    "They start it at the warning track. Sol.",
  ],
  kira: [
    "Closer entrance. The ninth is the only inning.",
    "Stars point at the bullpen door, not the sky.",
    "They start it the second the bullpen door opens.",
  ],
  yuki: [
    "Palm steal. She does not wait on a walk.",
    "Dirt all over the white pants. Nobody's surprised.",
    "They start it as she takes her lead.",
  ],
};

export function cheerLines(id: CharacterId, fans: number): string[] {
  const tier = verseTier(fans);
  if (tier === 0) return [];
  return VERSES[id].slice(0, tier);
}

const RECAP_JP = [
  "終盤. She tips the cap to the bleachers.",
  "Lantern Field dirt still on the spikes.",
  "応援団 does not sit down.",
  "お立ち台 waits if she earned it.",
  "The towels keep time with her name.",
  "The bleachers kept the verse.",
  "Koi holds. The booth stays quiet.",
  "She bows to the field before she bows to anyone else.",
  "The last verse is still in the bleachers.",
  "The pinch of dirt stays in the pocket.",
];

const RECAP_BLEND = [
  "Cowbell in the 7th. North does not wait.",
  "North Field. Nobody claps, but the bell never stops.",
  "They sing anyway. That is the point.",
  "Inning turns. The bell does not.",
  "North Field keeps the losing crowd.",
  "She heard the bell before the pitch.",
  "The booth calls it a fight, not a result.",
  "Rain on the cowbell. Still going.",
  "The bell says what the scoreboard won't.",
  "Section 4 rang both cowbells, a little out of time with each other.",
];

const RECAP_US = [
  "Walk-up sting. The dugout stays put.",
  "The organ plays her four bars. She's already in the box.",
  "In the 7th, the organ finds her.",
  "Dugout step. Cap. Crowd.",
  "The booth stays with her. The score can wait.",
  "Harbor wind. The lights stay on.",
  "A man behind the dugout eats a hot dog like it owes him money.",
];

export function recapLine(parkId: string, inning: number): string {
  const culture = parkCulture(parkId);
  const pool = culture === "jp" ? RECAP_JP : culture === "blend" ? RECAP_BLEND : RECAP_US;
  return pool[Math.abs(inning) % pool.length]!;
}

export function recapPoolSize() {
  return { jp: RECAP_JP.length, blend: RECAP_BLEND.length, us: RECAP_US.length };
}

export function verseCount() {
  return (Object.keys(VERSES) as CharacterId[]).reduce((n, id) => n + VERSES[id].length, 0);
}
