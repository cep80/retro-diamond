/**
 * Park identity as presentation. Sky, wind, and which yard hosts a date.
 * Never a plate constant — 応援 / wind copy does not touch the oracle.
 */
import type { CharacterId, TraineeRun } from "./types.ts";
import type { FeaturedGame, GameKind } from "./featured-game.ts";
import { datePark } from "./culture.ts";
import { FINALE_WON_BANNER, finaleWonShort } from "./goals.ts";

export type ParkSky = "day" | "dusk" | "night";
export type ParkWind = "offshore" | "variable" | "calm" | "still" | "cross" | "light";

const DAY = new Set(["heat", "dusters", "range", "palms", "mags", "irons"]);
const DUSK = new Set(["rain", "forges", "north", "peaks"]);

export function featuredParkId(opts: { weekly?: boolean; kind: GameKind; homePark: string }) {
  return datePark(opts.kind, opts.homePark, opts.weekly);
}

export function parkSky(parkId: string): ParkSky {
  if (DAY.has(parkId)) return "day";
  if (DUSK.has(parkId)) return "dusk";
  return "night";
}

export function parkWind(parkId: string): ParkWind {
  if (parkId === "harbor") return "offshore";
  if (parkId === "peaks") return "variable";
  if (parkId === "range") return "calm";
  if (parkId === "koi") return "still";
  if (parkId === "north") return "cross";
  return "light";
}

export function parkSkyClass(parkId: string) {
  return `park-sky-${parkSky(parkId)}`;
}

export function parkCardLine(parkId: string) {
  const sky = parkSky(parkId);
  const wind = parkWind(parkId);
  const skyCopy = sky === "day" ? "Day game" : sky === "dusk" ? "Dusk" : "Night";
  const windCopy =
    wind === "offshore"
      ? "Offshore wind"
      : wind === "variable"
        ? "Wind variable"
        : wind === "calm"
          ? "Wind calm"
          : wind === "still"
            ? "Still air"
            : wind === "cross"
              ? "Cross breeze"
              : "Light wind";
  return `${skyCopy} · ${windCopy}`;
}

export function kitAccent(id: CharacterId) {
  if (id === "aoi") return "#ffd166";
  if (id === "reina") return "#7ad7ff";
  if (id === "miki") return "#c4d4e0";
  if (id === "sol") return "#e07a3d";
  if (id === "kira") return "#b794f6";
  return "#7aeadc";
}

export function sitLabel(style: string, cell: { row: number; col: number }, home: { row: number; col: number }) {
  if (cell.row === home.row && cell.col === home.col) return style;
  return "";
}

export function plateRead(run: TraineeRun, game: FeaturedGame) {
  if (game.kind === "practice") return "That's her first swing. The next one's in a real game.";
  if (game.pgMet) {
    if (game.pgId === "see-3-one-pa") {
      if (game.kind === "gate") return "She made the pitcher throw her three in one at-bat at the Gate.";
      return "She made the pitcher throw her three in one at-bat.";
    }
    if (game.pgId === "see-4-one-pa") return "She made the pitcher throw her four in one at-bat.";
    if (game.pgId === "see-5-one-pa") return "She made the pitcher throw her five in one at-bat.";
    if (game.pgId === "no-k") return game.kind === "finale" ? "She went the whole Diamond Finale without striking out." : "She didn't strike out once.";
    if (game.pgId === "foul-two-strike") return "She fouled one off with two strikes and stayed alive.";
    if (game.pgId === "full-count") return "She worked the count all the way to 3-2.";
    if (game.pgId === "contact-breaking") return "She got the bat on a breaking ball.";
    if (game.pgId === "runners-on-at-bat") return "She came up with runners on base.";
    if (game.pgId === "steal") return "She stole a base.";
    if (game.pgId === "steal-late") return "She stole a base late in the game.";
    if (game.pgId === "steal-risp") return "She stole with a runner in scoring position.";
    // Check-in 35's asks.
    if (game.pgId === "steal-risp-score") return "She stole with a runner in scoring position, then came all the way home.";
    if (game.pgId === "hits-2") return "Two hits today, and she wanted that second one bad.";
    if (game.pgId === "contact-breaking-2") return "She got the bat on two breaking balls.";
    if (game.pgId === "score-from-first") return "She scored all the way from first.";
    if (game.pgId === "steal-third") return "She stole third.";
    if (game.pgId === "score-from-first-single") return "She scored from first on a single.";
    if (game.pgId === "score-no-hit") return "She scored without getting a hit.";
    if (game.pgId === "reach-twice") return "She got on base twice.";
    if (game.pgId === "hit-risp") return "She got a hit with runners on base.";
    if (game.pgId === "hit-late") return "She got her hit late, when it counted.";
    // Aoi's Lantern and her Finale ask the same (check-in 28); the Finale says it its own way.
    if (game.pgId === "rbi") return game.kind === "finale" ? "She drove in a run in the Diamond Finale." : "She drove in a run.";
    if (game.pgId === "quality-abs-3") return "She hit three balls hard today.";
    if (game.kind === "gate") {
      const firstTime = game.events.some((e) => e.t === "reach" && e.pa === 1);
      if (firstTime) return "She got on base her very first time up at the Gate.";
      return game.hits + game.walks > 0 ? "She got on base at the Academy Gate." : "She got it done at the Academy Gate.";
    }
    if (game.hr) return "She hit one out, and she watched it the whole way.";
    if (game.walks > 0 && game.hits === 0) return "She drew a walk, and that was enough.";
    // Say what she did: the headline shows this line under the 達成 stamp, not her verb again.
    if (game.hits >= 3) return "Three hits. She just kept getting on.";
    if (game.hits === 2) return "Two hits. She just kept getting on.";
    if (game.hits === 1) return "She got on with a hit.";
    return "She got what she came for.";
  }
  const miss = plateMissRead(run, game);
  // Her side won the Finale without her ask: say they won, then what she didn't get.
  return finaleWonShort(game) ? `${FINALE_WON_BANNER} ${miss}` : miss;
}

const LOOK_SAW = ["", "One pitch", "Two pitches", "Three pitches", "Four pitches"] as const;
const LOOK_NEED = ["", "one", "two", "three", "four", "five"] as const;

function lookShort(n: number, need: 3 | 4 | 5): string {
  const saw = n > 0 && n < need ? LOOK_SAW[n] : undefined;
  const word = LOOK_NEED[need];
  return saw ? `Her longest at-bat was ${saw.toLowerCase()}. She wanted ${word}.` : `None of her at-bats got to ${word} pitches.`;
}

/** The pitch type just before event `index` (contact on a breaking ball reads the pitch it met). */
function lastPitchType(ev: FeaturedGame["events"], index: number) {
  for (let i = index - 1; i >= 0; i--) {
    const e = ev[i]!;
    if (e.t === "pitch") return e.type;
  }
  return null;
}

/** What a missed ask says at the plate: what she did, and what didn't come. */
function plateMissRead(run: TraineeRun, game: FeaturedGame): string {
  if (game.pgId === "see-3-one-pa") return lookShort(game.maxPaPitches, 3);
  if (game.pgId === "see-4-one-pa") return lookShort(game.maxPaPitches, 4);
  if (game.pgId === "see-5-one-pa") return lookShort(game.maxPaPitches, 5);
  if (game.pgId === "no-k" && game.struckOut) return "She struck out, and that was the one thing she didn't want.";
  if (game.pgId === "foul-two-strike") return "She never got the two-strike foul. She kept swinging anyway.";
  if (game.pgId === "full-count") return "She never got the count full.";
  if (game.pgId === "contact-breaking") return "She never got the bat on a breaking ball.";
  if (game.pgId === "contact-breaking-2") {
    const met = game.events.filter((e, i) => e.t === "contact" && e.tier !== "miss" && lastPitchType(game.events, i) !== "fastball").length;
    return met === 1 ? "She hit one breaking ball. She needed two." : "She never got the bat on a breaking ball.";
  }
  if (game.pgId === "hits-2") return game.hits === 1 ? "She got one hit. She needed two." : "The hits just didn't come today.";
  if (game.pgId === "steal-risp-score") {
    const rispSteal = game.events.some((e) => e.t === "stealResult" && e.safe && e.risp);
    const plain = game.events.some((e) => e.t === "stealResult" && e.safe && !e.risp);
    if (rispSteal) return "She stole the base, but she never made it home.";
    return plain ? "She stole, but nobody was in scoring position yet." : "She never got to steal with a runner in scoring position.";
  }
  if (game.pgId === "runners-on-at-bat") return "She never came up with runners on base.";
  if (game.pgId === "steal") return "She didn't get her steal today.";
  if (game.pgId === "steal-late") {
    const early = game.events.some((e) => e.t === "stealResult" && e.safe && e.inning < 7);
    return early ? "She stole, but it was too early in the game." : "She didn't get a steal late in the game.";
  }
  if (game.pgId === "steal-risp") {
    const plain = game.events.some((e) => e.t === "stealResult" && e.safe && !e.risp);
    return plain ? "She stole, but nobody was in scoring position yet." : "She never got to steal with a runner in scoring position.";
  }
  if (game.pgId === "score-from-first") {
    const scored = game.events.some((e) => e.t === "score" && e.runner === "self");
    const onFirst = game.events.some((e) => e.t === "reach" && e.base === 1);
    if (scored) return "She scored, just not all the way from first.";
    return onFirst ? "She got to first, but she never made it home." : "She never got on at first.";
  }
  if (game.pgId === "steal-third") {
    const second = game.events.some((e) => e.t === "stealResult" && e.safe && e.from === 1);
    const caught = game.events.some((e) => e.t === "stealResult" && !e.safe && e.from === 2);
    if (caught) return second ? "She stole second, then got caught stealing third." : "She got caught stealing third.";
    return second ? "She stole second, but third never happened." : "She never stole third.";
  }
  if (game.pgId === "score-from-first-single") return "She didn't score from first on a single.";
  if (game.pgId === "score-no-hit") {
    const onHit = game.events.some((e) => e.t === "score" && e.runner === "self" && e.selfReachedBy === "hit");
    return onHit ? "She scored, but she got on with a hit." : "She never scored without a hit.";
  }
  const last = game.lastPitches.at(-1);
  if (game.hits > 0 || game.walks > 0) {
    const on = game.hits + game.walks;
    if (game.pgId === "reach-twice" && on < 2) return "She reached once. She needed two.";
    if (game.pgId === "hit-late") return game.hits > 0 ? "She got a hit, but it came early." : "She walked, but she needed a late hit.";
    if (game.pgId === "hit-risp") {
      const walk = game.sgMet ? " She did get her walk." : "";
      return game.hits > 0 ? `She got a hit, but nobody was on base.${walk}` : `She never got a hit with runners on.${walk}`;
    }
    if (game.pgId === "rbi") {
      // She got on and nobody came home on her: say both (Aoi's Lantern and Finale, check-in 28).
      const walk = game.kind === "finale" && game.sgMet && game.hits > 0 ? " She did get her walk." : "";
      return `${game.hits > 0 ? "She got a hit" : "She drew a walk"}, but no run came home on her.${walk}`;
    }
    return on === 1 ? "She got on once, just not the way she needed to." : "She got on base, just not the way she needed to.";
  }
  if (game.struckOut) {
    if (game.qualityAbs > 0) return "She hit the ball, but she never got on base.";
    return "She struck out looking for a different pitch.";
  }
  if (game.lastContact === "miss") return "She swung through one right where she was looking.";
  if (game.lastContact === "hit" || game.lastContact === "barrel") return "She put it in play, but she never got on.";
  if (last && last.type !== "fastball" && run.stats.eye < 9) return "She never figured out the breaking ball.";
  if (game.lastContact === "foul-tip") return "She fouled it off. Her timing was right, she was just looking a little off.";
  if (game.lastContact === "foul") return "She pulled it foul. Good timing, wrong spot, and she knows it.";
  return "She didn't get what she came for.";
}
