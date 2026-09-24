/** Every training event, hitters and pitchers, in one list for eventDue. */
import { HITTER_EVENTS } from "./training-events-hitters.ts";
import { PITCHER_EVENTS } from "./training-events-pitchers.ts";
import type { TrainingEvent } from "./training-events.ts";

export const EVENT_LIBRARY: readonly TrainingEvent[] = [...HITTER_EVENTS, ...PITCHER_EVENTS];
