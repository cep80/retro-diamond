// First-pitch take seeds by pitch type at exhibition pace.
import { exhibitionController, playPitch } from "../src/shine/plate-harness.ts";
import { EXHIBITION_PACE } from "../src/components/exhibition/scene/presentation.ts";

const TAKE = { action: "take" as const };
const want = ["fastball", "curve", "slider", "changeup"] as const;
const found: Partial<Record<(typeof want)[number], string>> = {};
for (let i = 0; i < 400 && Object.keys(found).length < want.length; i++) {
  const seed = `leave-type-${i}`;
  const { c, sched } = exhibitionController(seed, EXHIBITION_PACE);
  c.stepIn();
  const result = playPitch(c, sched, TAKE, EXHIBITION_PACE);
  const type = result.after.lastPitchType;
  const leave = result.resolved.beat === "take-strike" || result.resolved.beat === "ball";
  if (type && want.includes(type) && !found[type] && leave) {
    found[type] = seed;
    console.log(type, seed, result.resolved.beat);
  }
}
console.log(JSON.stringify(found));
