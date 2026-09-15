"use client";

import type { Cell } from "@/game/plate";
import type { PlateSnapshot } from "@/shine/plate-controller.ts";
import { firstPitchAimSight, firstPitchSitGlass, firstPitchSitLit, sitCellChosen, sitClearsForBall, sitGhostLead, sitSeatRests, sitSeatsPulse, sitHitSlopPx } from "./scene/presentation";

function cellKey(c: Cell) {
  return `${c.row}-${c.col}`;
}

/** Shared 3×3 aim grid: accessible buttons, hot/cold shading, ghost flash. */
export function AimGrid({
  snapshot,
  heat,
  ghost,
  onAim,
  compact,
  sitChosen = true,
}: {
  snapshot: PlateSnapshot;
  heat: number[];
  ghost: Cell | null;
  onAim: (c: Cell) => void;
  compact?: boolean;
  /** First pitch starts unlit so "Aim a cell" is a real verb. */
  sitChosen?: boolean;
}) {
  const sit = { pitchesSeen: snapshot.game.pitchesSeen, aimed: sitChosen };
  const showSit = firstPitchSitLit(sit);
  const glass = firstPitchSitGlass(sit) || sitClearsForBall(snapshot.stage, snapshot.game.pitchesSeen);
  const firstPitch = firstPitchAimSight({
    pitchesSeen: snapshot.game.pitchesSeen,
    stage: snapshot.stage,
    aimed: sitChosen,
  });
  const ghostLead = sitGhostLead({ ghost: Boolean(ghost), aimed: sitChosen });
  const pulse = sitSeatsPulse({ aimed: sitChosen, stage: snapshot.stage, ghost: Boolean(ghost) });
  return (
    <div className={`grid size-full grid-cols-3 grid-rows-3 overflow-visible ${compact ? "gap-0.5" : "gap-1"}`} role="grid" aria-label="Sit">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const cell = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
          const on = sitCellChosen({ aimed: sitChosen }) && cellKey(snapshot.aim) === cellKey(cell);
          const ghostHere = Boolean(ghost && cellKey(ghost) === cellKey(cell));
          const rest = sitSeatRests({
            aimed: sitChosen,
            on,
            ghost: Boolean(ghost),
            ghostHere,
          });
          const h = ghostLead || glass || rest ? 0 : showSit ? (heat[row * 3 + col] ?? 0) : 0;
          const hot = h > 0.25;
          const cold = h < -0.25;
          return (
            <button
              key={cellKey(cell)}
              type="button"
              aria-pressed={on}
              aria-label={`Aim ${row + 1} ${col + 1}`}
              data-ghost={ghostHere ? "1" : undefined}
              data-sit-rest={rest ? "1" : undefined}
              className={`shine-sit-hit relative min-h-0 overflow-visible rounded-md border font-display text-[10px] uppercase tracking-wide ${
                rest ? "opacity-0 " : ""
              }${
                ghostHere && ghostLead
                  ? "shine-first-cell border-gold text-cream"
                  : glass
                    ? `text-transparent ${on ? "border-gold" : pulse ? "shine-first-sit border-gold/60" : "border-gold/35"}`
                    : on
                      ? "border-gold text-cream"
                      : "border-white/20 text-cream/80"
              } ${on && firstPitch ? "shine-first-cell" : ""} ${ghostHere && !ghostLead ? "shine-ghost-cell" : ""}`}
              style={{
                ["--sit-hit" as string]: `${compact ? sitHitSlopPx(30) : 0}px`,
                background: ghostHere && ghostLead
                  ? "rgb(255 209 102 / 0.62)"
                  : glass
                    ? on
                      ? "rgb(255 209 102 / 0.10)"
                      : "transparent"
                    : hot
                      ? "rgb(255 113 143 / 0.30)"
                      : cold
                        ? "rgb(120 234 220 / 0.15)"
                        : "rgb(8 17 39 / 0.40)",
              }}
              onClick={() => onAim(cell)}
            >
              {hot ? "+" : cold ? "×" : ""}
            </button>
          );
        }),
      )}
    </div>
  );
}
