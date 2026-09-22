import type { Ballplayer } from "./core/zone.ts";
import { sheet } from "./bible.ts";
import type { TraineeRun, TraineeStats } from "./types.ts";

export function academyPitcher(): Ballplayer {
  return {
    id: "academy-arm",
    name: "Academy Arm",
    contact: 5,
    power: 8,
    speed: 8,
    eye: 8,
    stuff: 10,
    control: 11,
    stamina: 12,
    energy: 100,
    bats: "R",
    throws: "R",
  };
}

export function aoiBatter(stats: TraineeStats): Ballplayer {
  return traineeBatter({ characterId: "aoi", stats } as Pick<TraineeRun, "characterId" | "stats">);
}

export function traineeBatter(run: Pick<TraineeRun, "characterId" | "stats">): Ballplayer {
  const who = sheet(run.characterId);
  return {
    id: run.characterId,
    name: who.name,
    contact: run.stats.contact,
    power: run.stats.power,
    speed: run.stats.speed,
    eye: run.stats.eye,
    stuff: 4,
    control: 4,
    stamina: 10,
    energy: 100,
    bats: "R",
    throws: "R",
  };
}

export function traineePitcher(run: TraineeRun, firstPitchOfPa: boolean, consecutiveInnings: number): Ballplayer {
  const who = sheet(run.characterId);
  const closerThird = who.style === "closer" && consecutiveInnings >= 3;
  return {
    id: run.characterId,
    name: who.name,
    contact: run.stats.contact,
    power: run.stats.power,
    speed: run.stats.speed,
    eye: run.stats.eye,
    stuff: run.stats.stuff,
    control: run.stats.control + (who.style === "ace" && firstPitchOfPa ? 2 : 0),
    stamina: run.stats.stamina - (closerThird ? 4 : 0),
    energy: run.energy,
    bats: "R",
    throws: "R",
  };
}

/** Academy lineup for Ace Act 1 — six different bats, one time through. */
export function academyBatter(index: number): Ballplayer {
  const contact = [9, 7, 11, 8, 6, 10][index % 6]!;
  const power = [6, 12, 8, 5, 14, 7][index % 6]!;
  const eye = [8, 6, 9, 7, 5, 10][index % 6]!;
  return {
    id: `academy-bat-${index % 6}`,
    name: ["Nishi", "Cruz", "Vale", "Park", "Boone", "Ito"][index % 6]!,
    contact,
    power,
    speed: 8,
    eye,
    stuff: 4,
    control: 4,
    stamina: 10,
    energy: 100,
    bats: index % 2 === 0 ? "R" : "L",
    throws: "R",
  };
}
