import type { CSSProperties } from "react";
import { letterFill, letterFillLine, STAT_EN } from "@/shine/grades.ts";
import type { RepResult } from "@/shine/run.ts";
import type { TraineeRun } from "@/shine/types.ts";
import { letterStat, type DayChip } from "./work-day";

/**
 * How full the letter she already has is. Reads the 1–20 value and her potential. Changes nothing.
 * `rep`: the practice morning, where the line follows the rep's own work; otherwise the stat the
 * Coach card points at.
 */
export function LetterMarks({ run, rep = false }: { run: TraineeRun; rep?: boolean }) {
  const stat = letterStat(run, rep);
  const value = run.stats[stat];
  const fill = letterFill(value, run.potential);
  const line = letterFillLine(STAT_EN[stat], value, run.potential);
  return (
    <p
      className="shine-letter-fill font-story text-sm text-cream/90"
      data-letter-fill={fill.fill}
      data-letter-value={value}
      data-letter-stat={stat}
      data-letter-grade={fill.grade}
      data-letter-ceiling={fill.ceiling ? "" : undefined}
    >
      <span className="shine-letter-track" aria-hidden>
        <span className="shine-letter-track-fill" style={{ ["--letter" as string]: fill.fill }} />
      </span>
      <span className="shine-letter-line">{line}</span>
    </p>
  );
}

/** A row of small chips: yesterday's work on the rep morning, or the rep's own work at its done panel. */
export function WorkChips({ chips, label, kind }: { chips: readonly DayChip[]; label: string; kind: "yesterday" | "rep" }) {
  if (!chips.length) return null;
  return (
    <div className="shine-work-chips shine-rep-chips" aria-label={label} data-rep-chips={kind}>
      {chips.map((c, i) => (
        <span key={c.text} className={`shine-gain-chip ${c.cost ? "is-cost" : ""}`} style={{ ["--i" as string]: i } as CSSProperties}>
          {c.text}
        </span>
      ))}
    </div>
  );
}

/** The rep's real work, under its swing or throw: the line, then the chips. */
export function RepWork({ result }: { result: RepResult }) {
  return (
    <div className="shine-rep-work" data-rep-outcome={result.outcome}>
      <p className="text-center font-story text-sm text-cream/90" data-rep-line>
        {result.line}
      </p>
      <WorkChips chips={result.chips} label="What the morning's work did" kind="rep" />
    </div>
  );
}
