/**
 * Per-date Support Goals. Process only. No plate constants.
 * Thin adapter over `goals.ts`: verbs resolve to ids, ids resolve against state.
 */
import { evalHitterSg, evalPitcherSg, goalIdForVerb, isHitterSg, isPitcherSg, type HitterSgView, type PitcherSgView } from "./goals.ts";

export type HitterSgFlags = HitterSgView;
export type PitcherSgFlags = PitcherSgView;

export function hitterSupportMet(sgVerb: string, g: HitterSgFlags) {
  const id = goalIdForVerb(sgVerb);
  if (!id || !isHitterSg(id)) return false;
  return evalHitterSg(id, g);
}

export function pitcherSupportMet(sgVerb: string, g: PitcherSgFlags) {
  const id = goalIdForVerb(sgVerb);
  if (!id || !isPitcherSg(id)) return false;
  return evalPitcherSg(id, g);
}
