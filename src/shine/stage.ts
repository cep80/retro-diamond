/**
 * Park identity as presentation. Sky, wind, and which yard hosts a date.
 * Never a plate constant — 応援 / wind copy does not touch the oracle.
 */
import type { CharacterId, TraineeRun } from "./types.ts";
import type { FeaturedGame, GameKind } from "./featured-game.ts";
import { sheet } from "./bible.ts";
import { datePark } from "./culture.ts";

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
  const who = sheet(run.characterId);
  if (game.kind === "practice") return "Three looks. Energy spent.";
  if (game.pgMet) return `${who.pgVerb}.`;
  const last = game.lastPitches.at(-1);
  if (game.struckOut) return "She struck out. The sit never found the pitch.";
  if (game.lastContact === "miss") return "Swing through. The ghost sat where the ball crossed.";
  if (last && last.type !== "fastball" && run.stats.eye < 9) return "The breaking ball stayed a question.";
  if (game.lastContact === "foul-tip") return "Foul tip. Timing was there. The sit was a cell off.";
  if (game.lastContact === "foul") return "Pulled foul. She was on time. Wrong cell.";
  return "The Primary Goal stayed open. The loss is legible.";
}
