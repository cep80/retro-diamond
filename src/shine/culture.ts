import { sheet } from "./bible.ts";
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

/** Ending rank as the emotional frame label (before sparks / box score). */
export function endingRankLabel(rank: EndingRank) {
  if (rank === "never-quit") return "Never Quit ◆";
  if (rank === "S") return "S — Legend";
  if (rank === "A") return "A — Diamond";
  if (rank === "B") return "B — Rough";
  if (rank === "D") return "D — Quiet Graduate";
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
  return "Early work. You set the stations.";
}

/** Story, not a gacha. Mentor C rotates at year-start. */
export function yearVoice(year: 1 | 2 | 3) {
  if (year === 2) return "She's moving to the Palms organization. A new voice arrives.";
  if (year === 3) return "Senior camp. The skip who threw BP in Classic is gone. Legs lie. Energy is back to 80.";
  return "The year is open. Work.";
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
    "They start it before she leaves the bullpen. COMMAND.",
  ],
  miki: [
    "Cowbell for Miki. They do not wait for a win.",
    "North still sings at 8–1. FIGHT.",
    "The bell is already going when she leaves the on-deck circle.",
  ],
  sol: [
    "Red Mesa. Heat is not a metaphor.",
    "Gulf wind in the walk-up. She does not smile.",
    "They start it at the warning track. Sol.",
  ],
  kira: [
    "Closer entrance. The ninth is the only inning.",
    "Stars point at the bullpen door, not the sky.",
    "They start it at 11. HOLD.",
  ],
  yuki: [
    "Palm steal. She does not wait on a walk.",
    "Dirt on the white pants is the still.",
    "They start it as she takes a lead. RUN.",
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
  "First Light still lives in the 3rd.",
  "Koi holds. The booth stays quiet.",
  "She bows to the field. Flavor.",
  "朝練 is already tomorrow.",
  "The pinch of dirt stays in the pocket.",
];

const RECAP_BLEND = [
  "Cowbell in the 7th. North does not wait.",
  "Blend park. Quiet gloves, loud bell.",
  "They sing anyway. That is the point.",
  "Inning turns. The bell does not.",
  "North Field keeps the losing crowd.",
  "She heard the bell before the pitch.",
  "The booth calls it a fight, not a result.",
  "Rain on the cowbell. Still going.",
  "FIGHT is the only verb that fits.",
  "They cheer for her, not the board.",
];

const RECAP_US = [
  "Walk-up sting. Curtain call from the dugout.",
  "PA plays her hook. No encore promised.",
  "In the 7th, the organ finds her.",
  "Dugout step. Cap. Crowd.",
  "The booth follows the park, not the score.",
  "Night Classic lights. She does not look up.",
  "Harbor wind. The still is dirt on white pants.",
  "Stars. Bullpen door, not the sky.",
  "Stretch baseball. The date is on the plate.",
  "The Show is a park, not a menu.",
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
