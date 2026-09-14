/**
 * Unique skill stings. Personality in the acting, never a generic SKILL stamp.
 * Flash on windup, never steal the tap. Presentation — no plate constants.
 */
import { sheet } from "./bible.ts";
import { cowbellOn } from "./culture.ts";
import type { CharacterId } from "./types.ts";

export function uniqueName(id: CharacterId) {
  return sheet(id).unique.split(".")[0]!.trim();
}

export interface UniqueSit {
  already: boolean;
  kind: string;
  pitching?: boolean;
  firstPitchOfPa: boolean;
  paIndex: number;
  lastSpurt: boolean;
  stealArmed: boolean;
  parkId: string;
  scoreDiff: number;
  inning: number;
}

export function uniqueShouldFire(id: CharacterId, sit: UniqueSit): boolean {
  if (sit.already) return false;
  if (sit.kind === "practice" || sit.kind === "weekly") return false;
  const who = sheet(id);
  if (who.id === "aoi") return sit.firstPitchOfPa && sit.paIndex === 1 && !sit.pitching;
  if (who.id === "reina") return Boolean(sit.pitching) && sit.firstPitchOfPa && sit.paIndex <= 1;
  if (who.id === "miki") return cowbellOn(sit.parkId, sit.scoreDiff, sit.inning);
  if (who.id === "sol") return sit.lastSpurt || sit.inning >= 7;
  if (who.id === "kira") return Boolean(sit.pitching) && sit.inning >= 9;
  if (who.id === "yuki") return sit.inning >= 7;
  return false;
}
