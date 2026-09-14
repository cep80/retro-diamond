import type { Difficulty } from "./types.ts";

export function difficultyMod(d: Difficulty): {
  timing: number;
  barrel: number;
  scatter: number;
  eyeAdj: number;
  runnerTimer: number;
} {
  switch (d) {
    case "rookie":
      return { timing: 1.8, barrel: 1.5, scatter: 0.65, eyeAdj: -0.1, runnerTimer: 2.0 };
    case "legend":
      return { timing: 0.65, barrel: 0.78, scatter: 1.3, eyeAdj: 0.1, runnerTimer: 0.8 };
    default:
      return { timing: 1.0, barrel: 1.0, scatter: 1.0, eyeAdj: 0, runnerTimer: 1.2 };
  }
}
