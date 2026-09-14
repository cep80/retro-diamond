"use client";

import type { Cell } from "@/game/plate";
import type { PlateSnapshot } from "@/shine/plate-controller.ts";
import { firstPitchAimSight, firstPitchSitGlass, firstPitchSitLit, sitClearsForBall, sitHitSlopPx } from "./scene/presentation";

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
  const glass = firstPitchSitGlass(sit) || sitClearsForBall(snapshot.stage);
  const firstPitch = firstPitchAimSight({
    pitchesSeen: snapshot.game.pitchesSeen,
    stage: snapshot.stage,
    aimed: sitChosen,
  });
  return (
    <div className={`grid size-full grid-cols-3 grid-rows-3 overflow-visible ${compact ? "gap-0.5" : "gap-1"}`} role="grid" aria-label="Sit">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const cell = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
          const on = showSit && cellKey(snapshot.aim) === cellKey(cell);
          const h = showSit ? (heat[row * 3 + col] ?? 0) : 0;
          const hot = h > 0.25;
          const cold = h < -0.25;
          const ghostHere = ghost && cellKey(ghost) === cellKey(cell);
          return (
            <button
              key={cellKey(cell)}
              type="button"
              aria-pressed={on}
              aria-label={`Aim ${row + 1} ${col + 1}`}
              className={`shine-sit-hit relative min-h-0 overflow-visible rounded-md border font-display text-[10px] uppercase tracking-wide ${
                glass ? "shine-first-sit border-gold/80 text-transparent" : on ? "border-gold text-cream" : "border-white/20 text-cream/80"
              } ${on && firstPitch ? "shine-first-cell" : ""} ${ghostHere ? "shine-ghost-cell" : ""}`}
              style={{
                ["--sit-hit" as string]: `${compact ? sitHitSlopPx(30) : 0}px`,
                background: glass
                  ? "rgb(8 17 39 / 0.10)"
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
