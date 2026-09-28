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
  if (game.kind === "practice") return "Three looks. The bat is real.";
  if (game.pgMet) {
    if (game.pgId === "see-3-one-pa") {
      if (game.kind === "gate") return "Three pitches in one look. The Gate opened.";
      if (game.kind === "finale") return "Diamond Finale. Three pitches in one look.";
      return "Three pitches in one look.";
    }
    if (game.pgId === "no-k") return "She didn't strike out.";
    if (game.pgId === "foul-two-strike") return "She fouled one off with two strikes and stayed alive.";
    if (game.pgId === "full-count") return "She took it to 3-2.";
    if (game.pgId === "contact-breaking") return "She put the bat on a breaking ball.";
    if (game.pgId === "runners-on-at-bat") return "She came up with runners on.";
    if (game.pgId === "steal") return "She stole a base.";
    if (game.pgId === "steal-late") return "She stole late.";
    if (game.pgId === "steal-risp") return "She stole with a runner in scoring position.";
    if (game.pgId === "score-from-first-single") return "She scored from first on a single.";
    if (game.pgId === "score-no-hit") return "She scored without a hit.";
    if (game.pgId === "reach-twice") return "She reached twice.";
    if (game.pgId === "hit-risp") return "A hit with runners on.";
    if (game.pgId === "hit-late") return "A hit, and a late one.";
    if (game.pgId === "rbi") return "A run scored on her ball.";
    if (game.pgId === "quality-abs-3") return "Three balls in play, all hard.";
    if (game.kind === "gate") return "The Gate opened.";
    if (game.hr) return "She watched it go.";
    if (game.walks > 0 && game.hits === 0) return "Ball four was enough.";
    // Say what she did: the headline shows this line under the 達成 stamp, not her verb again.
    if (game.hits >= 3) return "Three hits. She kept reaching.";
    if (game.hits === 2) return "Two hits. She kept reaching.";
    if (game.hits === 1) return "She reached on a hit.";
    return "She got what she came for.";
  }
  const miss = plateMissRead(run, game);
  // Her side won the Finale without her ask: say they won, then what she didn't get.
  return finaleWonShort(game) ? `${FINALE_WON_BANNER} ${miss}` : miss;
}

/** What a missed ask says at the plate: what she did, and what didn't come. */
function plateMissRead(run: TraineeRun, game: FeaturedGame): string {
  if (game.pgId === "see-3-one-pa") {
    const n = game.maxPaPitches;
    if (n >= 2) return "Two pitches in the look. She needed three.";
    if (n === 1) return "One pitch in the look. She needed three.";
    return "The look never got to three pitches.";
  }
  if (game.pgId === "no-k" && game.struckOut) return "She struck out.";
  if (game.pgId === "foul-two-strike") return "The two-strike foul didn't come. She kept swinging anyway.";
  if (game.pgId === "full-count") return "The count never got to 3-2.";
  if (game.pgId === "contact-breaking") return "The breaking ball never met the bat.";
  if (game.pgId === "runners-on-at-bat") return "She never came up with runners on.";
  if (game.pgId === "steal") return "The steal didn't come.";
  if (game.pgId === "steal-late") {
    const early = game.events.some((e) => e.t === "stealResult" && e.safe && e.inning < 7);
    return early ? "She stole. It was early." : "The late steal didn't come.";
  }
  if (game.pgId === "steal-risp") {
    const plain = game.events.some((e) => e.t === "stealResult" && e.safe && !e.risp);
    return plain ? "She stole, but nobody was in scoring position yet." :"The steal with a runner in scoring position didn't come.";
  }
  if (game.pgId === "score-from-first-single") return "She didn't score from first.";
  if (game.pgId === "score-no-hit") {
    const onHit = game.events.some((e) => e.t === "score" && e.runner === "self" && e.selfReachedBy === "hit");
    return onHit ? "She scored. It was on a hit." : "The run without a hit didn't come.";
  }
  const last = game.lastPitches.at(-1);
  if (game.hits > 0 || game.walks > 0) {
    const on = game.hits + game.walks;
    if (game.pgId === "reach-twice" && on < 2) return "She reached once. She needed two.";
    if (game.pgId === "hit-late") return game.hits > 0 ? "She hit. It was early." : "She walked. She needed a hit, and a late one.";
    if (game.pgId === "hit-risp") {
      const walk = game.sgMet ? " The walk held." : "";
      return game.hits > 0 ? `She hit. The runners weren't on.${walk}` : `The hit with runners on didn't come.${walk}`;
    }
    return on === 1 ? "She reached once. Not the way she needed to." : "She got on. Not the way she needed to.";
  }
  if (game.struckOut) {
    if (game.qualityAbs > 0) return "She put the ball in play. She never got on.";
    return "Strike three. She was waiting on the wrong pitch.";
  }
  if (game.lastContact === "miss") return "Swing and a miss. Right where she was looking, too.";
  if (game.lastContact === "hit" || game.lastContact === "barrel") return "In play. She didn't reach.";
  if (last && last.type !== "fastball" && run.stats.eye < 9) return "The breaking ball stayed a question.";
  if (game.lastContact === "foul-tip") return "Foul tip. The timing was there. She was looking a little off it.";
  if (game.lastContact === "foul") return "Pulled foul. Good timing, wrong spot. She knows.";
  return "She didn't get what she came for.";
}
