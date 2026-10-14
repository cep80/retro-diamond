import { isPitcherStyle, sheet } from "@/shine/bible.ts";
import { letterFill, letterFillLine, STAT_EN } from "@/shine/grades.ts";
import type { TraineeRun } from "@/shine/types.ts";

/** How full the letter she already has is. Reads the 1–20 value. Changes nothing. */
export function LetterMarks({ run }: { run: TraineeRun }) {
  const stat = isPitcherStyle(sheet(run.characterId).style) ? "stuff" : "contact";
  const value = run.stats[stat];
  const fill = letterFill(value);
  const line = letterFillLine(STAT_EN[stat], value);
  return (
    <p
      className="shine-letter-fill font-story text-sm text-cream/90"
      data-letter-fill={fill.fill}
      data-letter-value={value}
      data-letter-stat={stat}
      data-letter-grade={fill.grade}
    >
      <span className="shine-letter-track" aria-hidden>
        <span className="shine-letter-track-fill" style={{ ["--letter" as string]: fill.fill }} />
      </span>
      <span className="shine-letter-line">{line}</span>
    </p>
  );
}
