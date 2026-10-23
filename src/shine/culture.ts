import { FINALE_PARK_PLATE, isPitcherStyle, sheet, stillSrc } from "./bible.ts";
import { FINALE_PARK } from "./core/parks.ts";
import type { Beat, SceneLike } from "./story.ts";
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
  if (year === 3) return { kana: "シニア級", name: "Senior", sub: "Last spring" };
  if (year === 2) return { kana: "クラシック級", name: "Classic", sub: "Spring" };
  return { kana: "ジュニア級", name: "Rookie", sub: "First spring" };
}

/** The lines under the year's card, one tap each. The card already names the class. */
export function yearStartLines(year: 1 | 2 | 3): string[] {
  if (year === 2) {
    return [
      "She was at the Academy before anyone opened the gate.",
      "She's a year older and still wearing the same number.",
    ];
  }
  if (year === 3) {
    return [
      "Her last spring at the Academy.",
      "She knows where everything is now, even the good hose.",
    ];
  }
  return ["First morning at the Academy.", "She hasn't learned the shortcuts yet."];
}

/** The year-end door after first spring / the lantern year. Never "Classic year" or "senior year". */
export function yearEndCta(year: 1 | 2): string {
  return year === 1 ? "On to the lantern year" : "On to last spring";
}

export function yearEndNextLine(year: 1 | 2): string {
  return year === 1
    ? "Next spring is the lantern year, and that means the Lantern Classic."
    : "Next spring is last spring, and the Stretch comes up fast.";
}

/** Joined, for tests and old speech that still reads one string. */
export function yearStartLine(year: 1 | 2 | 3): string {
  return yearStartLines(year).join(" ");
}

/** The line under the Call. It names the still, not a pose she does not have. */
export function curtainCaption(id: CharacterId) {
  if (id === "aoi") return "She takes her cap off for the crowd.";
  if (id === "yuki") return "She's already running, of course.";
  if (isPitcherStyle(sheet(id).style)) return "She holds the glove up to the stands.";
  return "She sets the bat down and just listens.";
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
  if (parkId === "koi") return "Seven in the morning at Koi Park, and the heron's in the pond while she's already in the cage.";
  if (parkId === "heat" || parkId === "dusters" || parkId === "range") return "It's early, and the sun's already baking the bullpen dirt.";
  if (parkId === "north") return "Morning at North, and Gary the heater is clanking because somebody's already in the cage.";
  return "It's early, and the Academy is already awake.";
}

/** Story, not a gacha. Mentor C rotates at year-start. She does not change parks. */
// The RETIRED_* lines are never shown: they match lines old saves still hold, word for word,
// so the speech can say the new line instead. Don't edit them.
const RETIRED_YEAR_VOICE = "She's moving to the Palms organization. A new voice arrives.";
const RETIRED_REACH = "She was on. The goal she came for stayed open.";
const RETIRED_K = "She struck out. The sit never found the pitch.";

/** The year-start line. A pitcher's rotating mentor is the Bullpen Coach, a hitter's the Cage Coach. */
export function yearVoice(year: 1 | 2 | 3, pitcher = false) {
  if (year === 2) return `Last year's ${pitcher ? "Bullpen" : "Cage"} Coach took a job in Osaka, and the new one shows up with donuts.`;
  if (year === 3) return "The Stretch is next, and everybody at the Academy knows it.";
  return pitcher ? "Don't get cute, find the bullpen and stay there." : "Don't get cute, find the cage and stay there.";
}

/** A saved miss line from before the reach count still names what she did. */
export function dateSpeech(line: string) {
  if (line === RETIRED_REACH) return "She reached once, and she needed two.";
  if (line === RETIRED_K) return "She put the ball in play, and she never got on.";
  return line;
}

type FanLetterRun = { characterId: CharacterId; highlights?: { kind: string; label: string; line: string }[] };

/** Fan mail quotes a date she actually sat. No napkin invents a count. One tap, one line. */
export function fanLetterScene(run: FanLetterRun): SceneLike {
  const last = [...(run.highlights ?? [])].reverse().find((h) => h.kind === "game");
  const who = sheet(run.characterId);
  const beats: Beat[] = last
    ? [
        { who: "narration", text: `A letter from Row J, about the ${last.label}.` },
        { who: "narration", text: last.line },
        { who: "narration", text: `They kept the napkin, and they've started wearing number ${who.number}.` },
      ]
    : [{ who: "narration", text: `A letter came from the seats, and somebody out there has started wearing number ${who.number}.` }];
  beats.push({ who: "coach", text: "There's a whole stack of them at the front desk now, and she read every one twice." });
  return { id: "fan-letter", girl: run.characterId, place: "Academy front desk · before seven", beats };
}

/** The letter as one string, for tests that still read the quote. */
export function fanLetter(run: FanLetterRun): string {
  return fanLetterScene(run)
    .beats.filter((b) => b.who === "narration")
    .map((b) => b.text)
    .join(" ");
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
  const UP = "Up on the hero's platform, ";
  const DOWN = "Back in the dugout, ";
  if (skin === "otachidai" && call.startsWith(DOWN)) return UP + call.slice(DOWN.length);
  if (skin === "dugout" && call.startsWith(UP)) return DOWN + call.slice(UP.length);
  // The older fragment openers, kept so a retired line still swaps — in English.
  if (call.startsWith("Dugout.")) {
    const rest = call.slice("Dugout.".length).trimStart();
    return (skin === "otachidai" ? UP : DOWN) + rest;
  }
  if (call.startsWith("お立ち台.")) {
    const rest = call.slice("お立ち台.".length).trimStart();
    return (skin === "otachidai" ? UP : DOWN) + rest;
  }
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
    "The bleachers chant \"Take the bag!\" for Aoi. Her mom is the loudest one.",
    "The Koi seats wave towels for her, somebody brought a sign that just says 1.",
    "They start her song while she's still in the on-deck circle.",
  ],
  reina: [
    "The Koi section counts her strikes out loud, she'd correct them if they were wrong.",
    "The cheering section holds one long note until she nods to the catcher.",
    "They start her song before she's even out of the bullpen.",
  ],
  miki: [
    "Section 4 rings the cowbell for Miki, they don't wait for a win.",
    "North is still singing, and it's 8–1, that's North for you.",
    "The cowbell's already going before she's out of the on-deck circle.",
  ],
  sol: [
    "The organ plays her song, the radar gun says a hundred and one.",
    "Her walk-up music is still echoing, she doesn't smile, Luz does.",
    "The crowd starts her song while she's still out by the warning track.",
  ],
  kira: [
    "She taps her glove twice, and the whole section taps back.",
    "The section waves old bus transfers at her, she laughs every single time.",
    "They start her song the second the bullpen door opens.",
  ],
  yuki: [
    "The Palms crowd yells \"Go!\" the second she takes a lead, she hates it, she goes anyway.",
    "There's dirt all over her white pants already, nobody's surprised.",
    "They start her song as soon as she takes her lead.",
  ],
};

export function cheerLines(id: CharacterId, fans: number): string[] {
  const tier = verseTier(fans);
  if (tier === 0) return [];
  return VERSES[id].slice(0, tier);
}

// The park's own people between innings: whole sentences, and nobody's inning number,
// since the same line can land in the 1st or the 9th.
const RECAP_JP = [
  "Haruko's in the third-base seats with a spatula in her hand, she came straight from the grill.",
  "The Koi cheering section hasn't sat down since the first pitch.",
  "A kid in the bleachers is keeping score with a pencil stub, the way Aoi does.",
  "The towels in right field are going in time with her name.",
  "There's a heron in the pond past left field, it hasn't moved all game.",
  "The booth at Koi goes quiet and lets the crowd do the talking.",
  "Haruko yells something from the stands, nobody can hear it, and everybody agrees with it.",
  "She bows to the field before she bows to anyone else.",
  "The cheering section starts the next verse before the last one's even done.",
  "She's got Koi dirt on her spikes, and she isn't wiping it off.",
];

const RECAP_BLEND = [
  "Section 4 rings the cowbell, they don't need a reason.",
  "Nobody at North claps much, but the cowbell never stops.",
  "The two mail carriers in Section 4 sing anyway, neither one knows the second verse.",
  "The inning turns over, the cowbell doesn't.",
  "North's crowd has seen a lot of losing, they came anyway.",
  "She can hear the cowbell before the pitch, every single time.",
  "The radio guy has run out of ways to say 'fouled back.'",
  "It's drizzling on the cowbell, it's still going.",
  "The cowbell says what the scoreboard won't.",
  "Section 4 brought two cowbells today, and they're not quite in time with each other.",
];

const RECAP_US = [
  "Her walk-up song hits, and the whole dugout leans on the rail.",
  "The organist plays her four bars, she's already in the box.",
  "The organ finds her name and leans on it.",
  "She comes up the dugout steps, tugs her cap, and the crowd gets loud.",
  "The booth stays on her, the score can wait.",
  "The lights are buzzing, and the wind's picked up.",
  "A guy behind the dugout is eating a hot dog like it owes him money.",
];

/** The Finale's house: every seat sold, both fan sections in one building. */
const RECAP_DIAMOND = [
  "Every seat is sold, and nobody is sitting in one.",
  "Both ends of the stadium brought their own songs, and they're singing over each other.",
  "There's gold bunting on every rail, and the crowd's too loud to hear the announcer.",
  "The lights hum, somebody in the upper deck is already crying.",
  "Her number's on towels in sections she's never even played to.",
  "The organ holds one chord, and the whole house waits for the pitch.",
  "Towels at one end, cowbells at the other, it's the last night of the year.",
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
