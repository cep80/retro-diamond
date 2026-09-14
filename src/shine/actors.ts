import { emptyStats } from "../game/data.ts";
import type { Player } from "../game/types.ts";
import { sheet } from "./bible.ts";
import type { TraineeRun, TraineeStats } from "./types.ts";

const LOOK = { skin: 0 as const, hair: 1 as const, build: 1 as const, helm: false };

export function academyPitcher(): Player {
  return {
    id: "academy-arm",
    name: "Academy Arm",
    pos: "SP",
    age: 22,
    potential: 12,
    contact: 5,
    power: 8,
    speed: 8,
    eye: 8,
    fielding: 10,
    arm: 11,
    stuff: 10,
    control: 11,
    stamina: 12,
    salary: 1,
    years: 1,
    morale: 60,
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    bats: "R",
    throws: "R",
    look: LOOK,
  };
}

export function aoiBatter(stats: TraineeStats): Player {
  return traineeBatter({ characterId: "aoi", stats } as Pick<TraineeRun, "characterId" | "stats">);
}

export function traineeBatter(run: Pick<TraineeRun, "characterId" | "stats">): Player {
  const who = sheet(run.characterId);
  return {
    id: run.characterId,
    name: who.name,
    pos: who.style === "lead" || who.style === "move" ? "CF" : "C",
    age: 16,
    potential: who.potential,
    contact: run.stats.contact,
    power: run.stats.power,
    speed: run.stats.speed,
    eye: run.stats.eye,
    fielding: 10,
    arm: 8,
    stuff: 4,
    control: 4,
    stamina: 10,
    salary: 1,
    years: 1,
    morale: 70,
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    bats: "R",
    throws: "R",
    look: LOOK,
  };
}

export function traineePitcher(run: TraineeRun, firstPitchOfPa: boolean, consecutiveInnings: number): Player {
  const who = sheet(run.characterId);
  const closerThird = who.style === "closer" && consecutiveInnings >= 3;
  return {
    id: run.characterId,
    name: who.name,
    pos: who.style === "closer" ? "RP" : "SP",
    age: 17,
    potential: who.potential,
    contact: run.stats.contact,
    power: run.stats.power,
    speed: run.stats.speed,
    eye: run.stats.eye,
    fielding: 10,
    arm: 12,
    stuff: run.stats.stuff,
    control: run.stats.control + (who.style === "ace" && firstPitchOfPa ? 2 : 0),
    stamina: run.stats.stamina - (closerThird ? 4 : 0),
    salary: 1,
    years: 1,
    morale: 70,
    energy: run.energy,
    injured: 0,
    stats: emptyStats(),
    bats: "R",
    throws: "R",
    look: LOOK,
  };
}

/** Academy lineup for Ace Act 1 — six different bats, one time through. */
export function academyBatter(index: number): Player {
  const contact = [9, 7, 11, 8, 6, 10][index % 6]!;
  const power = [6, 12, 8, 5, 14, 7][index % 6]!;
  const eye = [8, 6, 9, 7, 5, 10][index % 6]!;
  return {
    id: `academy-bat-${index % 6}`,
    name: ["Nishi", "Cruz", "Vale", "Park", "Boone", "Ito"][index % 6]!,
    pos: "CF",
    age: 21,
    potential: 12,
    contact,
    power,
    speed: 8,
    eye,
    fielding: 10,
    arm: 10,
    stuff: 4,
    control: 4,
    stamina: 10,
    salary: 1,
    years: 1,
    morale: 60,
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    bats: index % 2 === 0 ? "R" : "L",
    throws: "R",
    look: LOOK,
  };
}
