import { FINALE_PARK_PLATE, isPitcherStyle, sheet, stillSrc } from "./bible.ts";
import { FINALE_PARK } from "./core/parks.ts";
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
  return skin === "otachidai" ? "/bg/park-koi.jpg" : FINALE_PARK_PLATE;
}

/**
 * The girl on お立ち台. Celebrate and hitter follow stills hold a bat — retired.
 * Aoi has the locked cap-in-hand still. Miki walks off with the bat on the ground.
 * Yuki's trot is the steal: she is already running, no bat in the frame.
 * Pitchers hold the glove. A pitcher whose follow-through wears a banned mark stands
 * in her clean still, or her calm bust when she has none (Sol, art brief §10.2).
 */
export function curtainFilmSrc(id: CharacterId) {
  if (id === "aoi") return "/art/curtain/aoi.png";
  if (isPitcherStyle(sheet(id).style)) return stillSrc(id, "follow", "neutral");
  return `/art/action/${id}/trot.webp`;
}

/**
 * The postgame's picture, straight after the done panel (and after the Call, when
 * she earned one). It is never the picture that was just on screen:
 * - the done panel settles a miss on her crushed face, so the postgame is her composed one;
 * - a won date with no Call left her on the done panel's still (a hitter's celebrate,
 *   a pitcher's elated bust), so the postgame is the other one: the hitter's bust,
 *   the pitcher's follow-through;
 * - after the Call (the hitter's trot, the pitcher's follow-through) it is the one
 *   the Call didn't hold: the hitter's celebrate, the pitcher's bust.
 * ShineApp draws "film" with sceneFilmSrc and "bust" with sceneBustSrc.
 */
export function postgamePicture(id: CharacterId, met: boolean, curtain: boolean): { kind: "film" | "bust"; mood: "elated" | "focused" } {
  if (!met) return { kind: "bust", mood: "focused" };
  const pitcher = isPitcherStyle(sheet(id).style);
  return { kind: pitcher === curtain ? "bust" : "film", mood: "elated" };
}

/** The Call's own stamp: 喝采 (the cheer) over a gold "Curtain Call" pill, slammed like a date's. */
export const CURTAIN_STAMP = { jp: "喝采", en: "Curtain Call", tone: "gold" } as const;

/** The Call's way out (check-in 31, N10): she bows to the stands, she doesn't walk off on them. */
export const CURTAIN_CTA = "Take the bow";

/**
 * The stands' flashbulbs over the Call (check-in 31, N10): where each pops (percent of the
 * screen, kept to the stands above her), when it first fires and how often it fires again.
 * Fixed, so every Call flashes the same; reduced motion draws none.
 */
export const CURTAIN_FLASHES: readonly { x: number; y: number; d: number; p: number }[] = [
  { x: 12, y: 14, d: 150, p: 2300 },
  { x: 78, y: 9, d: 520, p: 2900 },
  { x: 34, y: 22, d: 940, p: 2600 },
  { x: 90, y: 26, d: 1350, p: 3100 },
  { x: 55, y: 11, d: 1720, p: 2450 },
  { x: 6, y: 31, d: 2100, p: 3300 },
  { x: 68, y: 33, d: 2480, p: 2750 },
];

/**
 * The card that opens a new year on its spring morning: the class in kana (the
 * way the track calls them), the year's name big, and the season under it.
 */
export function yearCard(year: 1 | 2 | 3): { kana: string; name: string; sub: string } {
  if (year === 3) return { kana: "シニア級", name: "Senior", sub: "Year three · Spring" };
  if (year === 2) return { kana: "クラシック級", name: "Classic", sub: "Year two · Spring" };
  return { kana: "ジュニア級", name: "Rookie", sub: "Year one · Spring" };
}

/** The line under the Call. It names the still, not a pose she does not have. */
export function curtainCaption(id: CharacterId) {
  if (id === "aoi") return "Cap in hand.";
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
// The RETIRED_* lines are never shown: they match lines old saves still hold, word for word,
// so the speech can say the new line instead. Don't edit them.
const RETIRED_YEAR_VOICE = "She's moving to the Palms organization. A new voice arrives.";
const RETIRED_REACH = "She was on. The goal she came for stayed open.";
const RETIRED_K = "She struck out. The sit never found the pitch.";

/** The year-start line. A pitcher's rotating mentor is the Bullpen Coach, a hitter's the Cage Coach. */
export function yearVoice(year: 1 | 2 | 3, pitcher = false) {
  if (year === 2) return `Last year's ${pitcher ? "Bullpen" : "Cage"} Coach took a job in Osaka. The new one shows up with donuts.`;
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
  if (!last) return `They wrote from the seats. They've started wearing ${who.number}.`;
  return `${last.label}. ${last.line} Row J kept the napkin. They've started wearing ${who.number}.`;
}

/** Campus speech. A saved year-start line from before the coach rewrite still speaks the new one. */
export function morningSpeech(lastLine: string | null, year: 1 | 2 | 3, parkId: string, pitcher = false) {
  if (!lastLine) return workMorningLine(parkId);
  if (lastLine === RETIRED_YEAR_VOICE) return yearVoice(year, pitcher);
  return dateSpeech(lastLine);
}

/**
 * Sacred-date host. Culture follows this park, not the girl's home. The Diamond Finale is
 * played in its own house (FINALE_PARK): neutral factors, its own crowd and booth.
 */
export function datePark(kind: string, homePark: string, weekly = false) {
  if (weekly || kind === "weekly" || kind === "lantern-classic" || kind === "gate") return "koi";
  if (kind === "night-classic") return "kings";
  if (kind === "finale") return FINALE_PARK;
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

/** The Finale's house takes the loudest stem we have (midwest measures loudest on disk). */
export function crowdStem(parkId: string): CrowdStem {
  if (parkId === FINALE_PARK) return "midwest";
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
    "Two taps of her glove. The whole section taps back.",
    "The section waves bus transfers. She laughs every time.",
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
  "They sing anyway. Neither mail carrier knows the second verse.",
  "Inning turns. The bell does not.",
  "North Field keeps the losing crowd.",
  "She heard the bell before the pitch.",
  "The radio booth has run out of ways to say 'fouled back.'",
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

/** The Finale's house: every seat sold, both fan sections in one building. */
const RECAP_DIAMOND = [
  "Every seat is sold. Nobody is sitting in one.",
  "Both ends of the stadium have brought their own songs.",
  "Gold bunting on the rail. The booth has stopped reading the lineup.",
  "The lights hum. Somebody in the upper deck is crying already.",
  "Her number is on towels in sections she's never played to.",
  "The organ holds a chord. The whole house waits for the pitch.",
  "Towels in one end, cowbells in the other. It's the last night.",
];

/** Lines only a hitter's day can say: the box, the walk-up, a foul, the spikes. */
const BATTER_ONLY = /in the box|Walk-up|fouled back|spikes|before the pitch/i;

export function recapLine(parkId: string, inning: number, pitcher = false): string {
  const culture = parkCulture(parkId);
  const all = parkId === FINALE_PARK ? RECAP_DIAMOND : culture === "jp" ? RECAP_JP : culture === "blend" ? RECAP_BLEND : RECAP_US;
  const pool = pitcher ? all.filter((l) => !BATTER_ONLY.test(l)) : all;
  return pool[Math.abs(inning) % pool.length]!;
}

export function recapPoolSize() {
  return { jp: RECAP_JP.length, blend: RECAP_BLEND.length, us: RECAP_US.length, diamond: RECAP_DIAMOND.length };
}

export function verseCount() {
  return (Object.keys(VERSES) as CharacterId[]).reduce((n, id) => n + VERSES[id].length, 0);
}
